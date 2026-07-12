import { DEFAULT_APP_CONFIG } from '../types'
import type { AppConfig } from '../types'
import { api } from './client'

/**
 * Konfigurasi runtime dari GET /api/config (publik). get() sinkron dari
 * cache — nilai default dipakai sampai fetch pertama selesai; kuota tetap
 * ditegakkan server-side jadi cache basi aman.
 */
export interface ConfigStore {
  get(): AppConfig
  refresh(): Promise<AppConfig>
  update(patch: Partial<AppConfig>): Promise<AppConfig>
}

export function createHttpConfigStore(): ConfigStore {
  let cached: AppConfig = DEFAULT_APP_CONFIG

  const store: ConfigStore = {
    get: () => cached,
    async refresh() {
      cached = await api<AppConfig>('/api/config')
      return cached
    },
    async update(patch) {
      cached = await api<AppConfig>('/api/admin/config', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      return cached
    },
  }

  // Prefetch di browser; kegagalan (mis. offline) dibiarkan — default tetap dipakai.
  if (typeof window !== 'undefined') void store.refresh().catch(() => {})
  return store
}
