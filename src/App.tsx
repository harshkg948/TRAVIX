import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Terminal, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Radio, 
  Database, 
  Play, 
  Bot, 
  BookOpen, 
  Eye, 
  Layers, 
  CheckCircle2, 
  X, 
  Search,
  Bell,
  Sliders,
  Sparkles,
  ArrowRight,
  Upload,
  Link2,
  Globe,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DependencyGraph } from "./components/DependencyGraph";
import { ExplainableAI } from "./components/ExplainableAI";
import { IncidentMemory } from "./components/IncidentMemory";
import { SlackSimulator } from "./components/SlackSimulator";
import { PostmortemGen } from "./components/PostmortemGen";
import { Incident, DiagnosticResult, ServiceMetrics } from "./types";

const PRESET_SCENARIOS: Incident[] = [
  {
    id: "scenario_redis_deadlock",
    name: "Redis Cache Stampede & Auth DB Thread Deadlock",
    severity: "critical",
    category: "Infrastructure",
    timestamp: "May 23, 2026, 11:15 AM UTC",
    metrics: { cpu: "94.2%", memory: "98.1%", latency: "15,200ms", throughput: "240 req/sec" },
    logs: `2026-05-23T11:15:01Z [api-gateway] WARN: Upstream timeout on POST /api/v1/auth/login. Duration: 15002ms
2026-05-23T11:15:05Z [auth-service] ERROR: RedisConnectionException: Connection pool is locked. Active connections was 250 (max 250).
2026-05-23T11:15:10Z [auth-service] WARN: Cache miss fallback triggered. Falling back directly to transactional auth DB.
2026-05-23T11:15:15Z [postgres-auth-db] ERROR: FATAL: remaining connection slots are reserved for non-replication superusers`
  },
  {
    id: "scenario_payment_oom",
    name: "Kubernetes Payment-Worker Node OOM-Kill Loop",
    severity: "high",
    category: "Deployment",
    timestamp: "May 23, 2026, 10:42 AM UTC",
    metrics: { cpu: "12.5%", memory: "100.0%", latency: "20,400ms", throughput: "45 req/sec" },
    logs: `2026-05-23T10:41:50Z [payments-api] INFO: Created payment checkout intent for transaction_id=tx_88319
2026-05-23T10:42:01Z [payment-worker-v2.4.1] INFO: Processing transaction_id=tx_88319
2026-05-23T10:42:10Z [kube-scheduler] ERROR: Container payment-worker-v2.4.1 OOMKilled. exit code 137.`
  },
  {
    id: "scenario_stripe_timeout",
    name: "Stripe Payment Gateway Read Timeout Cascade",
    severity: "high",
    category: "External Dependency",
    timestamp: "May 23, 2026, 09:12 AM UTC",
    metrics: { cpu: "32.0%", memory: "48.2%", latency: "30,000ms", throughput: "12 req/sec" },
    logs: `2026-05-23T09:11:45Z [payments-api] INFO: Forwarding payment capturing request to Stripe API
2026-05-23T09:12:00Z [payments-api] ERROR: SocketTimeoutException: Read timed out calling stripe-api https://api.stripe.com/v3/charges/ch_9021
2026-05-23T09:12:25Z [payments-api] FATAL: Connection pool depleted. Thread saturation at 100%.`
  }
];

