import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { dict as id } from './locales/id'
import { dict as en } from './locales/en'

const STORAGE_KEY = 'catopik.lang'

function initialLang(): 'id' | 'en' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    // localStorage tidak tersedia (SSR / private mode) — pakai default
  }
  return 'id'
}

void i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: initialLang(),
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
})

export default i18n
export { STORAGE_KEY }
