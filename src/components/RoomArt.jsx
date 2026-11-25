export const LivingRoom = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="280" fill="#C8B79A"/><rect width="400" height="186" fill="#BEA88C"/>
    <rect y="186" width="400" height="94" fill="#AE9876"/>
    {[1,2,3].map(i=><rect key={i} x="0" y={186+i*22} width="400" height="1" fill="#9A8464" opacity=".5"/>)}
    <rect x="255" y="12" width="128" height="158" fill="#A8C5D8" opacity=".7"/>
    {[257,316,375].map(x=><rect key={x} x={x} y="12" width="3" height="158" fill="#8B7355"/>)}
    <rect x="255" y="12" width="128" height="3" fill="#8B7355"/><rect x="255" y="88" width="128" height="3" fill="#8B7355"/><rect x="255" y="167" width="128" height="3" fill="#8B7355"/>
    <path d="M247 12 Q253 90 247 170 L260 170 Q253 90 260 12Z" fill="#E8DDD0"/>
    <path d="M391 12 Q385 90 391 170 L378 170 Q385 90 378 12Z" fill="#E8DDD0"/>
    <rect x="28" y="145" width="208" height="66" rx="8" fill="#7A6450"/><rect x="28" y="130" width="208" height="24" rx="6" fill="#8B7355"/>
    <rect x="20" y="135" width="18" height="66" rx="5" fill="#6B5540"/><rect x="230" y="135" width="18" height="66" rx="5" fill="#6B5540"/>
    {[0,1,2].map(i=><rect key={i} x={36+i*62} y="132" width="58" height="20" rx="4" fill="#C4A882" opacity=".85"/>)}
    <rect x="176" y="148" width="44" height="44" rx="4" fill="#A87D5A" transform="rotate(-8 198 170)"/>
    <rect x="85" y="218" width="150" height="10" rx="3" fill="#5C4A35"/>
    <rect x="96" y="228" width="6" height="22" rx="2" fill="#5C4A35"/><rect x="223" y="228" width="6" height="22" rx="2" fill="#5C4A35"/>
    <rect x="29" y="65" width="3" height="121" fill="#6B5540"/>
    <ellipse cx="30" cy="58" rx="22" ry="9" fill="#C4A882"/><ellipse cx="30" cy="50" rx="17" ry="7" fill="#F0E8DC" opacity=".9"/>
    <rect x="344" y="223" width="28" height="23" rx="3" fill="#5C4A35"/>
    <ellipse cx="358" cy="192" rx="22" ry="20" fill="#4A6741"/><ellipse cx="344" cy="208" rx="14" ry="12" fill="#3D5635"/>
    <ellipse cx="372" cy="206" rx="12" ry="14" fill="#5A7A50"/>
    <rect x="130" y="22" width="94" height="76" rx="2" fill="#D8C9B2"/><rect x="136" y="28" width="82" height="64" fill="#C8B89C"/>
    <circle cx="177" cy="58" r="20" fill="#8B7355" opacity=".35"/>
  </svg>
)

export const Bedroom = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="280" fill="#C4BDB6"/><rect width="400" height="180" fill="#B8B0A8"/><rect y="180" width="400" height="100" fill="#A8A098"/>
    <rect x="276" y="22" width="104" height="130" fill="#C0D4E8" opacity=".6"/>
    <line x1="328" y1="22" x2="328" y2="152" stroke="#888080" strokeWidth="3"/><line x1="276" y1="87" x2="380" y2="87" stroke="#888080" strokeWidth="3"/>
    <rect x="40" y="100" width="244" height="52" rx="8" fill="#7A7068"/>
    <rect x="40" y="145" width="244" height="98" rx="4" fill="#6B6058"/>
    <rect x="48" y="150" width="228" height="88" rx="4" fill="#EAE6E0"/>
    <rect x="58" y="153" width="90" height="52" rx="8" fill="#F2EEEA"/><rect x="176" y="153" width="90" height="52" rx="8" fill="#F2EEEA"/>
    <rect x="48" y="197" width="228" height="41" rx="3" fill="#9A8A7A"/><rect x="48" y="197" width="228" height="12" rx="3" fill="#B4A496"/>
    <rect x="8" y="168" width="38" height="74" rx="3" fill="#5A5248"/>
    <rect x="22" y="150" width="4" height="20" fill="#8A7868"/><ellipse cx="24" cy="145" rx="20" ry="8" fill="#E8DDD0"/>
    <rect x="316" y="168" width="38" height="74" rx="3" fill="#5A5248"/>
    <rect x="330" y="150" width="4" height="20" fill="#8A7868"/><ellipse cx="332" cy="145" rx="20" ry="8" fill="#E8DDD0"/>
  </svg>
)

