export const NAV_MENUS = {
  interiors: {
    hasPromo: true,
    cols: [
      { heading: 'OFFERINGS', items: [
        { label: 'Modular Interiors',     sub: 'Kitchen, wardrobe & storage units', path: '/spaces' },
        { label: 'Full Home Interiors',   sub: 'Turnkey design to delivery',        path: '/spaces' },
        { label: 'Luxury Interiors',      sub: 'Premium, tailored spaces',          path: '/spaces' },
        { label: 'Renovation',            sub: 'Upgrade your existing home',        path: '/contact' },
      ]},
      { heading: 'INTERIOR GUIDES', items: [
        { label: 'Know Your Kitchen',       path: '/spaces'  },
        { label: 'Know Your Wardrobe',      path: '/spaces'  },
        { label: 'Design to Installation',  path: '/process' },
        { label: 'Get a Cost Estimate',     path: '/contact' },
      ]},
    ],
  },
  ideas: {
    hasPromo: false,
    cols: [
      { heading: 'BY ROOM', items: [
        { label: 'Living Room Designs', path: '/spaces' },
        { label: 'Bedroom Designs',     path: '/spaces' },
        { label: 'Kitchen Designs',     path: '/spaces' },
        { label: 'Bathroom Designs',    path: '/spaces' },
        { label: 'Study Room Designs',  path: '/spaces' },
        { label: 'Balcony Designs',     path: '/spaces' },
      ]},
      { heading: 'MODULAR SPACES', items: [
        { label: 'Wardrobe Designs',    path: '/spaces' },
        { label: 'TV Unit Designs',     path: '/spaces' },
        { label: 'Pooja Room Designs',  path: '/spaces' },
        { label: 'Home Bar Designs',    path: '/spaces' },
      ]},
      { heading: 'INSPIRATION', items: [
        { label: 'Decor & Styling',         path: '/spaces' },
        { label: 'Lighting Ideas',          path: '/spaces' },
        { label: 'Wall Design Ideas',       path: '/spaces' },
        { label: 'False Ceiling Designs',   path: '/spaces' },
      ]},
    ],
  },
  about: {
    hasPromo: true,
    cols: [
      { heading: 'COMPANY', items: [
        { label: 'About Us',        path: '/about'   },
        { label: 'Our Process',     path: '/process' },
        { label: 'Careers',         path: '/about'   },
        { label: 'Press & Awards',  path: '/about'   },
      ]},
      { heading: 'CONNECT', items: [
        { label: 'Contact Us',        path: '/contact' },
        { label: 'Book a Consult',    path: '/contact' },
        { label: 'Visit Our Studio',  path: '/contact' },
      ]},
    ],
  },
}

export const PROJECTS = [
  { title: '3BHK in Whitefield',        type: 'Full Home',   area: 'Whitefield',      room: 'living'   },
  { title: 'Luxury Kitchen, JP Nagar',  type: 'Kitchen',     area: 'JP Nagar',        room: 'kitchen'  },
  { title: 'Master Suite, Indiranagar', type: 'Bedroom',     area: 'Indiranagar',     room: 'bedroom'  },
  { title: 'Home Office, Koramangala',  type: 'Study Room',  area: 'Koramangala',     room: 'study'    },
  { title: '2BHK Full Home, HSR Layout',type: 'Full Home',   area: 'HSR Layout',      room: 'living'   },
  { title: 'Bathroom Remodel, Jayanagar',type:'Bathroom',    area: 'Jayanagar',       room: 'bathroom' },
  { title: 'Terrace Balcony, Sarjapur', type: 'Balcony',     area: 'Sarjapur Road',   room: 'balcony'  },
  { title: 'Modern Kitchen, Marathahalli',type:'Kitchen',    area: 'Marathahalli',    room: 'kitchen'  },
  { title: 'Full Home, Hennur',         type: 'Full Home',   area: 'Hennur',          room: 'bedroom'  },
  { title: 'Study Room, Bellandur',     type: 'Study Room',  area: 'Bellandur',       room: 'study'    },
  { title: 'Living Room, Bannerghatta', type: 'Living Room', area: 'Bannerghatta Rd', room: 'living'   },
  { title: 'Kitchen Revamp, Eco City',  type: 'Kitchen',     area: 'Electronic City', room: 'kitchen'  },
]

export const PORTFOLIO_CATS = ['All','Full Home','Kitchen','Bedroom','Living Room','Study Room','Bathroom','Balcony']

export const ROOMS = [
  { label: 'Living Room', room: 'living',   desc: 'Sofas, storage & statement walls' },
  { label: 'Kitchen',     room: 'kitchen',  desc: 'Modular & semi-modular kitchens'  },
  { label: 'Bedroom',     room: 'bedroom',  desc: 'Wardrobes, beds & headboards'     },
  { label: 'Study',       room: 'study',    desc: 'Shelves, desks & ambient lighting'},
  { label: 'Bathroom',    room: 'bathroom', desc: 'Vanities, tiles & fixtures'       },
  { label: 'Balcony',     room: 'balcony',  desc: 'Outdoor furniture & landscaping'  },
]

