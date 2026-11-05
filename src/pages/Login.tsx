import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { loginComGoogle, solicitacaoManual } from '@/services/portal'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Carrega o Google Identity Services uma única vez
let gsiPromise: Promise<void> | null = null
function loadGsi(): Promise<void> {
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      if ((window as any).google?.accounts?.id) return resolve()
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.defer = true
      s.onload = () => resolve()
      s.onerror = () => { gsiPromise = null; reject(new Error('Não foi possível carregar o login do Google.')) }
      document.head.appendChild(s)
    })
  }
  return gsiPromise
}

const logoQueonetics = '/logo-queonetics-full.png'
const logoIntranet   = '/PortalService.png'
const bgPhoto         = '/login-bg.png'

export default function Login() {
  const { user, loginWithUserObject } = useAuth()
  const navigate = useNavigate()

  const [active, setActive] = useState(false) // false = Entrar | true = Solicitar Acesso
  const [loading, setLoading] = useState(false)

  // form de solicitação de acesso
  const [name, setName] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // 👇 REFERÊNCIA PARA O CANVAS NATIVO
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const googleBtnRef = useRef<HTMLDivElement | null>(null)

  // resultado do login com Google
  const [isPending, setIsPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isPending || errorMsg) setActive(false)
  }, [isPending, errorMsg])

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  // 👇 MOTOR DE PARTÍCULAS NATIVO (HTML5 Canvas)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
    }> = []

    const particleCount = 100
    const connectionDistance = 120

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    // Inicializa as partículas aleatoriamente
    particles = []
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5, // Velocidade sutil
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2 + 1,
      })
    }

    // Loop de Animação
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Desenhar e atualizar partículas
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy

        // Rebater nas bordas da tela
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // Desenha a bolinha (partícula)
        // Substitua o bloco do círculo por:
        ctx.beginPath()
        // Move para o topo do triângulo
        ctx.moveTo(p.x, p.y - p.radius) 
        // Linha para o canto inferior direito
        ctx.lineTo(p.x + p.radius, p.y + p.radius) 
        // Linha para o canto inferior esquerdo
        ctx.lineTo(p.x - p.radius, p.y + p.radius) 
        ctx.closePath() // Fecha o triângulo de volta ao topo

        ctx.fillStyle = 'rgba(76, 36, 178, 0.4)'
        ctx.fill()

        // Desenha as linhas que conectam as partículas próximas
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            // A opacidade diminui quanto mais longe a partícula estiver
            const alpha = (1 - dist / connectionDistance) * 0.18
            ctx.strokeStyle = `rgba(76, 36, 178, ${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  async function onGoogleCredential(resp: { credential: string }) {
    setLoading(true)
    setErrorMsg(null)
    setIsPending(false)
    try {
      const r = await loginComGoogle(resp.credential)
      if (r.authorized && r.user) {
        loginWithUserObject(r.user)
        navigate('/', { replace: true })
        return
      }
      if (r.status === 'pending') setIsPending(true)
      else setErrorMsg(r.message ?? 'Acesso não autorizado.')
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro durante o login com Google. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Renderiza o botão oficial do Google quando a tela de login está visível
  useEffect(() => {
    if (active) return
    if (!GOOGLE_CLIENT_ID) {
      setErrorMsg('VITE_GOOGLE_CLIENT_ID não configurado.')
      return
    }
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return
        const g = (window as any).google
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onGoogleCredential,
          hd: 'queonetics.com',
          auto_select: false,
        })
        googleBtnRef.current.innerHTML = ''
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_blue', size: 'large', text: 'signin_with',
          shape: 'rectangular', width: 320, locale: 'pt-BR',
        })
      })
      .catch((e) => setErrorMsg(e.message))
    return () => { cancelled = true }
  }, [active])

  async function handleRequestAccess(e: React.FormEvent) {
  e.preventDefault()
  setSendError(null)

  // 1. Validações locais cruciais idênticas ao código que funciona
  const nomeFormatado = name.trim()
  const emailFormatado = reqEmail.trim().toLowerCase()

  if (!nomeFormatado || !emailFormatado) {
    setSendError('Preencha todos os campos.')
    return
  }

  if (!emailFormatado.endsWith('@queonetics.com')) {
    setSendError('Use seu e-mail corporativo @queonetics.com.')
    return
  }

  setSending(true)
  
  try {
    await solicitacaoManual(nomeFormatado, emailFormatado)
    setSent(true)
  } catch (err: any) {
    setSendError(err.message || 'Erro ao conectar ao servidor.')
  } finally {
    setSending(false)
  }
}

  const photoPanelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '44%',
    left: active ? '0%' : '56%',
    borderRadius: active ? '0 170px 170px 0' : '170px 0 0 170px',
    transition: 'left 0.6s ease-in-out, border-radius 0.6s ease-in-out',
    zIndex: 2,
    overflow: 'hidden',
    backgroundImage: `linear-gradient(160deg, rgba(76, 36, 178, 0.9) 0%, rgba(48, 20, 190, 0.12) 60%, rgba(20, 5, 80, 0.85) 100%), url(${bgPhoto})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    padding: '80px 64px 40px 64px',
    color: '#ffffff',
  }

  const formPanelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '56%',
    left: active ? '44%' : '0%',
    transition: 'left 0.6s ease-in-out',
    zIndex: 1,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '48px 64px',
  }

  return (
    <div style={styles.root}>
      
      {/* 👇 CANVAS EM SEGUNDO PLANO TOTALMENTE NATIVO */}
      {/* 👇 CANVAS ATUALIZADO COM INSET 0 PARA REALMENTE TOMAR A TELA INTEIRA */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: '#f8fafc' 
        }}
      />

      <div style={styles.card}>
        <div style={photoPanelStyle}>
          <h2 style={styles.photoTitle}>
            {active ? 'Solicite acesso' : 'Bem-vindo de volta!'}
          </h2>
          <p style={styles.photoText}>
            {active
              ? 'Preencha os dados ao lado para solicitar acesso aos recursos da Intranet Queo. Nossa equipe irá analisar sua solicitação.'
              : 'Entre com sua conta corporativa Google para acessar o Portal de Serviços da Queonetics.'}
          </p>
          <div style={styles.decorLine} />
        </div>

        <div style={formPanelStyle}>
          <div style={styles.logoRow}>
            <div style={styles.logoContainer}>
              <img src={logoQueonetics} alt="Queonetics Icon" style={styles.logoImg} />
            </div>

            <div style={styles.logoDivider} />

            <div style={{ ...styles.logoContainer, flexDirection: 'column' }}> 
              <img src={logoIntranet} alt="Intranet Icon" style={styles.logoImg} />
            </div>
          </div>

          {!active ? (
            <>
              <p style={styles.formLabel}>Entre utilizando sua conta corporativa</p>

              {isPending && (
                <div style={styles.pendingBox}>
                  <p style={styles.pendingTitle}>Solicitação enviada!</p>
                  <p style={styles.pendingText}>O administrador irá avaliar seu acesso em breve.</p>
                </div>
              )}

              {errorMsg && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>⚠️ {errorMsg}</p>
                </div>
              )}

              <div
                ref={googleBtnRef}
                style={{
                  display: 'flex', justifyContent: 'center', minHeight: '44px',
                  opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto',
                }}
              />
              {loading && <p style={{ ...styles.formLabel, marginTop: '10px', marginBottom: 0 }}>Entrando...</p>}

              <div style={styles.dividerRow}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>ou</span>
                <div style={styles.dividerLine} />
              </div>

              <button style={styles.outlineBtn} onClick={() => setActive(true)} type="button">
                Solicitar acesso ao sistema
              </button>
            </>
          ) : (
            <>
              {sent ? (
                <div style={styles.pendingBox}>
                  <p style={styles.pendingTitle}>Solicitação enviada!</p>
                  <p style={styles.pendingText}>
                    Assim que o administrador aprovar, você receberá um e-mail para acessar o sistema.
                  </p>
                  <button style={{ ...styles.outlineBtn, marginTop: '14px' }} onClick={() => { setActive(false); setSent(false) }} type="button">
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess}>
                  <p style={styles.formLabel}>Informe seus dados para solicitar acesso à Intranet.</p>

                  {sendError && (
                    <div style={styles.errorBox}>
                      <p style={styles.errorText}>⚠️ {sendError}</p>
                    </div>
                  )}

                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                    <input
                      style={styles.inputWithIcon}
                      type="text"
                      placeholder="Nome completo"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    <input
                      style={styles.inputWithIcon}
                      type="email"
                      placeholder="E-mail corporativo"
                      value={reqEmail}
                      onChange={e => setReqEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    style={{ ...styles.primaryBtn, opacity: sending ? 0.7 : 1, marginTop: '16px' }}
                    type="submit"
                    disabled={sending}
                  >
                    <PaperPlaneIcon />
                    {sending ? 'Enviando...' : 'Enviar solicitação'}
                  </button>

                  <p style={styles.backLink}>
                    Já possui acesso?{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); setActive(false) }} style={styles.link}>
                      Voltar para o login
                    </a>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '4px' }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function PaperPlaneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', width: '100vw',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', // Permite ver o canvas ao fundo
    padding: '20px', fontFamily: "'Montserrat', sans-serif",
    position: 'relative', 
    overflow: 'hidden',   
  },
  card: {
    position: 'relative', overflow: 'hidden',
    width: '960px', maxWidth: '100%', minHeight: '580px',
    borderRadius: '24px', background: '#fff',
    boxShadow: '0 20px 60px rgba(20,30,60,0.12)',
    zIndex: 1, 
  },
  photoTitle: { fontSize: '32px', fontWeight: 700, marginBottom: '18px', letterSpacing: '-0.5px' },
  photoText: { fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', maxWidth: '340px' },
  decorLine: { width: '28px', height: '3px', background: '#7c4dff', marginTop: '16px', borderRadius: '2px' },
  logoRow: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '24px', 
    marginBottom: '48px',
    width: '100%'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoImg: { 
    height: '80px', 
    width: 'auto', 
    objectFit: 'contain',
    display: 'block' 
  },
  logoDivider: { 
    width: '1px', 
    height: '42px', 
    background: '#dfe3ee' 
  },
  formLabel: { fontSize: '14px', color: '#65676b', marginBottom: '18px', textAlign: 'center', width: '100%' },
  pendingBox: {
    background: '#f0f7ff', border: '1px solid #b3d4ff',
    borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
  },
  pendingTitle: { fontSize: '13px', color: '#1a5fc8', fontWeight: 600, marginBottom: '4px' },
  pendingText:  { fontSize: '12px', color: '#4a6fa5', lineHeight: 1.5 },
  errorBox: {
    background: '#fff5f5', border: '1px solid #fca5a5',
    borderRadius: '12px', padding: '10px 14px', marginBottom: '16px',
  },
  errorText: { fontSize: '12px', color: '#dc2626', lineHeight: 1.5 },
  primaryBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    background: '#4c24b2', border: 'none', borderRadius: '10px',
    padding: '15px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    color: '#fff', boxShadow: '0 4px 12px rgba(76, 36, 178, 0.3)',
    transition: 'background 0.2s',
  },
  outlineBtn: {
    width: '100%', background: '#fff', border: '1.5px solid #4c24b2', borderRadius: '12px',
    padding: '13px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#4c24b2',
  },
  dividerRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
  dividerLine: { flex: 1, height: '1px', background: '#e3e7f2' },
  dividerText: { fontSize: '11px', color: '#9aa5bd' },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: '16px',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8e9aa8',
    display: 'flex',
    alignItems: 'center',
  },
  inputWithIcon: {
    width: '100%', background: '#fff', border: '1px solid #d0d7de', borderRadius: '10px',
    padding: '14px 16px 14px 46px', fontSize: '14px', outline: 'none', color: '#1a2b4a',
    transition: 'border-color 0.2s',
  },
  backLink: { fontSize: '13px', color: '#65676b', marginTop: '24px', textAlign: 'center' },
  link: { color: '#4c24b2', fontWeight: 600, textDecoration: 'none' },
}