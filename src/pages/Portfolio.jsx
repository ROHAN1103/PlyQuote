import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectPhoto } from '../components/RoomArt'
import { PROJECTS, PORTFOLIO_CATS } from '../data/content'

export default function Portfolio() {
  const navigate  = useNavigate()
  const [cat, setCat]           = useState('All')
  const [lightbox, setLightbox] = useState(null)

  const filtered = cat === 'All'
    ? PROJECTS
    : PROJECTS.filter(p => p.type === cat)

  return (
    <div style={{ paddingTop: 72 }}>

      {/* ── Page header ── */}
      <div style={{ background: 'var(--sf)', padding: 'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1.5, background: 'var(--ac)' }}/>
            <span style={{ fontSize: '.72rem', letterSpacing: '.15em', color: 'var(--ac)' }}>BANGALORE</span>
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 400, letterSpacing: '-.025em', marginBottom: 12 }}>
            Our Portfolio
          </h1>
          <p style={{ color: 'var(--md)', fontSize: '1rem', maxWidth: 480, lineHeight: 1.7, fontWeight: 300 }}>
            Homes we've designed across Bangalore — each one a reflection of the people who live in it.
          </p>
        </div>
      </div>

      {/* ── Sticky filter bar ── */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--sf2)', position: 'sticky', top: 72, zIndex: 50, padding: '0 clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="filter-bar">
            {PORTFOLIO_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${cat === c ? 'var(--ac)' : 'transparent'}`,
                  padding: '15px 18px', fontSize: '.83rem',
                  color: cat === c ? 'var(--ac)' : 'var(--md)',
                  fontWeight: cat === c ? 500 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color .2s, border-color .2s',
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Project grid ── */}
      <div style={{ padding: '36px clamp(20px,5vw,60px) 72px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
            {filtered.map(project => (
              <ProjectCard
                key={project.title + project.area}
                project={project}
                onClick={() => setLightbox(project)}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{ textAlign: 'center', marginTop: 60, paddingTop: 48, borderTop: '1px solid var(--sf2)' }}>
            <h3 className="serif" style={{ fontSize: '1.9rem', fontWeight: 400, marginBottom: 10 }}>Like what you see?</h3>
            <p style={{ color: 'var(--lt)', fontSize: '.9rem', marginBottom: 22 }}>
              Book a free consult and let's talk about your home.
            </p>
            <button onClick={() => navigate('/contact')} className="btn-p" style={{ padding: '13px 32px' }}>
              Start Your Project
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox project={lightbox} onClose={() => setLightbox(null)} navigate={navigate} />
      )}
    </div>
  )
}

/* ── Project card ── */
function ProjectCard({ project, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--sf2)', cursor: 'pointer', position: 'relative', background: 'var(--sf)' }}
      onMouseOver={e => e.currentTarget.querySelector('.pov').style.opacity = '1'}
      onMouseOut ={e => e.currentTarget.querySelector('.pov').style.opacity = '0'}
    >
      {/* Photo */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .4s ease' }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseOut ={e => e.currentTarget.style.transform = 'scale(1)'}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* Hover overlay */}
      <div className="pov" style={{ position: 'absolute', inset: 0, background: 'rgba(28,28,26,.68)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 22, opacity: 0, transition: 'opacity .3s' }}>
        <div style={{ fontSize: '.7rem', letterSpacing: '.1em', color: 'var(--acl)', marginBottom: 4 }}>{project.type} · {project.area}</div>
        <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 500, color: 'white', marginBottom: 10 }}>{project.title}</div>
        <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.65)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>
          Click to expand
        </div>
      </div>

      {/* Card label */}
      <div style={{ padding: '14px 18px' }}>
        <div className="serif" style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 3 }}>{project.title}</div>
        <div style={{ fontSize: '.77rem', color: 'var(--lt)' }}>{project.type} · {project.area}, Bangalore</div>
      </div>
    </div>
  )
}

/* ── Lightbox modal ── */
function Lightbox({ project, onClose, navigate }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', maxWidth: 760, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}
      >
        {/* Full photo */}
        <div style={{ aspectRatio: '4/3', background: 'var(--sf2)' }}>
          <img
            src={project.image}
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--ac)', letterSpacing: '.1em', marginBottom: 6 }}>
              {project.type} · {project.area}, Bangalore
            </div>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 500 }}>{project.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { onClose(); navigate('/contact') }} className="btn-p" style={{ padding: '10px 20px', fontSize: '.83rem' }}>
              Enquire
            </button>
            <button onClick={onClose} style={{ background: 'var(--sf)', border: '1px solid var(--sf2)', borderRadius: 4, padding: '10px 16px', cursor: 'pointer', fontSize: '.83rem', color: 'var(--md)' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
