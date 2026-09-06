"use client";

import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import { Activity, Cloud, Database, Workflow } from "lucide-react";
import { useCallback, useState } from "react";
import { AgentChat } from "@/components/agent-elements/agent-chat";
import { InvestigationPanel } from "@/components/investigation-panel";
import type { CommanderState } from "../../worker/src/types";

const suggestions = [
  {
    id: "payments-latency",
    label: "Investigate payments latency",
    value: "Payments latency jumped after the latest production deployment. Investigate it."
  },
  {
    id: "redis",
    label: "Check Redis pressure",
    value: "Payments is timing out and I suspect Redis. Check the service and its dependencies."
  },
  {
    id: "remember",
    label: "Store service context",
    value: "Remember that payments depends on Redis and Postgres and normally has a p95 below 300ms."
  }
];

function getAgentHost() {
  if (process.env.NEXT_PUBLIC_AGENT_HOST) return process.env.NEXT_PUBLIC_AGENT_HOST;
  if (typeof window === "undefined") return "localhost:8787";
  return `${window.location.hostname}:8787`;
}

export function IncidentCommander() {
  const [connected, setConnected] = useState(false);
  const agent = useAgent({
    agent: "IncidentCommanderAgent",
    name: "default",
    host: getAgentHost(),
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback((error: Event) => console.error("Agent connection error", error), [])
  });

  const { messages, sendMessage, stop, status } = useAgentChat({ agent });
  const state = agent.state as CommanderState | undefined;

  return (
    <main className="min-h-screen bg-zinc-50 p-4 text-zinc-950 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Activity className="size-4" /> Incident Commander
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cloudflare Agents powered incident investigation</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            <span className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
            {connected ? "Agent connected" : "Connecting"}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-h-[620px] border-b lg:border-b-0 lg:border-r">
            <AgentChat
              messages={messages}
              status={status}
              onStop={stop}
              onSend={({ content }) =>
                sendMessage({
                  role: "user",
                  parts: [{ type: "text", text: content }]
                })
              }
              suggestions={suggestions}
              emptyStatePosition="center"
              emptySuggestionsPlacement="empty"
              showCopyToolbar
              className="h-full"
            />
          </section>
          <InvestigationPanel state={state} />
        </div>

        <footer className="grid gap-2 border-t bg-zinc-50 px-5 py-3 text-[11px] text-muted-foreground sm:grid-cols-4">
          <div className="flex items-center gap-1.5"><Cloud className="size-3.5" /> Workers AI / Llama 3.3</div>
          <div className="flex items-center gap-1.5"><Workflow className="size-3.5" /> Cloudflare Workflows</div>
          <div className="flex items-center gap-1.5"><Database className="size-3.5" /> Durable Object SQLite</div>
          <div className="flex items-center gap-1.5"><Activity className="size-3.5" /> Realtime WebSocket state</div>
        </footer>
      </div>
    </main>
  );
}
