"use client";

import { Disc, Activity, Cpu, Sparkles } from "lucide-react";

/**
 * Animated hero visual — tire in the center with flowing data streams,
 * orbiting elements, and scanning lines. No external assets.
 */
export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-square">
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle at center, rgba(52,140,203,0.5) 0%, transparent 70%)",
        }}
      />

      {/* Concentric grid rings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#348CCB" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1E76B6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="none" stroke="url(#ringGrad)" strokeWidth="1" strokeDasharray="2 6" className="animate-spin-slow" style={{ transformOrigin: "center" }} />
        <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(52,140,203,0.2)" strokeWidth="1" strokeDasharray="4 4" className="animate-spin-reverse" style={{ transformOrigin: "center" }} />
        <circle cx="200" cy="200" r="100" fill="none" stroke="rgba(52,140,203,0.15)" strokeWidth="1" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(52,140,203,0.25)" strokeWidth="1" />
      </svg>

      {/* Central tire */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Tire glow */}
          <div
            className="absolute inset-0 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(52,140,203,0.6) 0%, transparent 70%)" }}
          />
          {/* Tire icon */}
          <div className="relative animate-spin-tire" style={{ width: "160px", height: "160px" }}>
            <Disc
              size={160}
              className="text-[#348CCB]"
              strokeWidth={1.2}
              style={{ filter: "drop-shadow(0 0 24px rgba(52,140,203,0.6))" }}
            />
          </div>
          {/* Center hub glow */}
          <div
            className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{
              background: "#348CCB",
              boxShadow: "0 0 24px #348CCB, 0 0 48px #348CCB",
            }}
          />
        </div>
      </div>

      {/* Flowing binary data streams (left to right) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { top: "12%", delay: "0s", duration: "8s", text: "1010 0110 1011" },
          { top: "22%", delay: "2s", duration: "10s", text: "0110 1101 0010" },
          { top: "78%", delay: "1s", duration: "9s", text: "1100 0011 1010" },
          { top: "88%", delay: "3s", duration: "11s", text: "0101 1010 1100" },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute font-mono text-[10px] sm:text-xs whitespace-nowrap animate-data-stream"
            style={{
              top: s.top,
              color: "rgba(52,140,203,0.5)",
              animationDelay: s.delay,
              animationDuration: s.duration,
              textShadow: "0 0 8px rgba(52,140,203,0.6)",
            }}
          >
            {s.text}
          </div>
        ))}

        {/* Vertical streams */}
        {[
          { left: "10%", delay: "0.5s", duration: "9s", text: "100110" },
          { left: "88%", delay: "2.5s", duration: "10s", text: "011001" },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute font-mono text-[10px] sm:text-xs animate-data-stream-vertical"
            style={{
              left: s.left,
              color: "rgba(52,140,203,0.5)",
              animationDelay: s.delay,
              animationDuration: s.duration,
              textShadow: "0 0 8px rgba(52,140,203,0.6)",
              writingMode: "vertical-rl",
            }}
          >
            {s.text}
          </div>
        ))}
      </div>

      {/* Orbiting badges */}
      <OrbitBadge angle={0}   icon={Activity} label="CPK"     />
      <OrbitBadge angle={72}  icon={Cpu}      label="IA"      />
      <OrbitBadge angle={144} icon={Sparkles} label="42K km"  />
      <OrbitBadge angle={216} icon={Activity} label="OK"      />
      <OrbitBadge angle={288} icon={Disc}     label="12.5mm"  />

      {/* Scan line sweeping across */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
        style={{ mask: "radial-gradient(circle at center, black 60%, transparent 80%)" }}
      >
        <div
          className="absolute left-0 right-0 h-0.5 animate-scan-sweep"
          style={{
            background: "linear-gradient(90deg, transparent, #348CCB, transparent)",
            boxShadow: "0 0 16px #348CCB",
          }}
        />
      </div>

      {/* Data corner labels */}
      <div className="absolute top-4 left-4 px-2 py-1 rounded font-mono text-[9px] sm:text-[10px] animate-fade-loop"
        style={{ background: "rgba(52,140,203,0.1)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB" }}>
        ANALYZING
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 rounded font-mono text-[9px] sm:text-[10px] animate-fade-loop"
        style={{ background: "rgba(52,140,203,0.1)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB", animationDelay: "1s" }}>
        TIRE_001
      </div>
      <div className="absolute bottom-4 left-4 px-2 py-1 rounded font-mono text-[9px] sm:text-[10px] animate-fade-loop"
        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", animationDelay: "0.5s" }}>
        STATUS: OK
      </div>
      <div className="absolute bottom-4 right-4 px-2 py-1 rounded font-mono text-[9px] sm:text-[10px] animate-fade-loop"
        style={{ background: "rgba(52,140,203,0.1)", border: "1px solid rgba(52,140,203,0.3)", color: "#348CCB", animationDelay: "1.5s" }}>
        v2.4
      </div>

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes spin-tire { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @keyframes data-stream {
          0% { left: -30%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes data-stream-vertical {
          0% { top: -20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes scan-sweep {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes fade-loop { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .animate-spin-slow { animation: spin-slow 60s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 40s linear infinite; }
        .animate-spin-tire { animation: spin-tire 30s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-data-stream { animation: data-stream linear infinite; }
        .animate-data-stream-vertical { animation: data-stream-vertical linear infinite; }
        .animate-scan-sweep { animation: scan-sweep 4s ease-in-out infinite; }
        .animate-fade-loop { animation: fade-loop 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function OrbitBadge({ angle, icon: Icon, label }: { angle: number; icon: any; label: string }) {
  // Position around a circle of radius ~46% of the container
  const rad = (angle * Math.PI) / 180;
  const left = 50 + 42 * Math.cos(rad);
  const top = 50 + 42 * Math.sin(rad);
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full flex items-center gap-1 animate-bob font-mono text-[9px] sm:text-[10px] font-bold"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        background: "rgba(10,24,58,0.8)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(52,140,203,0.4)",
        color: "#348CCB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4), 0 0 12px rgba(52,140,203,0.2)",
        animationDelay: `${(angle / 360) * 2}s`,
      }}
    >
      <Icon size={10} />
      {label}
      <style jsx>{`
        @keyframes bob {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }
        .animate-bob { animation: bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
