import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Layers,
  Columns2,
  Columns3,
  Square,
  Moon,
  Trash2,
  Lock,
  Activity,
  Settings,
  Archive,
  ArrowRight
} from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

interface PaletteAction {
  id: string
  title: string
  category: 'Workspace' | 'App' | 'Layout' | 'System'
  icon: React.FC<{ className?: string }>
  run: () => void
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    cocoons,
    apps,
    selectCocoon,
    setActiveApp,
    setSplitMode,
    hibernateAllInactive,
    clearAllCache,
    lockCocoon,
    selectedCocoonId,
    setPerformanceHudOpen,
    setSettingsOpen
  } = useInstarStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  // Global Ctrl+K / Super+Space hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!isCommandPaletteOpen)
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCommandPaletteOpen, setCommandPaletteOpen])

  if (!isCommandPaletteOpen) return null

  // Build searchable action list
  const actions: PaletteAction[] = [
    // Workspaces
    ...cocoons.map((c) => ({
      id: `cocoon_${c.id}`,
      title: `Switch to Workspace: ${c.name}`,
      category: 'Workspace' as const,
      icon: Layers,
      run: () => selectCocoon(c.id)
    })),

    // Apps
    ...apps.map((a) => ({
      id: `app_${a.id}`,
      title: `Open App: ${a.name}`,
      category: 'App' as const,
      icon: ArrowRight,
      run: async () => {
        await selectCocoon(a.cocoonId)
        await setActiveApp(a.id)
      }
    })),

    // Layout
    {
      id: 'split_single',
      title: 'Layout: Single Full View',
      category: 'Layout',
      icon: Square,
      run: () => setSplitMode('single')
    },
    {
      id: 'split_dual',
      title: 'Layout: Dual Split View (50 / 50)',
      category: 'Layout',
      icon: Columns2,
      run: () => setSplitMode('dual')
    },
    {
      id: 'split_triple',
      title: 'Layout: Triple Split View (33 / 33 / 34)',
      category: 'Layout',
      icon: Columns3,
      run: () => setSplitMode('triple')
    },

    // System & Performance
    {
      id: 'hibernate_all',
      title: 'Performance: Deep Freeze All Inactive Apps (Save RAM)',
      category: 'System',
      icon: Moon,
      run: () => hibernateAllInactive()
    },
    {
      id: 'purge_cache',
      title: 'Storage: Purge All Partition Caches',
      category: 'System',
      icon: Trash2,
      run: () => clearAllCache()
    },
    {
      id: 'perf_hud',
      title: 'Diagnostics: Open Performance HUD',
      category: 'System',
      icon: Activity,
      run: () => setPerformanceHudOpen(true)
    },
    {
      id: 'settings',
      title: 'Preferences: Open Workspace Settings',
      category: 'System',
      icon: Settings,
      run: () => setSettingsOpen(true)
    }
  ]

  if (selectedCocoonId) {
    actions.push({
      id: 'lock_cocoon',
      title: 'Security: Lock Current Workspace with PIN',
      category: 'System',
      icon: Lock,
      run: () => lockCocoon(selectedCocoonId)
    })
  }

  // Filter actions by query
  const filteredActions = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredActions[selectedIndex]
      if (selected) {
        selected.run()
        setCommandPaletteOpen(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-center pt-24 z-50 p-4">
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-obsidian-750 shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-obsidian-800 bg-obsidian-900/80">
          <Search className="w-5 h-5 text-yaru-orange" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, app, or workspace name..."
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 text-sm"
          />
          <kbd className="px-2 py-0.5 rounded bg-obsidian-800 text-[10px] font-mono text-slate-400 border border-obsidian-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No matching commands found.</div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex
              const IconComp = action.icon

              return (
                <div
                  key={action.id}
                  onClick={() => {
                    action.run()
                    setCommandPaletteOpen(false)
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-yaru-orange text-white font-medium' : 'hover:bg-obsidian-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{action.title}</span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-obsidian-800 text-slate-400'
                    }`}
                  >
                    {action.category}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
