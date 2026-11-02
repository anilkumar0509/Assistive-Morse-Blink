const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const $ = id => document.getElementById(id);
const LEFT = [362, 385, 387, 263, 373, 380], RIGHT = [33, 160, 158, 133, 153, 144];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const eyeEar = (p, i) => (dist(p[i[1]], p[i[5]]) + dist(p[i[2]], p[i[4]])) / (2 * dist(p[i[0]], p[i[3]]) + 1e-6);

let cfg, landmarker, mode = "calibrating", thr = 0.2, openEar = 0.3;
let closedAt = null, lastBlinkEnd = null, firstBlinkAt = null, ignoreUntilOpen = false;
let seq = "", text = "", calib = [], calibStart = 0, lastVideoTime = -1;

function setMode(m) {
  mode = m;
  const label = { calibrating: "Calibrating: keep eyes open and look at the camera",
    idle: "Paused: blink twice quickly to start", active: "Listening" }[m];
  $("status").textContent = label;
  $("status").className = "status " + m;
}

function render() {
  const el = $("seq");
  el.innerHTML = seq ? [...seq].map(c => `<span class="${c === "." ? "dot" : "dash"}"></span>`).join("")
                     : `<span class="empty">${mode === "active" ? "Blink to begin a letter" : ""}</span>`;
  $("text").innerHTML = text.replace(/ /g, "&nbsp;") + '<span class="cursor"></span>';
  document.querySelectorAll("#chart div").forEach(d => {
    const hit = seq && d.dataset.code.startsWith(seq);
    d.classList.toggle("hit", !!hit && d.dataset.code === seq);
    d.classList.toggle("dim", !!seq && !hit);
  });
}

function buildChart() {
  $("chart").innerHTML = Object.entries(cfg.morse).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([code, ch]) => `<div data-code="${code}"><b>${ch}</b><span>${code.replace(/\./g, "·").replace(/-/g, "–")}</span></div>`).join("");
}

function speak(t) {
  if (!t.trim() || !$("voice").checked && t !== text) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(t));
}

async function classify(d) {
  try {
    const r = await fetch("/api/classify", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration: d }) });
    return (await r.json()).label;
  } catch { return d <= cfg.dot_max ? "dot" : d <= cfg.dash_max ? "dash" : "backspace"; }  // offline fallback
}

function commitLetter() {
  text += cfg.morse[seq] || "?";
  seq = "";
}
function commitWord() {
  if (!text || text.endsWith(" ")) return;
  const word = text.trim().split(" ").pop();
  text += " ";
  if ($("voice").checked) speak(word);
}

