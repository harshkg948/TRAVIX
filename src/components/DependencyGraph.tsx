import { TopologyNode, FailurePropagationLine } from "../types";
import { Server, ShieldAlert, Cpu, HardDrive, Database, Zap, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface DependencyGraphProps {
  nodes: TopologyNode[];
  propagation: FailurePropagationLine[];
  probableRootCause: string;
}

export function DependencyGraph({ nodes, propagation, probableRootCause }: DependencyGraphProps) {
  // Determine if a node is the root culprit
  const isCulprit = (nodeName: string) => {
    if (!probableRootCause) return false;
    const lowerRC = probableRootCause.toLowerCase();
    const lowerName = nodeName.toLowerCase();
    return lowerRC.includes(lowerName) || lowerName.includes(lowerRC);
  };

  const getNodeIcon = (type: string, status: string) => {
    const colorClass = 
      status === "failing" 
        ? "text-red-400" 
        : status === "degraded" 
        ? "text-amber-400" 
        : "text-emerald-400";

    switch (type) {
      case "gateway":
        return <ShieldAlert className={`w-6 h-6 ${colorClass}`} />;
      case "cache":
        return <Zap className={`w-6 h-6 ${colorClass}`} />;
      case "database":
        return <Database className={`w-6 h-6 ${colorClass}`} />;
      default:
        return <Server className={`w-6 h-6 ${colorClass}`} />;
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 glow-cyan relative overflow-hidden h-full flex flex-col shadow-[0_0_12px_rgba(34,211,238,0.06)]">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80 z-10">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-cyan-400 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            AI VISUALIZATION ENGINE
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time dependency & anomaly propagation cascade</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Degraded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Failing</span>
        </div>
      </div>

      {/* Flow Grid */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-6 py-6 z-10 relative">
        {nodes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            No topology configuration matching current diagnostic telemetry.
          </div>
        ) : (
          nodes.map((node, i) => {
            const nodeIsCulprit = isCulprit(node.name);
            const statusColor = 
              node.status === "failing" 
                ? "border-red-500 bg-red-500/10 text-red-100 shadow-[0_0_15px_rgba(239, 68, 68, 0.4)]" 
                : node.status === "degraded" 
                ? "border-amber-500 bg-amber-500/10 text-amber-100 shadow-[0_0_15px_rgba(245, 158, 11, 0.2)]" 
                : "border-slate-800 bg-slate-950/70 text-slate-100 hover:border-emerald-500/40";

            return (
              <div key={node.id} className="relative flex flex-col items-center w-full max-w-[180px]">
                {/* Connection Line with SVG animation to the next node */}
                {i < nodes.length - 1 && (
                  <div className="hidden md:block absolute left-[100%] top-[40px] w-[calc(100%-40px)] h-[4px] pointer-events-none z-0">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <line 
                        x1="0%" 
                        y1="50%" 
                        x2="100%" 
                        y2="50%" 
                        stroke={node.status === "failing" || nodes[i+1]?.status === "failing" ? "#ef4444" : "#1e293b"} 
                        strokeWidth="3"
                        strokeDasharray={node.status !== "healthy" ? "6,4" : "none"}
                        className={node.status !== "healthy" ? "animate-[dash_1s_linear_infinite]" : ""}
                      />
                      {/* Flowing particle */}
                      <circle cx="0" cy="50%" r="4" fill={node.status === "failing" ? "#f87171" : "#10b981"}>
                        <animate 
                          attributeName="cx" 
                          from="0%" 
                          to="100%" 
                          dur={node.status === "failing" ? "1s" : "2s"} 
                          repeatCount="indefinite" 
                        />
                      </circle>
                    </svg>
                  </div>
                )}

                {/* Main Node Card */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className={`w-full p-4 rounded-xl border ${statusColor} transition-all duration-300 relative z-10 flex flex-col items-center text-center`}
                  id={`node-card-${node.id}`}
                >
                  {/* Culprit Tag */}
                  {nodeIsCulprit && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-semibold tracking-wider flex items-center gap-1 shadow-md border border-red-400 animate-bounce">
                      <Sparkles className="w-3 h-3" />
                      Root Culprit
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg mb-2.5 bg-slate-900/90 border border-slate-800/80 ${nodeIsCulprit ? "border-red-500 animate-pulse" : ""}`}>
                    {getNodeIcon(node.type, node.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-semibold tracking-wide truncate max-w-full text-slate-100">{node.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{node.type}</span>

                  {/* Live Stats */}
                  <div className="w-full mt-3 pt-2.5 border-t border-slate-800/40 flex justify-between text-[9px] font-mono text-slate-300">
                    <span className="flex items-center gap-1"><Cpu className="w-2.5 h-2.5 text-slate-500" /> {node.cpu}</span>
                    <span className="flex items-center gap-1"><HardDrive className="w-2.5 h-2.5 text-slate-500" /> {node.memory}</span>
                  </div>

                  {node.errorCount > 0 && (
                    <div className="mt-2 text-[10px] font-mono text-red-400 font-semibold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">
                      {node.errorCount.toLocaleString()} ERR/s
                    </div>
                  )}
                </motion.div>

                {/* Beacon of failure under node */}
                {nodeIsCulprit && (
                  <div className="absolute top-full mt-2 text-center text-red-400 text-[10px] font-mono px-2 py-1 bg-red-950/70 border border-red-500/40 rounded shadow-lg animate-pulse z-20">
                    “Root cause originated here”
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Propagation Ledger */}
      {propagation.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2">ANOMALY PROPAGATION FLOWS</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            {propagation.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/40">
                <div className="flex items-center gap-1 text-slate-200">
                  <span className="truncate max-w-[90px] font-semibold">{line.source}</span>
                  <span className="text-slate-500">→</span>
                  <span className="truncate max-w-[90px] font-semibold">{line.target}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px] italic">{line.connectionState}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${line.status === "failing" ? "bg-red-500 animate-pulse" : line.status === "degraded" ? "bg-amber-400" : "bg-emerald-500"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
