from flask import Flask, request, jsonify
from flask_cors import CORS

from emotion_detector import detect_emotion
from music_mapper import get_songs_for_emotion

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (needed by the Vite dev server)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MOODTRACK API"}), 200


# ---------------------------------------------------------------------------
# Main analysis endpoint
# ---------------------------------------------------------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects JSON body: { "image": "<base64-encoded image>" }
    Returns:
    {
        "dominant_emotion": str,
        "emotion_scores":   { emotion: float, ... },
        "songs":            [ { song, artist, album, year, spotify_url }, ... ],
        "mood_message":     str,
        "colors":           { primary, secondary, bg }
    }
    """
    data = request.get_json(force=True, silent=True)

    if not data or "image" not in data:
        return jsonify({"error": "Request body must contain an 'image' field."}), 400

    try:
        # Step 1 – detect emotion from the uploaded image
        emotion_result = detect_emotion(data["image"])

        # Step 2 – map detected emotion to songs + theme
        dominant = emotion_result["dominant_emotion"]
        music_result = get_songs_for_emotion(dominant)

        # Step 3 – combine and return
        return jsonify(
            {
                "dominant_emotion": dominant,
                "emotion_scores": emotion_result["emotion_scores"],
                "confident": emotion_result.get("confident", True),
                "songs": music_result["songs"],
                "mood_message": music_result["mood_message"],
                "colors": music_result["colors"],
            }
        ), 200

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Internal server error: {exc}"}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
