import React, { useEffect, useMemo, useRef, useState } from "react";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Reveal order helper (grid tiles random)
function makeRandomOrder(tileCount, seed = 1) {
  // simple deterministic RNG (LCG)
  let s = seed >>> 0;
  const rnd = () => (s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32;

  const arr = Array.from({ length: tileCount }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pointsForStep(stepIndex, stepsTotal, maxPoints = 20) {
  // early = more points
  const t = stepIndex / Math.max(stepsTotal - 1, 1);
  const pts = Math.round(lerp(maxPoints, 1, t));
  return clamp(pts, 1, maxPoints);
}

export default function App() {
  const canvasRef = useRef(null);
  const offscreenRef = useRef(null);

  const [files, setFiles] = useState([]); // {name, url}
  const [current, setCurrent] = useState(0);
  const [img, setImg] = useState(null);
  const [isGameActive, setIsGameActive] = useState(false);

  const [teams, setTeams] = useState([
    { name: "A", score: 0 },
    { name: "B", score: 0 },
  ]);

  // settings
  const [tileN, setTileN] = useState(18); // grid size per axis
  const [stepsTotal, setStepsTotal] = useState(20);
  const [stepIndex, setStepIndex] = useState(0);
  const [disturb, setDisturb] = useState(6); // 0..10 pixelation strength
  const [showHud, setShowHud] = useState(true);

  const tileCount = tileN * tileN;
  const canStart = files.length > 0;

  // reveal order per round
  const [seed, setSeed] = useState(1);
  const revealOrder = useMemo(() => makeRandomOrder(tileCount, seed), [tileCount, seed]);

  // load image when current changes
  useEffect(() => {
    const f = files[current];
    if (!f) {
      setImg(null);
      return;
    }
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = f.url;
  }, [files, current]);

  // cleanup object URLs
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextStep = () => setStepIndex((s) => clamp(s + 1, 0, stepsTotal));
  const prevStep = () => setStepIndex((s) => clamp(s - 1, 0, stepsTotal));
  const resetRound = () => {
    setStepIndex(0);
    setSeed((x) => x + 1);
  };
  const nextImage = () => {
    if (!files.length) return;
    setCurrent((c) => (c + 1) % files.length);
    resetRound();
  };

  const awardTeam = (teamIdx) => {
    const pts = pointsForStep(stepIndex, stepsTotal, 20);
    setTeams((t) =>
      t.map((x, i) => (i === teamIdx ? { ...x, score: x.score + pts } : x))
    );
    nextImage();
  };

  // keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (!isGameActive) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        nextStep();
      } else if (e.key.toLowerCase() === "n") {
        nextImage();
      } else if (e.key.toLowerCase() === "r") {
        resetRound();
      } else if (e.key.toLowerCase() === "f") {
        const el = document.documentElement;
        if (!document.fullscreenElement) el.requestFullscreen?.();
        else document.exitFullscreen?.();
      } else {
        // A,B,C... awarding
        const k = e.key.toUpperCase();
        const idx = k.charCodeAt(0) - 65;
        if (idx >= 0 && idx < teams.length) awardTeam(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length, stepIndex, stepsTotal, files.length, isGameActive]);

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // offscreen canvas for pixelation
    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const off = offscreenRef.current;
    const offCtx = off.getContext("2d");

    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, w, h);

      if (!img) {
        ctx.fillStyle = "#ddd";
        ctx.font = "20px system-ui";
        ctx.fillText("Bilder laden, dann Space drücken …", 20, 40);
        return;
      }

      // fit image into canvas (contain)
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.min(w / iw, h / ih);
      const dw = Math.round(iw * scale);
      const dh = Math.round(ih * scale);
      const dx = Math.round((w - dw) / 2);
      const dy = Math.round((h - dh) / 2);

      // Pixelation: render downscaled then upscale nearest-neighbor
      const t = clamp(disturb / 10, 0, 1);
      const pixelScale = lerp(1.0, 0.05, t); // 1.0 -> sharp, 0.05 -> very pixelated
      const pw = Math.max(1, Math.floor(dw * pixelScale));
      const ph = Math.max(1, Math.floor(dh * pixelScale));

      off.width = pw;
      off.height = ph;
      offCtx.imageSmoothingEnabled = true;
      offCtx.clearRect(0, 0, pw, ph);
      // draw original into small offscreen
      offCtx.drawImage(img, 0, 0, pw, ph);

      ctx.save();
      // Reveal mask (grid tiles)
      ctx.beginPath();
      const tileW = dw / tileN;
      const tileH = dh / tileN;

      const tilesToShow = Math.floor((stepIndex / stepsTotal) * tileCount);

      for (let i = 0; i < tilesToShow; i++) {
        const idx = revealOrder[i];
        const tx = idx % tileN;
        const ty = Math.floor(idx / tileN);
        const x0 = dx + tx * tileW;
        const y0 = dy + ty * tileH;
        ctx.rect(x0, y0, tileW + 0.5, tileH + 0.5);
      }

      ctx.clip();

      // Upscale (nearest)
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, dx, dy, dw, dh);
      ctx.restore();

      // HUD
      if (showHud) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(10, 10, 280, 90);
        ctx.fillStyle = "#fff";
        ctx.font = "16px system-ui";
        const pts = pointsForStep(stepIndex, stepsTotal, 20);
        ctx.fillText(`Step: ${stepIndex}/${stepsTotal}`, 20, 35);
        ctx.fillText(`Aktuelle Punkte: ${pts}`, 20, 58);
        ctx.fillText(`Keys: Space | A/B/... | N | R | F`, 20, 81);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [img, tileN, tileCount, revealOrder, stepIndex, stepsTotal, disturb, showHud]);

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const mapped = picked.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setFiles(mapped);
    setCurrent(0);
    setSeed((x) => x + 1);
    setStepIndex(0);
  };

  const addTeam = () => {
    const nextLetter = String.fromCharCode(65 + teams.length);
    setTeams((t) => [...t, { name: nextLetter, score: 0 }]);
  };
  const resetScores = () => setTeams((t) => t.map((x) => ({ ...x, score: 0 })));

  if (!isGameActive) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#0b0b0b",
          color: "#fff",
        }}
      >
        <header
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 16,
            background: "#0f0f0f",
            borderBottom: "1px solid #222",
          }}
        >
          <strong>Dalli Klick Modern</strong>
          <span style={{ color: "#aaa" }}>Startbildschirm</span>
        </header>
        <main
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(900px, 100%)",
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: 24,
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 26 }}>Spiel vorbereiten</h1>
              <p style={{ margin: "8px 0 0", color: "#bbb" }}>
                Lade zuerst die Bilder und lege die Spielregeln fest. Danach startest du den
                Spielmodus.
              </p>
            </div>

            <section style={{ display: "grid", gap: 12 }}>
              <strong>Bilder</strong>
              <input type="file" accept="image/*" multiple onChange={onPickFiles} />
              <span style={{ color: "#bbb" }}>
                {files.length ? `${files.length} Bilder geladen.` : "Noch keine Bilder ausgewählt."}
              </span>
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <strong>Konfiguration</strong>
              <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                Störgrad
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={disturb}
                  onChange={(e) => setDisturb(parseInt(e.target.value, 10))}
                />
                {disturb}
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Grid
                <input
                  type="number"
                  min="6"
                  max="40"
                  value={tileN}
                  onChange={(e) =>
                    setTileN(clamp(parseInt(e.target.value || "18", 10), 6, 40))
                  }
                  style={{ width: 80 }}
                />
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Steps
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={stepsTotal}
                  onChange={(e) =>
                    setStepsTotal(clamp(parseInt(e.target.value || "20", 10), 5, 80))
                  }
                  style={{ width: 80 }}
                />
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                HUD
                <input
                  type="checkbox"
                  checked={showHud}
                  onChange={(e) => setShowHud(e.target.checked)}
                />
              </label>
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <strong>Teams</strong>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={addTeam}>+ Team</button>
                <button onClick={resetScores}>Punkte löschen</button>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {teams.map((t) => (
                  <div
                    key={t.name}
                    style={{
                      padding: "8px 12px",
                      background: "#151515",
                      borderRadius: 8,
                    }}
                  >
                    <b>{t.name}</b>: {t.score}
                  </div>
                ))}
              </div>
              <span style={{ color: "#888" }}>
                Punkte werden im Spielmodus vergeben (Taste A/B/…).
              </span>
            </section>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => setIsGameActive(true)} disabled={!canStart}>
                Spiel starten
              </button>
              {!canStart && <span style={{ color: "#888" }}>Bitte erst Bilder laden.</span>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 12,
          background: "#0f0f0f",
          color: "#fff",
          borderBottom: "1px solid #222",
          flexWrap: "wrap",
        }}
      >
        <strong>Dalli Klick Modern</strong>

        <button onClick={prevStep}>◀ Schritt</button>
        <button onClick={nextStep}>Schritt ▶ (Space)</button>
        <button onClick={nextImage}>Nächstes Bild (N)</button>
        <button onClick={resetRound}>Runde reset (R)</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {teams.map((t, i) => (
            <div key={t.name} style={{ padding: "6px 10px", background: "#151515", borderRadius: 8 }}>
              <b>{t.name}</b>: {t.score}{" "}
              <button onClick={() => awardTeam(i)} style={{ marginLeft: 8 }}>
                + (Taste {t.name})
              </button>
            </div>
          ))}
        </div>
      </header>

      <div style={{ position: "relative", background: "#111" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
}
