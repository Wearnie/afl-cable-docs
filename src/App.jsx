import { Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { loadDocumentMap, loadAppConfig } from './data/documentMap'
import DocumentPage from './pages/DocumentPage'
import DJDocumentPage from './pages/DJDocumentPage'
import GeneratePage from './pages/GeneratePage'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import AdminPage from './pages/AdminPage'
import AdminConfigPage from './pages/AdminConfigPage'
import AuditPage from './pages/AuditPage'
import CoverageAuditPage from './pages/CoverageAuditPage'
import ReviewMatchesPage from './pages/ReviewMatchesPage'
import UsersPage from './pages/UsersPage'
import AdminGate from './components/AdminGate'
import AuthProvider, { useAuth } from './components/AuthProvider'

const allCards = [
  {
    to: '/generate',
    label: 'Generator',
    title: 'QR Stickers',
    desc: 'Generate scannable QR labels for cable drums.',
    minRole: 'dispatch',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'Dispatch',
    title: 'Upload Final Test Certificates',
    desc: 'Drop one or many cert PDFs — DJ number and product code extracted automatically.',
    minRole: 'dispatch',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5V3.75m0 0L5.25 7.5M9 3.75l3.75 3.75M4.5 21h12.75A2.25 2.25 0 0019.5 18.75V12" />
      </svg>
    ),
  },
  {
    to: '/audit',
    label: 'Admin',
    title: 'Pattern Audit',
    desc: 'Review, edit, and upload document pattern mappings.',
    minRole: 'admin',
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
    minRole: 'admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    to: '/admin/config',
    label: 'Admin',
    title: 'App Configuration',
    desc: 'Manage product-code suffixes and custom document types.',
    minRole: 'admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Admin',
    title: 'User Management',
    desc: 'Add, edit, and remove user accounts.',
    minRole: 'admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
]

function meetsMinRole(userRole, requiredRole) {
  if (requiredRole === 'dispatch') return userRole === 'dispatch' || userRole === 'admin'
  if (requiredRole === 'admin') return userRole === 'admin'
  return false
}

function HomePage() {
  const { role, user, signOut } = useAuth()
  const cards = allCards.filter(card => meetsMinRole(role, card.minRole))

  return (
    <div className="min-h-screen bg-afl-light">
      {/* Header with AFL gradient */}
      <header className="afl-header-bg px-6 pt-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-10">
            <div className="logo-dark-bg"><img src="/afl-logo.png" alt="AFL" className="h-36 w-auto" /></div>
            {user && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="text-right leading-tight">
                  <div className="text-[13px] font-semibold text-white">{user.name || user.email}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60 font-heading">{role}</div>
                </div>
                <button
                  onClick={signOut}
                  className="text-[11px] font-bold uppercase tracking-wider text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-md px-2.5 py-1.5 transition-colors font-heading"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
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

        {/* Secondary cards — only shown if user has access */}
        {cards.length > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        )}
      </main>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    loadAppConfig()
    loadDocumentMap()
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/review" element={<AdminGate><ReviewPage /></AdminGate>} />
        <Route path="/admin" element={<AdminGate><AdminPage /></AdminGate>} />
        <Route path="/admin/config" element={<AdminGate><AdminConfigPage /></AdminGate>} />
        <Route path="/audit" element={<AdminGate><AuditPage /></AdminGate>} />
        <Route path="/coverage" element={<AdminGate><CoverageAuditPage /></AdminGate>} />
        <Route path="/review-matches" element={<AdminGate><ReviewMatchesPage /></AdminGate>} />
        <Route path="/users" element={<AdminGate><UsersPage /></AdminGate>} />
        <Route path="/dj/:djNumber" element={<DJDocumentPage />} />
        <Route path="/:productCode" element={<DocumentPage />} />
      </Routes>
    </AuthProvider>
  )
}