export const Kitchen = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="280" fill="#E6DFD4"/><rect width="400" height="175" fill="#D8D0C4"/><rect y="175" width="400" height="105" fill="#C6BEB4"/>
    <rect x="18" y="18" width="364" height="88" rx="3" fill="#C4A882"/>
    {[0,1,2,3,4].map(i=><rect key={i} x={18+i*74} y="18" width="2" height="88" fill="#B09070"/>)}
    {[0,1,2,3,4].map(i=><rect key={i} x={36+i*74} y="97" width="38" height="4" rx="2" fill="#8B7355"/>)}
    {[80,200,320].map(x=>(<g key={x}><line x1={x} y1="0" x2={x} y2="18" stroke="#8B7355" strokeWidth="2"/><ellipse cx={x} cy="27" rx="22" ry="10" fill="#C4A882"/><ellipse cx={x} cy="19" rx="17" ry="7" fill="#F0E8D8" opacity=".9"/></g>))}
    <rect x="18" y="155" width="364" height="22" rx="3" fill="#E8E0D4"/><rect x="18" y="155" width="364" height="4" rx="2" fill="#D4C8B8"/>
    <rect x="18" y="177" width="364" height="100" rx="3" fill="#C4A882"/>
    {[0,1,2,3,4].map(i=><rect key={i} x={18+i*74} y="177" width="2" height="100" fill="#B09070"/>)}
    {[0,1,2,3,4].map(i=><rect key={i} x={36+i*74} y="218" width="38" height="4" rx="2" fill="#8B7355"/>)}
    <rect x="232" y="158" width="104" height="20" rx="3" fill="#A8A098"/><circle cx="264" cy="167" r="6" fill="#888080"/>
    <rect x="88" y="158" width="112" height="18" rx="2" fill="#C8C0B4"/>
    {[[110,164],[152,164],[110,172],[152,172]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="7" fill="#A8A098" stroke="#888080" strokeWidth="1.5"/>)}
  </svg>
)

export const Study = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="280" fill="#2C3B30"/><rect width="400" height="185" fill="#28352C"/><rect y="185" width="400" height="95" fill="#1E2820"/>
    <rect x="18" y="18" width="144" height="168" rx="3" fill="#3D2E1E"/>
    {[0,1,2,3].map(i=><rect key={i} x="18" y={18+i*42} width="144" height="4" fill="#2C1E10"/>)}
    {[0,1,2,3].map(sh=>[{w:16,c:'#8B4513'},{w:20,c:'#2E5B4F'},{w:14,c:'#8B7355'},{w:18,c:'#4A3728'},{w:22,c:'#5A7A50'},{w:16,c:'#C4A882'}].map(({w,c},bi)=><rect key={`${sh}${bi}`} x={22+bi*21} y={22+sh*42} width={w} height={36} rx="1" fill={c} opacity=".9"/>))}
    <rect x="174" y="162" width="210" height="24" rx="3" fill="#5C4A35"/>
    <rect x="180" y="186" width="8" height="58" rx="2" fill="#4A3828"/><rect x="368" y="186" width="8" height="58" rx="2" fill="#4A3828"/>
    <rect x="262" y="90" width="112" height="74" rx="4" fill="#1A1A1A"/><rect x="267" y="95" width="102" height="64" rx="2" fill="#2A4A3A"/>
    <rect x="308" y="164" width="22" height="6" fill="#2A2A2A"/><rect x="298" y="168" width="42" height="4" rx="2" fill="#1A1A1A"/>
    <rect x="200" y="140" width="4" height="24" fill="#B08040"/>
    <path d="M204 140 Q224 128 232 115" stroke="#B08040" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <ellipse cx="234" cy="112" rx="22" ry="10" fill="#B08040" transform="rotate(-30 234 112)"/>
    <ellipse cx="232" cy="118" rx="30" ry="18" fill="#FFD080" opacity=".06"/>
  </svg>
)

