import { useState } from "react";
import { MessageSquare, Bell, Send, Check } from "lucide-react";

interface SlackSimulatorProps {
  incidentName: string;
  severity: string;
  summary: string;
  probableRootCause: string;
}

export function SlackSimulator({ incidentName, severity, summary, probableRootCause }: SlackSimulatorProps) {
  const [channel, setChannel] = useState("#ops-alerts");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const handleSimulateAlert = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch("/api/simulate-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          incidentName,
          severity,
          message: summary.slice(0, 180) + "..."
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setSentCount((prev) => prev + 1);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between shadow-[0_0_12px_rgba(34,211,238,0.05)]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-sky-400 font-mono flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SLACK / DISCORD SIMULATION
            </h2>
            <p className="text-xs text-slate-400 mt-1">Simulate instant webhook messaging triggers</p>
          </div>
          {sentCount > 0 && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {sentCount} Dispatch Sent
            </span>
          )}
        </div>

        {/* Configuration Setup */}
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">INTEGRATION CHANNEL</label>
              <select 
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:border-sky-500"
              >
                <option value="#ops-alerts">#ops-alerts</option>
                <option value="#sre-warroom">#sre-warroom</option>
                <option value="#devops-chat">#devops-chat</option>
                <option value="#travix-intelligence">#travix-intelligence</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">ALERT FORMAT</label>
              <div className="w-full bg-slate-950/40 border border-slate-850 text-slate-300 rounded-lg p-2.5 select-none">
                TRAVIX Markdown Embedded
              </div>
            </div>
          </div>
          
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block mb-1.5">MOCK PREVIEW</span>
            {/* Live mockup of slack attachment card */}
            <div className="border border-slate-800 bg-slate-950 rounded-lg p-4 font-sans text-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">T</div>
                <span className="font-bold text-slate-200">TRAVIX APP</span>
                <span className="text-[10px] text-slate-500 font-mono">11:23 AM</span>
              </div>
              <div className="border-l-4 border-red-500 pl-3 py-1 space-y-1 bg-slate-900/40 rounded-r">
                <p className="font-semibold text-slate-200">
                  🚨 [CRITICAL INCIDENT DETECTED]
                </p>
                <div className="text-slate-400 leading-normal text-[11px] mt-1 space-y-1">
                  <div>• <b className="text-slate-300">Name:</b> {incidentName}</div>
                  <div>• <b className="text-slate-300">Root Cause:</b> {probableRootCause || "Evaluating..."}</div>
                  <div className="line-clamp-2 italic text-slate-400 mt-1">"{summary || "Analyzing anomaly registers..."}"</div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <span className="text-[9px] font-mono uppercase bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold">
                    {severity.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    WARROOM GENERATED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

       {/* Button trigger */}
      <div className="pt-4 border-t border-slate-800/80">
        <button
          onClick={handleSimulateAlert}
          disabled={loading || !incidentName}
          className="w-full flex items-center justify-center gap-2 text-xs font-mono font-black uppercase tracking-wider py-3.5 rounded-lg bg-sky-500 text-black hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(14,165,233,0.35)] transition-all cursor-pointer duration-300"
        >
          {loading ? (
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              Dispatching Webhooks...
            </span>
          ) : success ? (
            <span className="flex items-center gap-1.5 text-black font-bold">
              <Check className="w-4 h-4" /> Message Placed Successfully!
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold">
              <Bell className="w-4 h-4" /> Trigger Simulated Webhook Dispatch
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
