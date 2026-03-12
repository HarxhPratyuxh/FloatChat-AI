import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const { signIn, signUp, user } = useAuth()

    const [tab, setTab] = useState(params.get('tab') === 'register' ? 'register' : 'login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // Redirect if already logged in
    useEffect(() => {
        if (user) navigate('/chat', { replace: true })
    }, [user])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setLoading(true)

        try {
            if (tab === 'login') {
                await signIn(email, password)
                navigate('/chat', { replace: true })
            } else {
                await signUp(email, password)
                setSuccess('Account created! Check your email to confirm, then sign in.')
                setTab('login')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg-root)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sans)', padding: '24px',
            position: 'relative', overflow: 'hidden',
        }}>

            {/* ── Background orbs ─────────────────────────────────── */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                    top: '-20%', right: '-10%',
                    background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
                    animation: 'orb-drift-1 20s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                    bottom: '-15%', left: '-8%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    animation: 'orb-drift-2 18s ease-in-out infinite',
                }} />
            </div>

            {/* ── Auth card ───────────────────────────────────────── */}
            <div className="animate-fade-in glass" style={{
                width: '100%', maxWidth: 420,
                borderRadius: 24, padding: '40px 36px',
                position: 'relative', zIndex: 1,
            }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        fontSize: '2.4rem',
                        animation: 'float 4s ease-in-out infinite',
                        marginBottom: 10,
                    }}>
                        🌊
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                    }}>
                        FloatChat
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                        Ocean Intelligence, Blockchain Verified
                    </p>
                </div>

                {/* Tab switcher */}
                <div style={{
                    display: 'flex', gap: 4,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 12, padding: 4, marginBottom: 28,
                }}>
                    {['login', 'register'].map(t => (
                        <button
                            key={t}
                            id={`tab-${t}`}
                            onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                            style={{
                                flex: 1, padding: '9px 0',
                                background: tab === t
                                    ? 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.18))'
                                    : 'transparent',
                                border: tab === t ? '1px solid rgba(34,211,238,0.25)' : '1px solid transparent',
                                borderRadius: 9,
                                color: tab === t ? 'var(--cyan)' : 'var(--text-muted)',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.85rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s ease',
                            }}
                        >
                            {t === 'login' ? 'Sign In' : 'Sign Up'}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                {error && <div className="msg-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
                {success && <div className="msg-success" style={{ marginBottom: 16 }}>✅ {success}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                            Email
                        </label>
                        <input
                            id="input-email"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="researcher@ocean.org"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/5 transition-all outline-none"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                            Password
                        </label>
                        <input
                            id="input-password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/5 transition-all outline-none"
                            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    <button
                        id="btn-auth-submit"
                        type="submit"
                        className="w-full bg-gradient-to-br from-primary to-accent hover:opacity-90 text-background font-bold rounded-xl py-3.5 transition-all shadow-[0_0_15px_rgba(34,211,238,0.25)] flex justify-center items-center mt-2"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        ) : (
                            tab === 'login' ? 'Sign In →' : 'Create Account →'
                        )}
                    </button>
                </form>

                {/* Switch tab link */}
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(null) }}
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--cyan)', cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', fontSize: '0.83rem', fontWeight: 600,
                        }}
                    >
                        {tab === 'login' ? 'Sign up free' : 'Sign in'}
                    </button>
                </p>

                {/* Back to Landing */}
                <p style={{ textAlign: 'center', marginTop: 12 }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--text-muted)', cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', fontSize: '0.78rem',
                        }}
                    >
                        ← Back to home
                    </button>
                </p>
            </div>
        </div>
    )
}
