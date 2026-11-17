import React, { useState } from 'react'
import { X, Plus, Sparkles, ExternalLink } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'
import type { ServiceDefinition } from '../../shared/types'

export const ServiceCatalog: React.FC = () => {
  const {
    isServiceCatalogOpen,
    setServiceCatalogOpen,
    services,
    selectedCocoonId,
    loadInitialData,
    setActiveApp
  } = useInstarStore()

  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customCss, setCustomCss] = useState('')

  if (!isServiceCatalogOpen || !selectedCocoonId) return null

  const handleAddBuiltin = async (service: ServiceDefinition) => {
    if (service.id === 'custom') {
      setIsCustomMode(true)
      return
    }

    try {
      const created = await window.instar.createApp({
        cocoonId: selectedCocoonId,
        serviceId: service.id,
        name: service.name,
        url: service.url,
        icon: service.icon,
        order: 99,
        customCss: service.recommendedCss
      })

      await loadInitialData()
      await setActiveApp(created.id)
      setServiceCatalogOpen(false)
    } catch (err) {
      console.error('[ServiceCatalog] Error adding app', err)
    }
  }

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customUrl.trim()) return

    let formattedUrl = customUrl.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl
    }

    try {
      const created = await window.instar.createApp({
        cocoonId: selectedCocoonId,
        serviceId: 'custom',
        name: customName.trim(),
        url: formattedUrl,
        icon: 'custom',
        order: 99,
        customCss: customCss.trim() || undefined
      })

      await loadInitialData()
      await setActiveApp(created.id)
      setIsCustomMode(false)
      setCustomName('')
      setCustomUrl('')
      setCustomCss('')
      setServiceCatalogOpen(false)
    } catch (err) {
      console.error('[ServiceCatalog] Error adding custom app', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-obsidian-750 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-obsidian-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yaru-orange flex items-center justify-center shadow-sensory-glow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add Service to Workspace</h2>
              <p className="text-xs text-slate-400">Pre-tuned client hints, zero-block spoofing, and sensory UI</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsCustomMode(false)
              setServiceCatalogOpen(false)
            }}
            className="p-1.5 rounded-lg hover:bg-obsidian-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Custom App Form */}
        {isCustomMode ? (
          <form onSubmit={handleAddCustom} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Service / App Name</label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Notion, Linear, ChatGPT, Jira"
                className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Web Application URL</label>
              <input
                type="text"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://app.example.com"
                className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-100 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Optional Custom Injected CSS</label>
              <textarea
                rows={3}
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder="::-webkit-scrollbar { width: 4px; }"
                className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-100 font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="px-4 py-2 rounded-xl bg-obsidian-800 text-slate-300 font-semibold"
              >
                Back to Catalog
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-yaru-orange hover:bg-yaru-lightOrange text-white font-bold shadow-sensory-glow"
              >
                Add App
              </button>
            </div>
          </form>
        ) : (
          /* Grid of Built-in Services */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => handleAddBuiltin(service)}
                className="group p-4 rounded-2xl bg-obsidian-850/80 hover:bg-obsidian-800 border border-obsidian-750 hover:border-yaru-orange/60 cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-sensory-glow hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <img
                    src={`/services/${service.id}.svg`}
                    alt={service.name}
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/services/custom.svg'
                    }}
                  />
                  <span className="p-1.5 rounded-lg bg-obsidian-750 text-slate-400 group-hover:text-yaru-orange group-hover:bg-yaru-orange/20 transition-colors">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-slate-100 group-hover:text-white">{service.name}</h3>
                  <span className="text-[10px] text-slate-400 capitalize">{service.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
