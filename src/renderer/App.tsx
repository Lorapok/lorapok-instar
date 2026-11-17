import React from 'react'
import { Layers, Shield, Sparkles } from 'lucide-react'

export default function App() {
  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100">
      {/* Title Bar Drag Region for Linux */}
      <div className="h-9 w-full bg-obsidian-900 border-b border-obsidian-800 flex items-center justify-between px-3 select-none app-drag">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-yaru-orange animate-pulse-glow" />
          <span className="text-xs font-semibold tracking-wider text-slate-200">LORAPOK INSTAR</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yaru-aubergine/40 text-yaru-lightOrange border border-yaru-aubergine/60 font-mono">
            SANDBOXED
          </span>
        </div>
        <div className="flex items-center gap-1.5 no-drag">
          <button
            onClick={() => window.instar?.minimizeWindow()}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-obsidian-750 text-slate-400 hover:text-slate-200"
          >
            —
          </button>
          <button
            onClick={() => window.instar?.maximizeWindow()}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-obsidian-750 text-slate-400 hover:text-slate-200"
          >
            □
          </button>
          <button
            onClick={() => window.instar?.closeWindow()}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-rose-600/80 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-cocoon-glow">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yaru-darkAubergine via-yaru-aubergine to-yaru-orange mx-auto flex items-center justify-center shadow-sensory-glow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Lorapok Instar</h1>
            <p className="text-xs text-slate-400 mt-1">Systems-grade multi-account workspace</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-300 pt-2">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-sensory-emerald" /> Hardware Wayland
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-yaru-orange" /> Zero-Leak Partitioning
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
