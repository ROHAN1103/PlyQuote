import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import WABtn from './components/WABtn'
import ScrollToTop from './components/ScrollToTop'
import ScrollProgress from './components/ScrollProgress'
import BackToTop from './components/BackToTop'
import { useTheme } from './hooks/useTheme'

const Home      = lazy(() => import('./pages/Home'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Spaces    = lazy(() => import('./pages/Spaces'))
const Process   = lazy(() => import('./pages/Process'))
const About     = lazy(() => import('./pages/About'))
const Contact   = lazy(() => import('./pages/Contact'))
const NotFound  = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid var(--sf2)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )
}

export default function App() {
  const { dark, toggle } = useTheme()
  const location = useLocation()
  return (
    <>
      <ScrollToTop />
      <ScrollProgress />
      <Navbar dark={dark} toggleDark={toggle} />
      <WABtn />
      <Suspense fallback={<PageLoader />}>
        <div key={location.pathname} style={{ animation:'pageIn .35s cubic-bezier(.16,1,.3,1)' }}>
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/spaces"    element={<Spaces />} />
            <Route path="/process"   element={<Process />} />
            <Route path="/about"     element={<About />} />
            <Route path="/contact"   element={<Contact />} />
            <Route path="*"          element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
      <Footer />
      <BackToTop />
    </>
  )
}