async function onBlink(d, now) {
  if (d < cfg.min_blink) return;
  if ($("collect").checked) {
    fetch("/api/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duration: d }) });
    $("hint").textContent = `Saved blink of ${d.toFixed(2)} s`;
    return;
  }
  if (mode === "idle") {                                   // double blink starts the system
    if (firstBlinkAt !== null && now - firstBlinkAt <= cfg.double_window) {
      firstBlinkAt = null; seq = ""; lastBlinkEnd = null; setMode("active");
    } else firstBlinkAt = now;
    render(); return;
  }
  lastBlinkEnd = now;
  const label = await classify(d);
  if (label === "dot") seq += ".";
  else if (label === "dash") seq += "-";
  else if (seq) seq = seq.slice(0, -1);
  else text = text.slice(0, -1);
  $("hint").textContent = `${d.toFixed(2)} s: ${label}`;
  render();
}

function onEar(e, now) {
  $("earBar").style.width = Math.min(100, e / (openEar * 1.4) * 100) + "%";
  $("earMark").style.left = Math.min(100, thr / (openEar * 1.4) * 100) + "%";
  if (mode === "calibrating") {
    if (!calibStart) calibStart = now;
    calib.push(e);
    if (now - calibStart >= 3) {
      calib.sort((a, b) => a - b);
      openEar = calib[Math.floor(calib.length * 0.6)];      // robust "eyes open" level
      thr = Math.min(0.3, Math.max(0.12, openEar * 0.75));
      setMode("idle"); render();
    }
    return;
  }
  const closed = e < thr;
  if (ignoreUntilOpen) { if (!closed) ignoreUntilOpen = false; return; }
  if (closed) {
    if (closedAt === null) closedAt = now;
    else if (mode === "active" && now - closedAt >= cfg.pause_at) {        // eyes held shut: pause
      closedAt = null; ignoreUntilOpen = true; lastBlinkEnd = null; seq = "";
      setMode("idle"); render();
    }
  } else if (closedAt !== null) {
    const d = now - closedAt; closedAt = null; onBlink(d, now);
  } else if (mode === "active" && lastBlinkEnd !== null) {                   // eyes open: measure the gap
    const gap = now - lastBlinkEnd;
    $("gapBar").style.width = Math.min(100, gap / cfg.word_gap * 100) + "%";
    if (seq && gap >= cfg.letter_gap) { commitLetter(); render(); }
    if (gap >= cfg.word_gap) { commitWord(); lastBlinkEnd = null; render(); }
  }
  if (lastBlinkEnd === null) $("gapBar").style.width = "0";
}

function loop() {
  const v = $("video");
  if (v.currentTime !== lastVideoTime) {
    lastVideoTime = v.currentTime;
    const res = landmarker.detectForVideo(v, performance.now());
    const now = performance.now() / 1000;
    if (res.faceLandmarks.length) {
      const p = res.faceLandmarks[0];
      onEar((eyeEar(p, LEFT) + eyeEar(p, RIGHT)) / 2, now);
      $("earText").textContent = "Eye openness";
    } else {
      closedAt = null;
      $("earText").textContent = "No face found. Move into view.";
    }
  }
  requestAnimationFrame(loop);
}

function startCalibration() { calib = []; calibStart = 0; closedAt = null; lastBlinkEnd = null; seq = ""; setMode("calibrating"); }

async function init() {
  cfg = await (await fetch("/api/config")).json();
  buildChart(); render();
  $("hint").textContent = cfg.model_ready ? "" : "No trained model found: using fixed thresholds. Run: python main.py train";
  const fail = msg => { $("status").textContent = msg; $("status").className = "status error"; };
  // Step 1: camera first, so the live video appears even if the face model cannot load
  try {
    if (!navigator.mediaDevices?.getUserMedia)
      return fail("Camera needs a secure page. Open http://127.0.0.1:5000 (not a file or network address).");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const v = $("video");
    v.srcObject = stream;
    await v.play();
    if (v.readyState < 2) await new Promise(r => v.addEventListener("loadeddata", r, { once: true }));
  } catch (err) {
    console.error(err);
    const why = { NotAllowedError: "Camera blocked. Click the camera icon in the address bar, choose Allow, then reload.",
      NotFoundError: "No camera found. Connect a webcam and reload.",
      NotReadableError: "Camera is in use by another app (Zoom, Teams, another tab). Close it and reload." }[err.name];
    return fail(why || "Camera error: " + err.name);
  }
  // Step 2: face model (needs internet on first load)
  $("status").textContent = "Camera on. Loading face model...";
  try {
    const { FaceLandmarker, FilesetResolver } = await import(MP);
    const fileset = await FilesetResolver.forVisionTasks(MP + "/wasm");
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
      runningMode: "VIDEO", numFaces: 1 });
  } catch (err) {
    console.error(err);
    return fail("Camera works, but the face model could not load. Check your internet connection and reload.");
  }
  startCalibration(); loop();
}

$("calibrate").onclick = startCalibration;
$("speak").onclick = () => speak(text);
$("clear").onclick = () => { text = ""; seq = ""; lastBlinkEnd = null; render(); };
// Browsers only allow speech after the page has been touched once
addEventListener("pointerdown", () => speechSynthesis.getVoices(), { once: true });
init();
