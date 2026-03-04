import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { findDocuments } from '../data/documentMap'
import { docTypeInfo } from '../data/documentMap'
import { findFinalTestCert } from '../data/finalTestCerts'
import QRGenerator from '../components/QRGenerator'

export default function GeneratePage() {
  const [input, setInput] = useState('')
  const [djInput, setDjInput] = useState('')
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const djNumber = djInput.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const isValid = code.length === 13
  const documents = useMemo(() => (isValid ? findDocuments(code) : []), [code, isValid])
  const finalTestCert = useMemo(() => findFinalTestCert(djNumber), [djNumber])

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5173'

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      {/* Header */}
      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">QR Code Generator</h1>
              <p className="text-blue-300 text-sm">Generate QR labels for cable drums</p>
            </div>
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-8 space-y-4 no-print">
        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
                Product Code
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. LMDC1DPA144BE"
                maxLength={13}
                className="w-full px-4 py-3 border border-afl-border rounded-xl font-mono text-lg tracking-[0.15em] uppercase focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent transition-shadow"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-medium ${code.length === 13 ? 'text-emerald-600' : 'text-afl-muted'}`}>
                  {code.length}/13 characters
                </span>
                {code.length > 0 && code.length !== 13 && (
                  <span className="text-xs text-amber-500 font-medium">
                    {13 - code.length} more needed
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
                DJ Number <span className="text-afl-muted/60 normal-case tracking-normal font-normal">(optional — for Final Test Certificate)</span>
              </label>
              <input
                type="text"
                value={djInput}
                onChange={(e) => setDjInput(e.target.value)}
                placeholder="e.g. DJ3429835"
                className="w-full px-4 py-3 border border-afl-border rounded-xl font-mono text-lg tracking-[0.15em] uppercase focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent transition-shadow"
              />
            </div>
          </div>
        </div>

        {/* QR Code + preview */}
        {isValid && (
          <>
            <QRGenerator productCode={code} djNumber={djNumber} baseUrl={baseUrl} />

            <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-3 font-heading">
                Documents that will appear ({documents.length + (djNumber ? 1 : 0)})
              </h3>
              {documents.length > 0 || djNumber ? (
                <div className="space-y-2.5">
                  {documents.map((doc, i) => {
                    const info = docTypeInfo[doc.type] || docTypeInfo.Other
                    return (
                      <div key={`${doc.type}-${i}`} className="flex items-center gap-3 text-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy" style={{ minWidth: '110px' }}>
                          {info.label}
                        </span>
                        <span className="text-afl-text truncate text-[13px]">{doc.name}</span>
                      </div>
                    )
                  })}
                  {djNumber && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy" style={{ minWidth: '110px' }}>
                        Final Test Cert
                      </span>
                      <span className="text-afl-text truncate text-[13px]">
                        {finalTestCert ? finalTestCert.name : `${djNumber} — pending upload`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-afl-muted text-sm">
                  No documents match this code. The QR will still work — the page will show "No documents found".
                </p>
              )}
            </div>

            <div className="text-center">
              <Link
                to={djNumber ? `/${code}?dj=${encodeURIComponent(djNumber)}` : `/${code}`}
                className="inline-block px-5 py-2 bg-afl-cyan text-white rounded-lg text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition font-heading"
              >
                Preview customer page →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
