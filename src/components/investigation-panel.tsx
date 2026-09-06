import { CheckCircle2, Circle, LoaderCircle, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CommanderState, InvestigationStep } from "../../worker/src/types";

const steps: Array<{ id: InvestigationStep; label: string }> = [
  { id: "triage", label: "Triage incident" },
  { id: "deployments", label: "Check deployments" },
  { id: "dependencies", label: "Inspect dependencies" },
  { id: "logs", label: "Correlate logs" },
  { id: "hypothesis", label: "Rank root cause" },
  { id: "complete", label: "Recommendation" }
];

function getStepIndex(step: InvestigationStep | null) {
  if (!step || step === "queued" || step === "error") return -1;
  return steps.findIndex((item) => item.id === step);
}

export function InvestigationPanel({ state }: { state?: CommanderState }) {
  const incident = state?.activeIncident;
  const investigation = state?.investigation;
  const activeIndex = getStepIndex(investigation?.step ?? null);
  const percent = Math.round((investigation?.percent ?? 0) * 100);

  return (
    <aside className="min-h-0 overflow-y-auto bg-zinc-50/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Investigation</p>
          <h2 className="mt-1 text-lg font-semibold">Live incident state</h2>
        </div>
        <Badge variant={investigation?.status === "error" ? "destructive" : "secondary"}>
          {investigation?.status ?? "idle"}
        </Badge>
      </div>

      <Card className="mb-4 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{incident?.title ?? "No active incident"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incident ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted-foreground">Service</p><p className="mt-1 font-medium">{incident.service}</p></div>
              <div><p className="text-muted-foreground">Environment</p><p className="mt-1 font-medium">{incident.environment}</p></div>
              <div><p className="text-muted-foreground">Severity</p><p className="mt-1 font-medium capitalize">{incident.severity}</p></div>
              <div><p className="text-muted-foreground">Status</p><p className="mt-1 font-medium capitalize">{incident.status}</p></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Describe an incident in chat and the agent will create a durable investigation when it has enough context.</p>
          )}
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground">{investigation?.message ?? "Waiting for an investigation"}</p>
        </CardContent>
      </Card>

      <div className="space-y-1">
        {steps.map((step, index) => {
          const complete = investigation?.status === "complete" || index < activeIndex;
          const active = index === activeIndex && investigation?.status !== "complete";
          const failed = investigation?.status === "error" && index === activeIndex;
          const Icon = failed ? TriangleAlert : complete ? CheckCircle2 : active ? LoaderCircle : Circle;
          return (
            <div key={step.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
              <Icon className={`mt-0.5 size-4 ${active ? "animate-spin text-zinc-950" : failed ? "text-destructive" : complete ? "text-emerald-600" : "text-zinc-300"}`} />
              <div className="min-w-0">
                <p className={`text-sm ${active || complete ? "font-medium text-zinc-950" : "text-muted-foreground"}`}>{step.label}</p>
                {active && investigation?.message ? <p className="mt-1 text-xs text-muted-foreground">{investigation.message}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
