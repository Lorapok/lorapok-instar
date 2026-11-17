import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Lock, KeyRound, Sparkles, Plus, AlertCircle } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

export const ViewportStage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null)
  const {
    cocoons,
    selectedCocoonId,
    apps,
    splitState,
    setSplitRatios,
    updateViewportBounds,
    submitPin,
    pinError,
    setServiceCatalogOpen
  } = useInstarStore()

  const [enteredPin, setEnteredPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraggingSash, setIsDraggingSash] = useState<number | null>(null)

  const activeCocoon = cocoons.find((c) => c.id === selectedCocoonId)
  const isCocoonLocked = Boolean(activeCocoon?.isLocked && activeCocoon?.hasPin)
  const currentApps = apps.filter((a) => a.cocoonId === selectedCocoonId)

  // Report viewport stage geometry to electron main process for WebContentsView positioning
  const updateGeometry = useCallback(() => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    updateViewportBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    })
  }, [updateViewportBounds])

  useEffect(() => {
    updateGeometry()

    const observer = new ResizeObserver(() => {
      updateGeometry()
    })

    if (stageRef.current) {
      observer.observe(stageRef.current)
    }

    window.addEventListener('resize', updateGeometry)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateGeometry)
    }
  }, [updateGeometry])

  // Split sash dragging
  useEffect(() => {
    if (isDraggingSash === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current) return
      const rect = stageRef.current.getBoundingClientRect()
      const relativeX = e.clientX - rect.x
      const ratio = Math.max(0.15, Math.min(0.85, relativeX / rect.width))

      if (splitState.mode === 'dual') {
        setSplitRatios([ratio])
      } else if (splitState.mode === 'triple' && isDraggingSash === 0) {
        setSplitRatios([ratio, 0.33])
      }
    }

    const handleMouseUp = () => {
      setIsDraggingSash(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSash, splitState.mode, setSplitRatios])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enteredPin) return
    setIsSubmitting(true)
    const ok = await submitPin(enteredPin)
    setIsSubmitting(false)
    if (ok) {
      setEnteredPin('')
      updateGeometry()
    }
  }

  return (
    <div ref={stageRef} className="relative flex-1 w-full h-full bg-obsidian-950 overflow-hidden">
      {/* Draggable Split Sashes */}
      {splitState.mode === 'dual' && splitState.activeAppIds.length >= 2 && !isCocoonLocked && (
        <div
          onMouseDown={() => setIsDraggingSash(0)}
          className="absolute top-0 bottom-0 w-2.5 -ml-1 cursor-col-resize z-30 group flex items-center justify-center hover:bg-yaru-orange/30 transition-colors"
          style={{ left: `${(splitState.ratios[0] || 0.5) * 100}%` }}
        >
          <div className="w-1 h-8 rounded-full bg-obsidian-600 group-hover:bg-yaru-orange transition-colors" />
        </div>
      )}

      {/* Cryptographic Shield / Locked Overlay */}
      {isCocoonLocked && (
        <div className="absolute inset-0 bg-obsidian-950/95 backdrop-blur-xl flex items-center justify-center z-40 p-6">
          <div className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-2xl border border-amber-500/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-100">{activeCocoon?.name}</h2>
              <p className="text-xs text-slate-400 mt-1">This workspace is encrypted and locked with a PIN.</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="password"
                  maxLength={12}
                  autoFocus
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter Workspace PIN"
                  className="w-full px-4 py-2.5 rounded-xl bg-obsidian-900 border border-obsidian-750 focus:border-amber-500 text-center text-lg tracking-widest text-slate-100 placeholder:text-slate-500 placeholder:tracking-normal placeholder:text-xs outline-none transition-all font-mono"
                />
                <KeyRound className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {pinError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !enteredPin}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-obsidian-950 font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Verifying...' : 'Unlock Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Empty Workspace State */}
      {!isCocoonLocked && currentApps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-glass">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yaru-darkAubergine to-yaru-orange mx-auto flex items-center justify-center shadow-sensory-glow">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">No Apps in this Workspace</h3>
              <p className="text-xs text-slate-400 mt-1">
                Add WhatsApp, Telegram, Discord, or custom services inside this isolated cocoon.
              </p>
            </div>
            <button
              onClick={() => setServiceCatalogOpen(true)}
              className="px-4 py-2 rounded-xl bg-yaru-orange hover:bg-yaru-lightOrange text-white font-semibold text-xs transition-colors shadow-md inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Your First App
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
