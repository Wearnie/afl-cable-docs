import { useEffect } from 'react'

export default function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-2xl font-semibold text-white shadow-lg z-50 animate-fade-in ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}
