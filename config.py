"""Single source of truth for every threshold (seconds). The web app reads these via /api/config."""
DOT_MAX = 0.50        # blink shorter than this  -> dot
DASH_MAX = 1.20       # up to this               -> dash, longer -> backspace
PAUSE_AT = 2.50       # eyes closed this long    -> pause the system
MIN_BLINK = 0.10      # shorter closures are camera noise, ignored
LETTER_GAP = 1.20     # open-eye pause  -> letter finished
WORD_GAP = 3.00       # open-eye pause  -> word finished (space + spoken)
DOUBLE_BLINK_WINDOW = 1.5   # two blinks within this time start the system
LABELS = ["dot", "dash", "backspace"]
DATA_FILE = "blink_data.csv"
MODEL_FILE = "blink_models.pkl"

def label_of(d: float) -> int:
    return 0 if d <= DOT_MAX else 1 if d <= DASH_MAX else 2
