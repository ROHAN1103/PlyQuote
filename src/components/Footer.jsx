import { useNavigate } from 'react-router-dom'
import { WAIconSm, InstagramIcon, FacebookIcon } from './Icons'
import { FOOTER_COLS } from '../data/content'

const lnkStyle = { background:'none', border:'none', cursor:'pointer', textAlign:'left', color:'rgba(240,235,227,.45)', fontSize:'.8rem', transition:'color .2s', padding:0 }

export default function Footer() {
  const navigate = useNavigate()
  const go = p => { navigate(p); window.scrollTo(0, 0) }

  return (
    <footer style={{ background:'var(--footer)', padding:'clamp(40px,6vw,60px) clamp(20px,5vw,60px) 28px', color:'rgba(240,235,227,.55)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div className="ft-g" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:44, marginBottom:48 }}>

          {/* Brand col */}
          <div>
            <button onClick={() => go('/')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'baseline', gap:8, marginBottom:16, padding:0 }}>
              <span className="serif" style={{ fontSize:'1.75rem', fontWeight:600, color:'#F0EBE3', letterSpacing:'-.025em' }}>Arav</span>
              <span style={{ fontSize:'.68rem', letterSpacing:'.13em', color:'var(--acl)', textTransform:'uppercase' }}>Interiors</span>
            </button>
            <p style={{ fontSize:'.83rem', lineHeight:1.72, maxWidth:260, marginBottom:20, fontWeight:300 }}>
              Thoughtfully designed homes, delivered end-to-end, across Bangalore.
            </p>
            <div style={{ fontSize:'.8rem', marginBottom:6 }}>hello@aravinteriors.com</div>
            <div style={{ fontSize:'.8rem', marginBottom:20 }}>+91 98765 43210</div>

            {/* WhatsApp CTA */}
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener"
               style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#25D366', color:'white', borderRadius:4, fontSize:'.78rem', fontWeight:500, textDecoration:'none', marginBottom:16 }}>
              <WAIconSm size={14} />WhatsApp Us
            </a>

            {/* Social */}
            <div style={{ display:'flex', gap:12, marginTop:4 }}>
              {[
                { icon: <InstagramIcon />, href: 'https://instagram.com', label: 'Instagram' },
                { icon: <FacebookIcon />,  href: 'https://facebook.com',  label: 'Facebook'  },
              ].map(({ icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener" aria-label={label}
                   style={{ width:36, height:36, border:'1px solid rgba(240,235,227,.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(240,235,227,.5)', textDecoration:'none', transition:'all .2s' }}
                   onMouseOver={e => { e.currentTarget.style.borderColor='var(--acl)'; e.currentTarget.style.color='var(--acl)' }}
                   onMouseOut ={e => { e.currentTarget.style.borderColor='rgba(240,235,227,.2)'; e.currentTarget.style.color='rgba(240,235,227,.5)' }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(({ h, rows }) => (
            <div key={h}>
              <div style={{ color:'#F0EBE3', fontSize:'.78rem', fontWeight:500, marginBottom:18, letterSpacing:'.07em' }}>{h}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {rows.map(([label, path]) => (
                  <button key={label} onClick={() => go(path)} style={lnkStyle}
                    onMouseOver={e => e.target.style.color='var(--acl)'}
                    onMouseOut ={e => e.target.style.color='rgba(240,235,227,.45)'}>{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop:'1px solid rgba(240,235,227,.1)', paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:'.74rem' }}>© 2024 Arav Interiors, Bangalore. All rights reserved.</div>
          <div style={{ display:'flex', gap:22 }}>
            {['Privacy', 'Terms', 'Sitemap'].map(l => (
              <a key={l} href="#" style={{ color:'rgba(240,235,227,.35)', fontSize:'.74rem', textDecoration:'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
