import { create } from 'zustand'
import type {
  Cocoon,
  AppInstance,
  SplitViewMode,
  SplitViewState,
  CocoonTelemetry,
  AppSettings,
  ServiceDefinition,
  ViewportRect
} from '../../shared/types'

interface InstarStoreState {
  cocoons: Cocoon[]
  selectedCocoonId: string | null
  apps: AppInstance[]
  splitState: SplitViewState
  telemetry: CocoonTelemetry[]
  settings: AppSettings | null
  services: ServiceDefinition[]

  // Modal & UI states
  isCommandPaletteOpen: boolean
  isPerformanceHudOpen: boolean
  isSettingsOpen: boolean
  isCocoonModalOpen: boolean
  editingCocoon: Cocoon | null
  isServiceCatalogOpen: boolean
  isPinModalOpen: boolean
  pinPromptCocoonId: string | null
  pinError: string | null

  // Actions
  loadInitialData: () => Promise<void>
  selectCocoon: (id: string) => Promise<void>
  setSplitMode: (mode: SplitViewMode) => Promise<void>
  setActiveApp: (appId: string, slotIndex?: number) => Promise<void>
  setSplitRatios: (ratios: number[]) => Promise<void>
  updateViewportBounds: (bounds: ViewportRect) => Promise<void>
  hibernateApp: (appId: string) => Promise<void>
  wakeApp: (appId: string) => Promise<void>
  hibernateAllInactive: () => Promise<void>
  reloadActiveViews: () => Promise<void>
  clearCocoonCache: (cocoonId: string) => Promise<void>
  clearAllCache: () => Promise<void>
  refreshTelemetry: () => Promise<void>

  // Modals & triggers
  setCommandPaletteOpen: (open: boolean) => void
  setPerformanceHudOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  openCreateCocoonModal: () => void
  openEditCocoonModal: (cocoon: Cocoon) => void
  closeCocoonModal: () => void
  setServiceCatalogOpen: (open: boolean) => void
  openPinModal: (cocoonId: string) => void
  closePinModal: () => void
  submitPin: (pin: string) => Promise<boolean>
  lockCocoon: (cocoonId: string) => Promise<void>

  // Mutators called by IPC event listeners
  handleCocoonUpdated: (cocoon: Cocoon) => void
  handleAppUpdated: (app: AppInstance) => void
  handleUnreadChanged: (appId: string, count: number, globalCount: number) => void
  handleFocusRequested: (cocoonId: string, appId?: string) => Promise<void>
}

