import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
    {
        icon: '🗣️',
        title: 'Plain English Queries',
        desc: 'Type your question naturally. FloatChat converts it to precise SQL and queries the Argo ocean database instantly.',
    },
    {
        icon: '⛓️',
        title: 'Blockchain Verified',
        desc: 'Every query is cryptographically logged on Polygon testnet. Cite a TX hash in your research paper. Immutable. Forever.',
    },
    {
        icon: '⚡',
        title: 'Streaming Responses',
        desc: 'Real-time AI responses powered by Groq. No waiting — answers flow to you as they\'re generated.',
    },
    {
        icon: '🔒',
        title: 'Secure & Private',
        desc: 'Your research sessions are end-to-end tied to your account. Full chat history. Full control.',
    },
]

const stats = [
    { value: '3.9B', label: 'People depend on oceans' },
    { value: '4,000+', label: 'Active Argo floats' },
    { value: '100%', label: 'Open & verifiable data' },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg-root)',
            overflowY: 'auto', overflowX: 'hidden',
            fontFamily: 'var(--font-sans)',
        }}>

            {/* ── Ambient background orbs ──────────────────────────── */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', width: 600, height: 600,
                    borderRadius: '50%', top: '-15%', left: '-10%',
                    background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
                    animation: 'orb-drift-1 18s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: 500, height: 500,
                    borderRadius: '50%', bottom: '5%', right: '-8%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)',
                    animation: 'orb-drift-2 22s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', width: 400, height: 400,
                    borderRadius: '50%', top: '40%', left: '40%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
                    animation: 'orb-drift-1 25s ease-in-out infinite reverse',
                }} />
            </div>

            {/* ── Nav ─────────────────────────────────────────────── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                padding: '16px 8%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(5,5,15,0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--glass-border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>🌊</span>
                    <span style={{
                        fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        FloatChat
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {user ? (
                        <button className="btn-primary" onClick={() => navigate('/chat')}>
                            Open App →
                        </button>
                    ) : (
                        <>
                            <button className="btn-ghost" onClick={() => navigate('/auth?tab=login')}>
                                Sign In
                            </button>
                            <button className="btn-primary" onClick={() => navigate('/auth?tab=register')}>
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────────── */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: '110px 8% 80px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: 28,
            }}>
                {/* Tag pill */}
                <div className="badge badge-cyan animate-fade-in" style={{ padding: '5px 16px', fontSize: '0.78rem' }}>
                    🏆 HackIndia × TECHआरंभ 2.0 — Team Wavesena
                </div>

                {/* Headline */}
                <h1 className="animate-fade-in" style={{
                    fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', 
                    fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
                    animationDelay: '0.1s',
                }}>
                    Ask the Ocean.{' '}
                    <span style={{
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Get Answers.
                    </span>
                    <br />
                    <span style={{ fontSize: '70%', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Verified on Chain.
                    </span>
                </h1>

                {/* Sub */}
                <p className="animate-fade-in" style={{
                    fontSize: '1.08rem', color: 'var(--text-secondary)',
                    maxWidth: 580, lineHeight: 1.7, animationDelay: '0.2s',
                }}>
                    FloatChat turns complex Argo float ocean datasets into plain-English conversations.
                    Every query is AI-powered, SQL-backed, and cryptographically logged on Polygon — immutable, citable, verifiable.
                </p>

                {/* CTA */}
                <div className="animate-fade-in" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
                    <button
                        id="hero-cta-start"
                        className="btn-primary"
                        onClick={() => navigate(user ? '/chat' : '/auth?tab=register')}
                        style={{ padding: '14px 36px', fontSize: '1rem' }}
                    >
                        Start Researching →
                    </button>
                    <button className="btn-ghost" onClick={() => navigate('/auth?tab=login')}>
                        Sign in
                    </button>
                </div>

                {/* Demo preview bubble */}
                <div className="animate-fade-in glass" style={{
                    marginTop: 24, padding: '16px 22px', borderRadius: 16, maxWidth: 540,
                    textAlign: 'left', animationDelay: '0.45s',
                }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        💬 Researcher just asked:
                    </p>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 12, fontStyle: 'italic' }}>
                        "What is the average salinity in the Bay of Bengal at 200m depth in 2023?"
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        FloatChat analyzed <strong style={{ color: 'var(--cyan)' }}>147 Argo profiles</strong> and found the average salinity was <strong style={{ color: 'var(--cyan)' }}>34.82 PSU</strong>, consistent with seasonal patterns…
                    </p>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-cyan">⛓ Verified · 0x2a7f…c391</span>
                        <span className="badge badge-purple">SQL generated</span>
                    </div>
                </div>
            </section>

            {/* ── Stats ───────────────────────────────────────────── */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: '40px 8%',
                display: 'flex', justifyContent: 'center', gap: 48,
                flexWrap: 'wrap', textAlign: 'center',
            }}>
                {stats.map(s => (
                    <div key={s.label} className="animate-fade-in">
                        <p style={{
                            fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {s.value}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
                    </div>
                ))}
            </section>

            {/* ── Features ────────────────────────────────────────── */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: '60px 8%',
            }}>
                <h2 style={{
                    textAlign: 'center', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                    fontWeight: 700, marginBottom: 48, letterSpacing: '-0.02em',
                }}>
                    Everything a researcher needs.{' '}
                    <span style={{
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Nothing they don't.
                    </span>
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 20,
                }}>
                    {features.map((f, i) => (
                        <div key={f.title} className="glass animate-fade-in" style={{
                            padding: '28px 24px', borderRadius: 18,
                            animationDelay: `${i * 0.1}s`,
                            transition: 'all 0.25s ease',
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)'
                                e.currentTarget.style.boxShadow = '0 12px 40px rgba(34,211,238,0.10)'
                                e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                                e.currentTarget.style.borderColor = 'var(--glass-border)'
                            }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                {f.title}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Final CTA ───────────────────────────────────────── */}
            <section style={{
                position: 'relative', zIndex: 1,
                padding: '80px 8%', textAlign: 'center',
            }}>
                <div className="glass" style={{
                    padding: '60px 40px', borderRadius: 28,
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 70%), var(--glass-bg)',
                }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 12 }}>
                        Ready to start?
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800,
                        letterSpacing: '-0.02em', marginBottom: 16,
                    }}>
                        The data exists. The question is:{' '}
                        <span style={{
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Can you ask it?
                        </span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 32px' }}>
                        Join FloatChat and start querying Argo ocean data in plain English — results on-chain in seconds.
                    </p>
                    <button
                        id="footer-cta-btn"
                        className="btn-primary"
                        onClick={() => navigate(user ? '/chat' : '/auth?tab=register')}
                        style={{ padding: '14px 40px', fontSize: '1rem' }}
                    >
                        {user ? 'Open FloatChat →' : 'Create Free Account →'}
                    </button>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────── */}
            <footer style={{
                position: 'relative', zIndex: 1,
                padding: '24px 8%',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 12,
            }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    🌊 FloatChat · Team Wavesena · HackIndia 2026
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Built with ❤️ for ocean science
                </span>
            </footer>
        </div>
    )
}
