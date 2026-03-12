import { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ResultRenderer from './ResultRenderer'

/* ── Typing indicator ────────────────────────────────────────── */
export function TypingIndicator() {
    return (
        <div className="flex gap-3 items-start py-1">
            <Avatar role="assistant" />
            <div className="px-4 py-3.5 glass-panel rounded-[4px_18px_18px_18px] flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary block"
                        style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                ))}
            </div>
        </div>
    )
}

/* ── Avatar ──────────────────────────────────────────────────── */
function Avatar({ role }) {
    const isUser = role === 'user'
    return (
        <div className={`
            hidden md:flex w-8 h-8 rounded-full shrink-0 items-center justify-center
            text-[0.72rem] font-bold text-background
            ${isUser
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : 'bg-gradient-to-br from-primary to-accent shadow-[0_0_12px_hsla(193,100%,50%,0.35)]'}
        `}>
            {isUser ? 'U' : '🌊'}
        </div>
    )
}

/* ── SQL Reveal Block ────────────────────────────────────────── */
function SqlBlock({ sql }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="mt-3 w-full overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-3 py-1 hover:bg-primary/15 transition-colors"
            >
                <span>{open ? '▾' : '▸'}</span>
                {open ? 'Hide' : 'View'} generated SQL
            </button>

            {open && (
                <pre className="mt-2 w-full p-4 rounded-xl bg-black/40 border border-primary/10 text-[0.75rem] text-sky-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap word-break" style={{ animation: 'chat-appear 0.25s ease both', wordBreak: 'break-all' }}>
                    {sql}
                </pre>
            )}
        </div>
    )
}

