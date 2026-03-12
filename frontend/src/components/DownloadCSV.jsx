import React from 'react'
import { Download, Table as TableIcon } from 'lucide-react'

export default function DownloadCSV({ data, filename = "wavesena_data.csv" }) {
    if (!data || data.length === 0) return null

    const handleDownload = () => {
        // Extract headers
        const headers = Object.keys(data[0])
        
        // Convert array of objects to CSV string
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    let cell = row[header] === null || row[header] === undefined ? '' : String(row[header])
                    // Escape quotes and wrap in quotes if contains comma
                    if (cell.includes(',') || cell.includes('"')) {
                      cell = `"${cell.replace(/"/g, '""')}"`
                    }
                    return cell
                }).join(',')
            )
        ].join('\n')

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', filename)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    return (
        <button 
            onClick={handleDownload}
            className="flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50/50 hover:bg-blue-100/50 rounded-md border border-blue-100 transition-colors"
        >
            <Download className="w-4 h-4" />
            Download Full Dataset ({data.length.toLocaleString()} rows)
        </button>
    )
}
