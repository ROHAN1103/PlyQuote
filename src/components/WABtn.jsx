import { WAIconLg } from './Icons'
export default function WABtn() {
  return (
    <a href="https://wa.me/919876543210?text=Hi%20Arav%20Interiors!%20I'd%20like%20to%20enquire%20about%20interior%20design%20services%20in%20Bangalore."
       target="_blank" rel="noopener noreferrer" title="Chat with us on WhatsApp"
       style={{ position:'fixed', bottom:28, right:28, zIndex:9998, width:56, height:56, background:'#25D366', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(37,211,102,.4)', transition:'transform .2s,box-shadow .2s', textDecoration:'none', animation:'pulse 2.5s ease-in-out infinite' }}
       onMouseOver={e=>{e.currentTarget.style.transform='scale(1.1)';e.currentTarget.style.boxShadow='0 6px 28px rgba(37,211,102,.55)'}}
       onMouseOut={e =>{e.currentTarget.style.transform='scale(1)';  e.currentTarget.style.boxShadow='0 4px 20px rgba(37,211,102,.4)'}}>
      <WAIconLg />
    </a>
  )
}
