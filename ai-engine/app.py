"""
app.py — MeroSuraksha AI Engine
================================
Flask REST API for SMS spam/scam detection.
Runs on port 8000 (matches backend .env AI_ENGINE_URL).

Endpoints:
  GET  /health        — Check if model is loaded
  POST /predict       — Classify a single message
  POST /predict/batch — Classify multiple messages (max 50)
"""

import os
import re
import logging
import joblib
import numpy as np
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS
from scipy.sparse import hstack, csr_matrix
from langdetect import detect, LangDetectException

import nltk
nltk.download("stopwords", quiet=True)
from nltk.corpus import stopwords
ENGLISH_STOPWORDS = set(stopwords.words("english"))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR       = os.path.join(BASE_DIR, "models")
MODEL_PATH      = os.path.join(MODEL_DIR, "spam_model.pkl")
TFIDF_WORD_PATH = os.path.join(MODEL_DIR, "tfidf_word.pkl")
TFIDF_CHAR_PATH = os.path.join(MODEL_DIR, "tfidf_char.pkl")
LE_PATH         = os.path.join(MODEL_DIR, "label_encoder.pkl")

# ── Keywords ──────────────────────────────────────────────────────────────────
NEPALI_SPAM_KEYWORDS = [
    "paisa", "paisaa", "rupees", "rs", "nrs", "lakh", "crore",
    "prize", "jitnu", "jeetnuhos", "lucky draw", "lucky", "draw",
    "inaam", "inam", "reward", "cash", "money", "free",
    "turant", "turanta", "jaldi", "abhi", "aba", "aile",
    "urgent", "immediately", "now", "today", "aaja",
    "click", "link", "website", "visit", "open", "download", "install", "app",
    "otp", "pin", "password", "passcode", "account", "bank",
    "verify", "verification", "confirm", "atm", "card",
    "winner", "selected", "chosen", "congratulation", "congratulations",
    "badhai", "badhaai", "shubhakamana",
    "loan", "offer", "scheme", "yojana", "subsidy", "invest",
    "investment", "profit", "return", "interest", "double",
    "job", "rojgar", "salary", "earning", "earn", "income",
    "work from home", "part time", "parttime",
    "kyc", "document", "id", "citizenship", "passport",
    "claim", "redeem", "expire", "last chance", "last day",
    "limited", "exclusive", "special", "bonus",
]

NEPALI_HAM_KEYWORDS = [
    "dhanyabad", "namaskar", "namaste", "subhakamana",
    "tapai", "hami", "garnu", "garna", "bhayo", "cha",
    "meeting", "schedule", "reminder",
]

URL_PATTERN   = re.compile(r"https?://\S+|www\.\S+|\S+\.(com|net|org|io|xyz|info|online|site)\S*", re.I)
PHONE_PATTERN = re.compile(r"\b(\+977|977|0)?[97][0-9]{8,9}\b")
MONEY_PATTERN = re.compile(r"\b(rs\.?|nrs\.?|rupees?|paisa|₹|\$|usd)\s*[\d,]+|\b[\d,]+\s*(rs\.?|nrs\.?|rupees?|paisa)\b", re.I)


