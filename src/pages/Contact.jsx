import { useState } from 'react'
import { WAIconSm, MailIcon, CheckIcon } from '../components/Icons'

function Toast({ msg, onClose }) {
  return (
    <div className="toast" style={{ display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ color:'var(--acl)' }}><CheckIcon /></span>
      {msg}
      <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(240,235,227,.5)', cursor:'pointer', marginLeft:8, fontSize:'1.1rem' }}>×</button>
    </div>
  )
}

export default function Contact() {
  const [form, setForm] = useState({ name:'', phone:'', email:'', room:'', property:'', budget:'', msg:'' })
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [toast, setToast] = useState(false)
  const ch = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('https://formsubmit.co/ajax/hello@aravinteriors.com', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify({
          Name: form.name, Phone: form.phone, Email: form.email,
          'Room Type': form.room, 'Property Type': form.property,
          'Budget Range': form.budget, Message: form.msg || '—',
          _subject: `Interior Design Enquiry – ${form.room || 'General'} | Arav Interiors`,
          _replyto: form.email,
        })
      })
      if (res.ok) { setStatus('done'); setToast(true); return }
    } catch (_) {}
    // Fallback: open mailto
    const sub = encodeURIComponent(`Interior Design Enquiry – ${form.room||'General'} | ${form.property}`)
    const bod = encodeURIComponent(`Name: ${form.name}\nPhone: ${form.phone}\nEmail: ${form.email}\nRoom: ${form.room}\nProperty: ${form.property}\nBudget: ${form.budget}\n\nMessage:\n${form.msg||'—'}`)
    window.open(`mailto:hello@aravinteriors.com?subject=${sub}&body=${bod}`, '_blank')
    setStatus('done'); setToast(true)
  }

  return (
    <div style={{ paddingTop:72, background:'var(--bg)' }}>
      {toast && <Toast msg="Enquiry sent! We'll be in touch within 24 hours." onClose={() => setToast(false)} />}

      <div style={{ background:'var(--sf)', padding:'clamp(44px,6vw,72px) clamp(20px,5vw,60px) 44px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h1 className="serif" style={{ fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:400, letterSpacing:'-.025em', marginBottom:12 }}>Let's Talk</h1>
          <p style={{ color:'var(--md)', fontSize:'1rem', maxWidth:460, lineHeight:1.7, fontWeight:300 }}>
            Book your free 45-minute consultation. We'll visit your home in Bangalore and have an honest conversation about what it could be.
          </p>
        </div>
      </div>

      <div style={{ padding:'clamp(36px,6vw,64px) clamp(20px,5vw,60px) clamp(60px,8vw,100px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="contact-layout" style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:60, alignItems:'start' }}>

            {/* Form */}
            {status === 'done' ? (
              <div style={{ padding:48, background:'var(--sf)', borderRadius:8, textAlign:'center', border:'1px solid var(--sf2)' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--ac)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', color:'white' }}>
                  <CheckIcon />
                </div>
                <h3 className="serif" style={{ fontSize:'1.8rem', fontWeight:400, marginBottom:12 }}>Enquiry sent!</h3>
                <p style={{ color:'var(--md)', fontSize:'.9rem', lineHeight:1.7, maxWidth:360, margin:'0 auto 24px' }}>
                  Your enquiry has been sent to <strong>hello@aravinteriors.com</strong>. We'll reach out within 24 hours.
                </p>
                <a href="https://wa.me/919876543210?text=Hi!%20I%20just%20submitted%20an%20enquiry." target="_blank" rel="noopener"
                   style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', background:'#25D366', color:'white', borderRadius:4, fontSize:'.87rem', fontWeight:500, textDecoration:'none' }}>
                  <WAIconSm size={16} />Follow Up on WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div><label className="field-label">YOUR NAME *</label><input className="field-input" placeholder="Priya Sharma" value={form.name} onChange={ch('name')} required /></div>
                  <div><label className="field-label">PHONE *</label><input className="field-input" placeholder="+91 98765 43210" value={form.phone} onChange={ch('phone')} required /></div>
                </div>
                <div>
                  <label className="field-label">EMAIL ADDRESS</label>
                  <input type="email" className="field-input" placeholder="priya@email.com" value={form.email} onChange={ch('email')} />
                  <div style={{ fontSize:'.72rem', color:'var(--lt)', marginTop:5 }}>We'll send your consultation confirmation to this address.</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label className="field-label">ROOM TYPE</label>
                    <select className="field-input" style={{ cursor:'pointer' }} value={form.room} onChange={ch('room')}>
                      <option value="">Select a room</option>
                      {['Full Home','Living Room','Bedroom','Kitchen','Bathroom','Study Room','Balcony'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">PROPERTY TYPE</label>
                    <select className="field-input" style={{ cursor:'pointer' }} value={form.property} onChange={ch('property')}>
                      <option value="">Select type</option>
                      {['1 BHK','2 BHK','3 BHK','4 BHK+','Villa','Duplex'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label">BUDGET RANGE</label>
                  <select className="field-input" style={{ cursor:'pointer' }} value={form.budget} onChange={ch('budget')}>
                    <option value="">Select range</option>
                    {['₹5L – ₹10L','₹10L – ₹20L','₹20L – ₹35L','₹35L – ₹50L','₹50L+'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">MESSAGE (OPTIONAL)</label>
                  <textarea className="field-input" style={{ resize:'vertical', minHeight:90 }} placeholder="Anything you'd like us to know..." value={form.msg} onChange={ch('msg')}/>
                </div>
                <button type="submit" className="btn-p" style={{ padding:14, fontSize:'.9rem', justifyContent:'center', opacity: status==='sending' ? .6 : 1 }} disabled={status==='sending'}>
                  {status === 'sending' ? 'Sending…' : 'Book Free Consultation →'}
                </button>
                <div style={{ fontSize:'.72rem', color:'var(--lt)', textAlign:'center' }}>
                  Enquiry sent directly to <strong style={{ color:'var(--md)' }}>hello@aravinteriors.com</strong>
                </div>
              </form>
            )}

            {/* Sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {/* WhatsApp */}
              <div style={{ background:'#E7F9ED', border:'1px solid #A8E8BC', borderRadius:8, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:40, height:40, background:'#25D366', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white' }}>
                    <WAIconSm size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize:'.85rem', fontWeight:500, color:'#1A5C2E' }}>Prefer WhatsApp?</div>
                    <div style={{ fontSize:'.78rem', color:'#2E7D4A' }}>+91 98765 43210</div>
                  </div>
                </div>
                <a href="https://wa.me/919876543210?text=Hi%20Arav%20Interiors!%20I'd%20like%20to%20book%20a%20design%20consultation%20in%20Bangalore." target="_blank" rel="noopener"
                   style={{ display:'block', textAlign:'center', padding:11, background:'#25D366', color:'white', borderRadius:4, fontSize:'.85rem', fontWeight:500, textDecoration:'none' }}>
                  Start a WhatsApp Chat
                </a>
              </div>

              {/* Email direct */}
              <div style={{ background:'var(--sf)', border:'1px solid var(--sf2)', borderRadius:8, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:40, height:40, background:'var(--ac)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white' }}>
                    <MailIcon />
                  </div>
                  <div>
                    <div style={{ fontSize:'.85rem', fontWeight:500 }}>Email us directly</div>
                    <div style={{ fontSize:'.78rem', color:'var(--lt)' }}>hello@aravinteriors.com</div>
                  </div>
                </div>
                <a href="mailto:hello@aravinteriors.com?subject=Interior%20Design%20Enquiry&body=Hi%20Arav%20Interiors%2C%20I'd%20like%20to%20enquire%20about%20your%20interior%20design%20services."
                   style={{ display:'block', textAlign:'center', padding:11, background:'var(--ac)', color:'white', borderRadius:4, fontSize:'.85rem', fontWeight:500, textDecoration:'none' }}>
                  Open in Email App
                </a>
              </div>

              {/* Office info */}
              <div style={{ background:'var(--sf)', border:'1px solid var(--sf2)', borderRadius:8, padding:22 }}>
                <h4 className="serif" style={{ fontSize:'1.1rem', fontWeight:500, marginBottom:18 }}>Our Studio, Bangalore</h4>
                {[['📍','Address','12/4, 100 Feet Road, Indiranagar, Bangalore — 560038'],
                  ['📞','Phone','+91 98765 43210'],
                  ['✉️','Email','hello@aravinteriors.com'],
                  ['🕐','Hours','Mon–Sat, 10 am – 7 pm'],
                ].map(([ic, lb, val]) => (
                  <div key={lb} style={{ display:'flex', gap:12, marginBottom:12 }}>
                    <span style={{ fontSize:'1rem', flexShrink:0, marginTop:1 }}>{ic}</span>
                    <div>
                      <div style={{ fontSize:'.71rem', color:'var(--lt)', letterSpacing:'.06em', marginBottom:2 }}>{lb}</div>
                      <div style={{ fontSize:'.83rem', color:'var(--md)' }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding:'13px 18px', background:'var(--sf2)', borderRadius:6, display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:'1rem' }}>⚡</span>
                <div style={{ fontSize:'.81rem', color:'var(--md)' }}>We respond to all enquiries within <strong>24 hours</strong>.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
