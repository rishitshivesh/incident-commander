import { routeAgentRequest } from "agents";

export { IncidentCommanderAgent } from "./server/incident-agent";
export { IncidentInvestigationWorkflow } from "./server/workflows/investigation";

export default {
  async fetch(request: Request, env: Env) {
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
