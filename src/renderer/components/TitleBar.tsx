import React, { useState, useEffect } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

export const TitleBar: React.FC = () => {
  const { cocoons, selectedCocoonId, setCommandPaletteOpen } = useInstarStore()
  const [isMax, setIsMax] = useState(false)

  const activeCocoon = cocoons.find((c) => c.id === selectedCocoonId)

  useEffect(() => {
    if (window.instar) {
      window.instar.isMaximized().then(setIsMax)
    }
  }, [])

  return (
    <div
      className="h-10 w-full bg-obsidian-900 border-b border-obsidian-800 flex items-center justify-between px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Brand & Active Workspace */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-yaru-darkAubergine via-yaru-aubergine to-yaru-orange flex items-center justify-center shadow-sensory-glow">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-bold tracking-wider text-slate-200">INSTAR</span>

        {activeCocoon && (
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-obsidian-800/80 border border-obsidian-700/60 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeCocoon.color }} />
            <span className="font-medium max-w-[140px] truncate">{activeCocoon.name}</span>
          </div>
        )}
      </div>

      {/* Global Command Palette Trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-700/70 text-slate-400 hover:text-slate-200 text-xs transition-colors shadow-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Command Palette (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-yaru-orange" />
        <span className="text-[11px]">Command Palette</span>
        <kbd className="px-1.5 py-0.5 rounded bg-obsidian-750 text-[10px] font-mono text-slate-400 border border-obsidian-700">
          Ctrl+K
        </kbd>
      </button>

      {/* Linux Window Action Buttons */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.instar?.minimizeWindow()}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-obsidian-800 transition-colors"
          title="Minimize"
        >
          —
        </button>
        <button
          onClick={() => {
            window.instar?.maximizeWindow()
            setIsMax(!isMax)
          }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-obsidian-800 transition-colors"
          title="Maximize"
        >
          {isMax ? '❐' : '□'}
        </button>
        <button
          onClick={() => window.instar?.closeWindow()}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
