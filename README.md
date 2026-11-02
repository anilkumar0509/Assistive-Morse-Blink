# BlinkMorse: Assistive Morse Communication by Eye Blinks

A website that lets a person type with Morse code using only eye blinks. No keyboard or mouse is needed once it is open.

## Run it
```bash
pip install -r requirements.txt
python main.py serve        # then open http://127.0.0.1:5000 in Chrome or Edge
```
The camera starts by itself (allow access when the browser asks). Keep your eyes open and look at the screen for 3 seconds while it calibrates. An internet connection is needed on first load for the MediaPipe face model.

## How to blink
| Action | Meaning |
|---|---|
| 2 quick blinks | Start (wake up) |
| Short blink (up to 0.5 s) | Dot |
| Longer blink (0.5 to 1.2 s) | Dash |
| Very long blink (over 1.2 s) | Backspace |
| Eyes open, pause 1.2 s | Letter finished |
| Eyes open, pause 3 s | Word finished (space added and the word is spoken) |
| Eyes closed 2.5 s | Pause the system |

All limits are in `config.py`.

## Project layout
```
main.py            command line: prepare | train | plot | serve
app.py             Flask server and API (/api/config, /api/classify, /api/collect)
config.py          every threshold in one place
templates/, static/  the website (camera, blink detection, Morse logic, UI)
src/prepare_data.py  cleans blink_data.csv and balances the classes
src/train_model.py   trains Logistic Regression (classifier) and Linear Regression
src/morse_decoder.py Morse table
plot_analysis.py     report figures -> blink_analysis.png
```

## Machine learning pipeline
```bash
python main.py prepare   # remove noise (<0.10 s) and outliers, add realistic samples
python main.py train     # 80/20 split, prints accuracy, saves blink_models.pkl
python main.py plot      # regression line, class probabilities, histogram
```
To add your own data, tick **Record samples** on the website and blink; each blink is appended to `blink_data.csv`. Run `train` again afterwards.

## Notes
- Blink detection runs in the browser with MediaPipe Face Landmarker and Eye Aspect Ratio (both eyes averaged).
- The classifier labels come from the duration rules in `config.py`, so high accuracy shows the model learned those rules. It is not an independent test.
- If the model file is missing, the site falls back to the same fixed thresholds.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render, create **New → Web Service** and connect the repository.
3. Select **Python** as the runtime.
4. Set the build command to `pip install -r requirements.txt`.
5. Set the start command to `gunicorn app:app --bind 0.0.0.0:$PORT`.
6. Choose a plan and deploy. Open the generated HTTPS URL and allow camera access.

The browser camera API requires HTTPS in production (Render provides an HTTPS URL). The app loads MediaPipe assets from public CDNs, so the visitor's browser needs internet access. The sample-recording endpoint writes to the server's local filesystem; on free hosting, that storage may be temporary and should not be treated as permanent dataset storage.
