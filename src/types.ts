export interface Incident {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  timestamp: string;
  logs: string;
  metrics: {
    cpu: string;
    memory: string;
    latency: string;
    throughput: string;
  };
}

export interface FailurePropagationLine {
  source: string;
  target: string;
  connectionState: string;
  status: "healthy" | "failing" | "degraded";
}

export interface SREStep {
  title: string;
  completed: boolean;
  details: string;
}

export interface MemoryMatch {
  eventName: string;
  similarity: number;
  similarityPercentage: string;
  recurringPatterns: string;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: "gateway" | "microservice" | "cache" | "database";
  status: "healthy" | "failing" | "degraded";
  errorCount: number;
  cpu: string;
  memory: string;
}

export interface DiagnosticResult {
  summary: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  affectedUsers: string;
  probableRootCause: string;
  suggestedFixes: string[];
  failurePropagation: FailurePropagationLine[];
  investigationSteps: SREStep[];
  memoryMatch: MemoryMatch;
  topologyNodes: TopologyNode[];
}

export interface ServiceMetrics {
  activeServices: number;
  healthyCount: number;
  failingCount: number;
  uptime: string;
  avgCpu: string;
  avgMemory: string;
  avgLatency: string;
  timestamp: string;
}
