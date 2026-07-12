export interface KVStore {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export function createMemoryStore(): KVStore {
  const map = new Map<string, string>()
  return {
    get<T>(key: string): T | null {
      const raw = map.get(key)
      return raw === undefined ? null : (JSON.parse(raw) as T)
    },
    set(key, value) {
      map.set(key, JSON.stringify(value))
    },
    remove(key) {
      map.delete(key)
    },
  }
}

export function createLocalStorageStore(): KVStore {
  const fallback = createMemoryStore()
  const available = (() => {
    try {
      const probe = '__caritopik_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  })()
  if (!available) return fallback
  return {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(key)
        return raw === null ? null : (JSON.parse(raw) as T)
      } catch {
        return fallback.get<T>(key)
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        fallback.set(key, value)
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key)
      } catch {
        fallback.remove(key)
      }
    },
  }
}
