"""
train_model.py — MeroSuraksha SMS Scam Detection
=================================================
Trains a spam detection model on the Nepali SMS dataset.
Supports Nepali, English, and Hinglish text.

Label mapping:
  - "ham" / "Ham"   → ham  (safe)
  - "spam" / "Spam" → spam (scam)
  - "scam" / "Scam" → spam (scam is spam)

Output:
  ai-engine/models/spam_model.pkl
  ai-engine/models/tfidf_word.pkl
  ai-engine/models/tfidf_char.pkl
  ai-engine/models/label_encoder.pkl
"""

import os
import re
import warnings
import joblib
import numpy as np
import pandas as pd
import nltk

from langdetect import detect, LangDetectException
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
from scipy.sparse import hstack, csr_matrix

warnings.filterwarnings("ignore")

# ── NLTK ──────────────────────────────────────────────────────────────────────
print("[INFO] Downloading NLTK resources...")
nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
from nltk.corpus import stopwords
ENGLISH_STOPWORDS = set(stopwords.words("english"))

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DATA_PATH       = os.path.join(BASE_DIR, "data", "spam_dataset_nepali_3200.xlsx")
MODEL_DIR       = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

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


# ── Language Detection ────────────────────────────────────────────────────────
def detect_language(text: str) -> str:
    try:
        lang = detect(str(text))
        return lang if lang in ("ne", "hi", "en") else "other"
    except LangDetectException:
        return "other"


# ── Text Preprocessing ────────────────────────────────────────────────────────
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
    tokens = text.split()
    return " ".join(t for t in tokens if t not in ENGLISH_STOPWORDS)


def preprocess(text: str) -> str:
    return remove_stopwords(clean_text(text))


# ── Feature Engineering ───────────────────────────────────────────────────────
def extract_extra_features(df: pd.DataFrame) -> np.ndarray:
    features = []
    for _, row in df.iterrows():
        raw  = str(row.get("raw_text", "")).lower()
        proc = str(row.get("processed_text", "")).lower()

        features.append([
            int(bool(URL_PATTERN.search(raw))),
            int(bool(PHONE_PATTERN.search(raw))),
            int(bool(MONEY_PATTERN.search(raw))),
            sum(1 for kw in NEPALI_SPAM_KEYWORDS if kw in proc),
            sum(1 for kw in NEPALI_HAM_KEYWORDS if kw in proc),
            len(raw),
            len(raw.split()),
            sum(1 for c in raw if c.isupper()) / max(len(raw), 1),
            raw.count("!"),
            int(bool(re.search(r"\b\d{4,8}\b", raw))),
            int(any(kw in proc for kw in ["prize", "lucky", "inaam", "winner", "jitnu"])),
            int(any(kw in proc for kw in ["turant", "urgent", "jaldi", "abhi", "aile", "immediately"])),
            int(any(kw in proc for kw in ["otp", "pin", "password", "account", "bank", "atm", "card", "kyc"])),
        ])
    return np.array(features, dtype=float)


# ── Label Normalization ───────────────────────────────────────────────────────
def normalize_label(label: str) -> str:
    label = str(label).strip().lower()
    if label == "ham":
        return "ham"
    elif label in ("spam", "scam"):
        return "spam"
    else:
        print(f"  [WARN] Unknown label '{label}', defaulting to ham")
        return "ham"


# ── Load Dataset ──────────────────────────────────────────────────────────────
def load_dataset(path: str) -> pd.DataFrame:
    print(f"\n[INFO] Loading dataset from: {path}")
    df = pd.read_excel(path, engine="openpyxl")

    print(f"[INFO] Raw shape: {df.shape}")
    print(f"[INFO] Columns: {list(df.columns)}")

    # Auto-detect columns
    col_map = {}
    for col in df.columns:
        col_lower = col.strip().lower()
        if col_lower in ("message", "sms", "text", "msg", "content"):
            col_map["text"] = col
        elif col_lower in ("label", "class", "category", "type", "target"):
            col_map["label"] = col

    if "text" not in col_map or "label" not in col_map:
        print(f"[INFO] Using first column as text, second as label")
        col_map["text"]  = df.columns[0]
        col_map["label"] = df.columns[1]

    print(f"[INFO] Text column  → '{col_map['text']}'")
    print(f"[INFO] Label column → '{col_map['label']}'")

    df = df[[col_map["text"], col_map["label"]]].copy()
    df.columns = ["raw_text", "raw_label"]

    before = len(df)
    df.dropna(subset=["raw_text", "raw_label"], inplace=True)
    df = df[df["raw_text"].astype(str).str.strip() != ""]
    print(f"[INFO] Dropped {before - len(df)} null/empty rows → {len(df)} rows remain")

    df["label"] = df["raw_label"].apply(normalize_label)
    print(f"\n[INFO] Label distribution:\n{df['label'].value_counts()}")

    print("\n[INFO] Detecting languages (may take a moment)...")
    df["language"] = df["raw_text"].apply(detect_language)
    print(f"[INFO] Language distribution:\n{df['language'].value_counts()}")

    print("\n[INFO] Preprocessing text...")
    df["processed_text"] = df["raw_text"].apply(preprocess)

    return df


