import joblib, numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")           # saves the file without needing a display
import matplotlib.pyplot as plt
import config as C

def run():
    df = pd.read_csv(C.DATA_FILE)
    models = joblib.load(C.MODEL_FILE)
    clf, reg = models["classifier"], models["regressor"]
    d = df["duration"].to_numpy()
    y = df["duration"].apply(C.label_of).to_numpy()
    grid = np.linspace(0, max(d.max(), 2.5), 300).reshape(-1, 1)
    colors = ["#0F7B8A", "#E0A100", "#C0392B"]

    fig, ax = plt.subplots(1, 3, figsize=(18, 5))
    ax[0].scatter(d, y, c=[colors[i] for i in y], alpha=.5)
    ax[0].plot(grid, reg.predict(grid), "k--", label="Linear regression")
    ax[0].set(xlabel="Blink duration (s)", ylabel="Class (0 dot, 1 dash, 2 backspace)", title="Regression: duration vs class")
    ax[0].legend(); ax[0].grid(alpha=.3)

    for i, p in enumerate(clf.predict_proba(grid).T):
        ax[1].plot(grid, p, color=colors[i], label=C.LABELS[i])
    ax[1].set(xlabel="Blink duration (s)", ylabel="Probability", title="Logistic regression: class probability")
    ax[1].legend(); ax[1].grid(alpha=.3)

    ax[2].hist(d, bins=30, color="#9DB4BF", edgecolor="black")
    for t in (C.DOT_MAX, C.DASH_MAX):
        ax[2].axvline(t, color="red", linestyle="--")
    ax[2].set(xlabel="Blink duration (s)", ylabel="Frequency", title="Blink durations with thresholds")

    plt.tight_layout()
    plt.savefig("blink_analysis.png", dpi=200)
    print("Saved blink_analysis.png")
