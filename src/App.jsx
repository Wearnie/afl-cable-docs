import { Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { loadDocumentMap } from './data/documentMap'
import DocumentPage from './pages/DocumentPage'
import DJDocumentPage from './pages/DJDocumentPage'
import GeneratePage from './pages/GeneratePage'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import AdminPage from './pages/AdminPage'
import AuditPage from './pages/AuditPage'
import CoverageAuditPage from './pages/CoverageAuditPage'
import ReviewMatchesPage from './pages/ReviewMatchesPage'
import AdminGate from './components/AdminGate'

const cards = [
  {
    to: '/generate',
    label: 'Generator',
    title: 'QR Stickers',
    desc: 'Generate scannable QR labels for cable drums.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'Upload',
    title: 'Test Certs',
    desc: 'Upload Final Test Certificates — DJ and product code read from PDF.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    to: '/dj/03429835',
    label: 'Preview',
    title: 'Example Scan',
    desc: 'See what a customer sees — all 5 documents.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    to: '/audit',
    label: 'Admin',
    title: 'Pattern Audit',
    desc: 'Review, edit, and upload document pattern mappings.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    to: '/coverage',
    label: 'Admin',
    title: 'Coverage Audit',
    desc: 'Check document coverage for every product code.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
]

function HomePage() {
  return (
    <div className="min-h-screen bg-afl-light">
      {/* Header with AFL gradient */}
      <header className="afl-header-bg px-6 pt-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="logo-dark-bg mb-10"><img src="/afl-logo.png" alt="AFL" className="h-9 w-auto" /></div>
          <h1 className="text-white text-3xl font-bold font-heading leading-tight tracking-tight">
            Cable Documentation
          </h1>
          <p className="text-white/60 mt-2 text-[15px] font-medium">
            Quick access to product documents and QR labels
          </p>
        </div>
      </header>

      {/* Cards */}
      <main className="max-w-4xl mx-auto px-6 -mt-12 pb-16">
        {/* Hero card — QR Sticker Generator */}
        <Link
          to={cards[0].to}
          className="card-enter gradient-border-hover group block bg-white p-8 rounded-2xl shadow-sm border border-afl-border hover:shadow-lg transition-all duration-300 mb-4"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl afl-gradient flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-afl-cyan mb-1 font-heading">Generator</h2>
              <h3 className="text-2xl font-bold text-afl-text font-heading">QR Sticker Generator</h3>
              <p className="text-afl-muted mt-1 text-sm leading-relaxed">Generate scannable QR labels for cable drums with product code and DJ number.</p>
            </div>
            <div className="ml-auto shrink-0 text-afl-cyan group-hover:translate-x-1 transition-transform duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Secondary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.slice(1).map((card, i) => (
            <Link
              key={card.to}
              to={card.to}
              className="card-enter gradient-border-hover group block bg-white p-6 rounded-2xl shadow-sm border border-afl-border hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${(i + 1) * 80}ms` }}
            >
              <div className="w-11 h-11 rounded-xl afl-gradient flex items-center justify-center mb-4 text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
                {card.icon}
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-afl-cyan mb-1 font-heading">
                {card.label}
              </h2>
              <h3 className="text-lg font-bold text-afl-text font-heading leading-snug">
                {card.title}
              </h3>
              <p className="text-afl-muted mt-1.5 text-[13px] leading-relaxed">
                {card.desc}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  useEffect(() => { loadDocumentMap() }, [])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/generate" element={<AdminGate><GeneratePage /></AdminGate>} />
      <Route path="/upload" element={<AdminGate><UploadPage /></AdminGate>} />
      <Route path="/review" element={<AdminGate><ReviewPage /></AdminGate>} />
      <Route path="/admin" element={<AdminGate><AdminPage /></AdminGate>} />
      <Route path="/audit" element={<AdminGate><AuditPage /></AdminGate>} />
      <Route path="/coverage" element={<AdminGate><CoverageAuditPage /></AdminGate>} />
      <Route path="/review-matches" element={<AdminGate><ReviewMatchesPage /></AdminGate>} />
      <Route path="/dj/:djNumber" element={<DJDocumentPage />} />
      <Route path="/:productCode" element={<DocumentPage />} />
    </Routes>
  )
}
