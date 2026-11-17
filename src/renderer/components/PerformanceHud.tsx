import React, { useEffect } from 'react'
import { X, Activity, Moon, HardDrive, Trash2, Zap, ShieldCheck } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

export const PerformanceHud: React.FC = () => {
  const {
    isPerformanceHudOpen,
    setPerformanceHudOpen,
    telemetry,
    refreshTelemetry,
    hibernateAllInactive,
    clearCocoonCache,
    clearAllCache,
    apps
  } = useInstarStore()

  useEffect(() => {
    if (isPerformanceHudOpen) {
      refreshTelemetry()
      const timer = setInterval(refreshTelemetry, 5000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [isPerformanceHudOpen, refreshTelemetry])

  if (!isPerformanceHudOpen) return null

  const totalRamBytes = telemetry.reduce((sum, t) => sum + t.memoryBytes, 0)
  const totalDiskBytes = telemetry.reduce((sum, t) => sum + t.diskCacheBytes, 0)
  const totalActiveViews = telemetry.reduce((sum, t) => sum + t.activeViewsCount, 0)
  const totalHibernatedViews = telemetry.reduce((sum, t) => sum + t.hibernatedViewsCount, 0)

  // Estimated RAM saved by hibernation (~250MB per hibernated view)
  const estimatedRamSavedMb = totalHibernatedViews * 250

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-obsidian-750 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-obsidian-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sensory-emerald/20 border border-sensory-emerald/40 text-sensory-emerald flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Performance HUD & Resource Telemetry</h2>
              <p className="text-xs text-slate-400">Low-footprint process metrics, V8 caching, and hibernation stats</p>
            </div>
          </div>
          <button
            onClick={() => setPerformanceHudOpen(false)}
            className="p-1.5 rounded-lg hover:bg-obsidian-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 text-center space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Active RAM</span>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {(totalRamBytes / 1024 / 1024).toFixed(0)} MB
            </div>
            <span className="text-[10px] text-sensory-emerald flex items-center justify-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" /> Hardware Wayland
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 text-center space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">RAM Saved</span>
            <div className="text-lg font-bold text-sensory-sapphire font-mono">
              ~{estimatedRamSavedMb} MB
            </div>
            <span className="text-[10px] text-slate-400">
              {totalHibernatedViews} hibernated apps
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 text-center space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Disk Cache</span>
            <div className="text-lg font-bold text-yaru-lightOrange font-mono">
              {(totalDiskBytes / 1024 / 1024).toFixed(1)} MB
            </div>
            <span className="text-[10px] text-slate-400">14d LRU worker</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => hibernateAllInactive()}
            className="flex-1 py-2 px-3 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Moon className="w-3.5 h-3.5 text-sensory-sapphire" /> Hibernate Inactive Apps
          </button>
          <button
            onClick={() => clearAllCache()}
            className="flex-1 py-2 px-3 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-yaru-orange" /> Purge Stale Caches
          </button>
        </div>

        {/* Per-Cocoon Telemetry Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-300">Workspace Breakdown</h3>
          <div className="space-y-2">
            {telemetry.map((t) => (
              <div
                key={t.cocoonId}
                className="p-3 rounded-xl bg-obsidian-850/60 border border-obsidian-750/70 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-100">{t.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t.activeViewsCount} active • {t.hibernatedViewsCount} hibernated
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right font-mono text-[11px]">
                  <div>
                    <div className="text-slate-200">{(t.memoryBytes / 1024 / 1024).toFixed(0)} MB RAM</div>
                    <div className="text-slate-500 text-[10px]">
                      {(t.diskCacheBytes / 1024 / 1024).toFixed(1)} MB cache
                    </div>
                  </div>

                  <button
                    onClick={() => clearCocoonCache(t.cocoonId)}
                    className="p-1.5 rounded-lg hover:bg-obsidian-750 text-slate-400 hover:text-yaru-orange transition-colors"
                    title="Clear cache for this workspace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
