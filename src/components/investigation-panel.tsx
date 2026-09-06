import { Check, Circle, LoaderCircle, TriangleAlert } from "lucide-react";
import type { CommanderState } from "../server/types";

const stages = [
  { key: "triage", label: "Triage incident" },
  { key: "deployments", label: "Check deployments" },
  { key: "dependencies", label: "Inspect dependencies" },
  { key: "logs", label: "Correlate logs" },
  { key: "hypothesis", label: "Rank hypothesis" },
  { key: "complete", label: "Recommendation" }
];

function StageIcon({ complete, active, error }: { complete: boolean; active: boolean; error: boolean }) {
  if (error && active) return <TriangleAlert size={15} className="text-red-400" />;
  if (complete) return <Check size={15} className="text-emerald-400" />;
  if (active) return <LoaderCircle size={15} className="animate-spin text-sky-400" />;
  return <Circle size={13} className="text-zinc-700" />;
}

export function InvestigationPanel({ state }: { state?: CommanderState }) {
  const investigation = state?.investigation;
  const incident = state?.activeIncident;
  const currentIndex = stages.findIndex((stage) => stage.key === investigation?.step);
  const isComplete = investigation?.status === "complete";
  const isError = investigation?.status === "error";

  return (
    <aside className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="border-b border-zinc-900 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">Investigation</p>
            <h2 className="mt-1 text-sm font-medium text-zinc-200">{incident?.title ?? "No active incident"}</h2>
          </div>
          {incident ? (
            <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
              {incident.severity}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {!incident ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-sm leading-6 text-zinc-600">
            A durable investigation appears here after the agent has enough context to start one.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">Service</p>
                <p className="mt-1 text-sm text-zinc-300">{incident.service}</p>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">Environment</p>
                <p className="mt-1 text-sm text-zinc-300">{incident.environment}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Progress</span>
                <span className="font-mono text-zinc-400">{Math.round(investigation?.percent ?? 0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div className="h-full rounded-full bg-zinc-200 transition-all duration-500" style={{ width: `${investigation?.percent ?? 0}%` }} />
              </div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-600">{investigation?.message}</p>
            </div>

            <div className="mt-5 space-y-1">
              {stages.map((stage, index) => {
                const active = stage.key === investigation?.step;
                const complete = isComplete || (currentIndex >= 0 && index < currentIndex);
                return (
                  <div key={stage.key} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                    <div className="flex size-5 items-center justify-center">
                      <StageIcon complete={complete} active={active} error={isError} />
                    </div>
                    <span className={active ? "text-xs text-zinc-200" : complete ? "text-xs text-zinc-400" : "text-xs text-zinc-700"}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
