import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily/safely
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to simulated diagnostic engine.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// Global System Metrics (Mock dynamic baseline telemetry)
let liveTelemetry = {
  activeServices: 24,
  healthyCount: 21,
  failingCount: 3,
  uptime: "99.94%",
  avgCpu: "42.5%",
  avgMemory: "61.2%",
  avgLatency: "148ms"
};

// Seed Outage Scenarios
const PRESET_SCENARIOS = {
  scenario_redis_deadlock: {
    id: "scenario_redis_deadlock",
    name: "Redis Cache Stampede & Auth DB Thread Deadlock",
    severity: "critical",
    category: "Infrastructure",
    timestamp: "May 23, 2026, 11:15 AM UTC",
    logs: `
2026-05-23T11:15:01Z [api-gateway] WARN: Upstream timeout on POST /api/v1/auth/login. Duration: 15002ms
2026-05-23T11:15:02Z [auth-service] INFO: Received login request for user_id=982183
2026-05-23T11:15:05Z [auth-service] ERROR: RedisConnectionException: Connection pool is locked. Active connections was 250 (max 250).
2016-05-23T11:15:10Z [auth-service] WARN: Cache miss fallback triggered. Falling back directly to transactional PostgreSQL authentication repository.
2026-05-23T11:15:15Z [postgres-auth-db] ERROR: FATAL: remaining connection slots are reserved for non-replication superuser connections
2026-05-23T11:15:16Z [auth-service] FATAL: Connection pool exhausted. DB connection timeout on auth-db. StackTrace: org.postgresql.util.PSQLException: Connection refused.
2026-05-23T11:15:20Z [redis-auth-cache] COMMAND: Keys expired. eviction-policy was 'volatile-lru'. Current state: Out of Memory. Memory limit exceeded.
    `,
    metrics: {
      cpu: "94.2%",
      memory: "98.1%",
      latency: "15,200ms",
      throughput: "240 req/sec"
    }
  },
  scenario_payment_oom: {
    id: "scenario_payment_oom",
    name: "Kubernetes Payment-Worker Node OOM-Kill Loop",
    severity: "high",
    category: "Deployment",
    timestamp: "May 23, 2026, 10:42 AM UTC",
    logs: `
2026-05-23T10:41:50Z [payments-api] INFO: Created payment checkout intent for transaction_id=tx_88319
2026-05-23T10:41:55Z [payments-api] WARN: Push to worker queue 'payment-process' took 5210ms (slow-mode)
2026-05-23T10:42:01Z [payment-worker-v2.4.1] INFO: Processing transaction_id=tx_88319
2026-05-23T10:42:05Z [payment-worker-v2.4.1] DEBUG: GC collection failed to reclaim heap memory. Current heap: 508MB / 512MB
2026-05-23T10:42:10Z [kube-scheduler] ERROR: Container payment-worker-v2.4.1 OOMKilled. exit code 137.
2026-05-23T10:42:11Z [kube-node-3] WARNING: Pod payments-worker-88df-vc92 crashed. Status: CrashLoopBackOff. Re-starting...
2026-05-23T10:42:30Z [payments-api] ERROR: QueuePublishTimeoutException: Failed to publish transaction after 20000ms. Job rejected.
    `,
    metrics: {
      cpu: "12.5%",
      memory: "100.0%",
      latency: "20,400ms",
      throughput: "45 req/sec"
    }
  },
  scenario_stripe_timeout: {
    id: "scenario_stripe_timeout",
    name: "Stripe Payment Gateway Read Timeout Cascade",
    severity: "high",
    category: "External Dependency",
    timestamp: "May 23, 2026, 09:12 AM UTC",
    logs: `
2026-05-23T09:11:45Z [payments-api] INFO: Forwarding payment capturing request to Stripe API: capture_id=ch_9021
2026-05-23T09:11:55Z [payments-api] WARN: Connection active with client. Thread-ID: 1420 is blocked waiting on socketRead.
2026-05-23T09:12:00Z [payments-api] ERROR: SocketTimeoutException: Read timed out calling stripe-api https://api.stripe.com/v3/charges/ch_9021
2026-05-23T09:12:01Z [payments-api] INFO: Retrying capture for ID ch_9021. Attempt 2 of 3.
2026-05-23T09:12:16Z [payments-api] ERROR: SocketTimeoutException: Read timed out calling stripe-api (Attempt 2)
2026-05-23T09:12:20Z [api-gateway] ERROR: HTTP 504 Gateway Timeout on POST /api/payment/complete
2026-05-23T09:12:25Z [payments-api] FATAL: Connection pool depleted. Thread saturation at 100%. Max active requests (500) reached. Services degraded.
    `,
    metrics: {
      cpu: "32.0%",
      memory: "48.2%",
      latency: "30,000ms",
      throughput: "12 req/sec"
    }
  }
};

