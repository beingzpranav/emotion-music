import os
import random
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_FALLBACK_CSV = os.path.join(_BASE_DIR, "data", "songs.csv")

# ---------------------------------------------------------------------------
# Load the Spotify Tracks dataset via kagglehub (downloaded once & cached)
# Falls back to the bundled songs.csv if kagglehub / network is unavailable.
# ---------------------------------------------------------------------------
_df_spotify: pd.DataFrame | None = None


def _load_spotify_dataset() -> pd.DataFrame | None:
    """Download (or load from cache) the Spotify Tracks Dataset from Kaggle."""
    try:
        import kagglehub  # noqa: PLC0415
        path = kagglehub.dataset_download("maharshipandya/-spotify-tracks-dataset")
        # The dataset contains a single CSV; find it
        for root, _, files in os.walk(path):
            for fname in files:
                if fname.endswith(".csv"):
                    df = pd.read_csv(os.path.join(root, fname))
                    print(f"[music_mapper] Loaded Spotify dataset: {len(df):,} tracks")
                    return df
    except Exception as exc:  # noqa: BLE001
        print(f"[music_mapper] kagglehub unavailable ({exc}), using bundled CSV.")
    return None


# Load once at import time
_df_spotify = _load_spotify_dataset()

# ---------------------------------------------------------------------------
# Emotion → audio-feature thresholds
# (all features are 0-1 floats from the Spotify API)
#
# valence      – musical positiveness (0 = dark/sad, 1 = happy/euphoric)
# energy       – intensity & activity (0 = calm, 1 = loud & fast)
# danceability – rhythmic suitability for dancing
# acousticness – confidence the track is acoustic (higher = more acoustic)
# ---------------------------------------------------------------------------
_EMOTION_FILTERS = {
    "happy": dict(
        valence=(0.65, 1.0),
        energy=(0.55, 1.0),
        danceability=(0.55, 1.0),
    ),
    "sad": dict(
        valence=(0.0, 0.35),
        energy=(0.0, 0.50),
        acousticness=(0.30, 1.0),
    ),
    "angry": dict(
        valence=(0.0, 0.45),
        energy=(0.70, 1.0),
    ),
    "neutral": dict(
        valence=(0.30, 0.65),
        energy=(0.30, 0.65),
    ),
    "fear": dict(
        valence=(0.0, 0.40),
        energy=(0.20, 0.55),
        acousticness=(0.20, 1.0),
    ),
    "surprise": dict(
        valence=(0.55, 1.0),
        energy=(0.65, 1.0),
        danceability=(0.60, 1.0),
    ),
    "disgust": dict(
        valence=(0.0, 0.35),
        energy=(0.55, 1.0),
    ),
}

# ---------------------------------------------------------------------------
# Per-emotion UI configuration (unchanged)
# ---------------------------------------------------------------------------
_EMOTION_CONFIG = {
    "happy": {
        "message": "Your smile is contagious! Let the good vibes roll 🌟",
        "colors": {"primary": "#FFD700", "secondary": "#FFA500", "bg": "#1a1500"},
    },
    "sad": {
        "message": "It's okay to feel blue. Let the music hold you 🌊",
        "colors": {"primary": "#4A90D9", "secondary": "#7B68EE", "bg": "#000d1a"},
    },
    "angry": {
        "message": "Channel that fire into something powerful 🔥",
        "colors": {"primary": "#FF3B30", "secondary": "#FF6B35", "bg": "#1a0000"},
    },
    "neutral": {
        "message": "Calm and collected — the perfect state of mind 🌿",
        "colors": {"primary": "#4CAF50", "secondary": "#81C784", "bg": "#001a05"},
    },
    "fear": {
        "message": "Courage is feeling the fear and moving forward 🔮",
        "colors": {"primary": "#9B59B6", "secondary": "#C39BD3", "bg": "#0d0015"},
    },
    "surprise": {
        "message": "Life is full of beautiful surprises! Embrace them ✨",
        "colors": {"primary": "#FF69B4", "secondary": "#FF9EC4", "bg": "#1a0010"},
    },
    "disgust": {
        "message": "Let it out — sometimes you need music that gets it 🌀",
        "colors": {"primary": "#00BCD4", "secondary": "#4DD0E1", "bg": "#001a1a"},
    },
}

_FALLBACK_CONFIG = {
    "message": "Here's some music to match your mood 🎵",
    "colors": {"primary": "#9B59B6", "secondary": "#C39BD3", "bg": "#0d0015"},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _filter_spotify(emotion_lower: str) -> pd.DataFrame:
    """Apply audio-feature thresholds to the Spotify dataset."""
    df = _df_spotify.copy()
    thresholds = _EMOTION_FILTERS.get(emotion_lower, {})
    for col, (lo, hi) in thresholds.items():
        if col in df.columns:
            df = df[(df[col] >= lo) & (df[col] <= hi)]
    # Sort by popularity (highest first) then sample for variety
    if "popularity" in df.columns:
        df = df.sort_values("popularity", ascending=False)
    return df


def _rows_to_songs(df: pd.DataFrame, n: int = 20) -> list[dict]:
    """Convert Spotify dataset rows to the standard song dict shape."""
    # Sample from the top-200 most popular to keep variety
    pool = df.head(200) if len(df) >= 200 else df
    sample = pool.sample(n=min(n, len(pool)), random_state=random.randint(0, 9999))

    songs = []
    for _, row in sample.iterrows():
        track_id = str(row.get("track_id", "")).strip()
        spotify_url = (
            f"https://open.spotify.com/track/{track_id}" if track_id else ""
        )
        # artist column may be called 'artists' in this dataset
        artist = str(row.get("artists", row.get("artist", "Unknown"))).strip()
        songs.append({
            "song":        str(row.get("track_name", row.get("song", "Unknown"))).strip(),
            "artist":      artist,
            "album":       str(row.get("album_name", row.get("album", ""))).strip(),
            "year":        str(row.get("year", "")).strip() if "year" in row.index else "",
            "spotify_url": spotify_url,
            "popularity":  int(row["popularity"]) if "popularity" in row.index else None,
        })
    return songs


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_songs_for_emotion(emotion: str) -> dict:
    """
    Return up to 5 songs that match *emotion*, plus the mood message and
    colour palette.  Uses the Spotify Tracks Dataset when available,
    falling back to the bundled songs.csv.
    """
    emotion_lower = emotion.lower()
    config = _EMOTION_CONFIG.get(emotion_lower, _FALLBACK_CONFIG)

    # ── Spotify dataset path ──────────────────────────────────────────────
    if _df_spotify is not None:
        filtered = _filter_spotify(emotion_lower)
        if len(filtered) >= 1:
            songs_list = _rows_to_songs(filtered, n=20)
            return {
                "songs": songs_list,
                "mood_message": config["message"],
                "colors": config["colors"],
            }
        # If filters are too strict (no matches), relax and return top popular tracks
        songs_list = _rows_to_songs(_df_spotify, n=20)
        return {
            "songs": songs_list,
            "mood_message": config["message"],
            "colors": config["colors"],
        }

    # ── Fallback: bundled songs.csv ───────────────────────────────────────
    df_fallback = pd.read_csv(_FALLBACK_CSV)
    filtered = df_fallback[df_fallback["emotion"].str.lower() == emotion_lower]
    sample_size = min(20, len(filtered))
    sample = filtered.sample(n=sample_size, random_state=random.randint(0, 9999))
    songs_list = sample[["song", "artist", "album", "year", "spotify_url"]].to_dict(
        orient="records"
    )
    return {
        "songs": songs_list,
        "mood_message": config["message"],
        "colors": config["colors"],
    }
