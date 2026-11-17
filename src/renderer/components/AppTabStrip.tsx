import React from 'react'
import {
  Plus,
  RotateCw,
  Columns2,
  Columns3,
  Square,
  Moon,
  Volume2,
  PhoneCall,
  X
} from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'
import type { SplitViewMode } from '../../shared/types'

export const AppTabStrip: React.FC = () => {
  const {
    selectedCocoonId,
    apps,
    splitState,
    setSplitMode,
    setActiveApp,
    reloadActiveViews,
    hibernateApp,
    setServiceCatalogOpen
  } = useInstarStore()

  if (!selectedCocoonId) return null

  const currentApps = apps.filter((a) => a.cocoonId === selectedCocoonId)

  return (
    <div className="h-11 w-full bg-obsidian-900/90 border-b border-obsidian-800 flex items-center justify-between px-3 z-10">
      {/* App Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {currentApps.map((app) => {
          const isActive = splitState.activeAppIds.includes(app.id)
          const isHibernated = app.state === 'HIBERNATED'

          return (
            <div
              key={app.id}
              onClick={() => setActiveApp(app.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-all duration-150 ${
                isActive
                  ? 'bg-obsidian-800 text-slate-100 font-medium shadow-sm border border-obsidian-700/80'
                  : 'bg-obsidian-850/60 text-slate-400 hover:text-slate-200 hover:bg-obsidian-850 border border-transparent'
              }`}
            >
              {/* App Service Icon */}
              <img
                src={`/services/${app.serviceId}.svg`}
                alt={app.name}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/services/custom.svg'
                }}
              />

              {/* App Title */}
              <span className="truncate max-w-[120px]">{app.name}</span>

              {/* Status Indicator (Audible, Calling, or Hibernated) */}
              {app.isCalling && <PhoneCall className="w-3 h-3 text-sensory-emerald animate-pulse" />}
              {app.isAudible && !app.isCalling && <Volume2 className="w-3 h-3 text-sensory-amber" />}

              {isHibernated && (
                <span
                  className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-sapphire/20 text-sensory-sapphire text-[10px] font-mono border border-sensory-sapphire/30"
                  title="App Hibernated (0 MB RAM)"
                >
                  <Moon className="w-2.5 h-2.5" /> 0M
                </span>
              )}

              {/* Unread badge */}
              {app.unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {app.unreadCount}
                </span>
              )}

              {/* Quick Hibernate action on inactive hover */}
              {!isActive && !isHibernated && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    hibernateApp(app.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-obsidian-750 rounded text-slate-400 hover:text-sensory-sapphire transition-opacity"
                  title="Hibernate to reclaim RAM"
                >
                  <Moon className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Add App Button */}
        <button
          onClick={() => setServiceCatalogOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-obsidian-850/70 hover:bg-obsidian-800 text-slate-400 hover:text-slate-200 border border-obsidian-750 text-xs transition-colors"
          title="Add app to workspace"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Add App</span>
        </button>
      </div>

      {/* Split-View Mode & Reload Controls */}
      <div className="flex items-center gap-1.5 pl-3 border-l border-obsidian-800">
        <button
          onClick={() => reloadActiveViews()}
          className="p-1.5 rounded-md hover:bg-obsidian-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reload active web views"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center bg-obsidian-850 rounded-lg p-0.5 border border-obsidian-750">
          <button
            onClick={() => setSplitMode('single')}
            className={`p-1 rounded ${
              splitState.mode === 'single'
                ? 'bg-yaru-orange text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Single View"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSplitMode('dual')}
            className={`p-1 rounded ${
              splitState.mode === 'dual'
                ? 'bg-yaru-orange text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dual Split View (Side by side)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSplitMode('triple')}
            className={`p-1 rounded ${
              splitState.mode === 'triple'
                ? 'bg-yaru-orange text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Triple Split View"
          >
            <Columns3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
