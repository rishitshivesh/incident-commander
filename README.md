# Incident Commander

AI-assisted incident investigation built on Cloudflare Agents.

The app is designed around a durable incident agent rather than a stateless chat endpoint. Chat runs through `AIChatAgent`, investigation work is delegated to Cloudflare Workflows, and incident context is persisted in the agent's Durable Object SQLite storage.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- Cloudflare Workers
- Cloudflare Agents SDK
- `AIChatAgent` + `useAgentChat`
- Workers AI using Llama 3.3 70B Instruct
- Cloudflare Workflows
- Durable Objects + SQLite
- Agent Elements-compatible chat UI
- Zod

## Development

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

Generate Cloudflare binding types after changing `wrangler.jsonc`:

```bash
pnpm types
```

## Architecture

```text
React client
    |
    | WebSocket
    v
IncidentCommanderAgent (AIChatAgent)
    |-- Workers AI / Llama 3.3
    |-- incident tools
    |-- Durable Object state
    |-- SQLite incident memory
    |
    `-- IncidentInvestigationWorkflow
            |-- triage
            |-- deployments
            |-- metrics
            |-- logs
            |-- hypotheses
            `-- recommendation
```

The first version uses deterministic mock infrastructure data so investigations remain repeatable during demos. The tool boundary is intentionally kept separate so real observability providers can replace it later without changing the agent or UI contracts.
