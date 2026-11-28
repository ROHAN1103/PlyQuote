import { useNavigate } from 'react-router-dom'
import { SPACES } from '../data/content'

function SpacePhoto({ room, label }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--sf2)', overflow: 'hidden' }}>
      <img
        src={`/images/rooms/${room}.jpg`}
        alt={`${label} Design – Arav Interiors`}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .4s ease' }}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    </div>
  )
}

export default function Spaces() {
  const navigate = useNavigate()
  return (
    <div style={{ paddingTop: 72 }}>
      <div style={{ background: 'var(--sf)', padding: 'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 className="serif" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 12 }}>Design Ideas</h1>
          <p style={{ color: 'var(--md)', fontSize: '1rem', maxWidth: 460, lineHeight: 1.7, fontWeight: 300 }}>
            Inspiration and information for every room — tailored for Bangalore homes.
          </p>
        </div>
      </div>

      <div style={{ padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,60px)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 56 }}>
          {SPACES.map(({ label, room, desc, tags }, i) => (
            <div key={label} className="spaces-row"
              style={{ display: 'flex', gap: 52, alignItems: 'center', flexDirection: i % 2 === 0 ? 'row' : 'row-reverse', paddingBottom: 56, borderBottom: '1px solid var(--sf2)' }}>

              {/* Photo */}
              <div style={{ flex: '0 0 44%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--sf2)', aspectRatio: '4/3' }}>
                <SpacePhoto room={room} label={label} />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <h2 className="serif" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, letterSpacing: '-.02em', marginBottom: 14 }}>{label}</h2>
                <p style={{ color: 'var(--md)', fontSize: '.95rem', lineHeight: 1.75, fontWeight: 300, marginBottom: 20 }}>{desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
                  {tags.map(t => (
                    <span key={t} style={{ padding: '5px 12px', background: 'var(--sf)', border: '1px solid var(--sf2)', borderRadius: 20, fontSize: '.75rem', color: 'var(--md)' }}>{t}</span>
                  ))}
                </div>
                <button onClick={() => navigate('/contact')} className="btn-p" style={{ fontSize: '.83rem', padding: '11px 22px' }}>
                  Get a Design Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
