import { useState } from "react";
import { SREStep } from "../types";
import { FileText, CheckCircle2, ChevronDown, ChevronUp, Cpu, Network, History, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExplainableAIProps {
  steps: SREStep[];
  confidenceScore: number;
}

export function ExplainableAI({ steps, confidenceScore }: ExplainableAIProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const getStepIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("deploy") || t.includes("ledger") || t.includes("rollback")) {
      return <Cpu className="w-4 h-4 text-cyan-400" />;
    }
    if (t.includes("latency") || t.includes("anomaly") || t.includes("spike")) {
      return <Network className="w-4 h-4 text-violet-400" />;
    }
    if (t.includes("history") || t.includes("alignment") || t.includes("match") || t.includes("similarity")) {
      return <History className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { label: "EXCEPTIONAL", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 75) return { label: "HIGH", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]" };
    return { label: "MODERATE", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  };

  const confidenceLevel = getConfidenceLevel(confidenceScore);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 glow-purple relative flex flex-col h-full justify-between shadow-[0_0_12px_rgba(168,85,247,0.06)]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-purple-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              EXPLAINABLE AI CORRELATOR
            </h2>
            <p className="text-xs text-slate-400 mt-1">“How TRAVIX Investigated This Incident”</p>
          </div>
          <div className="flex flex-col items-end gap-1 font-mono">
            <span className="text-[10px] text-slate-400">DECISION CONFIDENCE</span>
            <div className={`flex items-center gap-2 border px-2.5 py-1 rounded-lg ${confidenceLevel.color}`}>
              <span className="text-sm font-bold">{confidenceScore}%</span>
              <span className="text-[9px] font-semibold tracking-wider">{confidenceLevel.label}</span>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-mono bg-slate-950/40 border border-slate-800/50 p-3 rounded-lg">
          TRAVIX SRE Engine runs background vector parsing models, comparing raw metrics, structural error patterns, and Kubernetes deployment history to map causality step-by-step.
        </p>

        {/* Diagnostics Step list */}
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="text-center py-6 text-slate-500 font-mono text-xs">
              Waiting for incoming outage triggers to begin SRE correlation paths.
            </div>
          ) : (
            steps.map((step, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div 
                  key={idx}
                  className={`border rounded-lg transition-all duration-200 ${
                    isExpanded 
                      ? "border-purple-500/30 bg-purple-950/5/10" 
                      : "border-slate-800 bg-slate-950/20 hover:border-slate-700/60"
                  }`}
                  id={`investigation-step-${idx}`}
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center p-1.5 rounded bg-slate-900 border border-slate-800">
                        {getStepIcon(step.title)}
                      </div>
                      <span className="font-semibold text-slate-200 text-xs">{step.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {step.completed ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 animate-pulse" /> Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <HelpCircle className="w-3 h-3" /> Evaluating
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 border-t border-slate-800/40 text-slate-300 text-xs leading-relaxed font-sans bg-slate-950/40 rounded-b-lg">
                          {step.details}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>Analysis cycle: 420ms</span>
        <span>Audited: 844 files/metrics</span>
      </div>
    </div>
  );
}
