import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ART_MAP } from '../components/RoomArt'
import { WAIconSm } from '../components/Icons'
import { ROOMS, TESTIMONIALS } from '../data/content'

/* ── Animated counter ── */
function AnimatedNumber({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const done = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        const steps = 50, dur = 1800
        let i = 0
        const timer = setInterval(() => {
          i++
          setCount(Math.round(target * (i / steps)))
          if (i >= steps) clearInterval(timer)
        }, dur / steps)
      }
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ── Hero ── */
function Hero() {
  const navigate = useNavigate()
  const Art = ART_MAP.living
  return (
    <section style={{ minHeight:'100vh', background:'var(--sf)', display:'flex', alignItems:'center', padding:'100px clamp(20px,5vw,60px) 60px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:'repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(139,115,85,.03) 60px,rgba(139,115,85,.03) 61px)' }}/>
      <div className="hero-g" style={{ maxWidth:1200, margin:'0 auto', width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
        <div>
          <div className="ha1" style={{ marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ display:'inline-block', width:36, height:1.5, background:'var(--ac)' }}/>
            <span style={{ fontSize:'.72rem', letterSpacing:'.15em', color:'var(--ac)' }}>BANGALORE'S INTERIOR DESIGN STUDIO</span>
          </div>
          <h1 className="ha2 serif" style={{ fontSize:'clamp(2.8rem,5.5vw,4.5rem)', fontWeight:400, lineHeight:1.08, marginBottom:22, letterSpacing:'-.025em' }}>
            Spaces that feel<br/><em style={{ color:'var(--ac)', fontWeight:300 }}>unmistakably yours</em>
          </h1>
          <p className="ha3" style={{ fontSize:'1rem', color:'var(--md)', lineHeight:1.75, maxWidth:460, marginBottom:32, fontWeight:300 }}>
            Full-room interiors designed around how you live. End-to-end delivery, 10-year warranty, fixed price — in Bangalore.
          </p>
          <div className="ha3" style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <button onClick={() => navigate('/contact')} className="btn-p">Start Your Design</button>
            <button onClick={() => navigate('/portfolio')} className="btn-g">See Our Work</button>
          </div>
          <div className="ha4" style={{ display:'flex', gap:40, marginTop:48, paddingTop:32, borderTop:'1px solid var(--sf2)' }}>
            {[{ n:2400, s:'+', l:'Homes Designed' }, { n:45, s:' Days', l:'Avg. Delivery' }, { n:10, s:'yr', l:'Warranty' }].map(({ n, s, l }) => (
              <div key={l}>
                <div className="serif" style={{ fontSize:'2rem', fontWeight:500, lineHeight:1, marginBottom:4 }}>
                  <AnimatedNumber target={n} suffix={s} />
                </div>
                <div style={{ fontSize:'.75rem', color:'var(--lt)', letterSpacing:'.07em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-art ha4" style={{ borderRadius:8, overflow:'hidden', aspectRatio:'4/3', boxShadow:'0 20px 60px rgba(139,115,85,.15)', border:'1px solid var(--sf2)' }}>
          <Art />
        </div>
      </div>
    </section>
  )
}

/* ── Featured Spaces ── */
function FeaturedSpaces() {
  const navigate = useNavigate()
  return (
    <section style={{ padding:'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background:'var(--bg)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:44, flexWrap:'wrap', gap:14 }}>
          <div>
            <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:400, letterSpacing:'-.02em', marginBottom:8 }}>Every room, considered</h2>
            <p style={{ color:'var(--lt)', fontSize:'.9rem' }}>The same care goes into every corner of your home.</p>
          </div>
          <button onClick={() => navigate('/spaces')} className="btn-g" style={{ padding:'10px 20px', fontSize:'.83rem' }}>All Design Ideas</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:18 }}>
          {ROOMS.map(({ label, room, desc }) => {
            const Art = ART_MAP[room]
            return (
              <div key={label} className="room-card" onClick={() => navigate('/spaces')}>
                <div style={{ aspectRatio:'4/3' }}><Art /></div>
                <div style={{ padding:'16px 20px' }}>
                  <div className="serif" style={{ fontSize:'1.25rem', fontWeight:500, marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--lt)' }}>{desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── Process Preview ── */
function ProcessPreview() {
  const navigate = useNavigate()
  const steps = [
    { s:'Consult',          d:'Week 1',    t:'Your designer visits your home to understand your style and budget. No forms — just an honest conversation.' },
    { s:'Design',           d:'Week 2–3',  t:'3D visualisations, material samples, and a fixed cost breakdown. You approve everything before work starts.' },
    { s:'Install & Move In',d:'Week 4–10', t:'Factory-made pieces installed to a date, backed by a 10-year guarantee.' },
  ]
  return (
    <section style={{ padding:'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background:'var(--sf)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <h2 className="serif" style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:400, letterSpacing:'-.02em', lineHeight:1.1, marginBottom:52 }}>
          From brief to beautiful,<br/><em style={{ fontWeight:300, color:'var(--ac)' }}>in three steps</em>
        </h2>
        <div className="proc-g" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:3, marginBottom:36 }}>
          {steps.map(({ s, d, t }, i) => (
            <div key={s} style={{ padding:'36px 32px', background: i===1 ? 'var(--ac)' : 'var(--sf2)', position:'relative', borderRadius: i===0 ? '6px 0 0 6px' : i===2 ? '0 6px 6px 0' : '0' }}>
              <div className="serif" style={{ position:'absolute', top:14, right:20, fontSize:'5rem', fontWeight:300, lineHeight:1, color: i===1 ? 'rgba(255,255,255,.12)' : 'rgba(139,115,85,.1)', userSelect:'none' }}>{i+1}</div>
              <div style={{ fontSize:'.7rem', letterSpacing:'.12em', color: i===1 ? 'rgba(255,255,255,.55)' : 'var(--lt)', marginBottom:10 }}>{d}</div>
              <h3 className="serif" style={{ fontSize:'1.6rem', fontWeight:500, color: i===1 ? 'white' : 'var(--dk)', marginBottom:12 }}>{s}</h3>
              <p style={{ fontSize:'.87rem', lineHeight:1.7, color: i===1 ? 'rgba(255,255,255,.8)' : 'var(--md)', fontWeight:300, maxWidth:260 }}>{t}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center' }}>
          <button onClick={() => navigate('/process')} className="btn-g">See the Full Process</button>
        </div>
      </div>
    </section>
  )
}

/* ── Testimonials ── */
function Testimonials() {
  const [active, setActive] = useState(0)
  const t = TESTIMONIALS[active]
  return (
    <section style={{ padding:'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background:'var(--acd)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div className="ts-g" style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:56, alignItems:'start' }}>
          <div>
            <div style={{ fontSize:'.72rem', letterSpacing:'.13em', color:'var(--acl)', marginBottom:14 }}>CLIENT STORIES</div>
            <h2 className="serif" style={{ fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:400, color:'white', letterSpacing:'-.02em', lineHeight:1.15, marginBottom:34 }}>
              2,400 homes.<br/>2,400 stories.
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {TESTIMONIALS.map((item, i) => (
                <button key={i} onClick={() => setActive(i)}
                  style={{ background: active===i ? 'rgba(196,168,130,.12)' : 'none', border:'none', borderLeft:`3px solid ${active===i ? 'var(--acl)' : 'transparent'}`, textAlign:'left', cursor:'pointer', padding:'10px 16px', borderRadius:'0 2px 2px 0', transition:'all .2s' }}>
                  <div style={{ color: active===i ? 'white' : 'rgba(255,255,255,.45)', fontSize:'.88rem', fontWeight:500, marginBottom:2 }}>{item.name}</div>
                  <div style={{ color:'var(--acl)', fontSize:'.7rem' }}>{item.proj}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(196,168,130,.18)', borderRadius:8, padding:'clamp(28px,4vw,48px)' }}>
            <svg width="32" height="24" viewBox="0 0 32 24" fill="var(--acl)" style={{ marginBottom:22, opacity:.7 }}>
              <path d="M0 24V14.4C0 10.08 1.44 6.44 4.32 3.48 7.2.52 10.84 0 15.24 0v4.68c-2.4 0-4.4.8-6 2.4-1.6 1.6-2.4 3.6-2.4 6h5.76V24H0zm17.76 0V14.4c0-4.32 1.44-7.96 4.32-10.92C25 .52 28.64 0 33.04 0h-.04v4.68c-2.4 0-4.4.8-6 2.4-1.6 1.6-2.4 3.6-2.4 6h5.76V24H17.76z"/>
            </svg>
            <blockquote className="serif" style={{ fontSize:'clamp(1.25rem,2.4vw,1.75rem)', fontWeight:300, color:'white', lineHeight:1.6, letterSpacing:'-.01em', marginBottom:28, fontStyle:'italic' }}>
              {t.q}
            </blockquote>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--ac)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'"Cormorant Garamond",serif', fontSize:'1rem', fontWeight:600 }}>{t.name[0]}</div>
              <div>
                <div style={{ color:'white', fontSize:'.88rem', fontWeight:500 }}>{t.name}</div>
                <div style={{ color:'var(--acl)', fontSize:'.76rem' }}>{t.loc}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Home CTA ── */
function HomeCTA() {
  const navigate = useNavigate()
  return (
    <section style={{ padding:'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background:'var(--bg)', textAlign:'center' }}>
      <div style={{ maxWidth:580, margin:'0 auto' }}>
        <div style={{ width:1, height:56, background:'var(--sf2)', margin:'0 auto 36px' }}/>
        <h2 className="serif" style={{ fontSize:'clamp(2.2rem,4.5vw,3.5rem)', fontWeight:400, letterSpacing:'-.025em', lineHeight:1.1, marginBottom:18 }}>
          Ready to rethink<br/>your home?
        </h2>
        <p style={{ color:'var(--lt)', fontSize:'1rem', lineHeight:1.72, marginBottom:32, fontWeight:300 }}>
          Book a free 45-minute design consult in Bangalore. No obligation — just an honest conversation about what your home could be.
        </p>
        <div className="cta-btns" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => navigate('/contact')} className="btn-p" style={{ padding:'14px 36px' }}>Book Free Consult</button>
          <a href="https://wa.me/919876543210?text=Hi%20Arav%20Interiors!" target="_blank" rel="noopener" className="btn-wa" style={{ padding:'14px 32px' }}>
            <WAIconSm size={17} />WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero /><FeaturedSpaces /><ProcessPreview /><Testimonials /><HomeCTA />
    </>
  )
}
