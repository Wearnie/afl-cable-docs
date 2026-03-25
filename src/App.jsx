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
import ReviewMatchesPage from './pages/ReviewMatchesPage'
import AdminGate from './components/AdminGate'

function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 240px, #F0F4F8 240px)' }}>
      <header className="px-6 pt-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <img src="/afl-logo.svg" alt="AFL" className="h-14 w-auto mb-8" />
          <h1 className="text-white text-3xl font-bold font-heading leading-tight">
            Cable Documentation
          </h1>
          <p className="text-blue-300 mt-1.5 text-[15px]">Quick access to product documents and QR labels</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 -mt-10 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/generate"
            className="group block bg-white p-8 rounded-2xl shadow-sm border border-afl-border hover:shadow-md hover:border-afl-cyan/40 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-afl-cyan flex items-center justify-center mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-cyan mb-1 font-heading">Generator</h2>
            <h3 className="text-xl font-bold text-afl-text font-heading">QR Stickers</h3>
            <p className="text-afl-muted mt-2 text-sm leading-relaxed">Generate scannable QR labels for cable drums.</p>
          </Link>

          <Link
            to="/upload"
            className="group block bg-white p-8 rounded-2xl shadow-sm border border-afl-border hover:shadow-md hover:border-emerald-400/40 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600 mb-1 font-heading">Upload</h2>
            <h3 className="text-xl font-bold text-afl-text font-heading">Test Certs</h3>
            <p className="text-afl-muted mt-2 text-sm leading-relaxed">Upload Final Test Certificates — DJ and product code read from PDF.</p>
          </Link>

          <Link
            to="/dj/03429835"
            className="group block bg-white p-8 rounded-2xl shadow-sm border border-afl-border hover:shadow-md hover:border-afl-blue/40 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-afl-blue flex items-center justify-center mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-blue mb-1 font-heading">Preview</h2>
            <h3 className="text-xl font-bold text-afl-text font-heading">Example Scan</h3>
            <p className="text-afl-muted mt-2 text-sm leading-relaxed">See what a customer sees — all 5 documents.</p>
          </Link>

          <Link
            to="/audit"
            className="group block bg-white p-8 rounded-2xl shadow-sm border border-afl-border hover:shadow-md hover:border-rose-400/40 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-rose-500 flex items-center justify-center mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600 mb-1 font-heading">Admin</h2>
            <h3 className="text-xl font-bold text-afl-text font-heading">Pattern Audit</h3>
            <p className="text-afl-muted mt-2 text-sm leading-relaxed">Review, edit, and upload document pattern mappings.</p>
          </Link>
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
      <Route path="/generate" element={<GeneratePage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/review-matches" element={<ReviewMatchesPage />} />
      <Route path="/dj/:djNumber" element={<DJDocumentPage />} />
      <Route path="/:productCode" element={<DocumentPage />} />
    </Routes>
  )
}
