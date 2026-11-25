# Arav Interiors — React.js Project

A production-ready React.js website for **Arav Interiors**, a Bangalore-based interior design studio.

## Tech Stack
- **React 18** with Hooks
- **React Router v6** (HashRouter for static hosting)
- **Vite** for dev server & bundling
- **CSS Custom Properties** for theming (no CSS framework needed)

## Features
- 6 navigable pages (Home, Portfolio, Spaces, Process, About, Contact)
- Mega-menu navigation with hover dropdowns
- Light / Dark mode toggle (persisted in localStorage)
- Scroll progress bar + Back-to-top button
- WhatsApp floating button (with pulse animation)
- Portfolio with filter tabs + lightbox preview
- Contact form with **FormSubmit.co** email delivery + mailto fallback
- Lazy-loaded routes for performance
- Animated counters (Intersection Observer)
- Page transition animations
- Fully responsive (mobile nav with accordion menus)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

## Project Structure

```
src/
├── main.jsx              # Entry point (HashRouter)
├── App.jsx               # Routes + global wrappers
├── index.css             # Design tokens + global styles
├── hooks/
│   └── useTheme.js       # Light/dark mode hook
├── data/
│   └── content.js        # All copy, nav menus, project data
├── components/
│   ├── Navbar.jsx         # Mega-menu navbar
│   ├── Footer.jsx         # 4-column footer
│   ├── WABtn.jsx          # WhatsApp FAB
│   ├── BackToTop.jsx      # Back-to-top button
│   ├── ScrollProgress.jsx # Scroll progress bar
│   ├── ScrollToTop.jsx    # Route-change scroll reset
│   ├── Icons.jsx          # All SVG icon components
│   └── RoomArt.jsx        # 6 inline SVG room illustrations
└── pages/
    ├── Home.jsx           # Hero, Spaces, Process, Testimonials, CTA
    ├── Portfolio.jsx      # Filterable gallery with lightbox
    ├── Spaces.jsx         # Design ideas by room type
    ├── Process.jsx        # 5-step process + FAQ accordion
    ├── About.jsx          # Story, values, awards
    ├── Contact.jsx        # Form + WhatsApp + email
    └── NotFound.jsx       # 404 page
```

## Customisation

### Update contact email
In `src/pages/Contact.jsx`, replace `hello@aravinteriors.com` with your actual email.
> **Note:** FormSubmit.co will send a one-time verification email to that address on the first submission.

### Update WhatsApp number
Search for `919876543210` across the project and replace with your number (country code + number, no `+` or spaces).

### Add real project photos
In `src/components/RoomArt.jsx`, replace SVG components with `<img>` tags pointing to your actual project photography.

### Update content
All site copy, navigation items, project listings, and testimonials live in `src/data/content.js`.

## Deployment

Works on any static host (Netlify, Vercel, GitHub Pages, Firebase Hosting):

```bash
npm run build
# Deploy the /dist folder
```

For Netlify/Vercel, no extra config needed — HashRouter handles client-side routing without server config.

---

Built with ❤️ for Arav Interiors, Bangalore.
