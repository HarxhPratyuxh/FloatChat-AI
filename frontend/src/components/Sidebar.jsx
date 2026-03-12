import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/* ── Date grouping helper ────────────────────────────────────── */
function groupByDate(conversations) {
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const fmt = d => d.toDateString()
    const groups = { Today: [], Yesterday: [], Older: [] }
    conversations.forEach(c => {
        const d = new Date(c.updated_at)
        if (fmt(d) === fmt(today)) groups.Today.push(c)
        else if (fmt(d) === fmt(yesterday)) groups.Yesterday.push(c)
        else groups.Older.push(c)
    })
    return groups
}

/* ── Conversation item ───────────────────────────────────────── */
function ConvItem({ conv, isActive, onClick, onDelete }) {
    const [hover, setHover] = useState(false)

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={onClick}
            className={`
                group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer mb-1
                transition-all duration-150
                ${isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'border border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]'}
            `}
        >
            <span className={`
                text-[0.82rem] truncate flex-1 leading-snug
                ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-normal'}
            `}>
                💬 {conv.title}
            </span>

            {hover && (
                <button
                    onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
                    className="ml-2 text-[0.75rem] text-muted-foreground/50 hover:text-destructive transition-colors shrink-0 px-1"
                >
                    ✕
                </button>
            )}
        </div>
    )
}

/* ── Main Sidebar ─────────────────────────────────────────────── */
export default function Sidebar({
    username,
    conversations, setConversations,
    activeConvId, setActiveConvId,
    onNewChat,
    isOpen, setIsOpen
}) {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    useEffect(() => { fetchConversations() }, [])

    const fetchConversations = async () => {
        const { data, error } = await supabase
            .from('conversations').select('*')
            .order('updated_at', { ascending: false })
        if (!error && data) setConversations(data)
    }

    const handleDelete = async (id) => {
        await supabase.from('conversations').delete().eq('id', id)
        setConversations(prev => prev.filter(c => c.id !== id))
        if (activeConvId === id) { setActiveConvId(null); onNewChat() }
    }

    const handleSignOut = async () => { await signOut(); navigate('/') }

    const groups = groupByDate(conversations)

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-[268px] shrink-0 h-screen flex flex-col
                bg-[hsl(218,78%,8%)] border-r border-border
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* ── Logo ────────────────────────────────────────── */}
                <div className="px-4 pt-5 pb-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm shadow-[0_0_16px_hsla(193,100%,50%,0.3)]">
                                🌊
                            </div>
                            <span className="text-[1rem] font-extrabold text-gradient-primary">
                                FloatChat
                            </span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="md:hidden text-muted-foreground hover:text-white pb-1 px-1 text-lg">✕</button>
                    </div>

                {/* New chat button */}
                <button
                    id="btn-new-chat"
                    onClick={onNewChat}
                    className="
                        w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                        text-[0.83rem] font-medium text-muted-foreground
                        border border-border
                        hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-foreground
                        transition-all duration-200
                    "
                >
                    <span className="text-primary font-bold text-base leading-none">+</span>
                    New conversation
                </button>
            </div>

            {/* ── History ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-thin scrollbar-thumb-white/10">
                {conversations.length === 0 ? (
                    <p className="text-center text-muted-foreground/50 text-[0.78rem] mt-10 leading-relaxed">
                        No chats yet.<br />Ask the ocean something 🌊
                    </p>
                ) : (
                    Object.entries(groups).map(([label, convs]) =>
                        convs.length > 0 && (
                            <div key={label} className="mb-5">
                                <p className="text-[0.62rem] font-bold text-muted-foreground/40 uppercase tracking-widest px-1 mb-2">
                                    {label}
                                </p>
                                {convs.map(conv => (
                                    <ConvItem
                                        key={conv.id}
                                        conv={conv}
                                        isActive={activeConvId === conv.id}
                                        onClick={() => setActiveConvId(conv.id)}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )
                    )
                )}
            </div>

            {/* ── User footer ─────────────────────────────────── */}
            <div className="px-4 py-3.5 border-t border-border flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                    <p className="text-[0.82rem] font-semibold text-foreground truncate">
                        {username ?? user?.email?.split('@')[0]}
                    </p>
                    <p className="text-[0.67rem] text-muted-foreground/60 truncate">
                        {user?.email}
                    </p>
                </div>
                <button
                    id="btn-sign-out"
                    onClick={handleSignOut}
                    title="Sign out"
                    className="
                        shrink-0 px-2.5 py-1.5 rounded-lg text-[0.75rem]
                        text-muted-foreground border border-border
                        hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5
                        transition-all duration-200
                    "
                >
                    ⏻
                </button>
            </div>
        </aside>
        </>
    )
}
