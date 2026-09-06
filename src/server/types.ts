export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type InvestigationStatus = "idle" | "queued" | "running" | "complete" | "error";

export type IncidentSummary = {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  status: "open" | "investigating" | "resolved";
  createdAt: string;
};

export type WorkflowProgress = {
  step: string;
  status: InvestigationStatus;
  percent: number;
  message: string;
};

export type CommanderState = {
  activeIncident: IncidentSummary | null;
  investigation: {
    workflowId: string | null;
    status: InvestigationStatus;
    step: string | null;
    percent: number;
    message: string | null;
  };
};

export type InvestigationParams = {
  incidentId: string;
  service: string;
  environment: string;
  description: string;
};

export type InvestigationResult = {
  incidentId: string;
  likelyCause: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
};
