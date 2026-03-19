import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRGenerator({ djNumber, productCode, baseUrl, mode = 'dj' }) {
  const printRef = useRef(null)
  const dj = djNumber ? djNumber.replace(/\D/g, '') : ''
  const url = mode === 'product' ? `${baseUrl}/${productCode}` : `${baseUrl}/dj/${dj}`

  const handlePrint = () => {
    const printContent = printRef.current
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - DJ ${dj}</title>
          <style>
            @page { size: 62mm 40mm; margin: 2mm; }
            body {
              margin: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: Arial, sans-serif;
            }
            .label { text-align: center; }
            .dj {
              font-size: 11px;
              font-weight: bold;
              font-family: monospace;
              margin-top: 4px;
              letter-spacing: 1.5px;
            }
            .code {
              font-size: 7px;
              font-weight: bold;
              font-family: monospace;
              margin-top: 1px;
              color: #444;
            }
            .brand {
              font-size: 7px;
              color: #666;
              margin-top: 2px;
            }
            svg { width: 30mm; height: 30mm; }
          </style>
        </head>
        <body>
          <div class="label">
            ${printContent.querySelector('svg').outerHTML}
            ${dj ? `<div class="dj">DJ ${dj}</div>` : ''}
            ${productCode ? `<div class="code">${productCode}</div>` : ''}
            <div class="brand">AFL Cable Docs</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
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
      <div className="flex gap-3 mt-4 justify-center">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-afl-cyan text-white rounded-lg text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition cursor-pointer font-heading"
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
