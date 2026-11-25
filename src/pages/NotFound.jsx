import { useNavigate } from 'react-router-dom'
export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ paddingTop:72, minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'80px 24px' }}>
      <div>
        <div className="serif" style={{ fontSize:'8rem', fontWeight:300, color:'var(--sf2)', lineHeight:1, marginBottom:16 }}>404</div>
        <h1 className="serif" style={{ fontSize:'clamp(1.8rem,3vw,2.5rem)', fontWeight:400, marginBottom:14 }}>Page not found</h1>
        <p style={{ color:'var(--lt)', fontSize:'.95rem', marginBottom:32 }}>This page doesn't exist. Let's get you back home.</p>
        <button onClick={() => navigate('/')} className="btn-p" style={{ padding:'13px 32px' }}>Back to Home</button>
      </div>
    </div>
  )
}
