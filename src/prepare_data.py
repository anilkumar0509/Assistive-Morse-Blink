"""Clean blink_data.csv: drop noise/outliers, then add realistic samples so all classes are balanced."""
import numpy as np, pandas as pd
import config as C

def run(per_class=200, seed=42):
    df = pd.read_csv(C.DATA_FILE)
    real = df["duration"][(df["duration"] >= C.MIN_BLINK) & (df["duration"] < C.PAUSE_AT)]
    rng = np.random.default_rng(seed)
    # (mean, std, low, high) per class; bounds keep a margin from the thresholds
    specs = [(0.30, 0.07, 0.12, 0.47), (0.82, 0.13, 0.55, 1.15), (1.75, 0.25, 1.30, 2.35)]
    parts = [real.to_numpy()]
    for i, (m, s, lo, hi) in enumerate(specs):
        have = int((real.apply(C.label_of) == i).sum())
        parts.append(np.clip(rng.normal(m, s, max(per_class - have, 0)), lo, hi))
    out = pd.DataFrame({"duration": np.round(np.concatenate(parts), 3)}).sample(frac=1, random_state=seed)
    out.to_csv(C.DATA_FILE, index=False)
    print(f"Kept {len(real)} real blinks (removed {len(df) - len(real)} noise/outliers); "
          f"saved {len(out)} rows to {C.DATA_FILE}")
    print(out["duration"].apply(lambda d: C.LABELS[C.label_of(d)]).value_counts().to_string())
