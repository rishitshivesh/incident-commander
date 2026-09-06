import { routeAgentRequest } from "agents";
import { IncidentCommanderAgent } from "./incident-agent";
import { IncidentInvestigationWorkflow } from "./workflows/investigation";

export { IncidentCommanderAgent, IncidentInvestigationWorkflow };

export default {
  async fetch(request: Request, env: Env) {
    const response = await routeAgentRequest(request, env);
    return response ?? new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
