import { useState, useEffect } from 'react'
import { ArrowUpIcon } from './Icons'
export default function BackToTop() {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const h = () => setVis(window.scrollY > 400)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  if (!vis) return null
  return (
    <button onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} title="Back to top"
      style={{ position:'fixed', bottom:96, right:28, zIndex:998, width:44, height:44, background:'var(--sf)', border:'1px solid var(--sf2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,.12)', color:'var(--md)', transition:'all .2s' }}
      onMouseOver={e=>{Object.assign(e.currentTarget.style,{background:'var(--ac)',color:'#fff',borderColor:'var(--ac)'})}}
      onMouseOut={e =>{Object.assign(e.currentTarget.style,{background:'var(--sf)',color:'var(--md)',borderColor:'var(--sf2)'})}}>
      <ArrowUpIcon />
    </button>
  )
}
