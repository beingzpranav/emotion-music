"""
emotion_detector.py  (v5 — ViT + multi-model stack)
-----------------------------------------------------
Model priority:
  1. 🥇 HuggingFace ViT  (dima806/facial_emotions_image_detection)
        ~90 %+ accuracy, Vision Transformer, largest/cleanest training data.
  2. 🥈 HSEmotion EfficientNet-B0  (enet_b0_8_best_afew, AffectNet-trained)
        ~82 % accuracy, better than FER-2013.
  3. 🥉 DeepFace FER-2013 fallback
        ~65 % accuracy, last resort if nothing else is installed.

Face detection: DeepFace cascade (retinaface → mtcnn → ssd → opencv).
"""

import base64
import cv2
import numpy as np
from deepface import DeepFace

# ── Config ────────────────────────────────────────────────────────────────
_DETECTORS      = ["retinaface", "mtcnn", "ssd", "opencv"]
_TARGET_SHORT   = 480
NEUTRAL_MARGIN  = 8.0          # % lead needed to accept "neutral" as winner
_MIN_CONFIDENCE = 15.0

# HuggingFace model ID — ViT fine-tuned for facial emotion recognition
_HF_MODEL = "dima806/facial_emotions_image_detection"

# Emotion label normalisation maps
_HF_LABEL_MAP = {
    "angry":    "angry",  "anger":    "angry",
    "disgust":  "disgust","disgusted":"disgust",
    "fear":     "fear",   "fearful":  "fear",
    "happy":    "happy",  "happiness":"happy",
    "neutral":  "neutral",
    "sad":      "sad",    "sadness":  "sad",
    "surprise": "surprise","surprised":"surprise",
}
_HS_LABELS = ["Anger","Disgust","Fear","Happiness","Neutral","Sadness","Surprise"]
_HS_MAP    = {"Anger":"angry","Disgust":"disgust","Fear":"fear",
              "Happiness":"happy","Neutral":"neutral","Sadness":"sad","Surprise":"surprise"}
_STANDARD  = ["happy","sad","angry","neutral","fear","surprise","disgust"]

# ── Lazy singletons ───────────────────────────────────────────────────────
_vit_pipe   = None   # HuggingFace pipeline
_hs_rec     = None   # HSEmotion recognizer
_model_info = "?"    # which model is active


def _load_vit():
    global _vit_pipe, _model_info
    if _vit_pipe is not None:
        return _vit_pipe
    try:
        from transformers import pipeline as hf_pipeline
        print(f"[emotion] Loading ViT model: {_HF_MODEL}  (downloads ~330 MB on first run)")
        _vit_pipe = hf_pipeline(
            "image-classification",
            model=_HF_MODEL,
            device=-1,           # CPU
            top_k=None,          # return ALL class scores
        )
        _model_info = "ViT (HuggingFace)"
        print(f"[emotion] ✓ ViT ready — {_model_info}")
        return _vit_pipe
    except Exception as exc:
        print(f"[emotion] ViT unavailable ({exc})")
        return None


def _load_hs():
    global _hs_rec, _model_info
    if _hs_rec is not None:
        return _hs_rec
    try:
        from hsemotion.facial_emotions import HSEmotionRecognizer
        _hs_rec = HSEmotionRecognizer(model_name="enet_b0_8_best_afew", device="cpu")
        _model_info = "HSEmotion EfficientNet-B0"
        print(f"[emotion] ✓ HSEmotion ready — {_model_info}")
        return _hs_rec
    except Exception as exc:
        print(f"[emotion] HSEmotion unavailable ({exc})")
        return None


