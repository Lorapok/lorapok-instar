import React, { useState, useEffect } from 'react'
import { X, Shield, Lock, Globe, HardDrive, Trash2 } from 'lucide-react'
import { useInstarStore } from '../store/useInstarStore'
import { COCOON_COLORS, COCOON_ICONS } from '../../shared/constants'
import type { WebRtcPolicy } from '../../shared/types'

export const CocoonModal: React.FC = () => {
  const { isCocoonModalOpen, editingCocoon, closeCocoonModal, loadInitialData } = useInstarStore()

  const [name, setName] = useState('')
  const [color, setColor] = useState(COCOON_COLORS[0].value)
  const [icon, setIcon] = useState('briefcase')
  const [pin, setPin] = useState('')
  const [hasPin, setHasPin] = useState(false)
  const [lockTimeout, setLockTimeout] = useState(10)
  const [cacheLimit, setCacheLimit] = useState(250)
  const [trackerShield, setTrackerShield] = useState(true)
  const [webrtcPolicy, setWebrtcPolicy] = useState<WebRtcPolicy>('default_public_interface_only')
  const [autoHibernate, setAutoHibernate] = useState(10)

  // Proxy state
  const [proxyEnabled, setProxyEnabled] = useState(false)
  const [proxyProtocol, setProxyProtocol] = useState<'http' | 'https' | 'socks5'>('socks5')
  const [proxyHost, setProxyHost] = useState('')
  const [proxyPort, setProxyPort] = useState(1080)
  const [proxyUser, setProxyUser] = useState('')
  const [proxyPass, setProxyPass] = useState('')

  useEffect(() => {
    if (editingCocoon) {
      setName(editingCocoon.name)
      setColor(editingCocoon.color)
      setIcon(editingCocoon.icon)
      setHasPin(editingCocoon.hasPin)
      setLockTimeout(editingCocoon.lockTimeoutMinutes)
      setCacheLimit(editingCocoon.diskCacheLimitMb)
      setTrackerShield(editingCocoon.trackerShieldEnabled)
      setWebrtcPolicy(editingCocoon.webrtcPolicy)
      setAutoHibernate(editingCocoon.autoHibernateMinutes)

      if (editingCocoon.proxyConfig && editingCocoon.proxyConfig.enabled) {
        setProxyEnabled(true)
        setProxyProtocol(editingCocoon.proxyConfig.protocol)
        setProxyHost(editingCocoon.proxyConfig.host)
        setProxyPort(editingCocoon.proxyConfig.port)
        setProxyUser(editingCocoon.proxyConfig.username || '')
        setProxyPass(editingCocoon.proxyConfig.password || '')
      } else {
        setProxyEnabled(false)
      }
    } else {
      setName('')
      setColor(COCOON_COLORS[0].value)
      setIcon('briefcase')
      setPin('')
      setHasPin(false)
      setLockTimeout(10)
      setCacheLimit(250)
      setTrackerShield(true)
      setWebrtcPolicy('default_public_interface_only')
      setAutoHibernate(10)
      setProxyEnabled(false)
    }
  }, [editingCocoon])

  if (!isCocoonModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const proxyConfig = proxyEnabled
      ? {
          enabled: true,
          protocol: proxyProtocol,
          host: proxyHost.trim(),
          port: Number(proxyPort),
          username: proxyUser ? proxyUser.trim() : undefined,
          password: proxyPass ? proxyPass.trim() : undefined
        }
      : null

    if (editingCocoon) {
      await window.instar.updateCocoon(
        editingCocoon.id,
        {
          name: name.trim(),
          color,
          icon,
          lockTimeoutMinutes: lockTimeout,
          diskCacheLimitMb: cacheLimit,
          trackerShieldEnabled: trackerShield,
          webrtcPolicy,
          autoHibernateMinutes: autoHibernate,
          proxyConfig
        },
        hasPin ? (pin ? pin : undefined) : null
      )
    } else {
      await window.instar.createCocoon(
        {
          name: name.trim(),
          color,
          icon,
          order: 99,
          lockTimeoutMinutes: lockTimeout,
          diskCacheLimitMb: cacheLimit,
          trackerShieldEnabled: trackerShield,
          webrtcPolicy,
          autoHibernateMinutes: autoHibernate,
          proxyConfig
        },
        hasPin && pin ? pin : undefined
      )
    }

    await loadInitialData()
    closeCocoonModal()
  }

  const handleDelete = async () => {
    if (!editingCocoon) return
    if (confirm(`Are you sure you want to delete workspace "${editingCocoon.name}" and all its apps?`)) {
      await window.instar.deleteCocoon(editingCocoon.id)
      await loadInitialData()
      closeCocoonModal()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-obsidian-750 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-obsidian-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {editingCocoon ? `Edit Workspace (${editingCocoon.name})` : 'Create Isolated Cocoon'}
              </h2>
              <p className="text-xs text-slate-400">Sandboxed partition with hardware isolation & encryption</p>
            </div>
          </div>
          <button onClick={closeCocoonModal} className="p-1.5 rounded-lg hover:bg-obsidian-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Workspace Name */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">Workspace Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Client A, Personal, Crypto"
              className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 focus:border-yaru-orange outline-none text-slate-100 text-xs"
            />
          </div>

          {/* Color & Icon Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Color Palette</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COCOON_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c.value ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Workspace Icon</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-obsidian-850 border border-obsidian-750 text-slate-200 outline-none"
              >
                {COCOON_ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security & Cryptographic PIN */}
          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-slate-200">Cryptographic PIN Shield</span>
              </div>
              <input
                type="checkbox"
                checked={hasPin}
                onChange={(e) => setHasPin(e.target.checked)}
                className="w-4 h-4 rounded accent-yaru-orange"
              />
            </div>

            {hasPin && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {editingCocoon ? 'Set New PIN (leave blank to keep)' : 'Set 4-12 Digit PIN'}
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN Code"
                    className="w-full px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Auto-Lock on Idle</label>
                  <select
                    value={lockTimeout}
                    onChange={(e) => setLockTimeout(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-200"
                  >
                    <option value={0}>Never</option>
                    <option value={3}>After 3 minutes</option>
                    <option value={5}>After 5 minutes</option>
                    <option value={10}>After 10 minutes</option>
                    <option value={30}>After 30 minutes</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Disk Cache & Hibernate Settings */}
          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sensory-sapphire" />
              <span className="font-semibold text-slate-200">Disk Quota & Resource Hibernation</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Disk Cache Ceiling: <span className="text-sensory-sapphire font-bold">{cacheLimit} MB</span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={1024}
                  step={50}
                  value={cacheLimit}
                  onChange={(e) => setCacheLimit(Number(e.target.value))}
                  className="w-full accent-yaru-orange"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Deep Freeze Hibernation</label>
                <select
                  value={autoHibernate}
                  onChange={(e) => setAutoHibernate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-200"
                >
                  <option value={0}>Never hibernate</option>
                  <option value={3}>After 3m inactive</option>
                  <option value={10}>After 10m inactive (recommended)</option>
                  <option value={30}>After 30m inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-300">Turbo Tracker Shield (Ad & telemetry block)</span>
              <input
                type="checkbox"
                checked={trackerShield}
                onChange={(e) => setTrackerShield(e.target.checked)}
                className="w-4 h-4 rounded accent-yaru-orange"
              />
            </div>
          </div>

          {/* Per-Cocoon Isolated Proxy */}
          <div className="p-3.5 rounded-2xl bg-obsidian-850/80 border border-obsidian-750 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sensory-emerald" />
                <span className="font-semibold text-slate-200">Isolated Proxy & DNS Protection</span>
              </div>
              <input
                type="checkbox"
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-yaru-orange"
              />
            </div>

            {proxyEnabled && (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Protocol</label>
                    <select
                      value={proxyProtocol}
                      onChange={(e) => setProxyProtocol(e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700"
                    >
                      <option value="socks5">SOCKS5</option>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Host / IP</label>
                    <input
                      type="text"
                      required
                      placeholder="127.0.0.1"
                      value={proxyHost}
                      onChange={(e) => setProxyHost(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Port</label>
                    <input
                      type="number"
                      required
                      value={proxyPort}
                      onChange={(e) => setProxyPort(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Username (Optional)</label>
                    <input
                      type="text"
                      value={proxyUser}
                      onChange={(e) => setProxyUser(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Password (Optional)</label>
                    <input
                      type="password"
                      value={proxyPass}
                      onChange={(e) => setProxyPass(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">WebRTC IP Leak Policy</label>
                  <select
                    value={webrtcPolicy}
                    onChange={(e) => setWebrtcPolicy(e.target.value as WebRtcPolicy)}
                    className="w-full px-2 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-200"
                  >
                    <option value="default_public_interface_only">Default Public Interface Only</option>
                    <option value="disable_non_proxied_udp">Strict: Disable Non-Proxied UDP</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {editingCocoon ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-600/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Cocoon
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeCocoonModal}
                className="px-4 py-2 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-yaru-orange hover:bg-yaru-lightOrange text-white font-bold shadow-sensory-glow"
              >
                {editingCocoon ? 'Save Changes' : 'Create Cocoon'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
