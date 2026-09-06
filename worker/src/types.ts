export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "resolved";
export type InvestigationStep = "queued" | "triage" | "deployments" | "dependencies" | "logs" | "hypothesis" | "complete" | "error";
export type InvestigationStatus = "idle" | "queued" | "running" | "complete" | "error";

export type ActiveIncident = {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
};

export type CommanderState = {
  activeIncident: ActiveIncident | null;
  investigation: {
    workflowId: string | null;
    status: InvestigationStatus;
    step: InvestigationStep | null;
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

export type WorkflowProgress = {
  step: InvestigationStep;
  status: "pending" | "running" | "complete" | "error";
  percent: number;
  message: string;
};

export type InvestigationResult = {
  incidentId: string;
  likelyCause: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
};
