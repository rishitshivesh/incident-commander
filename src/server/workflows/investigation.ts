import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import { getDependencies, getRecentDeployments, getServiceSnapshot, searchServiceLogs } from "../data/mock-infrastructure";
import type { IncidentCommanderAgent } from "../incident-agent";
import type { InvestigationParams, InvestigationResult, WorkflowProgress } from "../types";

export class IncidentInvestigationWorkflow extends AgentWorkflow<IncidentCommanderAgent, InvestigationParams, WorkflowProgress> {
  async run(event: AgentWorkflowEvent<InvestigationParams>, step: AgentWorkflowStep) {
    const { incidentId, service } = event.payload;

    await this.reportProgress({
      step: "triage",
      status: "running",
      percent: 10,
      message: "Classifying incident and collecting service context"
    });

    const serviceSnapshot = await step.do("triage service", async () => getServiceSnapshot(service));

    await this.reportProgress({
      step: "deployments",
      status: "running",
      percent: 30,
      message: "Checking recent deployments"
    });

    const deployments = await step.do("check deployments", async () => getRecentDeployments(service));

    await this.reportProgress({
      step: "dependencies",
      status: "running",
      percent: 50,
      message: "Inspecting dependency health"
    });

    const dependencies = await step.do("inspect dependencies", async () => getDependencies(service));

    await this.reportProgress({
      step: "logs",
      status: "running",
      percent: 70,
      message: "Correlating application and dependency logs"
    });

    const serviceLogs = await step.do("search service logs", async () => searchServiceLogs(service));
    const redisLogs = await step.do("search redis logs", async () => searchServiceLogs("redis"));

    await this.reportProgress({
      step: "hypothesis",
      status: "running",
      percent: 90,
      message: "Ranking the strongest root-cause hypothesis"
    });

    const result = await step.do("build investigation result", async (): Promise<InvestigationResult> => {
      const redis = dependencies.find((dependency) => dependency.name === "redis");
      const latestDeployment = deployments[0];
      const redisPressure = redis?.status === "critical";
      const hasRedisTimeouts = [...serviceLogs, ...redisLogs].some((line) => line.includes("RedisTimeoutException") || line.includes("pool utilization"));

      if (redisPressure && hasRedisTimeouts && latestDeployment) {
        return {
          incidentId,
          likelyCause: `Redis connection pool exhaustion introduced around deployment ${latestDeployment.version}`,
          confidence: 0.94,
          evidence: [
            `Redis is ${redis.status} with ${redis.memoryPercent}% memory utilization`,
            "Application logs contain repeated Redis connection acquisition timeouts",
            `Deployment ${latestDeployment.version} changed the Redis client lifecycle shortly before the incident`
          ],
          recommendation: `Roll back ${latestDeployment.version}, then verify Redis connected clients and payment latency return to baseline before re-deploying.`
        };
      }

      return {
        incidentId,
        likelyCause: "No single root cause reached the confidence threshold",
        confidence: 0.42,
        evidence: serviceSnapshot ? [`${service} is currently ${serviceSnapshot.status}`] : ["Service telemetry was unavailable"],
        recommendation: "Continue investigation with real provider telemetry and compare against the last known healthy deployment."
      };
    });

    await step.reportComplete(result);
    return result;
  }
}
