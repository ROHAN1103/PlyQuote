import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROCESS_STEPS, FAQ_ITEMS } from '../data/content'

export default function Process() {
  const navigate = useNavigate()
  const [faq, setFaq] = useState(null)
  return (
    <div style={{ paddingTop:72 }}>
      <div style={{ background:'var(--sf)', padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 48px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h1 className="serif" style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:400, letterSpacing:'-.025em', marginBottom:12 }}>How It Works</h1>
          <p style={{ color:'var(--md)', fontSize:'1rem', maxWidth:460, lineHeight:1.7, fontWeight:300 }}>A clear, predictable process — from your first call to the day you move in.</p>
        </div>
      </div>

      <div style={{ padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px)', background:'var(--bg)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          {PROCESS_STEPS.map(({ n, s, d, t, b }, i) => (
            <div key={n} className="proc-step-g" style={{ display:'grid', gridTemplateColumns:'72px 1fr', gap:28, marginBottom: i<4 ? 56 : 0, paddingBottom: i<4 ? 56 : 0, borderBottom: i<4 ? '1px solid var(--sf2)' : 'none' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div className="serif" style={{ fontSize:'2.2rem', fontWeight:300, color:'var(--ac)', lineHeight:1 }}>{n}</div>
                {i < 4 && <div style={{ width:1, flex:1, background:'var(--sf2)' }}/>}
              </div>
              <div>
                <div style={{ fontSize:'.72rem', letterSpacing:'.12em', color:'var(--lt)', marginBottom:8 }}>{d}</div>
                <h2 className="serif" style={{ fontSize:'clamp(1.4rem,2.5vw,1.9rem)', fontWeight:500, marginBottom:12 }}>{s}</h2>
                <p style={{ color:'var(--md)', fontSize:'.93rem', lineHeight:1.75, fontWeight:300, maxWidth:580, marginBottom:18 }}>{t}</p>
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:7 }}>
                  {b.map(x => (
                    <li key={x} style={{ display:'flex', alignItems:'center', gap:10, fontSize:'.85rem', color:'var(--md)' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--ac)', flexShrink:0 }}/>{x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px)', background:'var(--sf)' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <h2 className="serif" style={{ fontSize:'clamp(1.8rem,3vw,2.5rem)', fontWeight:400, letterSpacing:'-.02em', marginBottom:36 }}>Frequently Asked Questions</h2>
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div key={i} style={{ borderBottom:'1px solid var(--sf2)' }}>
              <button onClick={() => setFaq(faq===i ? null : i)}
                style={{ width:'100%', background:'none', border:'none', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 0', cursor:'pointer', textAlign:'left', gap:20 }}>
                <span style={{ fontSize:'.93rem', fontWeight:500, color:'var(--dk)' }}>{q}</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ac)" strokeWidth="1.5" style={{ flexShrink:0, transform: faq===i ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>
                  <polyline points="4,7 10,13 16,7"/>
                </svg>
              </button>
              {faq===i && <p style={{ color:'var(--md)', fontSize:'.88rem', lineHeight:1.72, fontWeight:300, paddingBottom:20 }}>{a}</p>}
            </div>
          ))}
          <div style={{ marginTop:48, textAlign:'center' }}>
            <button onClick={() => navigate('/contact')} className="btn-p" style={{ padding:'14px 32px' }}>Book a Free Consult</button>
          </div>
        </div>
      </div>
    </div>
  )
}