export const useInstarStore = create<InstarStoreState>((set, get) => ({
  cocoons: [],
  selectedCocoonId: null,
  apps: [],
  splitState: { mode: 'single', activeAppIds: [], ratios: [0.5, 0.5] },
  telemetry: [],
  settings: null,
  services: [],

  isCommandPaletteOpen: false,
  isPerformanceHudOpen: false,
  isSettingsOpen: false,
  isCocoonModalOpen: false,
  editingCocoon: null,
  isServiceCatalogOpen: false,
  isPinModalOpen: false,
  pinPromptCocoonId: null,
  pinError: null,

  loadInitialData: async () => {
    if (!window.instar) return

    try {
      const [cocoons, apps, settings, services, telemetry] = await Promise.all([
        window.instar.getCocoons(),
        window.instar.getApps(),
        window.instar.getSettings(),
        window.instar.getServices(),
        window.instar.getTelemetry()
      ])

      const defaultCocoonId = cocoons[0]?.id || null

      set({
        cocoons,
        selectedCocoonId: defaultCocoonId,
        apps,
        settings,
        services,
        telemetry
      })

      // Mount first app if available
      if (defaultCocoonId) {
        const cocoonApps = apps.filter((a) => a.cocoonId === defaultCocoonId)
        if (cocoonApps.length > 0) {
          const firstAppId = cocoonApps[0].id
          await window.instar.setActiveApps([firstAppId], 'single')
          set({
            splitState: {
              mode: 'single',
              activeAppIds: [firstAppId],
              ratios: [0.5, 0.5]
            }
          })
        }
      }
    } catch (err) {
      console.error('[InstarStore] Error loading initial state', err)
    }
  },

  selectCocoon: async (cocoonId: string) => {
    const { cocoons, apps, splitState } = get()
    const cocoon = cocoons.find((c) => c.id === cocoonId)
    if (!cocoon) return

    if (cocoon.isLocked && cocoon.hasPin) {
      set({ isPinModalOpen: true, pinPromptCocoonId: cocoonId, pinError: null })
      return
    }

    set({ selectedCocoonId: cocoonId })

    // Find apps belonging to this cocoon
    const cocoonApps = apps.filter((a) => a.cocoonId === cocoonId)
    if (cocoonApps.length > 0) {
      const targetAppId = cocoonApps[0].id
      await window.instar.setActiveApps([targetAppId], splitState.mode)
      set({
        splitState: {
          ...splitState,
          activeAppIds: [targetAppId]
        }
      })
    } else {
      await window.instar.setActiveApps([], 'single')
      set({
        splitState: {
          mode: 'single',
          activeAppIds: [],
          ratios: [0.5, 0.5]
        }
      })
    }
  },

  setSplitMode: async (mode: SplitViewMode) => {
    const { selectedCocoonId, apps, splitState } = get()
    if (!selectedCocoonId) return

    const cocoonApps = apps.filter((a) => a.cocoonId === selectedCocoonId)
    let newActiveIds: string[] = []

    if (mode === 'single') {
      newActiveIds = splitState.activeAppIds.slice(0, 1)
      if (newActiveIds.length === 0 && cocoonApps[0]) {
        newActiveIds = [cocoonApps[0].id]
      }
    } else if (mode === 'dual') {
      newActiveIds = splitState.activeAppIds.slice(0, 2)
      if (newActiveIds.length < 2 && cocoonApps[1]) {
        newActiveIds = [cocoonApps[0]?.id, cocoonApps[1]?.id].filter(Boolean) as string[]
      }
    } else if (mode === 'triple') {
      newActiveIds = splitState.activeAppIds.slice(0, 3)
      if (newActiveIds.length < 3 && cocoonApps[2]) {
        newActiveIds = [cocoonApps[0]?.id, cocoonApps[1]?.id, cocoonApps[2]?.id].filter(Boolean) as string[]
      }
    }

    await window.instar.setActiveApps(newActiveIds, mode)
    set({
      splitState: {
        mode,
        activeAppIds: newActiveIds,
        ratios: mode === 'triple' ? [0.33, 0.33] : [0.5, 0.5]
      }
    })
  },

  setActiveApp: async (appId: string, slotIndex = 0) => {
    const { splitState } = get()
    const active = [...splitState.activeAppIds]

    if (splitState.mode === 'single') {
      active[0] = appId
    } else {
      active[slotIndex] = appId
    }

    await window.instar.setActiveApps(active, splitState.mode)
    set({
      splitState: {
        ...splitState,
        activeAppIds: active
      }
    })
  },

  setSplitRatios: async (ratios: number[]) => {
    await window.instar.setSplitRatios(ratios)
    set((state) => ({
      splitState: {
        ...state.splitState,
        ratios
      }
    }))
  },

  updateViewportBounds: async (bounds: ViewportRect) => {
    await window.instar.updateViewportBounds(bounds)
  },

  hibernateApp: async (appId: string) => {
    await window.instar.hibernateApp(appId)
    const apps = await window.instar.getApps()
    set({ apps })
  },

  wakeApp: async (appId: string) => {
    await window.instar.wakeApp(appId)
    const apps = await window.instar.getApps()
    set({ apps })
  },

  hibernateAllInactive: async () => {
    await window.instar.hibernateAllInactive()
    const [apps, telemetry] = await Promise.all([
      window.instar.getApps(),
      window.instar.getTelemetry()
    ])
    set({ apps, telemetry })
  },

  reloadActiveViews: async () => {
    await window.instar.reloadActiveViews()
  },

  clearCocoonCache: async (cocoonId: string) => {
    await window.instar.clearCocoonCache(cocoonId)
    const telemetry = await window.instar.getTelemetry()
    set({ telemetry })
  },

  clearAllCache: async () => {
    await window.instar.clearAllCache()
    const telemetry = await window.instar.getTelemetry()
    set({ telemetry })
  },

  refreshTelemetry: async () => {
    if (!window.instar) return
    const telemetry = await window.instar.getTelemetry()
    set({ telemetry })
  },

  setCommandPaletteOpen: (open: boolean) => set({ isCommandPaletteOpen: open }),
  setPerformanceHudOpen: (open: boolean) => set({ isPerformanceHudOpen: open }),
  setSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),

  openCreateCocoonModal: () => set({ isCocoonModalOpen: true, editingCocoon: null }),
  openEditCocoonModal: (cocoon: Cocoon) => set({ isCocoonModalOpen: true, editingCocoon: cocoon }),
  closeCocoonModal: () => set({ isCocoonModalOpen: false, editingCocoon: null }),
  setServiceCatalogOpen: (open: boolean) => set({ isServiceCatalogOpen: open }),

  openPinModal: (cocoonId: string) => set({ isPinModalOpen: true, pinPromptCocoonId: cocoonId, pinError: null }),
  closePinModal: () => set({ isPinModalOpen: false, pinPromptCocoonId: null, pinError: null }),

  submitPin: async (pin: string) => {
    const { pinPromptCocoonId } = get()
    if (!pinPromptCocoonId) return false

    const success = await window.instar.unlockCocoon(pinPromptCocoonId, pin)
    if (success) {
      set({ isPinModalOpen: false, pinPromptCocoonId: null, pinError: null })
      const cocoons = await window.instar.getCocoons()
      set({ cocoons, selectedCocoonId: pinPromptCocoonId })
      return true
    } else {
      set({ pinError: 'Invalid PIN code. Please retry.' })
      return false
    }
  },

  lockCocoon: async (cocoonId: string) => {
    await window.instar.lockCocoon(cocoonId)
    const cocoons = await window.instar.getCocoons()
    set({ cocoons })
  },

  handleCocoonUpdated: (cocoon: Cocoon) => {
    set((state) => ({
      cocoons: state.cocoons.map((c) => (c.id === cocoon.id ? cocoon : c))
    }))
  },

  handleAppUpdated: (app: AppInstance) => {
    set((state) => ({
      apps: state.apps.map((a) => (a.id === app.id ? app : a))
    }))
  },

  handleUnreadChanged: (appId: string, count: number, globalCount: number) => {
    set((state) => ({
      apps: state.apps.map((a) => (a.id === appId ? { ...a, unreadCount: count } : a)),
      settings: state.settings ? { ...state.settings, globalUnreadCount: globalCount } : null
    }))
  },

  handleFocusRequested: async (cocoonId: string, appId?: string) => {
    await get().selectCocoon(cocoonId)
    if (appId) {
      await get().setActiveApp(appId)
    }
  }
}))
