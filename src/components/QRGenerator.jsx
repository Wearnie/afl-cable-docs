import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRGenerator({ djNumber, productCode, baseUrl, mode = 'dj' }) {
  const printRef = useRef(null)
  const dj = djNumber ? djNumber.replace(/\D/g, '') : ''
  const url = mode === 'product' ? `${baseUrl}/${productCode}` : `${baseUrl}/dj/${dj}`

  const handlePrint = () => {
    const printContent = printRef.current
    const printWindow = window.open('', '_blank')
    const doc = printWindow.document

    // Build the print document safely using DOM methods (no document.write)
    doc.open()
    const style = doc.createElement('style')
    style.textContent = `
      @page { size: 62mm 40mm; margin: 2mm; }
      body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; }
      .label { text-align: center; }
      .dj { font-size: 11px; font-weight: bold; font-family: monospace; margin-top: 4px; letter-spacing: 1.5px; }
      .code { font-size: 7px; font-weight: bold; font-family: monospace; margin-top: 1px; color: #444; }
      .brand { font-size: 7px; color: #666; margin-top: 2px; }
      svg { width: 30mm; height: 30mm; }
    `
    doc.head.appendChild(style)
    doc.title = `QR Label - DJ ${dj}`

    const label = doc.createElement('div')
    label.className = 'label'

    // Clone the SVG safely instead of using outerHTML in a template string
    const svgClone = printContent.querySelector('svg').cloneNode(true)
    label.appendChild(doc.adoptNode(svgClone))

    if (dj) {
      const djDiv = doc.createElement('div')
      djDiv.className = 'dj'
      djDiv.textContent = `DJ ${dj}`
      label.appendChild(djDiv)
    }
    if (productCode) {
      const codeDiv = doc.createElement('div')
      codeDiv.className = 'code'
      codeDiv.textContent = productCode
      label.appendChild(codeDiv)
    }
    const brandDiv = doc.createElement('div')
    brandDiv.className = 'brand'
    brandDiv.textContent = 'AFL Cable Docs'
    label.appendChild(brandDiv)

    doc.body.appendChild(label)
    doc.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
  }

  const handleDownload = () => {
    const svg = printRef.current.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 600 // High-res PNG
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = `QR-${dj || productCode}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-6 text-center">
      <div ref={printRef} className="inline-block p-4 bg-white rounded-xl">
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="font-mono text-[13px] text-afl-muted mt-3 break-all tracking-wide">{url}</p>
      <div className="flex gap-3 mt-4 justify-center flex-wrap">
        <button
          onClick={handleDownload}
          className="px-5 py-2.5 bg-afl-cyan text-white rounded-lg text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition cursor-pointer font-heading"
        >
          Download QR
        </button>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 border border-afl-border text-afl-text rounded-lg text-sm font-semibold hover:bg-gray-50 transition cursor-pointer font-heading"
        >
          Print Sticker
        </button>
        <button
          onClick={handleCopy}
          className="px-5 py-2.5 border border-afl-border text-afl-text rounded-lg text-sm font-semibold hover:bg-gray-50 transition cursor-pointer font-heading"
        >
          Copy URL
        </button>
      </div>
    </div>
  )
}
