import csv, os
import joblib
from flask import Flask, jsonify, render_template, request
import config as C
from src.morse_decoder import MORSE_CODE_DICT

app = Flask(__name__)
_models = None

def models():
    global _models
    if _models is None and os.path.exists(C.MODEL_FILE):
        _models = joblib.load(C.MODEL_FILE)
    return _models

def read_duration():
    try:
        d = float((request.get_json(silent=True) or {}).get("duration"))
    except (TypeError, ValueError):
        return None
    return d if 0 < d < 30 else None

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/config")
def config():
    return jsonify(dot_max=C.DOT_MAX, dash_max=C.DASH_MAX, pause_at=C.PAUSE_AT, min_blink=C.MIN_BLINK,
                   letter_gap=C.LETTER_GAP, word_gap=C.WORD_GAP, double_window=C.DOUBLE_BLINK_WINDOW,
                   morse=MORSE_CODE_DICT, model_ready=models() is not None)

@app.post("/api/classify")
def classify():
    d = read_duration()
    if d is None:
        return jsonify(error="duration must be a number of seconds"), 400
    m = models()
    idx = int(m["classifier"].predict([[d]])[0]) if m else C.label_of(d)
    return jsonify(label=C.LABELS[idx], source="model" if m else "rules")

@app.post("/api/collect")
def collect():
    d = read_duration()
    if d is None:
        return jsonify(error="duration must be a number of seconds"), 400
    new = not os.path.exists(C.DATA_FILE)
    with open(C.DATA_FILE, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["duration"])
        w.writerow([round(d, 3)])
    return jsonify(saved=True, label=C.LABELS[C.label_of(d)])

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
