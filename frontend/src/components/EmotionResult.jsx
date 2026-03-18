const EMOTION_EMOJI = {
  happy:    '😄',
  sad:      '😢',
  angry:    '😠',
  neutral:  '😐',
  fear:     '😨',
  surprise: '😲',
  disgust:  '🤢',
}

// Stable order for the bar chart
const EMOTION_ORDER = ['happy', 'sad', 'angry', 'neutral', 'fear', 'surprise', 'disgust']

export default function EmotionResult({ dominantEmotion, emotionScores, moodMessage, colors, confident = true }) {
  const emoji = EMOTION_EMOJI[dominantEmotion] ?? '🎭'

  const s = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      width: '100%',
      maxWidth: 560,
    },
    header: {
      textAlign: 'center',
    },
    emojiRing: {
      width: 96,
      height: 96,
      borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${colors.primary}33, ${colors.secondary}11)`,
      border: `2px solid ${colors.primary}55`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '3.2rem',
      margin: '0 auto 1rem',
      boxShadow: `0 0 40px ${colors.primary}30`,
    },
    emotionLabel: {
      fontFamily: 'var(--font-heading)',
      fontSize: 'clamp(3rem, 12vw, 5rem)',
      letterSpacing: '0.06em',
      lineHeight: 1,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    moodMsg: {
      fontFamily: 'var(--font-body)',
      fontSize: '1rem',
      color: 'var(--muted)',
      marginTop: '0.5rem',
      lineHeight: 1.6,
    },
    chartCard: {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      padding: '1.4rem 1.6rem',
    },
    chartTitle: {
      fontFamily: 'var(--font-heading)',
      fontSize: '1rem',
      letterSpacing: '0.12em',
      color: 'var(--muted)',
      marginBottom: '1.2rem',
    },
    barRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.85rem',
    },
    barLabel: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.82rem',
      fontWeight: 500,
      color: 'var(--text)',
      width: 72,
      textTransform: 'capitalize',
      flexShrink: 0,
    },
    barTrack: {
      flex: 1,
      height: 8,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 99,
      overflow: 'hidden',
    },
    barValue: {
      fontFamily: 'var(--font-body)',
      fontSize: '0.78rem',
      color: 'var(--muted)',
      width: 44,
      textAlign: 'right',
      flexShrink: 0,
    },
  }

  return (
    <div style={s.wrapper}>
      {/* Low-confidence warning */}
      {!confident && (
        <div className="fade-up" style={{
          background: 'rgba(255,200,0,0.08)',
          border: '1px solid rgba(255,200,0,0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.7rem 1.2rem',
          fontSize: '0.84rem',
          fontFamily: 'var(--font-body)',
          color: '#FFD166',
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          ⚠️ Low confidence — try a clearer, well-lit photo facing the camera directly.
        </div>
      )}

      {/* Emotion header */}
      <div className="fade-up fade-up-1" style={s.header}>
        <div style={s.emojiRing}>{emoji}</div>
        <div style={s.emotionLabel}>{dominantEmotion.toUpperCase()}</div>
        <p style={s.moodMsg}>{moodMessage}</p>
      </div>

      {/* Bar chart */}
      <div className="fade-up fade-up-2" style={s.chartCard}>
        <div style={s.chartTitle}>EMOTION BREAKDOWN</div>
        {EMOTION_ORDER.map((emotion) => {
          const score = emotionScores?.[emotion] ?? 0
          const isActive = emotion === dominantEmotion
          return (
            <div key={emotion} style={s.barRow}>
              <span style={{
                ...s.barLabel,
                color: isActive ? colors.primary : 'var(--text)',
                fontWeight: isActive ? 700 : 500,
              }}>
                {EMOTION_EMOJI[emotion]} {emotion}
              </span>
              <div style={s.barTrack}>
                <div
                  style={{
                    height: '100%',
                    width: `${score}%`,
                    background: isActive
                      ? `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
                      : 'rgba(255,255,255,0.18)',
                    borderRadius: 99,
                    animation: `barFill 0.9s ease both`,
                    animationDelay: `${0.1 + EMOTION_ORDER.indexOf(emotion) * 0.07}s`,
                  }}
                />
              </div>
              <span style={{
                ...s.barValue,
                color: isActive ? colors.primary : 'var(--muted)',
              }}>
                {score.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