export const Bathroom = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="280" fill="#D8E0E0"/>
    {[0,1,2,3,4,5,6].map(r=>[0,1,2,3,4,5].map(c=><rect key={`${r}${c}`} x={c*68} y={r*40} width="66" height="38" fill={(r+c)%2===0?'#D0DCE0':'#C8D4D8'} rx="1"/>))}
    <rect x="130" y="10" width="140" height="90" rx="4" fill="#C0D0D8" opacity=".9"/>
    <rect x="134" y="14" width="132" height="82" rx="2" fill="#D0E0E8" opacity=".6"/>
    <rect x="130" y="98" width="140" height="6" rx="2" fill="#A8B8C0"/>
    <rect x="155" y="104" width="90" height="52" rx="8" fill="#D8E4E0"/>
    <ellipse cx="200" cy="130" rx="35" ry="15" fill="#C0D0CC"/>
    <ellipse cx="200" cy="215" rx="150" ry="48" fill="#EEF4F4"/>
    <ellipse cx="200" cy="208" rx="132" ry="36" fill="#B4D0DC" opacity=".6"/>
    <rect x="186" y="156" width="28" height="20" rx="4" fill="#C0C8C8"/><rect x="178" y="156" width="44" height="8" rx="4" fill="#B0B8B8"/>
    <rect x="346" y="230" width="26" height="20" rx="3" fill="#8A9890"/>
    <ellipse cx="359" cy="215" rx="18" ry="16" fill="#4A6741"/>
  </svg>
)

export const Balcony = () => (
  <svg viewBox="0 0 400 280" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#87CEEB" stopOpacity=".78"/><stop offset="100%" stopColor="#C8E4F8" stopOpacity=".45"/></linearGradient></defs>
    <rect width="400" height="280" fill="url(#bsky)"/>
    <ellipse cx="80" cy="38" rx="40" ry="13" fill="white" opacity=".6"/><ellipse cx="102" cy="32" rx="28" ry="16" fill="white" opacity=".6"/><ellipse cx="310" cy="55" rx="35" ry="11" fill="white" opacity=".5"/>
    <rect y="210" width="400" height="70" fill="#C4A882"/>
    {[0,1,2].map(r=>[0,1,2,3,4,5].map(c=><rect key={`${r}${c}`} x={c*68} y={212+r*20} width="66" height="18" fill="#B09870" rx="1"/>))}
    <rect y="192" width="400" height="6" rx="2" fill="#8B7355"/>
    {[...Array(14)].map((_,i)=><rect key={i} x={12+i*28} y="192" width="4" height="22" fill="#8B7355"/>)}
    <rect y="212" width="400" height="4" rx="2" fill="#8B7355"/>
    {[75,258].map(x=>(<g key={x}><rect x={x} y="140" width="62" height="42" rx="4" fill="#7A6450"/><rect x={x} y="175" width="62" height="38" rx="4" fill="#6B5540" opacity=".9"/><rect x={x-2} y="175" width="8" height="38" rx="3" fill="#5C4A35"/><rect x={x+56} y="175" width="8" height="38" rx="3" fill="#5C4A35"/></g>))}
    <circle cx="200" cy="168" r="38" fill="none" stroke="#5C4A35" strokeWidth="6"/>
    {[25,352].map(x=>(<g key={x}><rect x={x-12} y="230" width="24" height="30" rx="3" fill="#5C4A35"/><ellipse cx={x} cy="214" rx="20" ry="20" fill="#4A6741"/><ellipse cx={x-13} cy="224" rx="12" ry="13" fill="#3D5635"/></g>))}
  </svg>
)

export const ART_MAP = { living: LivingRoom, bedroom: Bedroom, kitchen: Kitchen, study: Study, bathroom: Bathroom, balcony: Balcony }
