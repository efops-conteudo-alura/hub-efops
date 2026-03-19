"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

interface ExportarPDFProps {
  assunto: string
  tipoConteudo: string
  tipoPesquisa: string
  nivel?: string
  focoGeo?: string
  autorNome?: string
  createdAt?: string
  printId: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function ExportarPDFButton({
  assunto, tipoConteudo, tipoPesquisa, nivel, focoGeo, autorNome, createdAt, printId,
}: ExportarPDFProps) {
  function handleExport() {
    const contentEl = document.getElementById(printId)
    if (!contentEl) return

    const slug = slugify(assunto)
    const originalTitle = document.title

    const dataFormatada = new Date(createdAt ?? Date.now()).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

    const metadados = [tipoConteudo, tipoPesquisa, nivel, focoGeo, autorNome ? `Por ${autorNome}` : null, dataFormatada]
      .filter(Boolean)
      .join(" · ")

    const printContainer = document.createElement("div")
    printContainer.id = "pdf-print-container"
    printContainer.innerHTML = `
      <div>
        <div class="pdf-header">
          <h1>${escapeHtml(assunto)}</h1>
          <p class="pdf-meta">${escapeHtml(metadados)}</p>
        </div>
        <div class="pdf-body">${contentEl.innerHTML}</div>
      </div>
    `
    document.body.appendChild(printContainer)

    const style = document.createElement("style")
    style.id = "pdf-print-styles"
    style.textContent = `
      @media print {
        body > *:not(#pdf-print-container) { display: none !important; }
        #pdf-print-container {
          display: block !important;
          padding: 32px 40px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #111;
        }
        .pdf-header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 14pt;
          margin-bottom: 20pt;
        }
        .pdf-header h1 {
          font-size: 20pt;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6pt;
        }
        .pdf-meta { font-size: 9pt; color: #64748b; }
        #pdf-print-container h1 { font-size: 16pt; font-weight: 700; margin: 16pt 0 6pt; }
        #pdf-print-container h2 { font-size: 13pt; font-weight: 600; margin: 14pt 0 5pt; }
        #pdf-print-container h3 { font-size: 11pt; font-weight: 600; margin: 12pt 0 4pt; }
        #pdf-print-container p { margin: 4pt 0 8pt; }
        #pdf-print-container ul, #pdf-print-container ol { margin: 4pt 0 8pt 18pt; }
        #pdf-print-container li { margin: 2pt 0; }
        #pdf-print-container strong { font-weight: 600; }
        #pdf-print-container table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
        #pdf-print-container th { background: #f1f5f9; font-weight: 600; text-align: left; padding: 6pt 8pt; border: 1pt solid #e2e8f0; }
        #pdf-print-container td { padding: 5pt 8pt; border: 1pt solid #e2e8f0; }
        #pdf-print-container tr:nth-child(even) td { background: #fafafa; }
        #pdf-print-container blockquote { border-left: 3pt solid #cbd5e1; padding-left: 10pt; color: #64748b; margin: 6pt 0; }
        #pdf-print-container code { font-family: monospace; font-size: 10pt; background: #f1f5f9; padding: 1pt 3pt; border-radius: 2pt; }
        #pdf-print-container a { color: #2563eb; }
        #pdf-print-container .prose { all: unset; display: block; }
      }
      #pdf-print-container { display: none; }
    `
    document.head.appendChild(style)
    document.title = slug

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      document.title = originalTitle
      if (document.body.contains(printContainer)) document.body.removeChild(printContainer)
      if (document.head.contains(style)) document.head.removeChild(style)
      window.onafterprint = null
    }

    window.onafterprint = cleanup
    window.print()
    setTimeout(cleanup, 10000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileDown size={15} className="mr-1.5" />
      Exportar PDF
    </Button>
  )
}