// API routes first
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", system: "TRAVIX", timestamp: new Date().toISOString() });
});

// Serve metrics and stats
app.get("/api/metrics", (req, res) => {
  // Add mild drift for futuristic feel
  const currentCpu = (40 + Math.random() * 10).toFixed(1) + "%";
  const currentMem = (60 + Math.random() * 5).toFixed(1) + "%";
  const currentLatency = Math.floor(140 + Math.random() * 20) + "ms";

  res.json({
    ...liveTelemetry,
    avgCpu: currentCpu,
    avgMemory: currentMem,
    avgLatency: currentLatency,
    timestamp: new Date().toISOString()
  });
});

// App Link / Health Check remote fetch trace extractor
app.post("/api/fetch-link", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, error: "Missing valid url parameter" });
  }

  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "http://" + targetUrl;
  }

  const timestamp = new Date().toISOString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TRAVIX-SRE-Intelligence-Probe/3.1",
        "Accept": "application/json, text/plain, */*",
      }
    });
    const duration = Date.now() - startTime;
    clearTimeout(timeoutId);

    let responseBody = "";
    const contentType = response.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        const text = await response.text();
        responseBody = text.substring(0, 800) + (text.length > 800 ? "\n...[TRUNCATED RESPONSE BODY]" : "");
      }
    } catch (e) {
      responseBody = "[Binary response content or could not decode stream]";
    }

    const headersList: string[] = [];
    response.headers.forEach((value, name) => {
      headersList.push(`${name}: ${value}`);
    });

    const mockLogs = `${timestamp} [sre-probe] INFO: Initiating health check trace request to custom App Link: ${targetUrl}
${timestamp} [sre-probe] INFO: Connection established. Target resolved. Latency: ${duration}ms
${timestamp} [sre-probe] STATUS: Received HTTP status code ${response.status} ${response.statusText}
${timestamp} [sre-probe] HEADERS: 
  ${headersList.slice(0, 10).join("\n  ")}
${timestamp} [sre-probe] PAYLOAD_SNEAK_PEEK:
${responseBody || "Empty Response body"}`;

    let resolvedHostname = targetUrl;
    try {
      resolvedHostname = new URL(targetUrl).hostname;
    } catch (_) {}

    res.json({
      success: true,
      logs: mockLogs.trim(),
      metrics: {
        cpu: (10 + Math.random() * 20).toFixed(1) + "%",
        memory: (45 + Math.random() * 15).toFixed(1) + "%",
        latency: `${duration}ms`,
        throughput: "1 req/sec"
      },
      name: `Link Trace: ${resolvedHostname}`,
      status: response.status
    });

  } catch (err: any) {
    clearTimeout(timeoutId);
    const duration = 6000;
    const errorMsg = err.name === "AbortError" ? "HTTP Connection request timed out (Limit: 6000ms)" : err.message || "Failed to make outbound socket connection";

    // Format realistic failure diagnostics log dump
    const mockLogs = `${timestamp} [sre-probe] INFO: Initiating health check trace request to custom App Link: ${targetUrl}
${timestamp} [sre-probe] WARN: Client wait timeout buffer reached. Duration context: ${duration}ms
${timestamp} [sre-probe] ERROR: NetworkFetchException: Outbound connection failed on remote host.
${timestamp} [sre-probe] ERROR: Details: ${errorMsg}
${timestamp} [sre-probe] DIAGNOSTIC: Remote host is either offline, blocking external secure SRE tracer requests, or undergoing a major network route blackout.`;

    let resolvedHostname = targetUrl;
    try {
      resolvedHostname = new URL(targetUrl).hostname;
    } catch (_) {}

    res.json({
      success: true,
      logs: mockLogs.trim(),
      metrics: {
        cpu: "99.9%",
        memory: "95.0%",
        latency: "Timeout (6,000ms)",
        throughput: "0 req/sec"
      },
      name: `Failing Connection: ${resolvedHostname}`,
      status: 504
    });
  }
});

