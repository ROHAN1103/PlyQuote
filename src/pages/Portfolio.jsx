import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ART_MAP } from '../components/RoomArt'
import { PROJECTS, PORTFOLIO_CATS } from '../data/content'

export default function Portfolio() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const filtered = cat === 'All' ? PROJECTS : PROJECTS.filter(p => p.type === cat)

  return (
    <div style={{ paddingTop:72 }}>
      {/* Header */}
      <div style={{ background:'var(--sf)', padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 36px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <span style={{ display:'inline-block', width:28, height:1.5, background:'var(--ac)' }}/>
            <span style={{ fontSize:'.72rem', letterSpacing:'.15em', color:'var(--ac)' }}>BANGALORE</span>
          </div>
          <h1 className="serif" style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:400, letterSpacing:'-.025em', marginBottom:12 }}>Our Portfolio</h1>
          <p style={{ color:'var(--md)', fontSize:'1rem', maxWidth:480, lineHeight:1.7, fontWeight:300 }}>
            Homes we've designed across Bangalore — each one a reflection of the people who live in it.
          </p>
        </div>
      </div>

      {/* Sticky filter */}
      <div style={{ background:'var(--bg)', borderBottom:'1px solid var(--sf2)', position:'sticky', top:72, zIndex:50, padding:'0 clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="filter-bar">
            {PORTFOLIO_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ background:'none', border:'none', borderBottom:`2px solid ${cat===c ? 'var(--ac)' : 'transparent'}`, padding:'15px 18px', fontSize:'.83rem', color: cat===c ? 'var(--ac)' : 'var(--md)', fontWeight: cat===c ? 500 : 400, cursor:'pointer', whiteSpace:'nowrap', transition:'color .2s,border-color .2s' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding:'36px clamp(20px,5vw,60px) 72px', background:'var(--bg)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 }}>
            {filtered.map(({ title, type, area, room }) => {
              const Art = ART_MAP[room]
              return (
                <div key={title+area} style={{ borderRadius:6, overflow:'hidden', border:'1px solid var(--sf2)', cursor:'pointer', position:'relative' }}
                     onClick={() => setLightbox({ title, type, area, room })}
                     onMouseOver={e => e.currentTarget.querySelector('.pov').style.opacity='1'}
                     onMouseOut ={e => e.currentTarget.querySelector('.pov').style.opacity='0'}>
                  <div style={{ aspectRatio:'4/3' }}><Art /></div>
                  <div className="pov" style={{ position:'absolute', inset:0, background:'rgba(28,28,26,.7)', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:22, opacity:0, transition:'opacity .3s' }}>
                    <div style={{ fontSize:'.7rem', letterSpacing:'.1em', color:'var(--acl)', marginBottom:4 }}>{type} · {area}</div>
                    <div className="serif" style={{ fontSize:'1.4rem', fontWeight:500, color:'white' }}>{title}</div>
                    <div style={{ marginTop:12, fontSize:'.78rem', color:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', gap:6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>
                      Click to expand
                    </div>
                  </div>
                  <div style={{ padding:'14px 18px', background:'var(--sf)' }}>
                    <div className="serif" style={{ fontSize:'1.1rem', fontWeight:500, marginBottom:3 }}>{title}</div>
                    <div style={{ fontSize:'.77rem', color:'var(--lt)' }}>{type} · {area}, Bangalore</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign:'center', marginTop:60, paddingTop:48, borderTop:'1px solid var(--sf2)' }}>
            <h3 className="serif" style={{ fontSize:'1.9rem', fontWeight:400, marginBottom:10 }}>Like what you see?</h3>
            <p style={{ color:'var(--lt)', fontSize:'.9rem', marginBottom:22 }}>Book a free consult and let's talk about your home.</p>
            <button onClick={() => navigate('/contact')} className="btn-p" style={{ padding:'13px 32px' }}>Start Your Project</button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (() => {
        const Art = ART_MAP[lightbox.room]
        return (
          <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg)', borderRadius:8, overflow:'hidden', maxWidth:720, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }}>
              <div style={{ aspectRatio:'4/3' }}><Art /></div>
              <div style={{ padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:'.72rem', color:'var(--ac)', letterSpacing:'.1em', marginBottom:6 }}>{lightbox.type} · {lightbox.area}, Bangalore</div>
                  <div className="serif" style={{ fontSize:'1.6rem', fontWeight:500 }}>{lightbox.title}</div>
                </div>
                <div style={{ display:'flex', gap:10' }}>
                  <button onClick={() => navigate('/contact')} className="btn-p" style={{ padding:'10px 20px', fontSize:'.83rem' }}>Enquire</button>
                  <button onClick={() => setLightbox(null)} style={{ background:'var(--sf)', border:'1px solid var(--sf2)', borderRadius:4, padding:'10px 16px', cursor:'pointer', fontSize:'.83rem', color:'var(--md)' }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
