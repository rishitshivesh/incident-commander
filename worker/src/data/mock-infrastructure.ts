type ServiceStatus = "healthy" | "degraded" | "critical";

type ServiceSnapshot = {
  name: string;
  status: ServiceStatus;
  p95Ms: number;
  errorRate: number;
  cpuPercent: number;
  memoryPercent: number;
};

type Deployment = {
  version: string;
  deployedAt: string;
  summary: string;
};

const services: Record<string, ServiceSnapshot> = {
  payments: { name: "payments", status: "critical", p95Ms: 4200, errorRate: 8.7, cpuPercent: 61, memoryPercent: 72 },
  checkout: { name: "checkout", status: "degraded", p95Ms: 1300, errorRate: 2.1, cpuPercent: 48, memoryPercent: 66 },
  redis: { name: "redis", status: "critical", p95Ms: 890, errorRate: 4.2, cpuPercent: 74, memoryPercent: 96 },
  postgres: { name: "postgres", status: "healthy", p95Ms: 42, errorRate: 0.1, cpuPercent: 39, memoryPercent: 58 },
  kafka: { name: "kafka", status: "healthy", p95Ms: 31, errorRate: 0.05, cpuPercent: 34, memoryPercent: 51 }
};

const dependencies: Record<string, string[]> = {
  payments: ["redis", "postgres", "kafka"],
  checkout: ["payments", "redis"]
};

const deployments: Record<string, Deployment[]> = {
  payments: [
    { version: "payments-2026.09.06.3", deployedAt: "2026-09-06T13:42:00.000Z", summary: "Refactor Redis client lifecycle and payment cache invalidation" },
    { version: "payments-2026.09.05.7", deployedAt: "2026-09-05T18:10:00.000Z", summary: "Add payment audit metadata" }
  ],
  checkout: [{ version: "checkout-2026.09.06.1", deployedAt: "2026-09-06T10:15:00.000Z", summary: "Update checkout experiment allocation" }]
};

const logs: Record<string, string[]> = {
  payments: [
    "14:03:12 ERROR RedisTimeoutException: timed out acquiring connection after 500ms",
    "14:03:14 WARN redis pool utilization=98% active=196 idle=4",
    "14:03:16 ERROR request POST /payments failed after 4217ms",
    "14:03:18 ERROR RedisTimeoutException: timed out acquiring connection after 500ms"
  ],
  redis: [
    "14:03:10 WARN connected_clients=198 maxclients=200",
    "14:03:14 WARN pool utilization=99%",
    "14:03:19 INFO evicted_keys=0 memory_usage=96%"
  ],
  postgres: ["14:03:15 INFO active_connections=42 max_connections=200", "14:03:18 INFO p95_query_ms=39"]
};

export function getServiceSnapshot(service: string) {
  return services[service.toLowerCase()] ?? null;
}

export function getDependencies(service: string) {
  return (dependencies[service.toLowerCase()] ?? []).map((name) => services[name]).filter(Boolean);
}

export function getRecentDeployments(service: string) {
  return deployments[service.toLowerCase()] ?? [];
}

export function searchServiceLogs(service: string, query?: string) {
  const serviceLogs = logs[service.toLowerCase()] ?? [];
  if (!query) return serviceLogs;
  const normalizedQuery = query.toLowerCase();
  return serviceLogs.filter((line) => line.toLowerCase().includes(normalizedQuery));
}
