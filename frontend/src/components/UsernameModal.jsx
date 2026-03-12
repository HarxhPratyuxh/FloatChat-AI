import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SUGGESTIONS = ['OceanExplorer', 'ArgoResearcher', 'DeepSeaDiver', 'WaveRider', 'FloatWatcher']

export default function UsernameModal({ onComplete }) {
    const { user } = useAuth()
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const name = username.trim()
        if (!name || name.length < 2) { setError('Must be at least 2 characters.'); return }
        if (name.length > 24) { setError('Max 24 characters.'); return }
        if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) { setError('Only letters, numbers, spaces, _ and - allowed.'); return }

        setLoading(true); setError(null)
        try {
            const { error: dbError } = await supabase
                .from('profiles').insert([{ id: user.id, username: name }])
            if (dbError) throw dbError
            onComplete(name)
        } catch (err) {
            setError(err.message?.includes('unique') ? 'That name is taken. Try another.' : err.message)
            setLoading(false)
        }
    }

    return (
        /* Backdrop */
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6" style={{ animation: 'chat-appear 0.3s ease' }}>

            {/* Card */}
            <div className="w-full max-w-[420px] glass-panel rounded-3xl px-9 py-11 relative overflow-hidden shadow-[0_0_80px_hsla(193,100%,50%,0.08),0_24px_60px_rgba(0,0,0,0.5)]" style={{ animation: 'chat-appear 0.35s ease' }}>

                {/* Top glow line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                {/* Icon */}
                <div className="text-center text-[3rem] mb-6 animate-float">🌊</div>

                {/* Heading */}
                <div className="text-center mb-7">
                    <h2 className="text-[1.4rem] font-extrabold tracking-tight mb-2 text-gradient-primary">
                        What do you wanna get called?
                    </h2>
                    <p className="text-[0.83rem] text-muted-foreground leading-relaxed">
                        This is your research identity in FloatChat.
                        <br />You can always change it later.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-[0.82rem]" style={{ animation: 'chat-appear 0.2s ease' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-4">
                        <input
                            id="input-username"
                            type="text"
                            placeholder="e.g. OceanExplorer42"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(null) }}
                            autoFocus
                            maxLength={24}
                            className="
                                w-full px-5 py-3.5 pr-14 rounded-xl text-[0.95rem] tracking-wide
                                bg-white/[0.05] border border-border text-foreground
                                placeholder:text-muted-foreground/50 outline-none
                                focus:border-primary/40 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_hsla(193,100%,50%,0.08)]
                                transition-all duration-200
                            "
                        />
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[0.7rem] pointer-events-none ${username.length > 20 ? 'text-yellow-400' : 'text-muted-foreground/40'}`}>
                            {username.length}/24
                        </span>
                    </div>

                    <button
                        id="btn-set-username"
                        type="submit"
                        disabled={loading || username.trim().length < 2}
                        className="
                            w-full py-3.5 rounded-xl text-[0.92rem] font-bold
                            bg-gradient-to-r from-primary to-accent text-background
                            hover:-translate-y-0.5 hover:shadow-[0_8px_32px_hsla(193,100%,50%,0.3)]
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0
                            transition-all duration-200 flex items-center justify-center gap-2
                        "
                    >
                        {loading
                            ? <span className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                            : <>Set my name — Let's go 🚀</>}
                    </button>
                </form>

                {/* Quick picks */}
                <div className="mt-6 text-center">
                    <p className="text-[0.7rem] text-muted-foreground/50 mb-3">Quick picks:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { setUsername(s); setError(null) }}
                                className="px-3 py-1 text-[0.73rem] text-muted-foreground border border-border rounded-full hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
