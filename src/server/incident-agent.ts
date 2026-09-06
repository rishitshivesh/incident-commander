import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { convertToModelMessages, pruneMessages, stepCountIs, streamText, tool } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";
import { getDependencies, getRecentDeployments, getServiceSnapshot, searchServiceLogs } from "./data/mock-infrastructure";
import type { CommanderState, IncidentSeverity, InvestigationResult, WorkflowProgress } from "./types";

type ServiceContextRow = {
  service: string;
  context: string;
  updated_at: string;
};

export class IncidentCommanderAgent extends AIChatAgent<Env, CommanderState> {
  maxPersistedMessages = 120;
  chatRecovery = true;

  initialState: CommanderState = {
    activeIncident: null,
    investigation: {
      workflowId: null,
      status: "idle",
      step: null,
      percent: 0,
      message: null
    }
  };

  onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        environment TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        workflow_id TEXT,
        result TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    this.sql`
      CREATE TABLE IF NOT EXISTS service_context (
        service TEXT PRIMARY KEY,
        context TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    this.sql`
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
  }

  private getServiceMemory() {
    return this.sql<ServiceContextRow>`SELECT service, context, updated_at FROM service_context ORDER BY updated_at DESC LIMIT 20`;
  }

  private rememberObservation(incidentId: string, category: string, content: string) {
    this.sql`
      INSERT INTO observations (incident_id, category, content, created_at)
      VALUES (${incidentId}, ${category}, ${content}, ${new Date().toISOString()})
    `;
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const serviceMemory = this.getServiceMemory();

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      system: `You are Incident Commander, an SRE-focused production incident assistant. Be concise, evidence-driven, and explicit about uncertainty.

Your job is to triage incidents, inspect telemetry through tools, remember durable service facts when the user asks you to remember them, and start a durable investigation workflow when the incident is sufficiently described.

Prefer tool evidence over guesses. Never claim a production action happened unless a tool confirms it. The current telemetry provider is a deterministic demo environment, so state that when it matters.

Known durable service context:
${serviceMemory.length ? serviceMemory.map((row) => `- ${row.service}: ${row.context}`).join("\n") : "- No service context has been stored yet."}`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
        reasoning: "before-last-message"
      }),
      tools: {
        getServiceHealth: tool({
          description: "Get current health and core metrics for a service in the demo infrastructure.",
          inputSchema: z.object({ service: z.string() }),
          execute: async ({ service }) => getServiceSnapshot(service) ?? { error: `Unknown service: ${service}` }
        }),
        getDependencies: tool({
          description: "Get dependency health for a service.",
          inputSchema: z.object({ service: z.string() }),
          execute: async ({ service }) => getDependencies(service)
        }),
        getRecentDeployments: tool({
          description: "Get recent deployments for a service.",
          inputSchema: z.object({ service: z.string() }),
          execute: async ({ service }) => getRecentDeployments(service)
        }),
        searchLogs: tool({
          description: "Search recent service logs in the demo telemetry dataset.",
          inputSchema: z.object({
            service: z.string(),
            query: z.string().optional()
          }),
          execute: async ({ service, query }) => searchServiceLogs(service, query)
        }),
        rememberServiceContext: tool({
          description: "Persist a durable fact about a service. Use only when the user asks to remember a service fact or clearly presents stable service context.",
          inputSchema: z.object({
            service: z.string(),
            context: z.string()
          }),
          execute: async ({ service, context }) => {
            const updatedAt = new Date().toISOString();
            this.sql`
              INSERT INTO service_context (service, context, updated_at)
              VALUES (${service}, ${context}, ${updatedAt})
              ON CONFLICT(service) DO UPDATE SET context = excluded.context, updated_at = excluded.updated_at
            `;
            return { stored: true, service, context };
          }
        }),
        startInvestigation: tool({
          description: "Create an incident and launch the durable Cloudflare investigation workflow.",
          inputSchema: z.object({
            title: z.string(),
            service: z.string(),
            environment: z.string().default("production"),
            severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
            description: z.string()
          }),
          execute: async ({ title, service, environment, severity, description }) => {
            const incidentId = crypto.randomUUID();
            const createdAt = new Date().toISOString();
            const workflowId = await this.runWorkflow("INCIDENT_INVESTIGATION", {
              incidentId,
              service,
              environment,
              description
            });

            this.sql`
              INSERT INTO incidents (id, title, service, environment, severity, status, workflow_id, created_at, updated_at)
              VALUES (${incidentId}, ${title}, ${service}, ${environment}, ${severity}, 'investigating', ${workflowId}, ${createdAt}, ${createdAt})
            `;

            this.rememberObservation(incidentId, "report", description);
            this.setState({
              activeIncident: {
                id: incidentId,
                title,
                service,
                environment,
                severity: severity as IncidentSeverity,
                status: "investigating",
                createdAt
              },
              investigation: {
                workflowId,
                status: "queued",
                step: "queued",
                percent: 0,
                message: "Investigation queued"
              }
            });

            return { incidentId, workflowId, status: "investigating" };
          }
        })
      },
      stopWhen: stepCountIs(12),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }

  async onWorkflowProgress(_workflowName: string, instanceId: string, progress: unknown) {
    const next = progress as WorkflowProgress;
    if (this.state.investigation.workflowId !== instanceId) return;

    this.setState({
      ...this.state,
      investigation: {
        workflowId: instanceId,
        status: next.status,
        step: next.step,
        percent: next.percent,
        message: next.message
      }
    });
  }

  async onWorkflowComplete(_workflowName: string, instanceId: string, result?: unknown) {
    const investigationResult = result as InvestigationResult | undefined;
    const updatedAt = new Date().toISOString();

    if (investigationResult) {
      this.sql`
        UPDATE incidents
        SET status = 'open', result = ${JSON.stringify(investigationResult)}, updated_at = ${updatedAt}
        WHERE workflow_id = ${instanceId}
      `;
      this.rememberObservation(investigationResult.incidentId, "root-cause", investigationResult.likelyCause);
    }

    if (this.state.investigation.workflowId === instanceId) {
      this.setState({
        activeIncident: this.state.activeIncident
          ? { ...this.state.activeIncident, status: "open" }
          : null,
        investigation: {
          workflowId: instanceId,
          status: "complete",
          step: "complete",
          percent: 100,
          message: investigationResult?.likelyCause ?? "Investigation complete"
        }
      });
    }
  }

  async onWorkflowError(_workflowName: string, instanceId: string, error: string) {
    if (this.state.investigation.workflowId !== instanceId) return;

    this.setState({
      ...this.state,
      investigation: {
        workflowId: instanceId,
        status: "error",
        step: "error",
        percent: this.state.investigation.percent,
        message: error
      }
    });
  }
}
