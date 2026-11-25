import { useState, useEffect, useCallback } from 'react'

export function useTheme() {
  const getInit = () => {
    try {
      const s = localStorage.getItem('arav-theme')
      if (s === 'dark') return true
      if (s === 'light') return false
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  const [dark, setDark] = useState(getInit)
  useEffect(() => {
    const attr = dark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', attr)
    try { localStorage.setItem('arav-theme', attr) } catch (e) {}
  }, [dark])
  const toggle = useCallback(() => setDark(d => !d), [])
  return { dark, toggle }
}