export default function App() {
  // Dynamic SRE Scenarios List (users can ingest files or fetch URLs)
  const [scenariosList, setScenariosList] = useState<Incident[]>(PRESET_SCENARIOS);

  // Ingress connectors state
  const [activeTab, setActiveTab] = useState<"catalogs" | "ingest">("catalogs");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [isFetchingLink, setIsFetchingLink] = useState<boolean>(false);
  const [linkSeverity, setLinkSeverity] = useState<"critical" | "high" | "medium" | "low">("high");
  const [fetchLinkError, setFetchLinkError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core SRE Client State
  const [activeScenario, setActiveScenario] = useState<Incident>(PRESET_SCENARIOS[0]);
  const [customLogs, setCustomLogs] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [customSeverity, setCustomSeverity] = useState<"critical" | "high" | "medium" | "low">("high");
  const [customName, setCustomName] = useState<string>("Custom Microservice Outage");
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState<boolean>(false);
  const [aiDiagnosticLoaded, setAiDiagnosticLoaded] = useState<boolean>(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string>("");

  const [globalMetrics, setGlobalMetrics] = useState<ServiceMetrics>({
    activeServices: 24,
    healthyCount: 21,
    failingCount: 3,
    uptime: "99.94%",
    avgCpu: "42.1%",
    avgMemory: "60.4%",
    avgLatency: "145ms",
    timestamp: new Date().toISOString()
  });

  const [appliedFixMessage, setAppliedFixMessage] = useState<string | null>(null);

  // SVG Sparkline dynamic fluctuation streams
  const [latencyHistory, setLatencyHistory] = useState<number[]>([145, 142, 148, 152, 141, 146, 150, 149, 144, 146, 142, 147]);
  const [cpuHistory, setCpuHistory] = useState<number[]>([42, 44, 41, 45, 43, 42, 46, 44, 41, 42, 45, 43]);

  // Loading Screen SRE logs simulator
  const loadingSteps = [
    "Reading live stack trace buffers...",
    "Correlating Kubernetes container configurations...",
    "Verifying external network socket read durations...",
    "Querying PostgreSQL active thread-locks...",
    "Retrieving similarity vectors from SRE Incident Memory Database...",
    "Synthesizing recommendations via TRAVIX AI brain..."
  ];

  // Live Metrics fetcher
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/metrics");
        const data = await response.json();
        setGlobalMetrics({
          activeServices: data.activeServices,
          healthyCount: data.healthyCount,
          failingCount: data.failingCount,
          uptime: data.uptime,
          avgCpu: data.avgCpu,
          avgMemory: data.avgMemory,
          avgLatency: data.avgLatency,
          timestamp: data.timestamp
        });

        // Fluctuating values for our animated sparklines
        const latVal = parseInt(data.avgLatency.replace("ms", ""), 10) || 145;
        const cpuVal = parseFloat(data.avgCpu.replace("%", "")) || 42;

        setLatencyHistory(prev => [...prev.slice(1), latVal]);
        setCpuHistory(prev => [...prev.slice(1), Math.floor(cpuVal)]);
      } catch (err) {
        console.warn("Failed metrics poll. Defaulting to local stream simulation.");
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Run AI Incident Analysis trigger
  const runDiagnostic = async (scenario: Incident, queryOverride?: string) => {
    setIsDiagnosticRunning(true);
    setAiDiagnosticLoaded(false);
    setAppliedFixMessage(null);

    // Dynamic loading text triggers
    let stepIndex = 0;
    setDiagnosticMessage(loadingSteps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length - 1) {
        stepIndex++;
        setDiagnosticMessage(loadingSteps[stepIndex]);
      }
    }, 800);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: scenario.logs,
          scenarioName: scenario.name,
          customPrompt: queryOverride || "",
          severity: scenario.severity,
          metrics: scenario.metrics
        })
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setDiagnostic(resData.data);
        setAiDiagnosticLoaded(true);
      }
    } catch (err) {
      console.error("Analysis failure:", err);
    } finally {
      clearInterval(stepInterval);
      setIsDiagnosticRunning(false);
    }
  };

  // Run initial diagnostic on first load
  useEffect(() => {
    runDiagnostic(activeScenario);
  }, []);

  // Handle Scenario trigger selection
  const handleSelectScenario = (sc: Incident) => {
    setActiveScenario(sc);
    setIsSandboxMode(false);
    runDiagnostic(sc);
  };

  // Handle Sandbox diagnostic run
  const handleSandboxRun = () => {
    const sandboxIncident: Incident = {
      id: "custom_sandbox",
      name: customName || "Custom Microservice Fault",
      severity: customSeverity,
      category: "Sandbox Audit",
      timestamp: "Just Now",
      logs: customLogs || "// Put code or network logs dump here",
      metrics: {
        cpu: "82.5%",
        memory: "78.4%",
        latency: "4,600ms",
        throughput: "185 req/sec"
      }
    };
    runDiagnostic(sandboxIncident, customPrompt);
  };

  // Apply historical recommendation
  const handleApplyHistoricalFix = (fixName: string) => {
    setAppliedFixMessage(`Success! SRE dispatched the validated recovery playbook matched to "${fixName}". Redeployment initiated.`);
    setTimeout(() => {
      setAppliedFixMessage(null);
    }, 6000);
  };

  const getSeverityBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase animate-pulse">CRITICAL</span>;
      case "high":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase">HIGH</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase">LOW</span>;
    }
  };

  // SVG plotting helper
  const drawSvgSparkline = (points: number[], maxVal: number) => {
    const width = 160;
    const height = 40;
    const padding = 5;
    const step = width / (points.length - 1);
    const min = Math.min(...points);
    const max = Math.max(...points) || maxVal;
    const diff = max - min || 1;

    const coordinates = points.map((val, idx) => {
      const x = idx * step;
      const y = height - padding - ((val - min) / diff) * (height - padding * 2);
      return `${x},${y}`;
    });

    return coordinates.join(" ");
  };

  // Files Drag-and-Drop + Processing handler
  const processFile = (file: File) => {
    setUploadSuccessMessage(null);
    setFetchLinkError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !content.trim()) {
        setFetchLinkError("The uploaded file contains no readable text content.");
        return;
      }

      const newId = `loaded_file_${Date.now()}`;
      const newScenario: Incident = {
        id: newId,
        name: file.name,
        severity: "high",
        category: "Uploaded File",
        timestamp: new Date().toLocaleString() + " (Local)",
        metrics: {
          cpu: (15 + Math.random() * 20).toFixed(1) + "%",
          memory: (35 + Math.random() * 25).toFixed(1) + "%",
          latency: "125ms",
          throughput: "24 req/sec"
        },
        logs: content
      };

      setScenariosList(prev => [newScenario, ...prev]);
      setActiveScenario(newScenario);
      setIsSandboxMode(false);
      setUploadSuccessMessage(`Successfully ingested "${file.name}" logs! Initiating AI RCA report...`);
      runDiagnostic(newScenario);
      setActiveTab("catalogs");
    };
    reader.onerror = () => {
      setFetchLinkError("Failed to read the uploaded SRE file.");
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Endpoint/App Link Fetch Handler
  const handleLinkFetch = async () => {
    if (!linkUrl.trim()) return;
    setIsFetchingLink(true);
    setFetchLinkError(null);
    setUploadSuccessMessage(null);

    let target = linkUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = "http://" + target;
    }

    try {
      const response = await fetch("/api/fetch-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target })
      });
      const data = await response.json();
      if (data.success) {
        const newId = `fetched_link_${Date.now()}`;
        const newScenario: Incident = {
          id: newId,
          name: data.name,
          severity: linkSeverity,
          category: "Live Link Trace",
          timestamp: new Date().toLocaleString() + " (Live)",
          metrics: data.metrics,
          logs: data.logs
        };

        setScenariosList(prev => [newScenario, ...prev]);
        setActiveScenario(newScenario);
        setIsSandboxMode(false);
        
        let displayHost = target;
        try {
          displayHost = new URL(target).hostname;
        } catch (_) {}

        setUploadSuccessMessage(`Response received! Gathered trace logs from "${displayHost}". Generating AI analysis...`);
        runDiagnostic(newScenario);
        setActiveTab("catalogs");
        setLinkUrl("");
      } else {
        setFetchLinkError(data.error || "Failed to fetch remote log trace from app link.");
      }
    } catch (err: any) {
      setFetchLinkError(err?.message || "Internal gateway client timeout connecting to target host.");
    } finally {
      setIsFetchingLink(false);
    }
  };

  // Filter incidents for searching
  const filteredScenarios = scenariosList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex flex-col justify-between selection:bg-cyan-500/30 font-sans">
      
      {/* ENTERPRISE TOP HUD BAR IN IMMERSIVE DESIGN */}
      <header className="border-b border-slate-800 bg-[#020617] sticky top-0 z-40 px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 h-auto min-h-[70px]">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black tracking-tighter text-white italic">TRAVIX<span className="text-cyan-400">.</span></span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold">Turning Chaos Into Clarity</span>
          </div>
        </div>

        {/* Global HUD metrics from Immersive UI mockup */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">
              SYSTEM HEALTH: {activeScenario.severity === "critical" ? "CRITICAL" : "DEGRADED"}
            </span>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block"></div>
          
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Live Uptime</span>
            <span className="text-white font-bold">{globalMetrics.uptime}</span>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block"></div>
          
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Active Alerts</span>
            <span className="text-red-400 font-bold">04 Critical</span>
          </div>
        </div>
      </header>

      {/* DETAILED WORKSPACE GRID */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* SIDEBAR COL: WARROOM INCIDENT HUB */}
        <div className="xl:col-span-1 space-y-6 flex flex-col">
          
          {/* Active Outage Search & Resource Connection Panel */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 font-mono mb-4 uppercase flex items-center justify-between">
              <span>SRE WARROOM INDEX</span>
              <Activity className="w-3.5 h-3.5 animate-pulse" />
            </h2>

            {/* Interactive Mode Tabs */}
            <div className="flex border-b border-slate-800 pb-2 mb-4 text-[10px] font-mono tracking-widest gap-2">
              <button 
                onClick={() => setActiveTab("catalogs")} 
                className={`pb-1 pr-2 border-b-2 font-bold cursor-pointer transition-all duration-200 ${activeTab === "catalogs" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                INCIDENTS CATALOG
              </button>
              <button 
                onClick={() => setActiveTab("ingest")} 
                className={`pb-1 px-2 border-b-2 font-bold cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${activeTab === "ingest" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                INGEST SOURCE <span className="bg-cyan-500/10 text-cyan-400 font-sans text-[8px] px-1.5 py-0.2 rounded font-black uppercase">NEW</span>
              </button>
            </div>

            {activeTab === "catalogs" ? (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search failure catalogs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-500"
                  />
                </div>

                {/* Status banner */}
                {uploadSuccessMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono leading-relaxed relative flex items-start justify-between gap-2 shadow-[0_0_10px_rgba(16,185,129,0.06)]">
                    <span className="flex-1">{uploadSuccessMessage}</span>
                    <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-500/60 hover:text-emerald-400 shrink-0 font-bold font-sans">×</button>
                  </div>
                )}

                {/* Simulated Live Feed List */}
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {filteredScenarios.length > 0 ? (
                    filteredScenarios.map((sc) => {
                      const isSelected = activeScenario.id === sc.id && !isSandboxMode;
                      return (
                        <button
                          key={sc.id}
                          onClick={() => handleSelectScenario(sc)}
                          className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex flex-col justify-between gap-1.5 ${
                            isSelected 
                              ? "bg-slate-950 border-cyan-500 glow-cyan-strong shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-[1.01]" 
                              : "bg-slate-950/25 border-slate-800/60 hover:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 uppercase">
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.severity === "critical" ? "bg-red-500 animate-pulse" : sc.severity === "high" ? "bg-amber-400" : "bg-cyan-400"}`} />
                              {sc.category}
                            </span>
                            {getSeverityBadge(sc.severity)}
                          </div>
                          <span className="text-xs font-bold text-slate-100 leading-tight block truncate select-none">{sc.name}</span>
                          <span className="text-[9px] font-mono text-slate-500 block truncate">{sc.timestamp}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 font-mono text-xs text-slate-500">
                      No matching incident scenarios found.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Error/Success metrics */}
                {uploadSuccessMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono leading-relaxed relative flex items-start justify-between gap-2">
                    <span className="flex-1">{uploadSuccessMessage}</span>
                    <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-500/60 hover:text-emerald-400 shrink-0 font-bold font-sans">×</button>
                  </div>
                )}
                {fetchLinkError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-mono leading-relaxed relative flex items-start justify-between gap-2">
                    <span className="flex-1">{fetchLinkError}</span>
                    <button onClick={() => setFetchLinkError(null)} className="text-red-500/60 hover:text-red-400 shrink-0 font-bold font-sans">×</button>
                  </div>
                )}

                {/* 1. FILE CONNECTOR */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">1. ANALYZE FILE OUTAGE</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                      isDraggingFile 
                        ? "border-cyan-400 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.15)]" 
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept=".log,.txt,.json,.xml,.yml,.yaml,.config" 
                    />
                    <Upload className={`w-6 h-6 ${isDraggingFile ? "text-cyan-400 animate-bounce" : "text-slate-500"}`} />
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 leading-tight">Drag & Drop SRE File</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-mono">Supports logs, trace exceptions, json</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-mono text-[9px] font-bold select-none py-1">
                  <div className="h-[1px] bg-slate-850 flex-1"></div>
                  <span className="px-3">OR TRACE LINK</span>
                  <div className="h-[1px] bg-slate-850 flex-1"></div>
                </div>

                {/* 2. LINK CONNECTOR */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-1">2. TRACE REMOTE URL/HOST</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="e.g., https://my-app.com/health"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-700 font-mono text-[10px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <label className="block text-[8px] text-slate-500 font-bold uppercase mb-1">SEVERITY LEVEL</label>
                      <select
                        value={linkSeverity}
                        onChange={(e: any) => setLinkSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px] text-slate-400 outline-none focus:border-cyan-500"
                      >
                        <option value="critical">Critical Outage</option>
                        <option value="high">High Stress</option>
                        <option value="medium">Medium Warn</option>
                        <option value="low">Low Metric</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleLinkFetch}
                        disabled={isFetchingLink || !linkUrl.trim()}
                        className="w-full h-[32px] rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black tracking-wider text-[10px] uppercase transition duration-200 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isFetchingLink ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" /> RUN TRACE
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SRE AI SANDBOX LOGS PLAYGROUND */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold tracking-widest text-[#c084fc] font-mono mb-3 uppercase flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-purple-400 animate-pulse" />
                DIAGNOSTIC PLAYGROUND
              </h2>
              <p className="text-[11px] text-slate-400 mb-4 font-mono leading-relaxed leading-normal">
                Input dynamic stack traces or custom logs directly below to test the automated root cause analyzer.
              </p>

              <div className="space-y-3.5">
                {/* Sandbox selector */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">PLAYGROUND STATE</span>
                  <button
                    onClick={() => {
                      setIsSandboxMode(true);
                      setCustomLogs(activeScenario.logs);
                    }}
                    className={`px-3 py-1 rounded transition text-[10px] font-bold ${
                      isSandboxMode 
                        ? "bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]" 
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Load Current logs
                  </button>
                </div>

                {/* Scenario details selection */}
                {isSandboxMode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-900"
                  >
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">INCIDENT NAME</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">SEVERITY</label>
                        <select
                          value={customSeverity}
                          onChange={(e: any) => setCustomSeverity(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300"
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">SYSTEM</label>
                        <div className="text-xs bg-slate-900 border border-slate-800 p-1.5 rounded text-slate-400 text-center">
                          AIOps Engine
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Log Entry Screen */}
                <div className="relative">
                  <textarea
                    placeholder="Enter application exception dump, connection timeouts, or deployment logs..."
                    value={isSandboxMode ? customLogs : activeScenario.logs}
                    onChange={(e) => {
                      setIsSandboxMode(true);
                      setCustomLogs(e.target.value);
                    }}
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[10px] text-slate-200 placeholder-slate-600 outline-none resize-none focus:border-purple-500"
                  />
                  {!isSandboxMode && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col justify-center items-center text-center p-4">
                      <p className="text-[10px] text-slate-400 font-mono">Currently inspecting ready-made warroom logs. Edit to override sandbox.</p>
                      <button
                        onClick={() => {
                          setIsSandboxMode(true);
                          setCustomLogs(activeScenario.logs);
                        }}
                        className="mt-2 text-[9px] font-bold font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded uppercase hover:bg-purple-500 hover:text-white transition"
                      >
                        Override & Sandbox
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Custom Instructions */}
                {isSandboxMode && (
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">ADDITIONAL AI DIRECTIVES (OPTIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. 'prioritize GCP container details'"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-purple-500 placeholder-slate-700 font-mono text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Run Button */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              {isSandboxMode ? (
                <button
                  onClick={handleSandboxRun}
                  disabled={isDiagnosticRunning}
                  className="w-full py-2.5 rounded-lg bg-purple-650 hover:bg-purple-500 text-white font-mono font-bold text-xs transition shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] bg-purple-600 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-4.5 h-4.5" /> RUN SANDBOX ANALYZER
                </button>
              ) : (
                <button
                  onClick={() => runDiagnostic(activeScenario)}
                  disabled={isDiagnosticRunning}
                  className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black uppercase tracking-wider text-xs transition duration-300 shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isDiagnosticRunning ? "animate-spin" : ""}`} /> RETRIGGER RCA ANALYSIS
                </button>
              )}
            </div>
          </div>
        </div>

        {/* WORKSPACE COLUMN MIDDLE + RIGHT (9 GRID / 4 COLS) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* TOP LIVE METRIC CARDS STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Latency Telemetry Sparkline */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 glow-cyan flex items-center justify-between shadow-[0_0_12px_rgba(34,211,238,0.06)]">
              <div>
                <span className="text-[10px] text-cyan-400 tracking-widest font-bold uppercase font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> LINE LATENCY PROFILE
                </span>
                <div className="text-2xl font-black mt-1 font-mono text-white">
                  {globalMetrics.avgLatency}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Average regional delivery time</div>
              </div>
              
              {/* Sparkline Visual */}
              <div className="w-[120px] h-[35px] shrink-0">
                <svg className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    points={drawSvgSparkline(latencyHistory, 200)}
                    className="transition-all duration-300"
                  />
                  {/* Glowing end point */}
                  <circle
                    cx="120"
                    cy={drawSvgSparkline(latencyHistory, 200).split(" ").pop()?.split(",")[1]}
                    r="4"
                    fill="#22d3ee"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            </div>

            {/* CPU Telemetry Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 glow-green flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 tracking-widest font-bold uppercase font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> AGGREGATED CLIENT STATE
                </span>
                <div className="text-2xl font-black mt-1 font-mono text-emerald-400">
                  {globalMetrics.avgCpu}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Under collective virtualization load</div>
              </div>

              {/* Sparkline Visual */}
              <div className="w-[120px] h-[35px] shrink-0">
                <svg className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={drawSvgSparkline(cpuHistory, 100)}
                  />
                  {/* Glowing end point */}
                  <circle
                    cx="120"
                    cy={drawSvgSparkline(cpuHistory, 100).split(" ").pop()?.split(",")[1]}
                    r="4"
                    fill="#34d399"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            </div>

            {/* Alert Fatigue deflection metrics */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 glow-amber flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <span className="text-[10px] text-amber-500 tracking-widest font-bold uppercase font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> ALERT FATIGUE DEFLECTOR
                </span>
                <div className="text-2xl font-black mt-1 font-mono text-amber-400">
                  94.8% SLA Auto-Match
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 font-sans">Reducing SRE alert panic fatigue</div>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-300">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
            </div>
          </div>

          {/* DIAGNOSTIC WORK ENGINE PORTAL */}
          <AnimatePresence mode="wait">
            
            {/* LOADING STATE ANIMATION */}
            {isDiagnosticRunning && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-12 text-center flex flex-col justify-center items-center gap-6 min-h-[460px] relative overflow-hidden"
              >
                {/* Embedded futuristic background matrix scan lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                
                {/* Outer dynamic loader */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin absolute" />
                  <div className="w-16 h-16 rounded-full border border-purple-500/30 animate-spin-slow absolute" style={{ animationDirection: "reverse" }} />
                  <Bot className="w-8 h-8 text-cyan-400 animate-pulse relative z-10" />
                </div>

                <div className="space-y-2 max-w-lg z-10">
                  <h3 className="text-sm font-bold font-mono tracking-widest text-[#a5f3fc]">COMPUTING AI RCA PATHS</h3>
                  <p className="text-xs text-slate-400 font-mono animate-pulse italic mt-2">
                    "{diagnosticMessage}"
                  </p>
                </div>

                {/* Staggered progress track indicators */}
                <div className="flex gap-2.5 mt-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#c084fc] animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </motion.div>
            )}

            {/* FULLY ANALYZED WORKSPACE DISPLAY */}
            {!isDiagnosticRunning && aiDiagnosticLoaded && diagnostic && (
              <motion.div
                key="workspace-results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* PLAYBOOK DISPATCH NOTIFIER */}
                {appliedFixMessage && (
                  <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl flex items-center justify-between text-emerald-100 text-xs font-mono glow-green gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{appliedFixMessage}</span>
                    </div>
                    <button onClick={() => setAppliedFixMessage(null)} className="text-emerald-400 hover:text-emerald-200">
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>
                )}

                {/* DYNAMIC TOPOLOGY DEPENDENCY MAP */}
                <DependencyGraph 
                  nodes={diagnostic.topologyNodes}
                  propagation={diagnostic.failurePropagation}
                  probableRootCause={diagnostic.probableRootCause}
                />

                {/* GRID FOR INTEL CORE + COMPREHENSION PATH */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* CORE AI ANALYTICS INTEL PANEL */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 glow-red relative flex flex-col justify-between shadow-[0_0_12px_rgba(239,68,68,0.05)]">
                    <div>
                      {/* Section heading */}
                      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
                        <div>
                          <h2 className="text-sm font-bold tracking-widest text-red-500 font-mono flex items-center gap-2">
                            <Bot className="w-4 h-4 text-red-500 animate-pulse" />
                            AI INCIDENT INTELLIGENCE
                          </h2>
                          <p className="text-xs text-slate-400 mt-1">SRE conversational diagnosis & root cause correlation</p>
                        </div>
                        {getSeverityBadge(diagnostic.severity)}
                      </div>

                      {/* Main explanation body */}
                      <div className="font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800/70 p-4 rounded-lg mb-5 space-y-4">
                        <p className="font-sans text-slate-200 text-xs leading-relaxed">
                          {diagnostic.summary}
                        </p>
                        <div className="pt-2 border-t border-slate-850/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                          <div>
                            <span className="text-slate-400 block font-bold">CAUSE CULPRIT:</span>
                            <span className="text-red-300 font-extrabold text-[11px] block mt-0.5">{diagnostic.probableRootCause}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold">AFFECTED RADIUS:</span>
                            <span className="text-slate-200 font-semibold block mt-0.5">{diagnostic.affectedUsers}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resolution actions Checklist */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase block text-cyan-455">RECOMMENDED REMEDY ACTION</span>
                        <div className="space-y-2">
                          {diagnostic.suggestedFixes.map((fix, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3.5 font-mono text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300 hover:border-slate-700 transition">
                              <code className="text-cyan-300 select-all overflow-x-auto whitespace-pre">{fix}</code>
                              <button
                                onClick={() => {
                                  setAppliedFixMessage(`Success! SRE executed automated terminal bash command: "${fix}". Checking service indicators...`);
                                  setTimeout(() => setAppliedFixMessage(null), 5000);
                                }}
                                className="text-[9px] shrink-0 font-bold bg-[#111827] border border-slate-850 text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 hover:shadow-[0_0_10px_rgba(34,211,238,0.15)] px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition cursor-pointer"
                              >
                                Execute Fix
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-500">
                      <span>RAG model: gemini-3.5-flash</span>
                      <span>Execution index: SECURE-99</span>
                    </div>
                  </div>

                  {/* HOW TRAVIX INVESTIGATED THIS */}
                  <ExplainableAI 
                    steps={diagnostic.investigationSteps}
                    confidenceScore={diagnostic.confidence}
                  />

                </div>

                {/* GRID FOR MEMORY KERNEL + WEBHOOK SIMULATION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* INDEX MEMORY COMPONENT */}
                  <IncidentMemory 
                    memory={diagnostic.memoryMatch}
                    onApplyHistoricalFix={handleApplyHistoricalFix}
                  />

                  {/* WEBHOOK DISPATCH SIMULATOR */}
                  <SlackSimulator 
                    incidentName={activeScenario.name}
                    severity={diagnostic.severity}
                    summary={diagnostic.summary}
                    probableRootCause={diagnostic.probableRootCause}
                  />

                </div>

                {/* POSTMORTEM DOWNLOAD GENERATOR */}
                <PostmortemGen 
                  diagnostic={diagnostic}
                  incidentName={activeScenario.name}
                />

              </motion.div>
            )}
          </AnimatePresence>

          {/* EXPLANATORY INFORMATION ABOUT ARCHITECTURE */}
          <div className="p-5 border border-slate-800 bg-slate-900/10 rounded-xl flex items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono tracking-widest text-[#a5f3fc] flex items-center gap-1.5 uppercase">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Operational Architecture
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono max-w-2xl">
                TRAVIX coordinates with Kubernetes container schedulers, distributed microservices (REST/gRPC interfaces), Kafka alert queues, and Redis memory nodes to isolate anomalous behavior. System telemetry is backed by Elasticsearch cluster diagnostics.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 whitespace-nowrap font-mono shrink-0 hidden md:block">
              SLA Compliance: 99.99% Guaranteed
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER METADATA */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
        <div>
          <span>© 12026 TRAVIX SRE Systems Co. </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-500 italic"> "Turning Chaos Into Clarity."</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-cyan-400">Security Audit logs</a>
          <span className="text-slate-800">•</span>
          <a href="#" className="hover:text-cyan-400">Slack Webhooks</a>
          <span className="text-slate-800">•</span>
          <a href="#" className="hover:text-cyan-400">Prometheus Exporter</a>
        </div>
      </footer>

    </div>
  );
}