export const SPACES = [
  { label: 'Living Room', room: 'living',
    desc: 'From statement sofas to custom TV units and false ceilings — we design living rooms that balance aesthetics with how your family actually gathers.',
    tags: ['Sofas','TV Units','False Ceiling','Storage Walls','Lighting'] },
  { label: 'Kitchen', room: 'kitchen',
    desc: 'Modular and semi-modular kitchens built for Indian cooking — with the right storage, ventilation, and countertop surfaces that last.',
    tags: ['L-Shaped','U-Shaped','Straight','Parallel','Island Kitchens'] },
  { label: 'Bedroom', room: 'bedroom',
    desc: 'Wardrobes, beds, headboards, and ambient lighting — designed around how you sleep, dress, and start your day.',
    tags: ['Wardrobes','Beds','Headboards','Study Nooks','Lighting'] },
  { label: 'Study Room', room: 'study',
    desc: 'A quiet, considered workspace with custom shelving, ergonomic desk setups, and lighting that keeps you focused.',
    tags: ['Bookshelves','Desks','Cabinets','Cable Management','Ambient Lighting'] },
  { label: 'Bathroom', room: 'bathroom',
    desc: 'Vanities, tiles, fixtures, and storage — designed to feel like a retreat, not an afterthought.',
    tags: ['Vanities','Tiles','Shower Enclosures','Lighting','Storage Niches'] },
  { label: 'Balcony', room: 'balcony',
    desc: 'Outdoor furniture, planters, pergolas, and weather-resistant decking — turning dead space into your favourite room.',
    tags: ['Outdoor Seating','Planters','Pergolas','Decking','Lighting'] },
]

export const TESTIMONIALS = [
  { name: 'Priya Nair',           loc: 'Whitefield, Bangalore', proj: 'Full Home, 3BHK',         q: 'Arav turned a blank 3BHK into something that actually feels like us. The designer understood our chaotic lifestyle and worked with it, not against it.' },
  { name: 'Rahul & Anjali Mehta', loc: 'Indiranagar, Bangalore',proj: 'Modular Kitchen Remodel', q: "We'd been procrastinating on our kitchen for two years. Arav did it in six weeks, within our exact budget. Worth every rupee." },
  { name: 'Karthik Srinivasan',   loc: 'Koramangala, Bangalore',proj: 'Study Room & Bedroom',    q: "The 3D visualisations alone convinced me. What they rendered is exactly what I got — no surprises, no shortcuts." },
]

export const PROCESS_STEPS = [
  { n:'01', s:'Book a Free Consultation', d:'Day 1',    t:'A 45-minute conversation at your home or over video. Your designer asks about your lifestyle, tastes, budget, and timeline.', b:['Site visit to understand your space','Discussion of style and needs','Initial budget scoping','Timeline agreement'] },
  { n:'02', s:'Design & Approval',        d:'Week 1–3', t:'3D visualisations, material samples, and a room-by-room cost breakdown. You approve before anything starts.',                b:['3D walkthrough of every room','Material and finish samples','Detailed itemised quote','Up to 3 revision rounds'] },
  { n:'03', s:'Manufacturing',            d:'Week 3–7', t:'All modular pieces manufactured in our Bangalore factory with precision engineering and QC checks.',                          b:['Factory-made, accurate','QC inspection before dispatch','Real-time project tracker','Dedicated project manager'] },
  { n:'04', s:'Site Work & Civil',        d:'Week 4–8', t:'Electrical, plumbing, false ceiling, flooring, painting — all running in parallel, coordinated by your PM.',                 b:['Civil, painting, flooring','False ceiling & electrical','Plumbing & sanitary fixtures','Daily updates via WhatsApp'] },
  { n:'05', s:'Installation & Handover',  d:'Week 7–10',t:'Modular pieces installed, punch list addressed, full walkthrough with you before handover.',                                  b:['Modular installation in 2–3 days','Full punch list resolution','Walkthrough with you','10-year warranty documentation'] },
]

export const FAQ_ITEMS = [
  { q: 'How long does a full home interior take?',        a: 'For a standard 3BHK, we typically complete the full project in 60 to 90 days. Modular kitchens and wardrobes are delivered in 30–45 days.' },
  { q: 'Do you have a fixed price guarantee?',            a: 'Yes. The quote you receive after the design phase is what you pay. Any scope changes are priced separately before we proceed.' },
  { q: 'Can I see my design in 3D before work starts?',   a: 'Absolutely. Every project includes detailed 3D visualisations of each room, along with material samples. You approve before any work begins.' },
  { q: 'What does the 10-year warranty cover?',           a: 'All modular furniture and civil work — wardrobes, kitchen units, TV units, false ceilings, and flooring. Manufacturer warranties on appliances follow their own terms.' },
  { q: 'Do you work in all parts of Bangalore?',          a: 'Yes — Whitefield, Sarjapur Road, Indiranagar, Jayanagar, Hennur, Electronic City, and everywhere in between.' },
]

export const ABOUT_VALUES = [
  { t: 'Honesty first',          d: 'The price we quote is the price you pay. If anything changes, we tell you before we act.' },
  { t: 'Your life, our canvas',  d: 'We design around how you actually live — not how a magazine says you should.' },
  { t: 'Factory precision',      d: 'Everything we install is factory-manufactured. We do not cut corners on materials or finish.' },
  { t: 'Delivery is a promise',  d: '45 days is not an aspiration — it is a commitment we back with accountability.' },
]

export const FOOTER_COLS = [
  { h: 'Spaces',     rows: [['Living Room','/spaces'],['Bedroom','/spaces'],['Kitchen','/spaces'],['Study Room','/spaces'],['Balcony','/spaces']] },
  { h: 'Company',    rows: [['About Us','/about'],['Portfolio','/portfolio'],['Our Process','/process'],['Careers','/about'],['Contact Us','/contact']] },
  { h: 'Get Started',rows: [['Book a Consult','/contact'],['Email Us','/contact'],['Design Ideas','/spaces'],['How It Works','/process']] },
]
