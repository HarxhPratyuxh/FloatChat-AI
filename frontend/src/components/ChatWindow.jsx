import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import MessageBubble, { TypingIndicator } from './MessageBubble'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const BACKEND_OFFLINE_MSG = 'Cannot reach the FloatChat backend. Make sure the Python server is running: python -m uvicorn api.main:app --reload --port 8000'

const SUGGESTIONS = [
    'What is the average salinity in the Bay of Bengal?',
    'Show temperature trends at 500m depth in 2023',
    'Which Argo floats recorded below 2°C last month?',
    'Compare Indian Ocean vs Pacific salinity levels',
]

export default function ChatWindow({
    conversationId, setConversationId,
    conversations, setConversations,
    onOpenSidebar,
}) {
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [backendOnline, setBackendOnline] = useState(true)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const isGenerating = useRef(false)

    useEffect(() => {
        if (conversationId && !isGenerating.current) loadMessages(conversationId)
        else if (!conversationId) setMessages([])
    }, [conversationId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    useEffect(() => { inputRef.current?.focus() }, [conversationId])

    const loadMessages = async (convId) => {
        const { data, error } = await supabase
            .from('messages').select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
        if (!error && data) setMessages(data)
    }

    const createConversation = async (firstQuestion) => {
        const title = firstQuestion.length > 58 ? firstQuestion.slice(0, 55) + '…' : firstQuestion
        const { data, error } = await supabase
            .from('conversations').insert([{ user_id: user.id, title }]).select().single()
        if (error) throw error
        setConversations(prev => [data, ...prev])
        return data.id
    }

    const saveMessage = async (convId, role, content, extra = {}) => {
        const { data, error } = await supabase
            .from('messages').insert([{
                conversation_id: convId, role, content,
                sql_generated: extra.sql_generated ?? null,
                tx_hash: extra.tx_hash ?? null,
                audit_hash: extra.audit_hash ?? null,
            }]).select().single()
        if (error) throw error
        return data
    }

    const handleSend = async () => {
        const question = input.trim()
        if (!question || isLoading) return
        setInput(''); setError(null); setIsLoading(true)
        isGenerating.current = true
        try {
            let convId = conversationId
            if (!convId) { convId = await createConversation(question); setConversationId(convId) }
            const userMsg = await saveMessage(convId, 'user', question)
            setMessages(prev => [...prev, userMsg])

            // Create a temporary streaming message
            const tempId = 'temp-' + Date.now()
            setMessages(prev => [...prev, {
                id: tempId,
                role: 'assistant',
                content: '',
            }])

            // Grab the last 8 messages, exclude the temporary streaming one
            const historyPayload = messages
                .filter(m => !String(m.id).startsWith('temp'))
                .slice(-8)
                .map(m => ({
                    role: m.role,
                    // Strip out the '*Executing...*' markers
                    content: m.content.replace(/\*.*?\*\n\n/g, '').trim()
                }))

            const response = await fetch(`${API_BASE}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, chat_history: historyPayload }),
            })

            if (!response.ok) {
                const detail = await response.json().catch(() => ({}));
                throw new Error(detail?.detail ?? 'API error')
            }

            // Turn off the typing indicator because the stream started
            setIsLoading(false)

            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''

            // Streaming state
            let fullText = ''     // The absolute source-of-truth text received so far
            let displayedText = ''// What is currently rendered on screen
            let statusText = ''   // e.g. "Executing PostgreSQL Query..."
            let finalMetadata = {}
            let streamComplete = false

            // Fluid Animation Loop
            // This runs very rapidly (every 10ms). We usually pull 1 character per tick
            // for that buttery smooth typewriter effect. If a giant network chunk 
            // spikes our backlog, we dynamically drain faster so the user isn't kept waiting.
            const smoothInterval = setInterval(() => {
                const diffLength = fullText.length - displayedText.length

                if (diffLength > 0) {
                    // Drain at least 3 chars. If we fall way behind (>5 chars), drain faster.
                    const charsToAdd = Math.max(3, Math.floor(diffLength / 5))
                    displayedText += fullText.slice(displayedText.length, displayedText.length + charsToAdd)

                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: statusText + displayedText } : m))
                } else if (streamComplete) {
                    // We've printed everything and the network stream is closed
                    clearInterval(smoothInterval)
                }
            }, 10)

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() // keep incomplete chunk

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))

                            if (data.type === 'token') {
                                fullText += data.content
                            } else if (data.type === 'status') {
                                statusText = `*${data.message}*\n\n`
                                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: statusText + displayedText } : m))
                            } else if (data.type === 'result') {
                                finalMetadata = data
                            } else if (data.type === 'error') {
                                fullText += `\n\n⚠️ ${data.message}`
                            }
                        } catch (e) {
                            console.error('SSE JSON parse error', e)
                        }
                    }
                }
            }

            // Mark stream as complete to stop the animation interval once it catches up
            streamComplete = true

            // Wait for the animation to finish draining the queue before saving to DB
            while (displayedText.length < fullText.length) {
                await new Promise(r => setTimeout(r, 50))
            }
            clearInterval(smoothInterval)

            // Save final generated message to Supabase
            const aiMsg = await saveMessage(convId, 'assistant', fullText, {
                sql_generated: finalMetadata.sql_query ?? null,
                tx_hash: finalMetadata.tx_hash ?? null,
                audit_hash: finalMetadata.audit_hash ?? null,
            })
            aiMsg._polygonscanUrl = finalMetadata.polygonscan_url ?? null
            if (finalMetadata.data) {
                aiMsg.data = finalMetadata.data
            }

            // Replace temporary message with true DB record
            setMessages(prev => prev.map(m => m.id === tempId ? aiMsg : m))
            setBackendOnline(true)

        } catch (err) {
            const isOffline = err.message === 'Failed to fetch' || err.name === 'TypeError'
            if (isOffline) { setBackendOnline(false); setError(BACKEND_OFFLINE_MSG) }
            else { setBackendOnline(true); setError(err.message) }
            setIsLoading(false)
        } finally {
            isGenerating.current = false
        }
    }

    useEffect(() => {
        if (backendOnline) return
        const ping = async () => {
            try {
                const r = await fetch(`${API_BASE}/health`, { method: 'GET' })
                if (r.ok) { setBackendOnline(true); setError(null) }
            } catch { /* still offline */ }
        }
        const id = setInterval(ping, 5000)
        return () => clearInterval(id)
    }, [backendOnline])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const isEmpty = messages.length === 0

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">

            {/* ── Top bar ─────────────────────────────────────── */}
            <div className="px-4 md:px-7 py-3.5 flex items-center justify-between border-b border-border bg-[hsl(218,78%,9%)] shrink-0">
                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={onOpenSidebar}
                        className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-white flex items-center justify-center transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${backendOnline ? 'bg-primary shadow-[0_0_8px_hsl(193,100%,50%)]' : 'bg-destructive shadow-[0_0_8px_theme(colors.red.500)]'}`} />
                    <span className="text-[0.83rem] text-muted-foreground font-medium hidden sm:inline">
                        {conversationId ? 'Research session active' : 'Start a new research query'}
                    </span>
                </div>
                <span className={`
                    text-[0.68rem] font-semibold px-3 py-1 rounded-full
                    ${backendOnline
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-destructive/10 text-destructive border border-destructive/20'}
                `}>
                    {backendOnline ? '⬤ Backend live' : '⬤ Backend offline'}
                </span>
            </div>

            {/* ── Offline banner ───────────────────────────────── */}
            {!backendOnline && (
                <div className="px-4 md:px-7 py-2.5 flex items-center justify-between flex-wrap gap-3 bg-destructive/5 border-b border-destructive/15 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[0.78rem] text-red-400">⚠️ Python backend not running.</span>
                        <code className="text-[0.72rem] text-sky-300 bg-black/30 px-2.5 py-0.5 rounded-md font-mono">
                            python -m uvicorn api.main:app --reload --port 8000
                        </code>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] text-muted-foreground/50 italic">Auto-reconnecting every 5s…</span>
                        <button
                            onClick={async () => {
                                try { const r = await fetch(`${API_BASE}/health`); if (r.ok) { setBackendOnline(true); setError(null) } }
                                catch { /* still offline */ }
                            }}
                            className="px-3.5 py-1 rounded-lg text-[0.72rem] font-semibold text-red-400 border border-destructive/25 hover:bg-destructive/15 transition-colors"
                        >
                            Retry now
                        </button>
                    </div>
                </div>
            )}

            {/* ── Messages ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 md:px-[10%] py-6 flex flex-col gap-5">

                {/* Empty state */}
                {isEmpty && !isLoading && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
                        <div className="text-[3.5rem] animate-float drop-shadow-[0_0_24px_hsla(193,100%,50%,0.5)]">
                            🌊
                        </div>
                        <div>
                            <h2 className="text-[1.5rem] font-bold text-gradient-primary mb-2">
                                Ask the Ocean Anything
                            </h2>
                            <p className="text-muted-foreground text-[0.88rem] max-w-md leading-relaxed">
                                Query Argo float data in plain English. Every answer is AI-powered, SQL-backed and cryptographically logged on Polygon.
                            </p>
                        </div>

                        {/* Suggestion chips */}
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {SUGGESTIONS.map(q => (
                                <button
                                    key={q}
                                    onClick={() => setInput(q)}
                                    className="px-3.5 py-2 text-[0.78rem] text-muted-foreground rounded-full border border-border hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        sqlGenerated={msg.sql_generated}
                        txHash={msg.tx_hash}
                        auditHash={msg.audit_hash}
                        data={msg.data}
                        polygonscanUrl={
                            msg._polygonscanUrl ??
                            (msg.tx_hash ? `https://amoy.polygonscan.com/tx/${msg.tx_hash}` : null)
                        }
                        createdAt={msg.created_at}
                    />
                ))}

                {isLoading && <TypingIndicator />}

                {error && backendOnline && (
                    <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-[0.83rem]">
                        ⚠️ {error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* ── Input bar ───────────────────────────────────── */}
            <div className="px-4 md:px-[10%] py-3 md:py-4 border-t border-border bg-[hsl(218,78%,9%)] shrink-0">
                <div
                    className="flex items-end gap-3 glass-panel rounded-2xl px-5 py-3 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsla(193,100%,50%,0.08)] transition-all duration-200"
                >
                    <textarea
                        id="chat-input"
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about ocean data…"
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-foreground text-[0.9rem] leading-relaxed resize-none max-h-[120px] overflow-y-auto placeholder:text-muted-foreground/50 pt-1"
                        onInput={e => {
                            e.target.style.height = 'auto'
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                        }}
                    />
                    <button
                        id="btn-send"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`
                            w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg
                            transition-all duration-200
                            ${input.trim() && !isLoading
                                ? 'bg-gradient-to-br from-primary to-accent text-background shadow-[0_0_16px_hsla(193,100%,50%,0.3)] hover:-translate-y-0.5'
                                : 'bg-white/[0.05] border border-border text-muted-foreground/40 cursor-not-allowed'}
                        `}
                    >
                        {isLoading
                            ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            : '↑'}
                    </button>
                </div>
                <p className="text-center text-[0.67rem] text-muted-foreground/40 mt-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-border text-[0.65rem]">Enter</kbd> to send ·{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-border text-[0.65rem]">Shift+Enter</kbd> for new line
                </p>
            </div>
        </div>
    )
}
