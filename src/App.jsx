import React, { useEffect, useMemo, useRef, useState } from "react";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const addRoundedRectPath = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

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

function makeSpiralOrder(tileN, direction = "outside-in", seed = 1) {
  const order = [];
  let top = 0;
  let bottom = tileN - 1;
  let left = 0;
  let right = tileN - 1;

  while (top <= bottom && left <= right) {
    for (let x = left; x <= right; x++) order.push(top * tileN + x);
    for (let y = top + 1; y <= bottom; y++) order.push(y * tileN + right);
    if (top < bottom) {
      for (let x = right - 1; x >= left; x--) order.push(bottom * tileN + x);
    }
    if (left < right) {
      for (let y = bottom - 1; y > top; y--) order.push(y * tileN + left);
    }
    top += 1;
    bottom -= 1;
    left += 1;
    right -= 1;
  }

  const baseOrder = direction === "inside-out" ? order.slice().reverse() : order;
  const rotation = baseOrder.length ? seed % baseOrder.length : 0;
  return baseOrder.slice(rotation).concat(baseOrder.slice(0, rotation));
}

function makeSegmentOrder(segments, seed = 1) {
  return makeRandomOrder(segments, seed);
}

function createRng(seed = 1) {
  let s = seed >>> 0;
  return () => (s = (1664525 * s + 1013904223) >>> 0) / 2 ** 32;
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
  const [revealMode, setRevealMode] = useState("GRID_RANDOM");
  const [spiralDirection, setSpiralDirection] = useState("outside-in");
  const [wedgeSegments, setWedgeSegments] = useState(18);
  const [stepsTotal, setStepsTotal] = useState(20);
  const [stepIndex, setStepIndex] = useState(0);
  const [disturb, setDisturb] = useState(10); // 0..10 pixelation strength
  const [showHud, setShowHud] = useState(true);

  const tileCount = tileN * tileN;
  const canStart = files.length > 0;

  const revealDurationMs = 420;
  const lastStepRef = useRef({ index: 0, time: 0 });

  // reveal order per round
  const [seed, setSeed] = useState(1);
  const revealOrder = useMemo(() => {
    if (revealMode === "SPIRAL_GRID") {
      return makeSpiralOrder(tileN, spiralDirection, seed);
    }
    return makeRandomOrder(tileCount, seed);
  }, [tileN, tileCount, revealMode, spiralDirection, seed]);
  const wedgeOrder = useMemo(
    () => makeSegmentOrder(wedgeSegments, seed),
    [wedgeSegments, seed]
  );

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

  useEffect(() => {
    lastStepRef.current = { index: stepIndex, time: performance.now() };
  }, [stepIndex]);

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
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.max(1, Math.floor(w * dpr));
      const nextH = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

      const t = clamp(disturb / 10, 0, 1);
      const revealProgress = clamp(stepIndex / stepsTotal, 0, 1);

      // Pixelation: render downscaled then upscale nearest-neighbor
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
      // Reveal mask (mode-specific)
      ctx.beginPath();

      const tilesToShow = Math.floor((stepIndex / stepsTotal) * tileCount);
      const prevTiles = Math.floor((Math.max(stepIndex - 1, 0) / stepsTotal) * tileCount);
      const incomingTiles = Math.max(tilesToShow - prevTiles, 0);
      const { time: lastStepTime } = lastStepRef.current;
      const stepProgress = clamp((performance.now() - lastStepTime) / revealDurationMs, 0, 1);
      const easedProgress = 1 - (1 - stepProgress) ** 3;

      const randForTile = (idx) => {
        const x = Math.sin((idx + seed * 131) * 12.9898) * 43758.5453;
        return x - Math.floor(x);
      };

      if (revealMode === "WEDGES_RADIAL") {
        const segmentsToShow = Math.floor((stepIndex / stepsTotal) * wedgeSegments);
        const prevSegments = Math.floor((Math.max(stepIndex - 1, 0) / stepsTotal) * wedgeSegments);
        const incomingSegments = Math.max(segmentsToShow - prevSegments, 0);
        const revealSegments = Math.max(segmentsToShow, 0);
        const centerX = dx + dw / 2;
        const centerY = dy + dh / 2;
        const radius = Math.max(dw, dh) * 0.6;
        const baseRng = createRng(seed * 173 + wedgeSegments);
        const angleOffset = baseRng() * Math.PI * 2;
        const segmentAngle = (Math.PI * 2) / wedgeSegments;

        for (let i = 0; i < revealSegments; i++) {
          const segIdx = wedgeOrder[i];
          const startAngle = angleOffset + segIdx * segmentAngle;
          const endAngle = startAngle + segmentAngle;
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, endAngle);
          ctx.closePath();
        }

        if (incomingSegments > 0 && stepProgress < 1) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = `rgba(120, 220, 255, ${0.35 * (1 - easedProgress)})`;
          for (let i = prevSegments; i < segmentsToShow; i++) {
            const segIdx = wedgeOrder[i];
            const startAngle = angleOffset + segIdx * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius * 1.02, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        const tileW = dw / tileN;
        const tileH = dh / tileN;

        for (let i = 0; i < prevTiles; i++) {
          const idx = revealOrder[i];
          const tx = idx % tileN;
          const ty = Math.floor(idx / tileN);
          const x0 = dx + tx * tileW;
          const y0 = dy + ty * tileH;
          const r = lerp(4, Math.min(tileW, tileH) * 0.3, randForTile(idx));
          addRoundedRectPath(ctx, x0, y0, tileW + 0.5, tileH + 0.5, r);
        }

        const popScale = lerp(0.25, 1.08, easedProgress);
        const rotScale = lerp(0.18, 0, easedProgress);

        for (let i = prevTiles; i < tilesToShow; i++) {
          const idx = revealOrder[i];
          const tx = idx % tileN;
          const ty = Math.floor(idx / tileN);
          const x0 = dx + tx * tileW;
          const y0 = dy + ty * tileH;
          const cx = x0 + tileW / 2;
          const cy = y0 + tileH / 2;
          const rand = randForTile(idx);
          const scale = popScale * (0.9 + rand * 0.2);
          const rot = (rand - 0.5) * rotScale;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          const w = tileW * scale;
          const h = tileH * scale;
          const r = lerp(6, Math.min(w, h) * 0.35, rand);
          addRoundedRectPath(ctx, -w * 0.5, -h * 0.5, w, h, r);
          ctx.restore();
        }
      }

      ctx.clip();

      const blurBase = lerp(0, 14, t);
      const blurPx = blurBase * lerp(1.0, 0.2, revealProgress);
      const canBlur = typeof ctx.filter === "string";

      if (canBlur && blurPx > 0.05) {
        ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
      }

      // Upscale (nearest)
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, dx, dy, dw, dh);

      if (canBlur) {
        ctx.filter = "none";
      }

      // Confetti overlay (noise)
      const noiseStrength = lerp(0.08, 0.45, t) * lerp(1, 0.2, revealProgress);
      if (noiseStrength > 0.01) {
        const rng = createRng(seed * 997 + stepIndex * 911);
        const area = dw * dh;
        const density = lerp(0.0008, 0.006, t) * lerp(1.0, 0.25, revealProgress);
        const count = Math.floor(area * density);
        for (let i = 0; i < count; i++) {
          const size = lerp(2, 6, rng());
          const x = dx + rng() * (dw - size);
          const y = dy + rng() * (dh - size);
          const r = Math.floor(80 + rng() * 175);
          const g = Math.floor(80 + rng() * 175);
          const b = Math.floor(80 + rng() * 175);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${noiseStrength})`;
          ctx.fillRect(x, y, size, size);
        }
      }

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
  }, [
    img,
    tileN,
    tileCount,
    revealOrder,
    wedgeOrder,
    revealMode,
    spiralDirection,
    wedgeSegments,
    stepIndex,
    stepsTotal,
    disturb,
    showHud,
    seed,
  ]);

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
                Aufdeckmodus
                <select
                  value={revealMode}
                  onChange={(e) => setRevealMode(e.target.value)}
                  style={{ minWidth: 220 }}
                >
                  <option value="GRID_RANDOM">Raster zufällig (GRID_RANDOM)</option>
                  <option value="WEDGES_RADIAL">Tortenstücke radial (WEDGES_RADIAL)</option>
                  <option value="SPIRAL_GRID">Spirale (SPIRAL_GRID)</option>
                </select>
              </label>

              {revealMode === "SPIRAL_GRID" && (
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  Spiralrichtung
                  <select
                    value={spiralDirection}
                    onChange={(e) => setSpiralDirection(e.target.value)}
                  >
                    <option value="outside-in">Außen → Innen</option>
                    <option value="inside-out">Innen → Außen</option>
                  </select>
                </label>
              )}

              <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                Störgrad (Pixelation, Blur, Konfetti)
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
                Rastergröße (Tiles)
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
                Schritte
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

              {revealMode === "WEDGES_RADIAL" && (
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  Segmente (Tortenstücke)
                  <input
                    type="number"
                    min="6"
                    max="36"
                    value={wedgeSegments}
                    onChange={(e) =>
                      setWedgeSegments(clamp(parseInt(e.target.value || "18", 10), 6, 36))
                    }
                    style={{ width: 80 }}
                  />
                </label>
              )}

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                HUD anzeigen
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
