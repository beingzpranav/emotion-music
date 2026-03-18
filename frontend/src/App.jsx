import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import ImageUpload from './components/ImageUpload.jsx'
import EmotionResult from './components/EmotionResult.jsx'
import SongCards from './components/SongCards.jsx'

const API_BASE = 'https://beingzpranav-moodtrack-api.hf.space'

// Default theme colours (overridden dynamically from the API response)
const DEFAULT_COLORS = {
  primary:   '#FFD700',
  secondary: '#FFA500',
  bg:        '#0a0a0a',
}

function applyTheme(colors) {
  const root = document.documentElement
  root.style.setProperty('--primary',   colors.primary)
  root.style.setProperty('--secondary', colors.secondary)
  root.style.setProperty('--bg',        colors.bg)
}

// ── Loading spinner ───────────────────────────────────────────────────────
function Loader() {
  const s = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
    },
    spinner: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.08)',
      borderTopColor: 'var(--primary)',
      animation: 'spin 0.9s linear infinite',
    },
    text: {
      fontFamily: 'var(--font-heading)',
      fontSize: '1.6rem',
      letterSpacing: '0.12em',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    sub: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.88rem',
      color: 'var(--muted)',
      marginTop: '-1rem',
    },
    dots: {
      display: 'inline-block',
      animation: 'spin 1.4s linear infinite',
    },
  }
  return (
    <div style={s.wrapper}>
      <div style={s.spinner} />
      <div style={s.text}>READING YOUR VIBE</div>
      <p style={s.sub}>AI is analyzing your emotions…</p>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  // step: 'upload' | 'loading' | 'result'
  const [step, setStep]     = useState('upload')
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')

  // Apply default theme on mount
  useEffect(() => { applyTheme(DEFAULT_COLORS) }, [])

  const handleAnalyze = useCallback(async (imageDataUrl) => {
    setApiError('')
    setStep('loading')
    try {
      const { data } = await axios.post(`${API_BASE}/analyze`, {
        image: imageDataUrl,
      })
      // Dynamically update CSS variables
      applyTheme(data.colors)
      setResult(data)
      setStep('result')
    } catch (err) {
      const msg =
        err.response?.data?.error ??
        'Could not reach the server. Is the backend running?'
      setApiError(msg)
      setStep('upload')
    }
  }, [])

  function handleReset() {
    applyTheme(DEFAULT_COLORS)
    setResult(null)
    setApiError('')
    setStep('upload')
  }

  // ── Layout styles ─────────────────────────────────────────────────────
  const page = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: step === 'result' ? 'flex-start' : 'center',
    padding: step === 'result' ? '3rem 1.5rem 5rem' : '2rem 1.5rem',
    position: 'relative',
    zIndex: 1,
    transition: 'padding var(--transition)',
  }

  // Ambient glow blob
  const glow = {
    position: 'fixed',
    top: '-20vh',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '70vw',
    height: '70vw',
    maxWidth: 800,
    maxHeight: 800,
    borderRadius: '50%',
    background: `radial-gradient(circle, var(--primary)18 0%, transparent 70%)`,
    filter: 'blur(80px)',
    pointerEvents: 'none',
    zIndex: 0,
    transition: 'background 0.8s ease',
  }

  const resultGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '2rem',
    width: '100%',
    maxWidth: 1140,
  }

  const resetBtn = {
    fontFamily: 'var(--font-heading)',
    fontSize: '1rem',
    letterSpacing: '0.1em',
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    padding: '0.65rem 1.8rem',
    cursor: 'pointer',
    transition: 'border-color var(--transition), color var(--transition)',
    marginBottom: '2.5rem',
    alignSelf: 'flex-start',
  }

  return (
    <>
      {/* Ambient glow */}
      <div style={glow} />

      <div style={page}>
        {/* ── UPLOAD step ── */}
        {step === 'upload' && (
          <>
            <ImageUpload onAnalyze={handleAnalyze} loading={false} />
            {apiError && (
              <div
                className="fade-up"
                style={{
                  marginTop: '1.5rem',
                  background: 'rgba(255,59,48,0.1)',
                  border: '1px solid rgba(255,59,48,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1.4rem',
                  color: '#FF6B6B',
                  fontSize: '0.88rem',
                  maxWidth: 520,
                  textAlign: 'center',
                  fontFamily: 'var(--font-body)',
                }}
              >
                ⚠ {apiError}
              </div>
            )}
          </>
        )}

        {/* ── LOADING step ── */}
        {step === 'loading' && <Loader />}

        {/* ── RESULT step ── */}
        {step === 'result' && result && (
          <>
            {/* Back button */}
            <button
              id="reset-btn"
              style={resetBtn}
              onClick={handleReset}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.color = 'var(--primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--muted)'
              }}
            >
              ← TRY ANOTHER PHOTO
            </button>

            {/* Two-column result grid */}
            <div style={resultGrid}>
              {/* Left: emotion breakdown */}
              <EmotionResult
                dominantEmotion={result.dominant_emotion}
                emotionScores={result.emotion_scores}
                moodMessage={result.mood_message}
                colors={result.colors}
                confident={result.confident ?? true}
              />
              {/* Right: song cards */}
              <SongCards
                songs={result.songs}
                colors={result.colors}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
