import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import { Activity, Cloud, Database, Workflow } from "lucide-react";
import { useCallback, useState } from "react";
import { AgentChat } from "./components/agent-elements/agent-chat";
import { InvestigationPanel } from "./components/investigation-panel";
import type { IncidentCommanderAgent } from "./server/incident-agent";
import type { CommanderState } from "./server/types";

function Header({ connected }: { connected: boolean }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-900 bg-zinc-950 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
          <Activity size={16} className="text-zinc-200" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Incident Commander</h1>
          <p className="hidden text-[10px] text-zinc-600 sm:block">Cloudflare Agents · Workers AI · Workflows</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-zinc-900 bg-zinc-900/40 px-2.5 py-1.5 text-[11px] text-zinc-500">
        <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
        {connected ? "Connected" : "Connecting"}
      </div>
    </header>
  );
}

function ArchitectureStrip() {
  const items = [
    { icon: Cloud, label: "Workers AI", value: "Llama 3.3 70B" },
    { icon: Workflow, label: "Coordination", value: "AgentWorkflow" },
    { icon: Database, label: "Memory", value: "DO SQLite" }
  ];

  return (
    <div className="hidden border-t border-zinc-900 bg-zinc-950 lg:grid lg:grid-cols-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 border-r border-zinc-900 px-4 py-2.5 last:border-r-0">
          <Icon size={14} className="text-zinc-600" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-zinc-700">{label}</p>
            <p className="truncate text-[11px] text-zinc-400">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [connected, setConnected] = useState(false);

  const agent = useAgent<IncidentCommanderAgent, CommanderState>({
    agent: "IncidentCommanderAgent",
    name: "default",
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback((error: Event) => console.error("Agent connection failed", error), [])
  });

  const { messages, sendMessage, stop, status } = useAgentChat({
    agent,
    experimental_throttle: 80
  });

  const handleSend = useCallback(
    (message: string) => {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: message }]
      });
    },
    [sendMessage]
  );

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Header connected={connected} />
      <div className="grid h-[calc(100vh-3.5rem)] min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col border-r border-zinc-900">
          <div className="min-h-0 flex-1">
            <AgentChat messages={messages} status={status} onSend={handleSend} onStop={stop} />
          </div>
          <ArchitectureStrip />
        </section>
        <div className="hidden min-h-0 xl:block">
          <InvestigationPanel state={agent.state} />
        </div>
      </div>
    </main>
  );
}
