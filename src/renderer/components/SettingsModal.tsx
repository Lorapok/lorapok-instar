import React, { useState } from 'react'
import { X, Cpu, Shield, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, settings, loadInitialData } = useInstarStore()

  const [wayland, setWayland] = useState(settings?.enableWaylandOzone ?? true)
  const [vulkan, setVulkan] = useState(settings?.enableVulkanGpu ?? true)
  const [vaapi, setVaapi] = useState(settings?.enableHardwareVideoDecode ?? true)
  const [defaultHibernate, setDefaultHibernate] = useState(settings?.defaultHibernateMinutes ?? 10)

  // Vault export/import states
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [importPassphrase, setImportPassphrase] = useState('')
  const [importJson, setImportJson] = useState('')
  const [vaultMsg, setVaultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isSettingsOpen) return null

  const handleSavePreferences = async () => {
    if (window.instar) {
      await window.instar.updateSettings({
        enableWaylandOzone: wayland,
        enableVulkanGpu: vulkan,
        enableHardwareVideoDecode: vaapi,
        defaultHibernateMinutes: defaultHibernate
      })
      await loadInitialData()
      setSettingsOpen(false)
    }
  }

  const handleExportVault = async () => {
    if (!exportPassphrase.trim()) {
      setVaultMsg({ type: 'error', text: 'Enter a strong passphrase to encrypt the vault.' })
      return
    }

    try {
      const encryptedJson = await window.instar.exportVault(exportPassphrase.trim())
      // Trigger browser download of .instar-vault file
      const blob = new Blob([encryptedJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lorapok-instar-backup-${new Date().toISOString().slice(0, 10)}.instar-vault`
      a.click()
      URL.revokeObjectURL(url)

      setExportPassphrase('')
      setVaultMsg({ type: 'success', text: 'Encrypted vault exported successfully!' })
    } catch (err) {
      setVaultMsg({ type: 'error', text: 'Failed to export vault. Try again.' })
    }
  }

  const handleImportVault = async () => {
    if (!importJson.trim() || !importPassphrase.trim()) {
      setVaultMsg({ type: 'error', text: 'Paste the vault archive and enter the decryption passphrase.' })
      return
    }

    try {
      await window.instar.importVault(importJson.trim(), importPassphrase.trim())
      await loadInitialData()
      setImportJson('')
      setImportPassphrase('')
      setVaultMsg({ type: 'success', text: 'Vault restored successfully!' })
    } catch (err) {
      setVaultMsg({ type: 'error', text: 'Decryption failed: Incorrect passphrase or corrupt file.' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-obsidian-750 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-obsidian-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-obsidian-800 border border-obsidian-700 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-yaru-orange" />
            </div>
            <div>
              <h2 className="text-base font-bold">Preferences & Linux Hardware Flags</h2>
              <p className="text-xs text-slate-400">Wayland compositor, Vulkan GPU acceleration, and encrypted backups</p>
            </div>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="p-1.5 rounded-lg hover:bg-obsidian-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Linux Hardware Acceleration */}
        <div className="p-4 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 space-y-3 text-xs">
          <h3 className="font-semibold text-slate-200">Hardware & GPU Acceleration (Ubuntu / Linux)</h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-200">Native Wayland Ozone Platform</div>
              <div className="text-[10px] text-slate-400">Zero-overhead fractional scaling and native Wayland subsurfaces</div>
            </div>
            <input
              type="checkbox"
              checked={wayland}
              onChange={(e) => setWayland(e.target.checked)}
              className="w-4 h-4 rounded accent-yaru-orange"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-200">Vulkan Hardware Compositing</div>
              <div className="text-[10px] text-slate-400">Low-latency 60/120fps window compositing</div>
            </div>
            <input
              type="checkbox"
              checked={vulkan}
              onChange={(e) => setVulkan(e.target.checked)}
              className="w-4 h-4 rounded accent-yaru-orange"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-200">VA-API Hardware Video Decoding</div>
              <div className="text-[10px] text-slate-400">Offload WhatsApp/Discord video streams to Intel/AMD/NVIDIA GPU</div>
            </div>
            <input
              type="checkbox"
              checked={vaapi}
              onChange={(e) => setVaapi(e.target.checked)}
              className="w-4 h-4 rounded accent-yaru-orange"
            />
          </div>
        </div>

        {/* Encrypted Vault Backup (.instar-vault) */}
        <div className="p-4 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-yaru-lightOrange" />
            <h3 className="font-semibold text-slate-200">Encrypted Workspace Backup (.instar-vault)</h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Export all workspaces, apps, and proxy configurations protected by AES-256-GCM and Argon2id/scrypt key derivation.
          </p>

          {vaultMsg && (
            <div
              className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
                vaultMsg.type === 'success' ? 'bg-sensory-emerald/20 text-sensory-emerald border border-sensory-emerald/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {vaultMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{vaultMsg.text}</span>
            </div>
          )}

          {/* Export */}
          <div className="space-y-2 pt-1 border-t border-obsidian-750">
            <label className="block text-[11px] font-medium text-slate-300">Export Encrypted Backup</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
                placeholder="Passphrase to encrypt archive"
                className="flex-1 px-3 py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-700 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={handleExportVault}
                className="px-3.5 py-1.5 rounded-xl bg-obsidian-750 hover:bg-obsidian-700 text-slate-200 font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="space-y-2 pt-2 border-t border-obsidian-750">
            <label className="block text-[11px] font-medium text-slate-300">Restore from Vault Archive</label>
            <textarea
              rows={2}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste .instar-vault JSON content here..."
              className="w-full px-3 py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-700 text-[10px] font-mono text-slate-100"
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                placeholder="Decryption passphrase"
                className="flex-1 px-3 py-1.5 rounded-xl bg-obsidian-900 border border-obsidian-700 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={handleImportVault}
                className="px-3.5 py-1.5 rounded-xl bg-yaru-orange hover:bg-yaru-lightOrange text-white font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Restore
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-obsidian-800 text-xs">
          <div className="text-[10px] text-slate-500 font-mono">Lorapok Instar v1.0.0 • Lorapok Labs</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2 rounded-xl bg-yaru-orange hover:bg-yaru-lightOrange text-white font-bold shadow-sensory-glow"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
