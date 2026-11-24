# Incident Commander

AI-assisted production incident investigation built on Cloudflare Agents.

## Stack

- Next.js 15 App Router + React 19
- Yarn 4
- Tailwind CSS 4 + shadcn/ui
- Agent Elements for the chat surface
- Cloudflare Workers + Agents SDK
- `AIChatAgent` + `useAgentChat`
- Workers AI using Llama 3.3 70B Instruct
- Cloudflare Workflows
- Durable Objects + SQLite
- Zod + AI SDK

The web UI and the agent Worker are intentionally separate processes. Next.js remains a normal Next application, while the agent Worker owns realtime WebSocket chat, Durable Object state, SQLite memory, Workers AI and Workflows.

## Development

```bash
corepack enable
yarn install
yarn dev
```

This starts Next.js on port 3000 and the agent Worker on port 8787. Copy `.env.example` to `.env.local` if you need to override the agent host.

Useful commands:

```bash
yarn format
yarn lint
yarn typecheck
yarn build
yarn build:agent
yarn check
```

## Agent Elements

The project is shadcn-initialised and checks in Agent Elements as source under `src/components/agent-elements`.

A project-scoped Agent Elements MCP server is also configured in `.mcp.json`. Claude Code will ask for approval the first time the project-scoped server is used.

To refresh the chat component manually:

```bash
yarn ui:agent-chat
```

## Architecture

```text
Next.js / Agent Elements
        |
        | WebSocket
        v
IncidentCommanderAgent
  |-- Workers AI / Llama 3.3
  |-- tool calls
  |-- Durable Object state
  |-- SQLite memory
  |
  `-- IncidentInvestigationWorkflow
        |-- triage
        |-- deployments
        |-- dependencies
        |-- logs
        |-- hypothesis
        `-- recommendation
```

The initial telemetry provider is deterministic mock infrastructure so the demo remains repeatable. Real observability providers can replace that boundary later without changing the Agent or UI contracts.

## Assignment requirements mapping

| Requirement | Implementation |
| --- | --- |
| LLM | Llama 3.3 70B (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) on Workers AI, called from `worker/src/incident-agent.ts` |
| Workflow / coordination | `IncidentInvestigationWorkflow` (Cloudflare Workflows) launched by the agent via `runWorkflow`; progress streams back through `onWorkflowProgress` |
| User input | Chat UI (Next.js + Agent Elements) over a WebSocket via `useAgent` / `useAgentChat` |
| Memory / state | Durable Object state (`CommanderState`) plus SQLite tables for incidents, service context and observations |

Prompt history for AI-assisted coding is in [PROMPTS.md](./PROMPTS.md).

## Deploying

Workers AI needs a Cloudflare login, including for `yarn dev:agent` because the AI binding runs remotely. Run `npx wrangler login` first, or set `CLOUDFLARE_API_TOKEN`.

```bash
# 1. Deploy the agent Worker (Durable Object, Workflow, AI binding)
yarn deploy:agent
# 2. Point the web app at it, using the host only (no protocol), e.g. incident-commander-agent.<account>.workers.dev
echo "NEXT_PUBLIC_AGENT_HOST=incident-commander-agent.<account>.workers.dev" > .env.local
# 3. Deploy the web app
yarn deploy:web
```

`NEXT_PUBLIC_AGENT_HOST` is read at build time. Without it the UI falls back to `<current hostname>:8787`, which only works locally.
