export type ServiceName = "api-gateway" | "payments" | "checkout" | "users" | "redis" | "postgres" | "kafka";

export type ServiceSnapshot = {
  name: ServiceName;
  status: "healthy" | "degraded" | "critical";
  p95LatencyMs: number;
  errorRate: number;
  cpuPercent: number;
  memoryPercent: number;
  dependencies: ServiceName[];
};

export type Deployment = {
  id: string;
  service: ServiceName;
  version: string;
  deployedAt: string;
  summary: string;
};

const services: Record<ServiceName, ServiceSnapshot> = {
  "api-gateway": {
    name: "api-gateway",
    status: "degraded",
    p95LatencyMs: 1240,
    errorRate: 4.8,
    cpuPercent: 62,
    memoryPercent: 54,
    dependencies: ["payments", "checkout", "users"]
  },
  payments: {
    name: "payments",
    status: "critical",
    p95LatencyMs: 4210,
    errorRate: 12.6,
    cpuPercent: 71,
    memoryPercent: 68,
    dependencies: ["redis", "postgres", "kafka"]
  },
  checkout: {
    name: "checkout",
    status: "degraded",
    p95LatencyMs: 1880,
    errorRate: 5.2,
    cpuPercent: 58,
    memoryPercent: 61,
    dependencies: ["payments", "redis"]
  },
  users: {
    name: "users",
    status: "healthy",
    p95LatencyMs: 168,
    errorRate: 0.2,
    cpuPercent: 34,
    memoryPercent: 47,
    dependencies: ["postgres"]
  },
  redis: {
    name: "redis",
    status: "critical",
    p95LatencyMs: 940,
    errorRate: 9.7,
    cpuPercent: 86,
    memoryPercent: 92,
    dependencies: []
  },
  postgres: {
    name: "postgres",
    status: "healthy",
    p95LatencyMs: 92,
    errorRate: 0.1,
    cpuPercent: 48,
    memoryPercent: 59,
    dependencies: []
  },
  kafka: {
    name: "kafka",
    status: "degraded",
    p95LatencyMs: 76,
    errorRate: 0.4,
    cpuPercent: 41,
    memoryPercent: 52,
    dependencies: []
  }
};

const deployments: Deployment[] = [
  {
    id: "dep_8f31",
    service: "payments",
    version: "payments-2026.09.06.4",
    deployedAt: "2026-09-06T13:42:00.000Z",
    summary: "Changed Redis client lifecycle while moving retry handling into the payment orchestration layer."
  },
  {
    id: "dep_23a9",
    service: "checkout",
    version: "checkout-2026.09.06.2",
    deployedAt: "2026-09-06T10:18:00.000Z",
    summary: "Updated checkout validation copy and fraud-score timeout."
  }
];

const logs: Record<ServiceName, string[]> = {
  "api-gateway": [
    "WARN upstream payments exceeded 3000ms timeout",
    "ERROR POST /v1/payment upstream returned 500"
  ],
  payments: [
    "ERROR RedisTimeoutException acquiring connection from pool after 1000ms",
    "ERROR RedisTimeoutException acquiring connection from pool after 1000ms",
    "WARN payment orchestration retry 3/3 after cache lookup timeout",
    "ERROR checkout authorization failed because dependency redis was unavailable"
  ],
  checkout: ["WARN payment dependency response exceeded 1500ms", "WARN retrying payment authorization"],
  users: ["INFO profile request completed in 87ms"],
  redis: [
    "WARN connected_clients=487 maxclients=500",
    "WARN blocked_clients=31",
    "ERROR connection pool utilization reached 98 percent"
  ],
  postgres: ["INFO active_connections=84 max_connections=300"],
  kafka: ["WARN consumer_group=payment-events lag=18240", "INFO broker health check passed"]
};

export function getServiceSnapshot(service: string): ServiceSnapshot | null {
  return services[service as ServiceName] ?? null;
}

export function getRecentDeployments(service: string): Deployment[] {
  return deployments.filter((deployment) => deployment.service === service);
}

export function searchServiceLogs(service: string, query?: string): string[] {
  const serviceLogs = logs[service as ServiceName] ?? [];
  if (!query) return serviceLogs;

  const normalizedQuery = query.toLowerCase();
  return serviceLogs.filter((line) => line.toLowerCase().includes(normalizedQuery));
}

export function getDependencies(service: string): ServiceSnapshot[] {
  const snapshot = getServiceSnapshot(service);
  if (!snapshot) return [];

  return snapshot.dependencies.map((dependency) => services[dependency]);
}
