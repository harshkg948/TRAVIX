import { MemoryMatch } from "../types";
import { History, Share2, Sparkles, AlertCircle, Bookmark } from "lucide-react";
import { motion } from "motion/react";

interface IncidentMemoryProps {
  memory: MemoryMatch | null;
  onApplyHistoricalFix: (fixes: string) => void;
}

export function IncidentMemory({ memory, onApplyHistoricalFix }: IncidentMemoryProps) {
  if (!memory) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 glow-amber h-full flex flex-col justify-center items-center text-center shadow-[0_0_12px_rgba(245,158,11,0.06)]">
        <History className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
        <h3 className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">INCIDENT VECTOR MEMORY</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px]">Run diagnostics on active outage triggers to trace historical SRE vectors.</p>
      </div>
    );
  }

  // Choose colors based on similarity range
  const getSimilarityColor = (percent: number) => {
    if (percent >= 90) return "text-red-400 stroke-red-500 border-red-500/20 bg-red-500/10";
    if (percent >= 75) return "text-amber-400 stroke-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-cyan-400 stroke-cyan-500 border-cyan-500/20 bg-cyan-500/10";
  };

  const similarityColor = getSimilarityColor(memory.similarity);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 glow-amber h-full flex flex-col justify-between relative overflow-hidden shadow-[0_0_12px_rgba(245,158,11,0.06)]">
      {/* Visual glowing matrix scan background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-amber-500 font-mono flex items-center gap-2">
              <History className="w-4 h-4 animate-spin-slow" />
              INCIDENT MEMORY KERNEL
            </h2>
            <p className="text-xs text-slate-400 mt-1">Cross-referencing global historical postmortems</p>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Vector RAG active
          </span>
        </div>

        {/* Vector Match Breakdown */}
        <div className="flex items-center gap-5 p-4 rounded-lg bg-slate-950/60 border border-slate-800/85 mb-5">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            {/* SVG radial track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-slate-800"
                strokeWidth="4"
                fill="transparent"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                className={similarityColor.split(" ")[1]}
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="175"
                initial={{ strokeDashoffset: 175 }}
                animate={{ strokeDashoffset: 175 - (175 * memory.similarity) / 100 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-sm font-extrabold text-slate-100 font-mono">{memory.similarityPercentage}</span>
              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">MATCH</span>
            </div>
          </div>

          <div className="flex-1">
            <span className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold uppercase flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
              PRIOR OUTAGE CORRELATION
            </span>
            <h3 className="text-xs font-bold text-slate-200 mt-1 line-clamp-2 leading-relaxed">{memory.eventName}</h3>
          </div>
        </div>

        {/* Recurring Patterns and Root Cause similarities */}
        <div className="text-xs space-y-4">
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block mb-1">RECURRING SIGNATURE</span>
            <p className="text-slate-300 leading-relaxed font-sans bg-slate-950/30 p-3 border border-slate-800/40 rounded-lg">
              {memory.recurringPatterns}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Fix */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <Bookmark className="w-3.5 h-3.5 text-slate-500" /> Matches: Incident ID #8928
          </div>
          <button
            onClick={() => onApplyHistoricalFix(memory.eventName)}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 rounded-lg bg-[#111827] border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] transition-all cursor-pointer duration-300"
          >
            <Share2 className="w-3 h-3" /> Apply Historical Remedy
          </button>
        </div>
      </div>
    </div>
  );
}