# ── Preprocessing ─────────────────────────────────────────────────────────────
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = URL_PATTERN.sub(" url_token ", text)
    text = PHONE_PATTERN.sub(" phone_token ", text)
    text = MONEY_PATTERN.sub(" money_token ", text)
    text = re.sub(r"[^\w\s\u0900-\u097F]", " ", text)
    text = re.sub(r"\b\d{5,}\b", " longnum_token ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def remove_stopwords(text: str) -> str:
    return " ".join(t for t in text.split() if t not in ENGLISH_STOPWORDS)


def preprocess(text: str) -> str:
    return remove_stopwords(clean_text(text))


def detect_language(text: str) -> str:
    try:
        lang = detect(str(text))
        return lang if lang in ("ne", "hi", "en") else "other"
    except LangDetectException:
        return "other"


def extract_extra_features(raw: str, processed: str) -> np.ndarray:
    return np.array([[
        int(bool(URL_PATTERN.search(raw))),
        int(bool(PHONE_PATTERN.search(raw))),
        int(bool(MONEY_PATTERN.search(raw))),
        sum(1 for kw in NEPALI_SPAM_KEYWORDS if kw in processed),
        sum(1 for kw in NEPALI_HAM_KEYWORDS if kw in processed),
        len(raw),
        len(raw.split()),
        sum(1 for c in raw if c.isupper()) / max(len(raw), 1),
        raw.count("!"),
        int(bool(re.search(r"\b\d{4,8}\b", raw))),
        int(any(kw in processed for kw in ["prize", "lucky", "inaam", "winner", "jitnu"])),
        int(any(kw in processed for kw in ["turant", "urgent", "jaldi", "abhi", "aile", "immediately"])),
        int(any(kw in processed for kw in ["otp", "pin", "password", "account", "bank", "atm", "card", "kyc"])),
    ]], dtype=float)


def detect_scam_categories(text: str) -> list:
    text_lower = text.lower()
    categories = []
    if any(kw in text_lower for kw in ["lucky", "prize", "winner", "inaam", "jitnu", "draw"]):
        categories.append("Lucky Draw / Prize Scam")
    if any(kw in text_lower for kw in ["otp", "pin", "password", "bank", "account", "atm", "kyc"]):
        categories.append("Phishing / Account Scam")
    if any(kw in text_lower for kw in ["loan", "invest", "profit", "double", "return", "interest"]):
        categories.append("Financial / Investment Scam")
    if any(kw in text_lower for kw in ["job", "earn", "salary", "rojgar", "work from home", "income"]):
        categories.append("Job / Work-from-Home Scam")
    if any(kw in text_lower for kw in ["free", "claim", "redeem", "bonus", "exclusive"]):
        categories.append("Free Gift / Offer Scam")
    if URL_PATTERN.search(text) and not categories:
        categories.append("Suspicious Link")
    return categories if categories else ["General Spam"]


# ── Classification threshold ──────────────────────────────────────────────────
def classify(spam_prob: float) -> tuple:
    if spam_prob >= 0.70:
        return "spam", True
    elif spam_prob >= 0.45:
        return "probably spam", True
    else:
        return "not spam", False


# ── Flask App ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

model      = None
tfidf_word = None
tfidf_char = None
le         = None


def load_models():
    global model, tfidf_word, tfidf_char, le
    missing = [p for p in [MODEL_PATH, TFIDF_WORD_PATH, TFIDF_CHAR_PATH, LE_PATH]
               if not os.path.exists(p)]
    if missing:
        logger.error(f"Missing model files: {missing}")
        logger.error("Please run: python train_model.py")
        return False
    logger.info("Loading model artifacts...")
    model      = joblib.load(MODEL_PATH)
    tfidf_word = joblib.load(TFIDF_WORD_PATH)
    tfidf_char = joblib.load(TFIDF_CHAR_PATH)
    le         = joblib.load(LE_PATH)
    logger.info("All model artifacts loaded successfully.")
    return True


def predict_single(message: str) -> dict:
    """Run prediction on one message and return full result dict."""
    processed = preprocess(message)
    language  = detect_language(message)

    X_word  = tfidf_word.transform([processed])
    X_char  = tfidf_char.transform([processed])
    X_extra = csr_matrix(extract_extra_features(message, processed))
    X       = hstack([X_word, X_char, X_extra])

    proba     = model.predict_proba(X)[0]
    classes   = list(le.classes_)
    ham_prob  = float(proba[classes.index("ham")])
    spam_prob = float(proba[classes.index("spam")])

    classification, is_scam = classify(spam_prob)
    confidence = int(max(spam_prob, ham_prob) * 100)
    categories = detect_scam_categories(message) if is_scam else []

    return {
        "isScam":         is_scam,
        "confidence":     confidence,
        "classification": classification,
        "details": {
            "spam_probability":  round(spam_prob * 100, 2),
            "ham_probability":   round(ham_prob  * 100, 2),
            "language":          language,
            "scam_categories":   categories,
            "flags": {
                "has_url":           bool(URL_PATTERN.search(message)),
                "has_phone_number":  bool(PHONE_PATTERN.search(message)),
                "has_money_mention": bool(MONEY_PATTERN.search(message)),
                "has_urgency":       any(kw in processed for kw in ["turant", "urgent", "jaldi", "abhi", "immediately"]),
                "has_prize_words":   any(kw in processed for kw in ["prize", "lucky", "winner", "inaam"]),
            },
        },
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "model_loaded": model is not None,
        "service":      "MeroSuraksha AI Engine",
        "version":      "1.0.0",
    })


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Run python train_model.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    message = data.get("message", "")
    if not message or not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Field 'message' is required and must be a non-empty string"}), 400

    if len(message) > 5000:
        return jsonify({"error": "Message too long (max 5000 characters)"}), 400

    message = message.strip()
    logger.info(f"Predicting: '{message[:80]}'")

    result = predict_single(message)
    logger.info(f"Result: {result['classification']} | {result['confidence']}% | isScam: {result['isScam']}")
    return jsonify(result), 200


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(silent=True)
    if not data or "messages" not in data:
        return jsonify({"error": "Field 'messages' is required"}), 400

    messages = data["messages"]
    if not isinstance(messages, list) or len(messages) == 0:
        return jsonify({"error": "'messages' must be a non-empty list"}), 400
    if len(messages) > 50:
        return jsonify({"error": "Maximum 50 messages per batch"}), 400

    results = []
    for msg in messages:
        if not isinstance(msg, str) or not msg.strip():
            results.append({"error": "Invalid message"})
            continue
        result = predict_single(msg.strip())
        result["message"] = msg[:100]
        results.append(result)

    return jsonify({"results": results, "count": len(results)}), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "available": ["/health", "/predict", "/predict/batch"]}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(e):
    logger.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("  MeroSuraksha AI Engine — Starting")
    logger.info("=" * 50)

    if not load_models():
        logger.error("Failed to load models. Run train_model.py first.")
        exit(1)

    # Port 8000 matches backend .env AI_ENGINE_URL=http://localhost:8000
    logger.info("Starting on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)