# ── Image helpers ─────────────────────────────────────────────────────────
def _resize(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    s = min(h, w)
    if s < _TARGET_SHORT:
        f = _TARGET_SHORT / s
        img = cv2.resize(img, (int(w*f), int(h*f)), interpolation=cv2.INTER_CUBIC)
    elif s > _TARGET_SHORT * 3:
        f = _TARGET_SHORT / s
        img = cv2.resize(img, (int(w*f), int(h*f)), interpolation=cv2.INTER_AREA)
    return img


def _sharpen(img: np.ndarray) -> np.ndarray:
    """Gentle unsharp-mask to enhance facial muscle edges."""
    blur  = cv2.GaussianBlur(img, (0, 0), 2.5)
    sharp = cv2.addWeighted(img, 1.5, blur, -0.5, 0)
    return sharp


def _crop_face(img: np.ndarray, region: dict, pad: float = 0.18) -> np.ndarray:
    x, y, w, h = (region.get(k, 0) for k in ("x","y","w","h"))
    if w == 0 or h == 0:
        return img
    ih, iw = img.shape[:2]
    px, py = int(w*pad), int(h*pad)
    x1, y1 = max(0, x-px), max(0, y-py)
    x2, y2 = min(iw, x+w+px), min(ih, y+h+py)
    crop = img[y1:y2, x1:x2]
    return crop if crop.size > 0 else img


# ── Face detection ────────────────────────────────────────────────────────
def _detect(img: np.ndarray) -> list[dict]:
    for det in _DETECTORS:
        try:
            res = DeepFace.analyze(img_path=img, actions=["emotion"],
                                   detector_backend=det, enforce_detection=True,
                                   silent=True)
            faces = res if isinstance(res, list) else [res]
            if faces:
                print(f"[emotion] detector={det}  faces={len(faces)}")
                return faces
        except Exception:
            continue
    print("[emotion] fallback detector (enforce=False)")
    res = DeepFace.analyze(img_path=img, actions=["emotion"],
                           detector_backend="opencv", enforce_detection=False,
                           silent=True)
    return res if isinstance(res, list) else [res]


def _largest_face(faces: list[dict]) -> dict:
    return max(faces, key=lambda f: f.get("region",{}).get("w",0)*f.get("region",{}).get("h",0))


# ── Classifiers ───────────────────────────────────────────────────────────
def _classify_vit(face_bgr: np.ndarray) -> dict | None:
    pipe = _load_vit()
    if pipe is None:
        return None
    try:
        from PIL import Image
        rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(rgb).resize((224, 224))
        raw = pipe(pil)           # list of {"label":..., "score":...}
        scores = {}
        for r in raw:
            key = _HF_LABEL_MAP.get(r["label"].lower().strip(), r["label"].lower())
            scores[key] = scores.get(key, 0.0) + float(r["score"])
        total = sum(scores.values()) or 1.0
        return {k: round(v/total*100, 2) for k, v in scores.items()}
    except Exception as exc:
        print(f"[emotion] ViT classify error: {exc}")
        return None


def _classify_hs(face_bgr: np.ndarray) -> dict | None:
    rec = _load_hs()
    if rec is None:
        return None
    try:
        _, probs = rec.predict_emotions(face_bgr, logits=False)
        raw = {_HS_MAP.get(lbl, lbl.lower()): float(p)
               for lbl, p in zip(_HS_LABELS, probs)}
        total = sum(raw.values()) or 1.0
        return {k: round(v/total*100, 2) for k, v in raw.items()}
    except Exception as exc:
        print(f"[emotion] HSEmotion classify error: {exc}")
        return None


def _classify_deepface(face: dict) -> dict:
    raw  = face.get("emotion", {})
    total = sum(raw.values()) or 1.0
    return {k: round(float(v/total)*100, 2) for k, v in raw.items()}


# ── Neutral bias correction ───────────────────────────────────────────────
def _dominant(scores: dict) -> str:
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top, top_s   = ranked[0]
    sec, sec_s   = ranked[1] if len(ranked) > 1 else ("neutral", 0)
    if top == "neutral" and (top_s - sec_s) < NEUTRAL_MARGIN:
        print(f"[emotion] neutral→{sec}  ({top_s:.1f}% vs {sec_s:.1f}%)")
        return sec
    return top


# ── Public API ────────────────────────────────────────────────────────────
def detect_emotion(image_base64: str) -> dict:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    arr = np.frombuffer(base64.b64decode(image_base64), dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Please upload a valid JPG/PNG.")

    img = _resize(img)

    # Detect face
    faces      = _detect(img)
    best_face  = _largest_face(faces)
    region     = best_face.get("region", {})
    face_crop  = _crop_face(_sharpen(img), region)

    # Classify — try each tier
    scores = (
        _classify_vit(face_crop)
        or _classify_hs(face_crop)
        or _classify_deepface(best_face)
    )

    # Ensure all 7 standard emotion keys exist
    for e in _STANDARD:
        scores.setdefault(e, 0.0)

    dominant  = _dominant(scores)
    confident = scores.get(dominant, 0.0) >= _MIN_CONFIDENCE

    # Log
    top5 = dict(sorted(scores.items(), key=lambda x: -x[1])[:5])
    print(f"[emotion] model={_model_info}")
    print(f"[emotion] top-5: { {k: f'{v:.1f}%' for k,v in top5.items()} }")
    print(f"[emotion] → dominant={dominant}  confident={confident}")

    return {
        "dominant_emotion": dominant,
        "emotion_scores":   scores,
        "confident":        confident,
    }
