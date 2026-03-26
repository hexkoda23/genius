// src/components/teach/EulerRenderer.jsx
import React from 'react'

export function inlineFormat(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-[var(--color-teal)]/10 font-mono text-xs text-[var(--color-teal)]">$1</code>')
        .replace(/\$([^$\n]+)\$/g, '<span class="font-mono text-[var(--color-ink)] bg-[var(--color-ink)]/5 px-1 rounded text-xs border border-[var(--color-ink)]/10">$1</span>')
}

export default function EulerRenderer({ text }) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (!line.trim()) {
            elements.push(<div key={key++} className="h-4" />)
            continue
        }

        if (line.trim() === '---' || line.trim() === '***') {
            elements.push(<hr key={key++} className="border-[var(--color-ink)]/10 my-6" />)
            continue
        }

        // Headlines
        const h1Match = line.match(/^# (.+)/)
        if (h1Match) {
            elements.push(<h1 key={key++} className="font-serif font-black text-2xl text-[var(--color-ink)] mt-8 mb-4 uppercase tracking-tighter">{h1Match[1]}</h1>)
            continue
        }

        const h2Match = line.match(/^## (.+)/)
        if (h2Match) {
            elements.push(<h2 key={key++} className="font-serif italic font-black text-xl text-[var(--color-ink)] mt-6 mb-3">{h2Match[1]}</h2>)
            continue
        }

        const h3Match = line.match(/^### (.+)/)
        if (h3Match) {
            elements.push(<h3 key={key++} className="font-mono text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)] mt-4 mb-2">{h3Match[1]}</h3>)
            continue
        }

        // Lists
        const numMatch = line.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
            elements.push(
                <div key={key++} className="flex gap-4 text-sm leading-relaxed ml-2 group">
                    <span className="shrink-0 font-mono font-black text-[var(--color-gold)] w-6 pt-0.5 text-[10px]">{numMatch[1].padStart(2, '0')}.</span>
                    <span className="font-serif italic text-[var(--color-ink)]" dangerouslySetInnerHTML={{ __html: inlineFormat(numMatch[2]) }} />
                </div>
            )
            continue
        }

        const bulletMatch = line.match(/^[-*•]\s+(.*)/)
        if (bulletMatch) {
            elements.push(
                <div key={key++} className="flex gap-4 text-sm leading-relaxed ml-2">
                    <span className="shrink-0 text-[var(--color-gold)] mt-2 text-[10px]">■</span>
                    <span className="font-serif italic text-[var(--color-ink)]" dangerouslySetInnerHTML={{ __html: inlineFormat(bulletMatch[1]) }} />
                </div>
            )
            continue
        }

        // Math Block
        if (line.trim().startsWith('$$')) {
            elements.push(
                <div key={key++}
                    className="my-6 px-12 py-10 bg-[var(--color-cream)] border-2 border-[var(--color-ink)] font-mono text-base text-center overflow-x-auto text-[var(--color-ink)] shadow-[12px_12px_0_var(--color-gold)]">
                    {line.trim()}
                </div>
            )
            continue
        }

        // Paragraph
        elements.push(
            <p key={key++} className="font-serif font-light text-[17px] leading-[1.6] text-[var(--color-ink)]/90"
                dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
        )
    }

    return <div className="space-y-4">{elements}</div>
}
