/**
 * RoomArt.jsx — Real photo version
 *
 * DROP YOUR PHOTOS into:
 *   public/images/rooms/      ← used for room category cards + hero
 *   public/images/projects/   ← used for portfolio grid
 *
 * Each component below maps to one photo file.
 * To use a remote URL (Cloudinary, S3, Unsplash, etc.) just replace
 * the src string with the full https:// URL.
 */

/** Shared image wrapper — handles loading placeholder + broken image */
function RoomPhoto({ src, alt }) {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--sf2)', overflow:'hidden', position:'relative' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .4s ease' }}
        onError={e => {
          // If photo is missing, show a neutral placeholder
          e.currentTarget.style.display = 'none'
          e.currentTarget.parentNode.style.background = 'var(--sf2)'
        }}
      />
    </div>
  )
}

/* ── Room category photos (used in Home + Spaces pages) ── */
export const LivingRoom = () => <RoomPhoto src="/images/rooms/living-room.jpg" alt="Living Room Design – Arav Interiors"/>
export const Bedroom    = () => <RoomPhoto src="/images/rooms/bedroom.jpg"     alt="Bedroom Design – Arav Interiors"/>
export const Kitchen    = () => <RoomPhoto src="/images/rooms/kitchen.jpg"     alt="Kitchen Design – Arav Interiors"/>
export const Study      = () => <RoomPhoto src="/images/rooms/study.jpg"       alt="Study Room Design – Arav Interiors"/>
export const Bathroom   = () => <RoomPhoto src="/images/rooms/bathroom.jpg"    alt="Bathroom Design – Arav Interiors"/>
export const Balcony    = () => <RoomPhoto src="/images/rooms/balcony.jpg"     alt="Balcony Design – Arav Interiors"/>

/** Lookup map used throughout the app: ART_MAP[room] returns a component */
export const ART_MAP = {
  living:   LivingRoom,
  bedroom:  Bedroom,
  kitchen:  Kitchen,
  study:    Study,
  bathroom: Bathroom,
  balcony:  Balcony,
}

/**
 * ProjectPhoto — used in Portfolio.jsx for each project card.
 * Each project in content.js has an `image` field pointing to its photo.
 */
export function ProjectPhoto({ src, alt }) {
  return <RoomPhoto src={src} alt={alt} />
}
