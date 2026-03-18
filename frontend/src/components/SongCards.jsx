import { useState } from 'react'

const NOTE_EMOJIS = ['🎵', '🎶', '🎸', '🎹', '🎷', '🎺', '🥁', '🎻']

function extractTrackId(url = '') {
  const match = String(url).match(/track\/([A-Za-z0-9]+)/)
  return match ? match[1] : null
}

// ── Mini bottom-bar player ─────────────────────────────────────────────────
function BottomPlayer({ song, colors, onClose }) {
  const trackId = extractTrackId(song?.spotify_url)
  if (!song || !trackId) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${colors.primary}44`,
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: `0 -10px 60px ${colors.primary}22`,
      animation: 'slideUp 0.3s ease both',
    }}>
      {/* Now playing info */}
      <div style={{ flex: '0 0 auto' }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.7rem',
          color: colors.primary,
          letterSpacing: '0.12em',
          marginBottom: '0.1rem',
        }}>NOW PLAYING</div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.85rem',
          color: 'var(--text)',
          maxWidth: 180,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{song.song}</div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          color: 'var(--muted)',
        }}>{song.artist}</div>
      </div>

      {/* Spotify embed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <iframe
          key={trackId}
          title={song.song}
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          style={{ border: 'none', borderRadius: 8, display: 'block' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>

      {/* Close & open in Spotify */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
        <a
          href={song.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.72rem',
            color: colors.primary,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          ↗ Open in Spotify
        </a>
        <button
          onClick={onClose}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.72rem',
            color: 'var(--muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '0.25rem 0.75rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ✕ Close
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SongCards({ songs, colors }) {
  const [playing, setPlaying] = useState(null)   // index of currently playing song
  const [hovered, setHovered] = useState(null)

  function handlePlay(idx) {
    setPlaying(prev => (prev === idx ? null : idx))
  }

  return (
    <>
      {/* Song list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        maxWidth: 560,
        // Add bottom padding so last card isn't hidden behind bottom player
        paddingBottom: playing !== null ? '120px' : '0',
        transition: 'padding-bottom 0.3s ease',
      }}>
        {/* Header */}
        <div className="fade-up" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.1rem',
          letterSpacing: '0.14em',
          color: 'var(--muted)',
          marginBottom: '0.25rem',
        }}>
          <span>🎧 YOUR MOOD PLAYLIST</span>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.78rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 99,
            padding: '0.2rem 0.75rem',
          }}>{songs.length} tracks</span>
        </div>

        {/* Scrollable cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '65vh',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}>
          {songs.map((song, idx) => {
            const isHovered = hovered === idx
            const isPlaying = playing === idx
            const trackId   = extractTrackId(song.spotify_url)

            return (
              <div
                key={idx}
                id={`song-card-${idx}`}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => trackId && handlePlay(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: isPlaying
                    ? `1px solid ${colors.primary}88`
                    : isHovered
                    ? `1px solid ${colors.primary}33`
                    : '1px solid rgba(255,255,255,0.07)',
                  background: isPlaying
                    ? `linear-gradient(90deg, ${colors.primary}18, rgba(20,20,20,0.9))`
                    : isHovered
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(20,20,20,0.8)',
                  cursor: trackId ? 'pointer' : 'default',
                  transform: isHovered && !isPlaying ? 'translateX(4px)' : 'none',
                  transition: 'transform 0.2s ease, background 0.2s ease, border-color 0.2s ease',
                  userSelect: 'none',
                }}
              >
                {/* Track number */}
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  color: isPlaying ? colors.primary : 'rgba(255,255,255,0.3)',
                  width: 28,
                  textAlign: 'center',
                  flexShrink: 0,
                  transition: 'color 0.2s ease',
                }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>

                {/* Album art placeholder */}
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${colors.primary}55, ${colors.secondary}33)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0,
                  boxShadow: isPlaying ? `0 0 16px ${colors.primary}44` : 'none',
                  transition: 'box-shadow 0.2s ease',
                }}>
                  {isPlaying ? '▶' : NOTE_EMOJIS[idx % NOTE_EMOJIS.length]}
                </div>

                {/* Song info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: isPlaying ? colors.primary : '#f0f0f0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 0.2s ease',
                  }}>
                    {song.song || '—'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.78rem',
                    color: 'rgba(240,240,240,0.45)',
                    marginTop: '0.15rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {song.artist || '—'}
                  </div>
                </div>

                {/* Play / playing indicator */}
                {trackId && (
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: isPlaying
                      ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                      : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: isPlaying ? '0.85rem' : '1rem',
                    transition: 'background 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: isPlaying ? `0 0 18px ${colors.primary}66` : 'none',
                    color: isPlaying ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                  }}>
                    {isPlaying ? '■' : '▶'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed bottom Spotify player */}
      {playing !== null && songs[playing] && (
        <BottomPlayer
          song={songs[playing]}
          colors={colors}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  )
}