# ── Train ─────────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame):
    print("\n" + "="*60)
    print("  TRAINING SPAM DETECTION MODEL")
    print("="*60)

    le = LabelEncoder()
    y  = le.fit_transform(df["label"])
    print(f"\n[INFO] Classes: {le.classes_}")

    print("\n[INFO] Building TF-IDF word n-grams...")
    tfidf_word = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        max_features=15000,
        sublinear_tf=True,
        min_df=2,
        strip_accents=None,
        token_pattern=r"(?u)\b\w+\b",
    )

    print("[INFO] Building TF-IDF char n-grams...")
    tfidf_char = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 5),
        max_features=10000,
        sublinear_tf=True,
        min_df=2,
    )

    X_word  = tfidf_word.fit_transform(df["processed_text"])
    X_char  = tfidf_char.fit_transform(df["processed_text"])

    print("[INFO] Extracting hand-crafted features...")
    X_extra = csr_matrix(extract_extra_features(df))

    print("[INFO] Combining all features...")
    X = hstack([X_word, X_char, X_extra])
    print(f"[INFO] Final feature matrix: {X.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[INFO] Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    # Classifiers
    lr = LogisticRegression(
        C=1.0, max_iter=1000,
        class_weight="balanced",
        solver="lbfgs", random_state=42,
    )
    svc = CalibratedClassifierCV(
        LinearSVC(C=1.0, max_iter=2000, class_weight="balanced", random_state=42)
    )
    rf = RandomForestClassifier(
        n_estimators=200, min_samples_leaf=2,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )

    ensemble = VotingClassifier(
        estimators=[("lr", lr), ("svc", svc), ("rf", rf)],
        voting="soft",
        weights=[2, 2, 1],
    )

    print("\n[INFO] Training ensemble (LR + LinearSVC + RF) — takes 3-7 minutes...")
    ensemble.fit(X_train, y_train)

    # Evaluate
    y_pred = ensemble.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)

    print("\n" + "="*60)
    print(f"  TEST ACCURACY: {acc * 100:.2f}%")
    print("="*60)
    print("\n[INFO] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    print("[INFO] Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"          Predicted: ham   spam")
    for i, cls in enumerate(le.classes_):
        print(f"Actual {cls:>4}:        {cm[i]}")

    print("\n[INFO] Running 5-fold cross-validation...")
    cv_scores = cross_val_score(ensemble, X, y, cv=5, scoring="accuracy", n_jobs=-1)
    print(f"[INFO] CV Scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"[INFO] CV Mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save
    joblib.dump(ensemble,   os.path.join(MODEL_DIR, "spam_model.pkl"))
    joblib.dump(tfidf_word, os.path.join(MODEL_DIR, "tfidf_word.pkl"))
    joblib.dump(tfidf_char, os.path.join(MODEL_DIR, "tfidf_char.pkl"))
    joblib.dump(le,         os.path.join(MODEL_DIR, "label_encoder.pkl"))

    print(f"\n[INFO] All model files saved to: {MODEL_DIR}")
    print("[SUCCESS] Training complete!")

    return ensemble, tfidf_word, tfidf_char, le


# ── Quick Test ────────────────────────────────────────────────────────────────
def quick_test(model, tfidf_word, tfidf_char, le):
    print("\n" + "="*60)
    print("  QUICK PREDICTION TEST")
    print("="*60)

    test_messages = [
        ("Congratulations! You have won Rs 50,000 lucky draw. Click now: www.claim-prize.com", "spam"),
        ("Tapailai lucky draw ma Rs 1,00,000 jitnu bhayo! Turant link click garnu", "spam"),
        ("Your OTP is 4521. Do not share with anyone. Expires in 10 minutes.", "ham"),
        ("Kal meeting 3 baje cha. Office aaunus please.", "ham"),
        ("Free job offer! Work from home earn Rs 5000 daily. Call now.", "spam"),
        ("Aaja bhetau? Coffee khana jane?", "ham"),
        ("Your account suspended. Verify KYC at www.fake-bank-nepal.com", "spam"),
    ]

    for msg, expected in test_messages:
        proc   = preprocess(msg)
        X_word = tfidf_word.transform([proc])
        X_char = tfidf_char.transform([proc])

        mini_df = pd.DataFrame({"raw_text": [msg], "processed_text": [proc]})
        X_extra = csr_matrix(extract_extra_features(mini_df))
        X       = hstack([X_word, X_char, X_extra])

        proba      = model.predict_proba(X)[0]
        pred_label = le.classes_[proba.argmax()]
        confidence = proba.max() * 100

        status = "✓" if pred_label == expected else "✗"
        print(f"\n  {status} Expected: {expected} | Got: {pred_label} ({confidence:.1f}%)")
        print(f"    MSG: {msg[:70]}")


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    df = load_dataset(DATA_PATH)
    model, tfidf_word, tfidf_char, le = train(df)
    quick_test(model, tfidf_word, tfidf_char, le)
    print("\n[INFO] Now run: python app.py")