// Dynamic AI Diagnostic Endpoint
app.post("/api/analyze", async (req, res) => {
  const { logs, scenarioName, customPrompt, severity, metrics, systemState } = req.body;

  const contentLogs = logs || PRESET_SCENARIOS.scenario_redis_deadlock.logs;
  const contentName = scenarioName || "Unknown Microservice Fault";
  const contentSeverity = severity || "high";
  const contentMetrics = metrics ? JSON.stringify(metrics) : JSON.stringify(PRESET_SCENARIOS.scenario_redis_deadlock.metrics);

  const promptText = `
    Conduct an expert site reliability engineering (SRE) diagnostic and root cause analysis (RCA) on the following alert/system logs:
    
    SYSTEM / INCIDENT IDENTIFIER: ${contentName}
    DECLARED SEVERITY: ${contentSeverity}
    SYSTEM TELEMETRY METRICS: ${contentMetrics}
    
    Incident Logs Dump:
    ${contentLogs}

    ${customPrompt ? `ADDITIONAL USER QUERY/INPUT: ${customPrompt}` : ""}

    Act as the core artificial intelligence operations (AIOps) brain of TRAVIX, an enterprise incident responder. 
    Analyze the raw log lines and metric data to formulate a comprehensive troubleshooting tree.
    Return the response as a valid JSON object matching this schema. Be highly descriptive, deep, realistic, and expert.
    
    JSON Schema fields:
    {
      "summary": "Deep, conversational, and easy to understand explanation of what happened in plain English. Frame it beautifully, explaining the sequence of events and clear technical links.",
      "severity": "critical" | "high" | "medium" | "low",
      "confidence": Number (SRE confidence index from 0 to 100),
      "affectedUsers": "Reasoned estimate of users impacted (e.g. '8,400 active login sessions aborted')",
      "probableRootCause": "Brief identifier of the exact culprit service or node (e.g. 'Postgres Auth Database / Connection Pool Exhaustion')",
      "suggestedFixes": ["list of complete, real commands or SRE actions of what the SRE should execute right now to fix the site (e.g. 'pg_terminate_backend()', 'kubectl rollout roll', etc.')"],
      "failurePropagation": [
        { "source": "Service A", "target": "Service B", "connectionState": "API Request", "status": "failing" | "healthy" | "degraded" }
      ],
      "investigationSteps": [
        { "title": "Verification Check description", "completed": true, "details": "How we investigated and what we observed in logs/DB locks." }
      ],
      "memoryMatch": {
        "eventName": "What prior real-world incident this resembles from incident history database",
        "similarity": Number (0-100),
        "similarityPercentage": "e.g. '94%'",
        "recurringPatterns": "Description of why they look similar and how to avoid the root cause long-term."
      },
      "topologyNodes": [
        { "id": "node_1", "name": "Frontend", "type": "gateway" | "microservice" | "cache" | "database", "status": "healthy" | "failing" | "degraded", "errorCount": 0, "cpu": "30%", "memory": "40%" }
      ]
    }

    Notes for fields:
    - Include at least 4 key infrastructure nodes in 'topologyNodes' representing the sequence of the system, matching the logs, with accurate status, CPU/Mem spikes.
    - Set proper statuses ('failing', 'degraded') for the parts of the architecture that are struggling, and 'healthy' for surviving components.
    - Provide at least 5 realistic, structured investigative steps explaining how TRAVIX analyzed logs, checked deployments, correlated latency spikes, compared triggers, and reached conclusions.
    - Ensure your JSON matches this requested format strictly.
  `;

  try {
    const ai = getGeminiClient();
    if (process.env.GEMINI_API_KEY) {
      const maxRetries = 3;
      let delayMs = 1000;
      let responseText = "";
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[TRAVIX SRE] Gemini API request: Attempt ${attempt} of ${maxRetries}`);
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptText,
            config: {
              responseMimeType: "application/json"
            }
          });
          responseText = response.text || "{}";
          lastError = null;
          break; // Succeeded!
        } catch (err: any) {
          lastError = err;
          const errMsg = err.message || String(err);
          const is503Status = err.status === "UNAVAILABLE" || 
                              err.status === 503 || 
                              err.code === 503 || 
                              errMsg.includes("503") || 
                              errMsg.includes("demand") || 
                              errMsg.includes("UNAVAILABLE") ||
                              errMsg.includes("Service Unavailable");

          if (is503Status && attempt < maxRetries) {
            console.warn(`[TRAVIX SRE] Gemini API got 503/Unavailable (Demand Spike). Backing off for ${delayMs}ms before retrying...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // exponential delay expansion
          } else {
            // Fatal error or reached max retries
            throw err;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      const diagnosticData = JSON.parse(responseText.trim());
      res.json({ success: true, data: diagnosticData, liveFetched: true });
    } else {
      // Return beautiful, robust offline fallback content if api key is missing
      console.warn("Using offline simulated diagnostic generation.");
      const mockResult = generateMockDiagnostic(contentName, contentSeverity, contentLogs);
      res.json({ success: true, data: mockResult, liveFetched: false, highDemandFallback: false });
    }
  } catch (err: any) {
    console.error("Gemini API request failed final:", err);
    // Graceful fallback representation
    const fallbackMock = generateMockDiagnostic(contentName, contentSeverity, contentLogs);
    res.json({
      success: true,
      data: fallbackMock,
      liveFetched: false,
      highDemandFallback: true,
      error: err.message || "Failed to call live Gemini AI core."
    });
  }
});

