import { useTranslation } from 'react-i18next'
import { STORAGE_KEY } from './index'

export type Lang = 'id' | 'en'

export function localeTag(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'id-ID'
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'en' ? 'en' : 'id'
  const setLang = (l: Lang) => {
    void i18n.changeLanguage(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // ignore persistence failure
    }
  }
  return { lang, setLang }
}
