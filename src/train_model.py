import joblib, pandas as pd
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
import config as C

def run():
    df = pd.read_csv(C.DATA_FILE)
    if "duration" not in df.columns or df.empty:
        raise ValueError(f"{C.DATA_FILE} must contain a non-empty 'duration' column.")
    X = df[["duration"]].values
    y = df["duration"].apply(C.label_of).values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = LogisticRegression(max_iter=1000, C=10).fit(Xtr, ytr)    # dot / dash / backspace
    reg = LinearRegression().fit(Xtr, ytr)                         # numeric class score, for analysis
    pred = clf.predict(Xte)
    print(f"Classifier accuracy on held-out data: {accuracy_score(yte, pred):.3f}")
    print(classification_report(yte, pred, target_names=C.LABELS, zero_division=0))
    print("Regression R^2 on held-out data:", round(reg.score(Xte, yte), 3))

    # Final models use all data
    clf.fit(X, y); reg.fit(X, y)
    joblib.dump({"classifier": clf, "regressor": reg}, C.MODEL_FILE)
    print("Saved", C.MODEL_FILE)
