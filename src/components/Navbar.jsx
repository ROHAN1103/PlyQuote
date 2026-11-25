import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SunIcon, MoonIcon, ChevronIcon, WAIconSm } from './Icons'
import { NAV_MENUS } from '../data/content'

const PAD = '0 clamp(20px,5vw,60px)'

export default function Navbar({ dark, toggleDark }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scrolled, setScrolled]         = useState(false)
  const [openMenu, setOpenMenu]         = useState(null)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [mobileExp, setMobileExp]       = useState(null)
  const closeTimer = useRef(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  // close everything on route change
  useEffect(() => { setOpenMenu(null); setMobileOpen(false); setMobileExp(null) }, [pathname])

  const startClose  = () => { closeTimer.current = setTimeout(() => setOpenMenu(null), 160) }
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  const openItem    = k  => { cancelClose(); setOpenMenu(k) }
  const goTo        = p  => { navigate(p); setOpenMenu(null); setMobileOpen(false); setMobileExp(null) }

  const transparent = pathname === '/' && !scrolled && !openMenu

  const NavBtn = ({ label, path }) => (
    <button onClick={() => goTo(path)}
      style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 14px', fontSize:'.875rem', fontWeight:400, color: pathname === path ? 'var(--ac)' : 'var(--md)', transition:'color .2s' }}
      onMouseOver={e => e.currentTarget.style.color='var(--ac)'}
      onMouseOut ={e => e.currentTarget.style.color = pathname === path ? 'var(--ac)' : 'var(--md)'}>
      {label}
    </button>
  )

  const ThemeBtn = (
    <button onClick={toggleDark} title={dark ? 'Switch to light' : 'Switch to dark'}
      style={{ background:'var(--sf)', border:'1px solid var(--sf2)', borderRadius:20, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--md)', transition:'all .2s', flexShrink:0 }}
      onMouseOver={e => { e.currentTarget.style.borderColor='var(--ac)'; e.currentTarget.style.color='var(--ac)' }}
      onMouseOut ={e => { e.currentTarget.style.borderColor='var(--sf2)'; e.currentTarget.style.color='var(--md)' }}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )

  return (
    <nav style={{ position:'fixed', inset:'0 0 auto 0', zIndex:500, background: transparent ? 'transparent' : 'var(--bg)', borderBottom: transparent ? 'none' : '1px solid var(--sf2)', transition:'background .35s,border-color .35s' }}
         onMouseLeave={startClose}>

      {/* Top bar */}
      <div style={{ padding: PAD }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:72 }}>

          {/* Logo */}
          <button onClick={() => goTo('/')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'baseline', gap:7, padding:0, flexShrink:0 }}>
            <span className="serif" style={{ fontSize:'1.75rem', fontWeight:600, color:'var(--dk)', letterSpacing:'-.025em', lineHeight:1 }}>Arav</span>
            <span style={{ fontSize:'.7rem', fontWeight:400, color:'var(--ac)', letterSpacing:'.14em', textTransform:'uppercase' }}>Interiors</span>
          </button>

          {/* Desktop links */}
          <div className="nav-lks" style={{ display:'flex', alignItems:'center', gap:2 }}>
            {Object.entries({ interiors:'Interiors', ideas:'Design Ideas', about:'About' }).map(([key, label]) => (
              <div key={key} onMouseEnter={() => openItem(key)} style={{ position:'relative' }}>
                <button style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 14px', fontSize:'.875rem', color: openMenu===key ? 'var(--ac)' : 'var(--md)', display:'flex', alignItems:'center', gap:5, transition:'color .2s' }}>
                  {label} <ChevronIcon open={openMenu === key} />
                </button>
              </div>
            ))}
            <div style={{ width:1, height:18, background:'var(--sf2)', margin:'0 6px' }}/>
            <NavBtn label="Portfolio" path="/portfolio" />
            <NavBtn label="Process"   path="/process"   />
            <div style={{ width:1, height:18, background:'var(--sf2)', margin:'0 6px' }}/>
            {ThemeBtn}
            <div style={{ width:8 }}/>
            <button onClick={() => goTo('/contact')} className="btn-p" style={{ padding:'10px 20px', fontSize:'.83rem' }}>Book a Consult</button>
          </div>

          {/* Mobile controls */}
          <div className="nav-mb" style={{ display:'none', alignItems:'center', gap:10 }}>
            {ThemeBtn}
            <button onClick={() => setMobileOpen(o => !o)} style={{ background:'none', border:'none', color:'var(--dk)', cursor:'pointer', padding:4 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {mobileOpen
                  ? <><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></>
                  : <><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></>}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mega menu */}
      {openMenu && NAV_MENUS[openMenu] && (
        <div className="nav-mega" onMouseEnter={cancelClose} onMouseLeave={startClose}
             style={{ position:'fixed', top:72, left:0, right:0, zIndex:499, background:'var(--bg)', borderBottom:'1px solid var(--sf2)', boxShadow:'0 20px 48px rgba(0,0,0,.09)', padding:`28px ${PAD.split(' ')[1]} 36px` }}>
          <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:`repeat(${NAV_MENUS[openMenu].cols.length},1fr)${NAV_MENUS[openMenu].hasPromo ? ' 210px' : ''}`, gap:40 }}>
            {NAV_MENUS[openMenu].cols.map(col => (
              <div key={col.heading}>
                <div style={{ fontSize:'.67rem', letterSpacing:'.15em', color:'var(--lt)', fontWeight:500, marginBottom:14 }}>{col.heading}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  {col.items.map(item => (
                    <button key={item.label} onClick={() => goTo(item.path || '/contact')}
                      style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'8px 10px', borderRadius:3, transition:'background .15s' }}
                      onMouseOver={e => e.currentTarget.style.background='var(--sf)'}
                      onMouseOut ={e => e.currentTarget.style.background='none'}>
                      <div style={{ fontSize:'.875rem', color:'var(--dk)', marginBottom: item.sub ? 2 : 0 }}>{item.label}</div>
                      {item.sub && <div style={{ fontSize:'.73rem', color:'var(--lt)' }}>{item.sub}</div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {NAV_MENUS[openMenu].hasPromo && (
              <div style={{ background:'var(--sf)', borderRadius:6, padding:24, border:'1px solid var(--sf2)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'.68rem', letterSpacing:'.12em', color:'var(--ac)', marginBottom:8 }}>SERVING BANGALORE</div>
                  <div className="serif" style={{ fontSize:'1.4rem', fontWeight:500, lineHeight:1.2, marginBottom:10 }}>Design your<br/>dream home</div>
                  <div style={{ fontSize:'.8rem', color:'var(--md)', marginBottom:18, fontWeight:300 }}>Free consultation. Fixed pricing.</div>
                </div>
                <button onClick={() => goTo('/contact')} className="btn-p" style={{ fontSize:'.8rem', padding:'9px 18px', width:'100%' }}>Book Free Consult</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{ background:'var(--bg)', borderTop:'1px solid var(--sf2)', maxHeight:'80vh', overflowY:'auto' }}>
          {Object.entries({ interiors:'Interiors', ideas:'Design Ideas', about:'About' }).map(([key, label]) => (
            <div key={key}>
              <button onClick={() => setMobileExp(mobileExp === key ? null : key)}
                style={{ width:'100%', background:'none', border:'none', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 24px', fontSize:'1rem', color:'var(--dk)', cursor:'pointer', borderBottom:'1px solid var(--sf)' }}>
                {label} <ChevronIcon open={mobileExp === key} />
              </button>
              {mobileExp === key && (
                <div style={{ background:'var(--sf)', padding:'8px 24px 12px' }}>
                  {NAV_MENUS[key].cols.flatMap(c => c.items).map(item => (
                    <button key={item.label} onClick={() => goTo(item.path || '/contact')}
                      style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'10px 0', fontSize:'.875rem', color:'var(--md)', cursor:'pointer', borderBottom:'1px solid var(--sf2)' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {[{ l:'Portfolio', p:'/portfolio' }, { l:'Process', p:'/process' }].map(({ l, p }) => (
            <button key={p} onClick={() => goTo(p)}
              style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'15px 24px', fontSize:'1rem', color:'var(--dk)', cursor:'pointer', borderBottom:'1px solid var(--sf)' }}>{l}</button>
          ))}
          <div style={{ padding:'16px 24px' }}>
            <button onClick={() => goTo('/contact')} className="btn-p" style={{ width:'100%', padding:14 }}>Book a Consult</button>
          </div>
        </div>
      )}
    </nav>
  )
}