// Helper for high-fidelity fallback generation if key is absent or fails
function generateMockDiagnostic(name: string, severity: string, logs: string): any {
  const isRedis = logs.toLowerCase().includes("redis") || name.toLowerCase().includes("redis");
  const isOOM = logs.toLowerCase().includes("oom") || logs.toLowerCase().includes("heap");
  const isStripe = logs.toLowerCase().includes("stripe");

  if (isRedis) {
    return {
      summary: "TRAVIX detected a cache stampede immediately causing connection exhaustion on our primary authentication server. The Redis Auth cache ran out of physical memory and halted active evictions, resulting in downstream threads cascading back to the primary transactional PostgreSQL database. The DB received over 2,400 concurrent connection requests, exhausting its thread pool and locking authentication capabilities entirely.",
      severity: "critical",
      confidence: 96,
      affectedUsers: "Approximately 8,450 users attempting authentication services",
      probableRootCause: "Redis Out Of Memory & PostgreSQL Max Connection Threshold Reached",
      suggestedFixes: [
        "Re-configure Redis eviction-policy to 'allkeys-lru' immediately: redis-cli config set maxmemory-policy allkeys-lru",
        "Kill sleeping background PostgreSQL connection locks: SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';",
        "Scale 'auth-service' pool limits to throttle fallback requests gracefully under cache outages."
      ],
      failurePropagation: [
        { source: "Frontend Router", target: "API Gateway Cluster", connectionState: "HTTPS Payload", status: "degraded" },
        { source: "API Gateway Cluster", target: "Auth Service Core", connectionState: "gRPC", status: "failing" },
        { source: "Auth Service Core", target: "Redis cache node-1", connectionState: "Redis socket", status: "failing" },
        { source: "Auth Service Core", target: "PostgreDB Auth Cluster", connectionState: "TCP Pooling", status: "failing" }
      ],
      investigationSteps: [
        { title: "Verifying Deployment Ledger", completed: true, details: "Verified Kubernetes replica setups. No recent deploys triggered directly in the last 60 minutes." },
        { title: "Analyzing Anomaly Correlator", completed: true, details: "Detected sudden latency spikes up to 15,200ms on Auth endpoints matching Redis eviction failure." },
        { title: "Database Query Inspector", completed: true, details: "PostgreSQL active connection slots reached cgroup limits of 100/100 slots, throwing fatal connection warnings." },
        { title: "Historical Incident Alignment", completed: true, details: "Cross-correlated logs against previous outages. Found a 92% footprint similarity match." },
        { title: "Rollback Simulation", completed: true, details: "Generated ideal configuration patches for connection retry backoff logic." }
      ],
      memoryMatch: {
        eventName: "The March 14 database thread saturation incident",
        similarity: 92,
        similarityPercentage: "92%",
        recurringPatterns: "Occurs under flash-sale campaign load when cache invalidations strike simultaneously. Solution requires circuit breakers on the direct database path."
      },
      topologyNodes: [
        { id: "front", name: "Frontend Loadbalancer", type: "gateway", status: "degraded", errorCount: 142, cpu: "18%", memory: "30%" },
        { id: "api", name: "API Gateway Engine", type: "gateway", status: "degraded", errorCount: 310, cpu: "42%", memory: "45%" },
        { id: "auth", name: "Auth Service Node", type: "microservice", status: "failing", errorCount: 1120, cpu: "94%", memory: "98%" },
        { id: "redis", name: "Redis Memory Cache", type: "cache", status: "failing", errorCount: 450, cpu: "85%", memory: "99%" },
        { id: "postgres", name: "PostgreSQL Auth DB", type: "database", status: "failing", errorCount: 220, cpu: "98%", memory: "89%" }
      ]
    };
  } else if (isOOM) {
    return {
      summary: "Kubernetes Payment-Worker container encountered a heap exhaustion leak on gcr.io/travix/payment-worker:v2.4.1. Under transaction loading, unreleased telemetry arrays saturated memory constraints, breaching the hard 512MB cgroup limit. The kernel scheduler dispatched a SIGKILL (exit code 137). Kubernetes was caught inside an endless restart crashloop, causing backlogs to accumulate in our queuing engine.",
      severity: "high",
      confidence: 94,
      affectedUsers: "1,200 active checkouts queued or delayed",
      probableRootCause: "gcr.io/travix/payment-worker Kubernetes OOM Crashloop (Memory Leak)",
      suggestedFixes: [
        "Rollback the payments deployment to stable release v2.4.0: kubectl rollout undo deployment/payments-worker",
        "Set safe heap size parameter for the node runner: node --max-old-space-size=400 index.js",
        "Flush queue backup to prevent processor load spikes during restart."
      ],
      failurePropagation: [
        { source: "API Gateway Cluster", target: "Payments API Service", connectionState: "REST", status: "healthy" },
        { source: "Payments API Service", target: "RabbitMQ Processing Queue", connectionState: "AMQP Broker", status: "degraded" },
        { source: "RabbitMQ Processing Queue", target: "Payment Worker v2.4.1", connectionState: "Task Worker", status: "failing" }
      ],
      investigationSteps: [
        { title: "Verifying Deployment Ledger", completed: true, details: "Identified deployment checkin of tag payments-worker:v2.4.1 completed 27 minutes ago." },
        { title: "Pod Crash Correlator", completed: true, details: "Identified cgroup kernel kills. Pod reported Exit Code 137 (Out Of Memory)." },
        { title: "Broker Backlog Counter", completed: true, details: "RabbitMQ queue 'payment-process' backup count increased from 10 to 450 jobs in 5 minutes." },
        { title: "Simulated Deployment Reversal", completed: true, details: "Prepared and formatted clean rollback configuration script." }
      ],
      memoryMatch: {
        eventName: "The Q2 Kubernetes Worker Memory Leak Incident",
        similarity: 88,
        similarityPercentage: "88%",
        recurringPatterns: "Recurring issue when unclosed database cursor loops occur on updated node driver code. Recommend enforcing strict memory alert thresholds on Grafana."
      },
      topologyNodes: [
        { id: "api", name: "Payments API Core", type: "microservice", status: "healthy", errorCount: 4, cpu: "14%", memory: "38%" },
        { id: "queue", name: "RabbitMQ Message Broker", type: "cache", status: "degraded", errorCount: 18, cpu: "40%", memory: "82%" },
        { id: "worker", name: "Payment Worker v2.4.1", type: "microservice", status: "failing", errorCount: 889, cpu: "12%", memory: "100%" },
        { id: "payments_db", name: "Payments PostgreSQL", type: "database", status: "healthy", errorCount: 0, cpu: "8%", memory: "41%" }
      ]
    };
  } else {
    // Default / External Gateway timeout
    return {
      summary: "Critical network latency bottleneck and thread starvation triggered on the Stripe outward payment gateway connectivity layer. Multiple sequential capture invocations encountered a socket read timeout at api.stripe.com. Internal thread blocks piled up waiting for SocketRead, completely locking active web pool processes, degrading response times down to 30,000ms and saturated API workers.",
      severity: "high",
      confidence: 89,
      affectedUsers: "approx. 430 checkout sessions threw gateway timeouts",
      probableRootCause: "Stripe Payment Provider HTTP Socket Wait Saturation",
      suggestedFixes: [
        "Modify HTTP Client timeouts to close hanging connections after 4000ms max timeout limit.",
        "Equip payments-api connection pool with a resilient Circuit Breaker using fallback mocks.",
        "Simulate Stripe Webhook retry fallback triggers to let transactions process asynchronously."
      ],
      failurePropagation: [
        { source: "API Gateway Cluster", target: "Payments API Service", connectionState: "REST Endpoint", status: "degraded" },
        { source: "Payments API Service", target: "Stripe API Network Gateway", connectionState: "HTTPS Outgoing", status: "failing" }
      ],
      investigationSteps: [
        { title: "External API Health Verification", completed: true, details: "Verified Stripe's central status. Socket timeouts originate specifically on the transit route network." },
        { title: "Network Path Diagnostics", completed: true, details: "Simulated raw packet traceroute. Detected 72% packet loss on outbound edge switch." },
        { title: "Thread Saturation Monitor", completed: true, details: "Web worker active thread pool saturated to 500/500 active threads, causing 504 gateway failures." }
      ],
      memoryMatch: {
        eventName: "The Dec 2025 Stripe Regional Network Degradation",
        similarity: 95,
        similarityPercentage: "95%",
        recurringPatterns: "Caused by underlying ISP routing problems on regional servers. Best practice is to run an active asynchronous buffer queue during network failures."
      },
      topologyNodes: [
        { id: "gateway", name: "API Gateway Edge", type: "gateway", status: "degraded", errorCount: 189, cpu: "14%", memory: "45%" },
        { id: "payment", name: "Payments API Service", type: "microservice", status: "degraded", errorCount: 412, cpu: "89%", memory: "55%" },
        { id: "stripe", name: "Stripe API (api.stripe.com)", type: "database", status: "failing", errorCount: 304, cpu: "0%", memory: "0%" }
      ]
    };
  }
}

// Simulated User Live Interaction / Slack alert routing
app.post("/api/simulate-channels", (req, res) => {
  const { channel, incidentName, severity, message } = req.body;
  res.json({
    success: true,
    channel,
    timestamp: new Date().toISOString(),
    formattedMessage: `🚨 *[TRAVIX INCIDENT DETECTED]*severity: *${severity?.toUpperCase()}* \n*Incident:* ${incidentName}\n*Diagnosis:* ${message}\n_Resolving actions initiated automatically by AI brain._`
  });
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TRAVIX SERVER] Running on port http://0.0.0.0:${PORT}`);
  });
}

startServer();
