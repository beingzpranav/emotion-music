import { useRef, useState, useEffect, useCallback } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ImageUpload({ onAnalyze, loading }) {
  const [image, setImage]       = useState(null)   // { dataUrl }
  const [error, setError]       = useState('')
  const [dragging, setDrag]     = useState(false)
  const [mode, setMode]         = useState('upload') // 'upload' | 'camera'
  const [cameraReady, setCameraReady] = useState(false)
  const [countdown, setCountdown]     = useState(null) // null | 3 | 2 | 1
  const [flash, setFlash]             = useState(false)

  const inputRef  = useRef(null)
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef  = useRef(null)

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    clearInterval(timerRef.current)
    setCameraReady(false)
    setCountdown(null)
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    setImage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setError('Could not access camera. Please allow camera permission and try again.')
      setMode('upload')
    }
  }, [])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    else stopCamera()
    return stopCamera
  }, [mode, startCamera, stopCamera])

  // ── Snap photo with 3-2-1 countdown ──────────────────────────────────────
  function startCountdown() {
    let count = 3
    setCountdown(count)
    timerRef.current = setInterval(() => {
      count -= 1
      if (count === 0) {
        clearInterval(timerRef.current)
        setCountdown(null)
        snapPhoto()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  function snapPhoto() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    // Flash effect
    setFlash(true)
    setTimeout(() => setFlash(false), 350)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    stopCamera()
    setImage({ dataUrl })
    setMode('upload')          // go back to preview mode
    // Auto-submit immediately after snap
    onAnalyze(dataUrl)
  }

  // ── File upload helpers ───────────────────────────────────────────────────
  function handleFile(file) {
    setError('')
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setImage({ dataUrl: e.target.result })
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDrag(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  function handleRemove() {
    setImage(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleSubmit() {
    if (!image) { setError('Please select an image first.'); return }
    onAnalyze(image.dataUrl)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      width: '100%',
      maxWidth: 520,
    },
    logo: {
      fontFamily: 'var(--font-heading)',
      fontSize: 'clamp(3rem, 10vw, 5.5rem)',
      letterSpacing: '0.06em',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1,
      animation: 'float 3.5s ease-in-out infinite',
    },
    tagline: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.95rem',
      color: 'var(--muted)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      marginTop: '-1.2rem',
    },
    // Mode switcher tabs
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 99,
      padding: '0.3rem',
      width: '100%',
      maxWidth: 300,
    },
    tab: (active) => ({
      flex: 1,
      fontFamily: 'var(--font-heading)',
      fontSize: '0.85rem',
      letterSpacing: '0.1em',
      padding: '0.55rem 1rem',
      borderRadius: 99,
      border: 'none',
      cursor: 'pointer',
      transition: 'background var(--transition), color var(--transition)',
      background: active
        ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
        : 'transparent',
      color: active ? '#0a0a0a' : 'var(--muted)',
    }),
    // Drop zone / camera container
    dropzone: {
      width: '100%',
      minHeight: 280,
      border: dragging
        ? '2px dashed var(--primary)'
        : '2px dashed var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: dragging ? 'rgba(255,215,0,0.04)' : 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: mode === 'upload' && !image ? 'pointer' : 'default',
      transition: 'border-color var(--transition), background var(--transition)',
      position: 'relative',
      overflow: 'hidden',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'absolute',
      inset: 0,
      borderRadius: 'var(--radius-lg)',
      transform: 'scaleX(-1)', // mirror
    },
    flashOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'white',
      opacity: flash ? 0.85 : 0,
      transition: 'opacity 0.08s ease',
      pointerEvents: 'none',
      borderRadius: 'var(--radius-lg)',
      zIndex: 10,
    },
    countdownBadge: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontFamily: 'var(--font-heading)',
      fontSize: '6rem',
      color: '#fff',
      textShadow: '0 0 40px rgba(255,215,0,0.8)',
      zIndex: 9,
      pointerEvents: 'none',
      animation: 'pulseRing 0.9s ease-out',
    },
    snapBtn: {
      position: 'absolute',
      bottom: '1.2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 8,
      fontFamily: 'var(--font-heading)',
      fontSize: '1rem',
      letterSpacing: '0.1em',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
      color: '#0a0a0a',
      border: 'none',
      borderRadius: 99,
      padding: '0.7rem 2rem',
      cursor: countdown !== null ? 'not-allowed' : 'pointer',
      opacity: countdown !== null ? 0.6 : 1,
      transition: 'transform var(--transition), opacity var(--transition)',
      boxShadow: '0 0 20px rgba(255,215,0,0.3)',
      whiteSpace: 'nowrap',
    },
    cameraOffMsg: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.8rem',
    },
    previewImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'absolute',
      inset: 0,
      borderRadius: 'var(--radius-lg)',
    },
    previewOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: '1rem',
    },
    removeBtn: {
      background: 'rgba(0,0,0,0.7)',
      border: '1px solid var(--border)',
      borderRadius: 99,
      color: '#fff',
      padding: '0.4rem 1rem',
      fontSize: '0.8rem',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      letterSpacing: '0.05em',
      backdropFilter: 'blur(8px)',
      transition: 'background var(--transition)',
    },
    dropIcon: { fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.5 },
    dropText: {
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',
      color: 'var(--muted)',
      textAlign: 'center',
      lineHeight: 1.6,
    },
    browseLink: {
      color: 'var(--primary)',
      cursor: 'pointer',
      textDecoration: 'underline',
    },
    ctaWrapper: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      inset: 0,
      borderRadius: 99,
      border: '2px solid var(--primary)',
      animation: 'pulseRing 1.8s ease-out infinite',
      pointerEvents: 'none',
    },
    cta: {
      fontFamily: 'var(--font-heading)',
      fontSize: '1.3rem',
      letterSpacing: '0.12em',
      background: image && !loading
        ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
        : 'var(--surface)',
      color: image && !loading ? '#0a0a0a' : 'var(--muted)',
      border: 'none',
      borderRadius: 99,
      padding: '1rem 2.8rem',
      cursor: image && !loading ? 'pointer' : 'not-allowed',
      transition: 'transform var(--transition), box-shadow var(--transition)',
      boxShadow: image && !loading ? '0 0 30px rgba(255,215,0,0.25)' : 'none',
      position: 'relative',
      zIndex: 1,
    },
    error: {
      background: 'rgba(255,59,48,0.1)',
      border: '1px solid rgba(255,59,48,0.3)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.75rem 1.2rem',
      color: '#FF6B6B',
      fontSize: '0.88rem',
      width: '100%',
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
    },
  }

  return (
    <div style={s.wrapper}>
      {/* Logo */}
      <div className="fade-up fade-up-1">
        <div style={s.logo}>MOODTRACK</div>
      </div>
      <p className="fade-up fade-up-2" style={s.tagline}>Feel the music · Live the moment</p>

      {/* Mode tabs */}
      <div className="fade-up fade-up-2" style={s.tabs}>
        <button
          id="tab-upload"
          style={s.tab(mode === 'upload')}
          onClick={() => { setMode('upload'); setError('') }}
        >
          📁 UPLOAD
        </button>
        <button
          id="tab-camera"
          style={s.tab(mode === 'camera')}
          onClick={() => { setMode('camera'); setImage(null); setError('') }}
        >
          📷 CAMERA
        </button>
      </div>

      {/* ── CAMERA mode ── */}
      {mode === 'camera' && (
        <div className="fade-up fade-up-3" style={{ width: '100%' }}>
          <div style={s.dropzone}>
            {/* Flash overlay */}
            <div style={s.flashOverlay} />

            {/* Countdown badge */}
            {countdown !== null && (
              <div style={s.countdownBadge} key={countdown}>{countdown}</div>
            )}

            {/* Video feed */}
            <video
              ref={videoRef}
              style={s.video}
              autoPlay
              playsInline
              muted
            />

            {/* Camera loading state */}
            {!cameraReady && (
              <div style={s.cameraOffMsg}>
                <div style={{ fontSize: '2.5rem', opacity: 0.4 }}>📷</div>
                <p style={{ ...s.dropText, fontSize: '0.9rem' }}>Starting camera…</p>
              </div>
            )}

            {/* Snap button */}
            {cameraReady && (
              <button
                id="snap-btn"
                style={s.snapBtn}
                onClick={startCountdown}
                disabled={countdown !== null}
              >
                {countdown !== null ? `📸 Snapping in ${countdown}…` : '📸 SNAP PHOTO'}
              </button>
            )}
          </div>
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* ── UPLOAD mode ── */}
      {mode === 'upload' && (
        <>
          <div
            className="fade-up fade-up-3"
            style={{ width: '100%' }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => !image && inputRef.current?.click()}
          >
            <div style={s.dropzone}>
              {image ? (
                <>
                  <img src={image.dataUrl} alt="preview" style={s.previewImg} />
                  <div style={s.previewOverlay}>
                    <button
                      style={s.removeBtn}
                      onClick={(e) => { e.stopPropagation(); handleRemove() }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={s.dropIcon}>📁</div>
                  <p style={s.dropText}>
                    Drag &amp; drop your photo here<br />
                    or{' '}
                    <span
                      style={s.browseLink}
                      onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                    >
                      browse files
                    </span>
                  </p>
                  <p style={{ ...s.dropText, fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    JPG · PNG · WebP · max 10 MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </>
      )}

      {/* Error */}
      {error && (
        <div className="fade-up" style={s.error}>
          ⚠ {error}
        </div>
      )}

      {/* CTA — only shown in upload mode */}
      {mode === 'upload' && (
        <div className="fade-up fade-up-4" style={s.ctaWrapper}>
          {image && !loading && <div style={s.pulseRing} />}
          <button
            id="detect-mood-btn"
            style={s.cta}
            onClick={handleSubmit}
            disabled={!image || loading}
            onMouseEnter={(e) => {
              if (image && !loading) {
                e.currentTarget.style.transform = 'scale(1.04)'
                e.currentTarget.style.boxShadow = '0 0 50px rgba(255,215,0,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = image && !loading ? '0 0 30px rgba(255,215,0,0.25)' : 'none'
            }}
          >
            {loading ? 'ANALYZING…' : 'DETECT MY MOOD →'}
          </button>
        </div>
      )}
    </div>
  )
}
