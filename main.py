import argparse

def main():
    p = argparse.ArgumentParser(description="Assistive Morse blink communicator")
    p.add_argument("mode", choices=["prepare", "train", "plot", "serve"],
                   help="prepare = clean data, train = fit models, plot = report figures, serve = run website")
    mode = p.parse_args().mode
    if mode == "prepare":
        from src import prepare_data; prepare_data.run()
    elif mode == "train":
        from src import train_model; train_model.run()
    elif mode == "plot":
        import plot_analysis; plot_analysis.run()
    else:
        from app import app
        print("Open http://127.0.0.1:5000 in Chrome or Edge")
        app.run(host="127.0.0.1", port=5000)

if __name__ == "__main__":
    main()
