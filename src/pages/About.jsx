import { useNavigate } from 'react-router-dom'
import { LivingRoom } from '../components/RoomArt'
import { ABOUT_VALUES } from '../data/content'

export default function About() {
  const navigate = useNavigate()
  return (
    <div style={{ paddingTop:72 }}>
      <div style={{ background:'var(--sf)', padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 56px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="about-hg" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ display:'inline-block', width:28, height:1.5, background:'var(--ac)' }}/>
                <span style={{ fontSize:'.72rem', letterSpacing:'.15em', color:'var(--ac)' }}>OUR STORY</span>
              </div>
              <h1 className="serif" style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:400, letterSpacing:'-.025em', marginBottom:22, lineHeight:1.1 }}>
                Designing homes<br/><em style={{ color:'var(--ac)', fontWeight:300 }}>since 2016</em>
              </h1>
              <p style={{ color:'var(--md)', fontSize:'1rem', lineHeight:1.78, fontWeight:300, marginBottom:16 }}>
                Arav Interiors was founded in Bangalore by a team who believed good interiors shouldn't require a long waiting list or a willingness to compromise.
              </p>
              <p style={{ color:'var(--md)', fontSize:'1rem', lineHeight:1.78, fontWeight:300, marginBottom:28 }}>
                Eight years and 2,400 homes later, we still start every project the same way: by listening to your life first, budget second.
              </p>
              <button onClick={() => navigate('/contact')} className="btn-p">Work With Us</button>
            </div>
            <div className="about-art" style={{ borderRadius:8, overflow:'hidden', aspectRatio:'4/3', border:'1px solid var(--sf2)' }}>
              <LivingRoom />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px)', background:'var(--bg)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h2 className="serif" style={{ fontSize:'clamp(1.8rem,3vw,2.5rem)', fontWeight:400, letterSpacing:'-.02em', marginBottom:44 }}>What we believe in</h2>
          <div className="why-feat" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
            {ABOUT_VALUES.map(({ t, d }, i) => (
              <div key={t} style={{ padding:'32px 28px', background:'var(--sf)', borderRadius: i===0 ? '6px 0 0 0' : i===1 ? '0 6px 0 0' : i===2 ? '0 0 0 6px' : '0 0 6px 0' }}>
                <div style={{ width:28, height:2, background:'var(--ac)', marginBottom:18 }}/>
                <h3 className="serif" style={{ fontSize:'1.2rem', fontWeight:500, marginBottom:8 }}>{t}</h3>
                <p style={{ fontSize:'.85rem', color:'var(--md)', lineHeight:1.65, fontWeight:300 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'clamp(36px,5vw,56px) clamp(20px,5vw,60px)', background:'var(--sf)', borderTop:'1px solid var(--sf2)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:'.72rem', letterSpacing:'.15em', color:'var(--lt)', marginBottom:28 }}>RECOGNISED FOR</div>
          <div style={{ display:'flex', justifyContent:'center', gap:48, flexWrap:'wrap' }}>
            {["Best Interior Studio, Bangalore 2023","India Design Awards — Finalist 2022","Houzz Best of Interiors 2021","Inc42 Top Design Startups"].map(a => (
              <div key={a} style={{ fontSize:'.83rem', color:'var(--md)', fontWeight:300, maxWidth:160, textAlign:'center', lineHeight:1.5 }}>{a}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
