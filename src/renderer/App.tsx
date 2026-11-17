import React, { useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { CocoonRail } from './components/CocoonRail'
import { AppTabStrip } from './components/AppTabStrip'
import { ViewportStage } from './components/ViewportStage'
import { CocoonModal } from './components/CocoonModal'
import { ServiceCatalog } from './components/ServiceCatalog'
import { CommandPalette } from './components/CommandPalette'
import { PerformanceHud } from './components/PerformanceHud'
import { SettingsModal } from './components/SettingsModal'
import { useInstarStore } from './store/useInstarStore'

export default function App() {
  const {
    loadInitialData,
    handleCocoonUpdated,
    handleAppUpdated,
    handleUnreadChanged,
    handleFocusRequested
  } = useInstarStore()

  useEffect(() => {
    // 1. Initial data bootstrap
    loadInitialData()

    // 2. Attach real-time IPC listeners if running in electron context
    if (window.instar) {
      const unsubCocoon = window.instar.onCocoonUpdated((cocoon) => {
        handleCocoonUpdated(cocoon)
      })

      const unsubApp = window.instar.onAppUpdated((app) => {
        handleAppUpdated(app)
      })

      const unsubUnread = window.instar.onUnreadCountChanged(({ appId, unreadCount, globalCount }) => {
        handleUnreadChanged(appId, unreadCount, globalCount)
      })

      const unsubFocus = window.instar.onFocusAppRequested(({ cocoonId, appId }) => {
        handleFocusRequested(cocoonId, appId)
      })

      return () => {
        unsubCocoon()
        unsubApp()
        unsubUnread()
        unsubFocus()
      }
    }
    return undefined
  }, [loadInitialData, handleCocoonUpdated, handleAppUpdated, handleUnreadChanged, handleFocusRequested])

  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-none overflow-hidden">
      {/* Linux Custom Title Bar */}
      <TitleBar />

      {/* Main Workspace Body */}
      <div className="flex-1 flex w-full h-[calc(100vh-2.5rem)] overflow-hidden">
        {/* Left Cocoon Rail */}
        <CocoonRail />

        {/* Center Workspace Stage */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-obsidian-950">
          <AppTabStrip />
          <ViewportStage />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <CocoonModal />
      <ServiceCatalog />
      <CommandPalette />
      <PerformanceHud />
      <SettingsModal />
    </div>
  )
}
