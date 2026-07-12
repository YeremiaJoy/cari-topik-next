import { useEffect, useState } from 'react'

/** Event `beforeinstallprompt` (Chrome/Edge/Android) — belum ada di lib DOM TypeScript. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Menangkap prompt pemasangan PWA.
 * - `canInstall`: browser siap menampilkan prompt pasang satu-ketuk.
 * - `installed`: app sudah berjalan standalone / baru saja dipasang.
 * - `promptInstall()`: tampilkan prompt; resolve `true` bila diterima.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') setDeferred(null)
    return choice.outcome === 'accepted'
  }

  return { canInstall: deferred !== null, installed, promptInstall }
}