/* ── TX Hash Badge ───────────────────────────────────────────── */
function TxBadge({ txHash, auditHash, polygonscanUrl }) {
    const [expanded, setExpanded] = useState(false)
    const [copied, setCopied] = useState(null)

    const short = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`
    const link = polygonscanUrl ?? `https://amoy.polygonscan.com/tx/${txHash}`

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key); setTimeout(() => setCopied(null), 2000)
        })
    }

    return (
        <div className="mt-3 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] to-blue-500/[0.07] overflow-hidden" style={{ animation: 'chat-appear 0.3s ease both' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-[0.88rem]" style={{ animation: 'pulse-glow 2.5s ease infinite' }}>⛓️</span>
                    <span className="text-[0.68rem] font-bold text-violet-300 uppercase tracking-wider">On-Chain Verified</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" style={{ animation: 'pulse-glow 2s ease infinite' }} />
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={link} target="_blank" rel="noopener noreferrer"
                        className="text-[0.67rem] font-semibold text-indigo-300 border border-indigo-400/20 bg-indigo-400/8 rounded-full px-2.5 py-1 hover:bg-indigo-400/18 transition-colors shrink-0 whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">View on PolygonScan ↗</span>
                        <span className="sm:hidden">View TX</span>
                    </a>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-[0.72rem] text-muted-foreground hover:text-violet-300 transition-colors px-1"
                        title={expanded ? 'Collapse' : 'Show full hashes'}
                    >
                        {expanded ? '▴' : '▾'}
                    </button>
                </div>
            </div>

            {/* Short TX pill */}
            <div className="px-3.5 pb-2.5 flex items-center gap-2">
                <code className="text-[0.7rem] text-violet-300 font-mono bg-violet-500/10 px-2 py-0.5 rounded-md tracking-wide">
                    TX: {short}
                </code>
                <button
                    onClick={() => copyToClipboard(txHash, 'tx')}
                    className={`text-[0.72rem] transition-colors ${copied === 'tx' ? 'text-green-400' : 'text-muted-foreground hover:text-violet-300'}`}
                >
                    {copied === 'tx' ? '✓' : '⧉'}
                </button>
            </div>

            {/* Expanded hashes */}
            {expanded && (
                <div className="border-t border-violet-500/10 px-3.5 py-3 flex flex-col gap-3" style={{ animation: 'chat-appear 0.2s ease both' }}>
                    <div>
                        <p className="text-[0.6rem] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                            <code className="text-[0.67rem] text-violet-300 font-mono break-all leading-relaxed">{txHash}</code>
                            <button onClick={() => copyToClipboard(txHash, 'tx-full')} className={`text-[0.72rem] shrink-0 transition-colors ${copied === 'tx-full' ? 'text-green-400' : 'text-muted-foreground'}`}>
                                {copied === 'tx-full' ? '✓' : '⧉'}
                            </button>
                        </div>
                    </div>
                    {auditHash && (
                        <div>
                            <p className="text-[0.6rem] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Audit Hash (SHA-256 · reproducible)</p>
                            <div className="flex items-center gap-2">
                                <code className="text-[0.67rem] text-sky-300 font-mono break-all leading-relaxed">{auditHash}</code>
                                <button onClick={() => copyToClipboard(auditHash, 'audit')} className={`text-[0.72rem] shrink-0 transition-colors ${copied === 'audit' ? 'text-green-400' : 'text-muted-foreground'}`}>
                                    {copied === 'audit' ? '✓' : '⧉'}
                                </button>
                            </div>
                            <p className="text-[0.6rem] text-muted-foreground/40 italic mt-1">SHA256(question + SQL + results) — independently reproducible by any researcher</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ── Main MessageBubble ──────────────────────────────────────── */
const MessageBubble = memo(function MessageBubble({ role, content, sqlGenerated, txHash, auditHash, polygonscanUrl, createdAt, data }) {
    const isUser = role === 'user'
    const [reloadedData, setReloadedData] = useState(null)
    const [loadingMap, setLoadingMap] = useState(false)
    const [loadError, setLoadError] = useState(null)

    const effectiveData = data || reloadedData

    const handleLoadMap = async () => {
        if (!sqlGenerated) return
        setLoadingMap(true)
        setLoadError(null)
        try {
            const res = await fetch('/api/rerun-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: sqlGenerated })
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`)
            const json = await res.json()
            if (json.data && json.data.length > 0) {
                setReloadedData(json.data)
            } else {
                setLoadError('Query returned no data.')
            }
        } catch (e) {
            setLoadError(e.message)
        } finally {
            setLoadingMap(false)
        }
    }

    return (
        <div className={`flex gap-3 items-start py-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} style={{ animation: 'chat-appear 0.3s ease both' }}>
            <Avatar role={role} />

            <div className={`w-full max-w-[92%] md:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <span className="text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1.5">
                    {isUser ? 'You' : 'FloatChat'}
                </span>

                <div className={`
                    px-4 py-3.5 backdrop-blur-sm w-full max-w-full overflow-hidden
                    ${isUser
                        ? 'bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/25 rounded-[18px_4px_18px_18px]'
                        : 'glass-panel rounded-[4px_18px_18px_18px]'}
                `}>
                    <div className="text-foreground text-[0.88rem] leading-[1.68] whitespace-pre-wrap break-words w-full overflow-hidden">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-sky-300" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-[1.1rem] font-bold mt-4 mb-2 text-white" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-[1rem] font-bold mt-4 mb-2 text-white" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-[0.95rem] font-bold mt-3 mb-1.5 text-white" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="" {...props} />,
                                table: ({node, ...props}) => <div className="overflow-x-auto mb-4 bg-black/20 rounded-lg"><table className="w-full text-left border-collapse text-[0.8rem]" {...props} /></div>,
                                th: ({node, ...props}) => <th className="px-4 py-2 bg-white/10 border-b border-white/10 text-sky-200 font-semibold" {...props} />,
                                td: ({node, ...props}) => <td className="px-4 py-2 border-b border-white/5 last:border-0" {...props} />,
                                a: ({node, ...props}) => <a className="text-blue-400 hover:underline break-all" target="_blank" rel="noreferrer" {...props} />,
                                code: ({node, inline, ...props}) => inline ? <code className="bg-white/10 px-1 py-0.5 rounded text-[0.8em] font-mono text-violet-200 break-words" {...props} /> : <div className="bg-black/50 p-3 rounded-lg overflow-x-auto mb-3 w-full"><code className="text-[0.8em] font-mono text-green-300 break-words whitespace-pre-wrap" style={{ wordBreak: 'break-all' }} {...props} /></div>,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>

                    {!isUser && sqlGenerated && <SqlBlock sql={sqlGenerated} />}

                    {/* Data visualization (from live stream or reloaded) */}
                    {!isUser && effectiveData && <ResultRenderer data={effectiveData} />}

                    {/* Load Map button — shown when SQL exists but data was lost (chat history) */}
                    {!isUser && sqlGenerated && !effectiveData && (
                        <div className="mt-3">
                            <button
                                onClick={handleLoadMap}
                                disabled={loadingMap}
                                className="inline-flex items-center gap-2 text-[0.72rem] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3.5 py-1.5 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                                {loadingMap ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                        Loading data…
                                    </>
                                ) : (
                                    <>🗺️ Load Visualization</>
                                )}
                            </button>
                            {loadError && (
                                <p className="text-[0.65rem] text-red-400 mt-1.5">{loadError}</p>
                            )}
                        </div>
                    )}

                    {!isUser && txHash && (
                        <TxBadge txHash={txHash} auditHash={auditHash} polygonscanUrl={polygonscanUrl} />
                    )}
                </div>

                {createdAt && (
                    <span className="text-[0.63rem] text-muted-foreground/40 mt-1.5">
                        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </div>
    )
})

export default MessageBubble

