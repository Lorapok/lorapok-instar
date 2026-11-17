import React from 'react'
import {
  Layers,
  Shield,
  Briefcase,
  User,
  Terminal,
  Globe,
  MessageSquare,
  Lock,
  Sparkles,
  Cpu,
  Plus,
  Activity,
  Settings
} from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  layers: Layers,
  shield: Shield,
  briefcase: Briefcase,
  user: User,
  terminal: Terminal,
  globe: Globe,
  'message-square': MessageSquare,
  lock: Lock,
  sparkles: Sparkles,
  cpu: Cpu
}

export const CocoonRail: React.FC = () => {
  const {
    cocoons,
    selectedCocoonId,
    apps,
    selectCocoon,
    openCreateCocoonModal,
    openEditCocoonModal,
    setPerformanceHudOpen,
    setSettingsOpen,
    telemetry
  } = useInstarStore()

  // Calculate total unread count per cocoon
  const getCocoonUnreadCount = (cocoonId: string) => {
    return apps
      .filter((a) => a.cocoonId === cocoonId)
      .reduce((sum, a) => sum + (a.unreadCount || 0), 0)
  }

  // Calculate total estimated RAM across all cocoons
  const totalRamMb = Math.round(
    telemetry.reduce((sum, t) => sum + t.memoryBytes, 0) / (1024 * 1024)
  )

  return (
    <div className="w-16 h-full bg-obsidian-900 border-r border-obsidian-800 flex flex-col items-center justify-between py-3 z-20">
      {/* Top: Workspaces List */}
      <div className="flex flex-col items-center gap-3 w-full">
        {cocoons.map((cocoon) => {
          const isSelected = cocoon.id === selectedCocoonId
          const IconComponent = ICON_MAP[cocoon.icon] || Layers
          const unreadCount = getCocoonUnreadCount(cocoon.id)

          return (
            <div key={cocoon.id} className="relative group">
              <button
                onClick={() => selectCocoon(cocoon.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openEditCocoonModal(cocoon)
                }}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'shadow-cocoon-glow scale-105'
                    : 'hover:scale-105 opacity-80 hover:opacity-100 bg-obsidian-850'
                }`}
                style={{
                  backgroundColor: isSelected ? cocoon.color : undefined,
                  border: isSelected ? `2px solid #ffffff55` : '1px solid #3c3b3788'
                }}
                title={`${cocoon.name} (Right-click to edit)`}
              >
                <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-300'}`} />

                {/* Lock Badge */}
                {cocoon.isLocked && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-obsidian-950 border border-amber-500/80 flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                  </span>
                )}

                {/* Unread Message Badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-obsidian-900 shadow-sm animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Active rail indicator pip */}
              {isSelected && (
                <div
                  className="absolute -left-3 top-2 bottom-2 w-1.5 rounded-r-full"
                  style={{ backgroundColor: cocoon.color }}
                />
              )}
            </div>
          )
        })}

        {/* Add Cocoon (+) Button */}
        <button
          onClick={openCreateCocoonModal}
          className="w-10 h-10 rounded-2xl border border-dashed border-obsidian-700 hover:border-yaru-orange/70 flex items-center justify-center text-slate-400 hover:text-yaru-orange hover:bg-obsidian-850/60 transition-all"
          title="Create New Workspace (Cocoon)"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom: Diagnostics & Settings */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Performance HUD trigger */}
        <button
          onClick={() => setPerformanceHudOpen(true)}
          className="relative w-10 h-10 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-750 flex flex-col items-center justify-center text-slate-400 hover:text-sensory-emerald transition-colors"
          title="Performance HUD (RAM & Cache metrics)"
        >
          <Activity className="w-4 h-4 text-sensory-emerald" />
          <span className="text-[9px] font-mono text-slate-400 font-semibold mt-0.5">
            {totalRamMb > 0 ? `${totalRamMb}M` : 'HUD'}
          </span>
        </button>

        {/* Settings modal trigger */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-10 h-10 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-750 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          title="Workspace Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
