import { useState, useEffect } from 'react'
export default function ScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      setP((scrollTop / (scrollHeight - clientHeight)) * 100)
    }
    window.addEventListener('scroll', update)
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <div style={{ position:'fixed', top:0, left:0, zIndex:9999, width:`${p}%`, height:2, background:'var(--ac)', transition:'width .08s linear', pointerEvents:'none' }}/>
}
