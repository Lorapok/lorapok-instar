import { app, powerMonitor, type Session } from 'electron'
import { join } from 'node:path'
import { existsSync, readdirSync, statSync, unlinkSync, rmSync } from 'node:fs'
import { CocoonRepository, TelemetryRepository } from '../database/repositories'
import { LRU_EVICTION_DAYS } from '../../shared/constants'

export class CacheManager {
  private evictionTimer: NodeJS.Timeout | null = null

  public init(): void {
    const handleIdleOrSuspend = () => {
      this.runLruCachePruning().catch((err) => {
        console.error('[CacheManager] Error in idle LRU cache eviction', err)
      })
    }

    powerMonitor.on('lock-screen', handleIdleOrSuspend)
    powerMonitor.on('suspend', handleIdleOrSuspend)

    // Also schedule periodic check every 30 minutes, checking idle time
    this.evictionTimer = setInterval(() => {
      const idleTimeSeconds = powerMonitor.getSystemIdleTime()
      if (idleTimeSeconds >= 120) {
        this.runLruCachePruning().catch((err) => {
          console.error('[CacheManager] Error in scheduled LRU cache eviction', err)
        })
      }
    }, 30 * 60 * 1000)
  }

  // Get base partition storage directory
  public getPartitionPath(partition: string): string {
    // partition format is persist:cocoon_<uuid>
    const safeName = partition.replace(/^persist:/, '')
    return join(app.getPath('userData'), 'Partitions', safeName)
  }

  // Measure cache and storage metrics for a Cocoon session
  public async measureCocoonStorage(cocoonId: string, session?: Session): Promise<{ diskCacheBytes: number; codeCacheBytes: number }> {
    const partition = `persist:cocoon_${cocoonId}`
    const partPath = this.getPartitionPath(partition)

    let diskCacheBytes = 0
    let codeCacheBytes = 0

    if (existsSync(partPath)) {
      const cacheDir = join(partPath, 'Cache', 'Cache_Data')
      const codeCacheDir = join(partPath, 'Code Cache')
      const gpuCacheDir = join(partPath, 'GPUCache')

      if (existsSync(cacheDir)) {
        diskCacheBytes += this.getDirectorySize(cacheDir)
      }
      if (existsSync(gpuCacheDir)) {
        diskCacheBytes += this.getDirectorySize(gpuCacheDir)
      }
      if (existsSync(codeCacheDir)) {
        codeCacheBytes += this.getDirectorySize(codeCacheDir)
      }
    }

    // If session is active and provided, also consult Chromium internal cache size if available
    if (session) {
      try {
        const internalSize = await session.clearCache() // returns void in Electron, or session.getCacheSize if modern
      } catch {
        // Ignored
      }
    }

    TelemetryRepository.upsert({
      cocoonId,
      diskCacheBytes,
      codeCacheBytes,
      memoryBytes: 0 // Will be aggregated by viewManager
    })

    return { diskCacheBytes, codeCacheBytes }
  }

  // Enforce disk quota limit for a Cocoon
  public async enforceQuota(cocoonId: string, session: Session): Promise<void> {
    const cocoon = CocoonRepository.getById(cocoonId)
    if (!cocoon) return

    const quotaBytes = cocoon.diskCacheLimitMb * 1024 * 1024
    const stats = await this.measureCocoonStorage(cocoonId, session)

    if (stats.diskCacheBytes > quotaBytes) {
      console.log(`[CacheManager] Cocoon ${cocoon.name} exceeded quota (${(stats.diskCacheBytes / 1024 / 1024).toFixed(1)}MB > ${cocoon.diskCacheLimitMb}MB). Clearing session cache...`)
      await session.clearCache()
      await session.clearCodeCaches({})
      await this.measureCocoonStorage(cocoonId, session)
    }
  }

  // Purge temporary caches for a specific Cocoon partition
  public async clearCocoonCache(cocoonId: string, session?: Session): Promise<boolean> {
    if (session) {
      await session.clearCache()
      await session.clearCodeCaches({})
    }

    const partition = `persist:cocoon_${cocoonId}`
    const partPath = this.getPartitionPath(partition)

    if (existsSync(partPath)) {
      const targets = [
        join(partPath, 'Cache'),
        join(partPath, 'Code Cache'),
        join(partPath, 'GPUCache'),
        join(partPath, 'DawnCache')
      ]

      for (const target of targets) {
        if (existsSync(target)) {
          try {
            rmSync(target, { recursive: true, force: true })
          } catch (err) {
            console.warn(`[CacheManager] Could not remove cache dir: ${target}`, err)
          }
        }
      }
    }

    await this.measureCocoonStorage(cocoonId, session)
    return true
  }

  // Purge all caches across all Cocoons
  public async clearAllCaches(): Promise<boolean> {
    const cocoons = CocoonRepository.getAll()
    for (const c of cocoons) {
      await this.clearCocoonCache(c.id)
    }
    return true
  }

  // LRU eviction worker: deletes artifacts older than 14 days without touching cookies or IndexedDB
  public async runLruCachePruning(): Promise<number> {
    const partitionsDir = join(app.getPath('userData'), 'Partitions')
    if (!existsSync(partitionsDir)) {
      return 0
    }

    const cutoffMs = Date.now() - LRU_EVICTION_DAYS * 24 * 60 * 60 * 1000
    let prunedCount = 0

    const partitionDirs = readdirSync(partitionsDir)
    for (const pDir of partitionDirs) {
      const fullPartitionPath = join(partitionsDir, pDir)
      const pruneTargets = [
        join(fullPartitionPath, 'Cache', 'Cache_Data'),
        join(fullPartitionPath, 'Code Cache', 'js'),
        join(fullPartitionPath, 'Code Cache', 'wasm'),
        join(fullPartitionPath, 'GPUCache')
      ]

      for (const target of pruneTargets) {
        if (existsSync(target)) {
          prunedCount += this.pruneDirectoryOldFiles(target, cutoffMs)
        }
      }
    }

    if (prunedCount > 0) {
      console.log(`[CacheManager] LRU Eviction pruned ${prunedCount} stale cached objects older than ${LRU_EVICTION_DAYS} days`)
    }

    return prunedCount
  }

  private pruneDirectoryOldFiles(dirPath: string, cutoffMs: number): number {
    let count = 0
    try {
      const entries = readdirSync(dirPath)
      for (const entry of entries) {
        const fullPath = join(dirPath, entry)
        const stats = statSync(fullPath)
        if (stats.isFile() && stats.mtimeMs < cutoffMs) {
          unlinkSync(fullPath)
          count++
        }
      }
    } catch {
      // Ignore directory access hiccups
    }
    return count
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)
        if (entry.isDirectory()) {
          totalSize += this.getDirectorySize(fullPath)
        } else if (entry.isFile()) {
          const stats = statSync(fullPath)
          totalSize += stats.size
        }
      }
    } catch {
      // Ignore transient access locks
    }
    return totalSize
  }

  public destroy(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer)
      this.evictionTimer = null
    }
  }
}

export const cacheManager = new CacheManager()
