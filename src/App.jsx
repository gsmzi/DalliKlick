import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { bilderList } from "virtual:bilder-list";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Dictionary mapping image names to German solution terms
const GERMAN_IMAGE_TRANSLATIONS = {
  acoustic_guitar: "Akustikgitarre",
  airplane: "Flugzeug",
  alarm_clock: "Wecker",
  blue_bicycle: "Blaues Fahrrad",
  brick_house: "Backsteinhaus",
  coffee_mug: "Kaffeetasse",
  aurora: "Polarlichter (Aurora)",
  balloons: "Luftballons",
  butterfly: "Schmetterling",
  car: "Oldtimer / Auto",
  castle: "Schloss Neuschwanstein",
  chameleon: "Chamäleon",
  christ_redeemer: "Christusstatue (Rio de Janeiro)",
  coral: "Korallenriff",
  dog: "Hund (Welpe)",
  dragon: "Drache",
  eagle: "Adler",
  eiffel: "Eiffelturm (Paris)",
  hot_air_balloon: "Heißluftballon",
  ocean_island: "Südseeinsel",
  sunrise_city: "Skyline bei Sonnenaufgang",
  giza_pyramids: "Pyramiden von Gizeh",
  golden_gate: "Golden Gate Bridge (San Francisco)",
  great_wall: "Chinesische Mauer",
  havana: "Havanna (Oldtimer Kuba)",
  kitten: "Kätzchen",
  lavender_balloon: "Heißluftballon über Lavendelfeld",
  library: "Bibliothek",
  lighthouse_cliff: "Leuchtturm an der Steilküste",
  machu_picchu: "Machu Picchu (Peru)",
  moon: "Mond im Weltall",
  oasis: "Wüstenoase",
  pizza: "Pizza",
  red_squirrel: "Eichhörnchen",
  rome_colosseum: "Kolosseum (Rom)",
  space: "Weltall / Universum",
  statue_liberty: "Freiheitsstatue (New York)",
  steam_locomotive: "Dampflokomotive",
  stonehenge: "Stonehenge",
  submarine: "U-Boot",
  sydney_opera: "Opernhaus Sydney",
  taj_mahal: "Taj Mahal",
  train: "Zug / Eisenbahn",
  village: "Malerisches Bergdorf",
  waterfall: "Wasserfall",
  wise_owl: "Eule",
  fluffy_rabbit: "Flauschiger Hase",
  golden_retriever: "Golden Retriever",
  oak_tree: "Eichenbaum",
  open_book: "Aufgeschlagenes Buch",
  red_apple: "Roter Apfel",
  soccer_ball: "Fußball",
  tabby_cat: "Getigerte Katze",
  yellow_car: "Gelbes Auto",
  yellow_sunflower: "Sonnenblume",
};

const GERMAN_WORD_TRANSLATIONS = {
  guitar: "Gitarre",
  acoustic: "Akustik",
  airplane: "Flugzeug",
  plane: "Flugzeug",
  alarm: "Wecker",
  clock: "Uhr",
  bicycle: "Fahrrad",
  bike: "Fahrrad",
  house: "Haus",
  brick: "Backstein",
  coffee: "Kaffee",
  mug: "Tasse",
  cup: "Tasse",
  balloons: "Luftballons",
  balloon: "Ballon",
  butterfly: "Schmetterling",
  car: "Auto",
  castle: "Schloss",
  palace: "Palast",
  dog: "Hund",
  puppy: "Welpe",
  cat: "Katze",
  kitten: "Kätzchen",
  dragon: "Drache",
  eagle: "Adler",
  bird: "Vogel",
  ocean: "Ozean",
  sea: "Meer",
  island: "Insel",
  beach: "Strand",
  sunrise: "Sonnenaufgang",
  sunset: "Sonnenuntergang",
  city: "Stadt",
  skyline: "Skyline",
  pyramid: "Pyramide",
  pyramids: "Pyramiden",
  bridge: "Brücke",
  wall: "Mauer",
  lavender: "Lavendel",
  library: "Bibliothek",
  lighthouse: "Leuchtturm",
  cliff: "Klippe",
  moon: "Mond",
  sun: "Sonne",
  star: "Stern",
  space: "Weltall",
  squirrel: "Eichhörnchen",
  locomotive: "Lokomotive",
  train: "Zug",
  village: "Dorf",
  mountain: "Berg",
  mountains: "Berge",
  waterfall: "Wasserfall",
  owl: "Eule",
  rabbit: "Hase",
  bunny: "Häschen",
  tree: "Baum",
  forest: "Wald",
  book: "Buch",
  apple: "Apfel",
  soccer: "Fußball",
  football: "Fußball",
  ball: "Ball",
  sunflower: "Sonnenblume",
  flower: "Blume",
  flowers: "Blumen",
  red: "Rot",
  blue: "Blau",
  yellow: "Gelb",
  green: "Grün",
  white: "Weiß",
  black: "Schwarz",
  golden: "Gold",
  big: "Groß",
  small: "Klein",
};

// Helper to format image names cleanly in German
export function formatImageName(name) {
  if (!name) return "";
  let key = name.replace(/\.[^/.]+$/, "");
  key = key.replace(/_\d{10,}$/, "");
  key = key.replace(/^dalli_/i, "");
  key = key.replace(/^dalli_generated_/i, "");
  key = key.toLowerCase().trim();

  // Direct match in German translations
  if (GERMAN_IMAGE_TRANSLATIONS[key]) {
    return GERMAN_IMAGE_TRANSLATIONS[key];
  }

  // Tokenized word-level German mapping
  const words = key.split(/[_-]+/).filter(Boolean);
  if (words.length === 0) return name;

  const translatedWords = words.map((w) => {
    const lower = w.toLowerCase();
    if (GERMAN_WORD_TRANSLATIONS[lower]) {
      return GERMAN_WORD_TRANSLATIONS[lower];
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return translatedWords.join(" ");
}

const addRoundedRectPath = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

function makeRandomOrder(tileCount, seed = 1) {
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
    bottom += 1;
    left += 1;
    right += 1;
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
  const t = stepIndex / Math.max(stepsTotal - 1, 1);
  const pts = Math.round(lerp(maxPoints, 1, t));
  return clamp(pts, 1, maxPoints);
}

const SYNC_CHANNEL = "dalliklick_sync_channel";
const STORAGE_KEY = "dalliklick_sync_state";

export default function App() {
  const isControllerWindow =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("role") === "controller";

  const canvasRef = useRef(null);
  const offscreenRef = useRef(null);
  const fileInputRef = useRef(null);
  const startScreenFileInputRef = useRef(null);
  const channelRef = useRef(null);
  const childWindowRef = useRef(null);

  const defaultImagesCount = (bilderList || []).length;

  const [files, setFiles] = useState(() => {
    return (bilderList || []).map((name) => ({
      name,
      url: `./bilder/${name}`,
      isDefault: true,
    }));
  });

  const [current, setCurrent] = useState(0);
  const [img, setImg] = useState(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [hasStartedBefore, setHasStartedBefore] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showCheatPopover, setShowCheatPopover] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [syncStatus, setSyncStatus] = useState("connected");

  const [teams, setTeams] = useState([
    { name: "A", score: 0 },
    { name: "B", score: 0 },
  ]);

  // settings
  const [tileN, setTileN] = useState(18);
  const [revealMode, setRevealMode] = useState("GRID_RANDOM");
  const [spiralDirection, setSpiralDirection] = useState("outside-in");
  const [wedgeSegments, setWedgeSegments] = useState(18);
  const [stepsTotal, setStepsTotal] = useState(20);
  const [stepIndex, setStepIndex] = useState(0);
  const [disturb, setDisturb] = useState(10);
  const [showHud, setShowHud] = useState(true);
  const [lastAward, setLastAward] = useState(null);
  const [seed, setSeed] = useState(1);

  const tileCount = tileN * tileN;
  const canStart = files.length > 0;

  const isUsingDefaultOnly = useMemo(() => {
    return files.length === defaultImagesCount && files.every((f) => f.isDefault);
  }, [files, defaultImagesCount]);

  const revealDurationMs = 420;
  const lastStepRef = useRef({ index: 0, time: 0 });

  const currentFile = files[current] || null;
  const nextFile = files.length > 1 ? files[(current + 1) % files.length] : null;

  const currentSolutionName = currentFile ? formatImageName(currentFile.name) : "";
  const nextSolutionName = nextFile ? formatImageName(nextFile.name) : "";

  // State ref to provide fresh state across bridge / listeners without stale closures
  const stateRef = useRef({});
  stateRef.current = {
    current,
    stepIndex,
    stepsTotal,
    teams,
    lastAward,
    revealMode,
    spiralDirection,
    wedgeSegments,
    disturb,
    tileN,
    showHud,
    isGameActive,
    hasStartedBefore,
    seed,
    files,
  };

  // Helper to apply incoming state update
  const applyRemoteState = useCallback((remoteState) => {
    if (!remoteState) return;
    if (typeof remoteState.current === "number") setCurrent(remoteState.current);
    if (typeof remoteState.stepIndex === "number") setStepIndex(remoteState.stepIndex);
    if (typeof remoteState.stepsTotal === "number") setStepsTotal(remoteState.stepsTotal);
    if (Array.isArray(remoteState.teams)) setTeams(remoteState.teams);
    if (remoteState.lastAward !== undefined) setLastAward(remoteState.lastAward);
    if (remoteState.revealMode) setRevealMode(remoteState.revealMode);
    if (remoteState.spiralDirection) setSpiralDirection(remoteState.spiralDirection);
    if (typeof remoteState.wedgeSegments === "number") setWedgeSegments(remoteState.wedgeSegments);
    if (typeof remoteState.disturb === "number") setDisturb(remoteState.disturb);
    if (typeof remoteState.tileN === "number") setTileN(remoteState.tileN);
    if (typeof remoteState.showHud === "boolean") setShowHud(remoteState.showHud);
    if (typeof remoteState.isGameActive === "boolean") setIsGameActive(remoteState.isGameActive);
    if (typeof remoteState.hasStartedBefore === "boolean") setHasStartedBefore(remoteState.hasStartedBefore);
    if (typeof remoteState.seed === "number") setSeed(remoteState.seed);
    if (Array.isArray(remoteState.files) && remoteState.files.length > 0) setFiles(remoteState.files);
    setSyncStatus("connected");
  }, []);

  // Multi-layer broadcast function
  const publishSync = useCallback((type = "ACTION_EXECUTE") => {
    const currentState = stateRef.current;
    const fullPayload = { type, state: currentState, timestamp: Date.now() };

    // 1. Direct window bridge
    try {
      if (isControllerWindow && window.opener && window.opener.__dalliMainUpdate) {
        window.opener.__dalliMainUpdate(currentState);
      }
      if (!isControllerWindow && childWindowRef.current && !childWindowRef.current.closed && childWindowRef.current.__dalliControllerUpdate) {
        childWindowRef.current.__dalliControllerUpdate(currentState);
      }
    } catch (e) {}

    // 2. window.postMessage with targetOrigin = "*"
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "DALLI_SYNC_MSG", payload: fullPayload }, "*");
      }
      if (childWindowRef.current && !childWindowRef.current.closed) {
        childWindowRef.current.postMessage({ type: "DALLI_SYNC_MSG", payload: fullPayload }, "*");
      }
    } catch (e) {}

    // 3. BroadcastChannel
    try {
      if (channelRef.current) {
        channelRef.current.postMessage(fullPayload);
      }
    } catch (e) {}

    // 4. localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {}
  }, [isControllerWindow]);

  // Set up Direct JS Bridge on window objects
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isControllerWindow) {
      window.__dalliControllerUpdate = (newState) => {
        applyRemoteState(newState);
      };
      try {
        if (window.opener && window.opener.__dalliRegisterController) {
          window.opener.__dalliRegisterController(window);
        }
      } catch (e) {}
    } else {
      window.__dalliMainUpdate = (newState) => {
        applyRemoteState(newState);
      };
      window.__dalliRegisterController = (controllerWin) => {
        childWindowRef.current = controllerWin;
        try {
          if (controllerWin.__dalliControllerUpdate) {
            controllerWin.__dalliControllerUpdate(stateRef.current);
          }
        } catch (e) {}
      };
    }
  }, [isControllerWindow, applyRemoteState]);

  // Initialize sync channels, postMessage & storage listeners
  useEffect(() => {
    if (isControllerWindow) {
      try {
        if (window.opener && window.opener.__dalliMainGetState) {
          const s = window.opener.__dalliMainGetState();
          if (s) applyRemoteState(s);
        }
      } catch (e) {}

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          applyRemoteState(parsed);
        }
      } catch (e) {}
    } else {
      window.__dalliMainGetState = () => stateRef.current;
    }

    let ch = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        ch = new BroadcastChannel(SYNC_CHANNEL);
        channelRef.current = ch;

        ch.onmessage = (event) => {
          const data = event.data || {};
          if (data.type === "REQUEST_STATE") {
            if (!isControllerWindow) {
              ch.postMessage({ type: "STATE_SYNC", state: stateRef.current });
            }
          } else if (data.state) {
            applyRemoteState(data.state);
          }
        };

        if (isControllerWindow) {
          ch.postMessage({ type: "REQUEST_STATE" });
        }
      } catch (e) {}
    }

    const onWindowMessage = (e) => {
      if (e.data && e.data.type === "DALLI_SYNC_MSG" && e.data.payload) {
        if (e.data.payload.state) {
          applyRemoteState(e.data.payload.state);
        }
      }
    };
    window.addEventListener("message", onWindowMessage);

    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyRemoteState(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", onStorage);

    let interval = null;
    if (isControllerWindow) {
      interval = setInterval(() => {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "DALLI_SYNC_PING" }, "*");
            if (window.opener.__dalliMainGetState) {
              applyRemoteState(window.opener.__dalliMainGetState());
            }
          } else if (ch) {
            ch.postMessage({ type: "REQUEST_STATE" });
          }
        } catch (e) {}
      }, 1000);
    }

    return () => {
      if (ch) ch.close();
      window.removeEventListener("message", onWindowMessage);
      window.removeEventListener("storage", onStorage);
      if (interval) clearInterval(interval);
    };
  }, [isControllerWindow, applyRemoteState]);

  // Sync state changes from main window to storage & channels
  useEffect(() => {
    if (!isControllerWindow) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch (e) {}
      publishSync("STATE_UPDATE");
    }
  }, [
    current,
    stepIndex,
    stepsTotal,
    teams,
    lastAward,
    revealMode,
    spiralDirection,
    wedgeSegments,
    disturb,
    tileN,
    showHud,
    isGameActive,
    hasStartedBefore,
    seed,
    files,
    isControllerWindow,
    publishSync,
  ]);

  // Reveal orders
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
      files.forEach((f) => {
        if (!f.isDefault && f.url) {
          URL.revokeObjectURL(f.url);
        }
      });
    };
  }, []);

  // Action Handlers
  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      const nextVal = clamp(prev + 1, 0, stepsTotal);
      stateRef.current.stepIndex = nextVal;
      publishSync("ACTION_NEXT_STEP");
      return nextVal;
    });
  }, [stepsTotal, publishSync]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => {
      const nextVal = clamp(prev - 1, 0, stepsTotal);
      stateRef.current.stepIndex = nextVal;
      publishSync("ACTION_PREV_STEP");
      return nextVal;
    });
  }, [stepsTotal, publishSync]);

  const solveRound = useCallback(() => {
    setStepIndex(stepsTotal);
    stateRef.current.stepIndex = stepsTotal;
    publishSync("ACTION_SOLVE");
  }, [stepsTotal, publishSync]);

  const resetRound = useCallback(() => {
    setStepIndex(0);
    setSeed((x) => x + 1);
    setLastAward(null);
    stateRef.current.stepIndex = 0;
    stateRef.current.seed += 1;
    stateRef.current.lastAward = null;
    publishSync("ACTION_RESET_ROUND");
  }, [publishSync]);

  const nextImage = useCallback(() => {
    if (!files.length) return;
    const nextIdx = (current + 1) % files.length;
    setCurrent(nextIdx);
    setStepIndex(0);
    setSeed((x) => x + 1);
    setLastAward(null);

    stateRef.current.current = nextIdx;
    stateRef.current.stepIndex = 0;
    stateRef.current.seed += 1;
    stateRef.current.lastAward = null;
    publishSync("ACTION_NEXT_IMAGE");
  }, [current, files.length, publishSync]);

  const selectImage = useCallback((idx) => {
    setCurrent(idx);
    setStepIndex(0);
    setSeed((x) => x + 1);
    setLastAward(null);
    setHasStartedBefore(true);

    stateRef.current.current = idx;
    stateRef.current.stepIndex = 0;
    stateRef.current.seed += 1;
    stateRef.current.lastAward = null;
    stateRef.current.hasStartedBefore = true;
    publishSync("ACTION_SET_IMAGE");
  }, [publishSync]);

  const awardTeam = useCallback((teamIdx) => {
    const pts = pointsForStep(stepIndex, stepsTotal, 20);
    const stepBefore = stepIndex;
    const awardObj = { teamIdx, pts, stepIndexBefore: stepBefore };
    setLastAward(awardObj);

    const updatedTeams = teams.map((x, i) =>
      i === teamIdx ? { ...x, score: x.score + pts, _lastAward: Date.now() } : x
    );
    setTeams(updatedTeams);
    setStepIndex(stepsTotal);

    stateRef.current.lastAward = awardObj;
    stateRef.current.teams = updatedTeams;
    stateRef.current.stepIndex = stepsTotal;
    publishSync("ACTION_AWARD_TEAM");
  }, [stepIndex, stepsTotal, teams, publishSync]);

  const undoLastAward = useCallback(() => {
    if (!lastAward) return;
    const la = lastAward;
    const updatedTeams = teams.map((x, i) =>
      i === la.teamIdx ? { ...x, score: x.score - la.pts, _lastAward: Date.now() } : x
    );
    setTeams(updatedTeams);
    setStepIndex(la.stepIndexBefore);
    setLastAward(null);

    stateRef.current.teams = updatedTeams;
    stateRef.current.stepIndex = la.stepIndexBefore;
    stateRef.current.lastAward = null;
    publishSync("ACTION_UNDO_AWARD");
  }, [lastAward, teams, publishSync]);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (!isGameActive && !isControllerWindow) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        nextStep();
      } else if (e.key.toLowerCase() === "n") {
        nextImage();
      } else if (e.key.toLowerCase() === "r") {
        resetRound();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "l") {
        solveRound();
      } else if (e.key.toLowerCase() === "s") {
        setShowCheatPopover((prev) => !prev);
      } else if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
        undoLastAward();
      } else {
        const k = e.key.toUpperCase();
        const idx = k.charCodeAt(0) - 65;
        if (idx >= 0 && idx < teams.length) awardTeam(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isGameActive,
    isControllerWindow,
    nextStep,
    nextImage,
    resetRound,
    toggleFullscreen,
    solveRound,
    undoLastAward,
    awardTeam,
    teams.length,
  ]);

  useEffect(() => {
    lastStepRef.current = { index: stepIndex, time: performance.now() };
  }, [stepIndex]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isControllerWindow) return;
    const ctx = canvas.getContext("2d");

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

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.min(w / iw, h / ih);
      const dw = Math.round(iw * scale);
      const dh = Math.round(ih * scale);
      const dx = Math.round((w - dw) / 2);
      const dy = Math.round((h - dh) / 2);

      const t = clamp(disturb / 10, 0, 1);
      const revealProgress = clamp(stepIndex / stepsTotal, 0, 1);
      const revealFade = 1 - revealProgress;

      const basePixelScale = lerp(1.0, 0.05, t);
      const pixelScale = lerp(1.0, basePixelScale, revealFade);
      const pw = Math.max(1, Math.floor(dw * pixelScale));
      const ph = Math.max(1, Math.floor(dh * pixelScale));

      off.width = pw;
      off.height = ph;
      offCtx.imageSmoothingEnabled = true;
      offCtx.clearRect(0, 0, pw, ph);
      offCtx.drawImage(img, 0, 0, pw, ph);

      ctx.save();
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
      const blurPx = blurBase * revealFade;
      const canBlur = typeof ctx.filter === "string";

      if (canBlur && blurPx > 0.05) {
        ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, dx, dy, dw, dh);

      if (canBlur) {
        ctx.filter = "none";
      }

      const noiseStrength = lerp(0.08, 0.45, t) * revealFade;
      if (noiseStrength > 0.01) {
        const rng = createRng(seed * 997 + stepIndex * 911);
        const area = dw * dh;
        const density = lerp(0.0008, 0.006, t) * revealFade;
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

      if (showHud) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(14, 14, 290, 92, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px system-ui";
        const pts = pointsForStep(stepIndex, stepsTotal, 20);
        ctx.fillText(`Schritt: ${stepIndex} / ${stepsTotal}`, 26, 38);
        ctx.fillStyle = "#4ade80";
        ctx.fillText(`Aktuelle Punkte: ${pts} Pkt`, 26, 62);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px system-ui";
        ctx.fillText(`Space: Weiter | A/B: Punkte | L: Lösen`, 26, 86);
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
    isControllerWindow,
  ]);

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const mapped = picked.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      isDefault: false,
    }));
    setFiles(mapped);
    setCurrent(0);
    setSeed((x) => x + 1);
    setStepIndex(0);
    setHasStartedBefore(false);
    e.target.value = null;

    stateRef.current.files = mapped;
    stateRef.current.current = 0;
    stateRef.current.stepIndex = 0;
    stateRef.current.hasStartedBefore = false;
    publishSync("ACTION_EXECUTE");
  };

  const onAddFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const mapped = picked.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      isDefault: false,
    }));
    const updated = [...files, ...mapped];
    setFiles(updated);
    e.target.value = null;

    stateRef.current.files = updated;
    publishSync("ACTION_EXECUTE");
  };

  const resetToDefaultImages = () => {
    const defaults = (bilderList || []).map((name) => ({
      name,
      url: `./bilder/${name}`,
      isDefault: true,
    }));
    setFiles(defaults);
    setCurrent(0);
    setSeed((x) => x + 1);
    setStepIndex(0);
    setHasStartedBefore(false);

    stateRef.current.files = defaults;
    stateRef.current.current = 0;
    stateRef.current.stepIndex = 0;
    stateRef.current.hasStartedBefore = false;
    publishSync("ACTION_EXECUTE");
  };

  const shuffleFiles = () => {
    const shuffled = [...files].sort(() => Math.random() - 0.5);
    setFiles(shuffled);
    setSeed((s) => s + 1);
    setCurrent(0);
    setStepIndex(0);
    setHasStartedBefore(false);

    stateRef.current.files = shuffled;
    stateRef.current.current = 0;
    stateRef.current.stepIndex = 0;
    stateRef.current.hasStartedBefore = false;
    publishSync("ACTION_EXECUTE");
  };

  const addTeam = () => {
    if (teams.length >= 8) return;
    const nextLetter = String.fromCharCode(65 + teams.length);
    const updated = [...teams, { name: nextLetter, score: 0 }];
    setTeams(updated);
    stateRef.current.teams = updated;
    publishSync("ACTION_EXECUTE");
  };

  const removeTeam = (idx) => {
    if (teams.length <= 1) return;
    const updated = teams.filter((_, i) => i !== idx);
    setTeams(updated);
    stateRef.current.teams = updated;
    publishSync("ACTION_EXECUTE");
  };

  const resetScores = () => {
    const updated = teams.map((x) => ({ ...x, score: 0 }));
    setTeams(updated);
    stateRef.current.teams = updated;
    publishSync("ACTION_EXECUTE");
  };

  const resumeGame = () => {
    setIsGameActive(true);
    setHasStartedBefore(true);
    stateRef.current.isGameActive = true;
    stateRef.current.hasStartedBefore = true;
    publishSync("ACTION_EXECUTE");
  };

  const startNewGameFromBeginning = () => {
    setCurrent(0);
    setStepIndex(0);
    setSeed((x) => x + 1);
    setLastAward(null);
    setIsGameActive(true);
    setHasStartedBefore(true);

    stateRef.current.current = 0;
    stateRef.current.stepIndex = 0;
    stateRef.current.seed += 1;
    stateRef.current.lastAward = null;
    stateRef.current.isGameActive = true;
    stateRef.current.hasStartedBefore = true;
    publishSync("ACTION_EXECUTE");
  };

  const openControllerWindow = () => {
    const base = window.location.href.split("?")[0].split("#")[0];
    const url = `${base}?role=controller`;
    const win = window.open(
      url,
      "dalli_controller_window",
      "width=1060,height=780,menubar=no,toolbar=no,location=no,status=no"
    );
    childWindowRef.current = win;
  };

  const copySolutionList = () => {
    const text = files
      .map((f, i) => `${i + 1}. ${formatImageName(f.name)}`)
      .join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  const revealModeLabel =
    revealMode === "GRID_RANDOM"
      ? "Zufälliges Raster"
      : revealMode === "WEDGES_RADIAL"
      ? "Tortenstücke (Radial)"
      : `Spirale (${spiralDirection === "outside-in" ? "Außen→Innen" : "Innen→Außen"})`;

  return (
    <>
      {/* ==========================================
          DEDICATED PRINT CONTAINER (FOR HIGH QUALITY PDFS)
          ========================================== */}
      <div id="solution-print-area">
        <div className="print-header">
          <h1>🎯 Dalli Klick – Spielleiter-Lösungsliste</h1>
          <p>{files.length} Bilder in Spielreihenfolge</p>
        </div>
        <div className="print-grid">
          {files.map((f, i) => (
            <div key={f.url + i} className="print-card">
              <span className="print-number">#{i + 1}</span>
              <img src={f.url} alt={f.name} className="print-img" />
              <div className="print-title">{formatImageName(f.name)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          SCREEN VIEWS (INTERACTIVE APP)
          ========================================== */}
      {isControllerWindow ? (
        /* VIEW 1: PRESENTER / CONTROLLER WINDOW */
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "#0c0e14",
            color: "#f1f5f9",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          {/* Presenter Top Bar */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              background: "#131826",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.5rem" }}>🖥️</span>
              <div>
                <strong style={{ fontSize: "1.1rem", color: "#818cf8" }}>Spielleiter-Konsole</strong>
                <div style={{ fontSize: "0.8rem", color: syncStatus === "connected" ? "#4ade80" : "#facc15" }}>
                  {syncStatus === "connected" ? "🟢 Live synchronisiert mit Hauptfenster" : "🟡 Synchronisiere..."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => {
                  if (window.opener) {
                    try {
                      window.opener.focus();
                    } catch (e) {}
                  }
                }}
                style={{ fontSize: "0.85rem", background: "#1e293b" }}
                title="Zum Beamer/Hauptfenster wechseln"
              >
                📺 Zum Hauptfenster
              </button>
              <button
                onClick={() => {
                  if (window.opener && window.opener.__dalliMainGetState) {
                    applyRemoteState(window.opener.__dalliMainGetState());
                  }
                  if (channelRef.current) {
                    channelRef.current.postMessage({ type: "REQUEST_STATE" });
                  }
                }}
                style={{ fontSize: "0.85rem", background: "#1e293b" }}
                title="Aktualisiert die Synchronisation"
              >
                🔄 Sync
              </button>
            </div>
          </header>

          {/* Presenter Grid Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 16,
              flex: 1,
            }}
          >
            {/* Left Column: Uncensored Current Image & Big Control Actions */}
            <div
              style={{
                background: "#131826",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 700 }}>
                  AKTUELLES BILD #{current + 1} VON {files.length}
                </span>
                <span style={{ fontSize: "0.95rem", color: "#4ade80", fontWeight: 800 }}>
                  {pointsForStep(stepIndex, stepsTotal, 20)} Punkte verfügbar
                </span>
              </div>

              {/* Unblurred Solution Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)",
                  border: "2px solid #6366f1",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#000",
                    flexShrink: 0,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {currentFile && (
                    <img
                      src={currentFile.url}
                      alt={currentFile.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", color: "#a5b4fc", textTransform: "uppercase", fontWeight: 700 }}>
                    Gesuchte Lösung:
                  </div>
                  <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#fff", margin: "2px 0 4px", wordBreak: "break-word" }}>
                    {currentSolutionName || "—"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Datei: {currentFile?.name}
                  </div>
                </div>
              </div>

              {/* Step Progress Bar */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 12, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                  <span>Aufdeck-Fortschritt:</span>
                  <strong>{stepIndex} / {stepsTotal} Schritte ({Math.round((stepIndex / stepsTotal) * 100)}%)</strong>
                </div>
                <div style={{ width: "100%", height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(stepIndex / stepsTotal) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #6366f1, #4ade80)",
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              </div>

              {/* Big Action Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={nextStep}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "16px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    border: "none",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  ⏭️ Nächster Schritt aufdecken (Space)
                </button>

                <button
                  onClick={solveRound}
                  style={{ padding: "12px", background: "#059669", borderColor: "#10b981", fontSize: "0.95rem" }}
                >
                  💡 Sofort auflösen (L)
                </button>

                <button
                  onClick={nextImage}
                  style={{ padding: "12px", background: "#252e42", fontSize: "0.95rem" }}
                >
                  ➡️ Nächstes Bild (N)
                </button>

                <button
                  onClick={prevStep}
                  style={{ padding: "8px", background: "#1e293b", fontSize: "0.85rem" }}
                >
                  ◀ Schritt zurück
                </button>

                <button
                  onClick={resetRound}
                  style={{ padding: "8px", background: "#1e293b", fontSize: "0.85rem" }}
                >
                  🔄 Runde neu starten (R)
                </button>
              </div>

              {/* Next Image Teaser */}
              {nextFile && (
                <div
                  style={{
                    marginTop: "auto",
                    background: "rgba(15, 23, 42, 0.5)",
                    border: "1px dashed rgba(255, 255, 255, 0.15)",
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                    <img src={nextFile.url} alt={nextFile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>⏭️ Als Nächstes kommt:</div>
                    <strong style={{ fontSize: "0.92rem", color: "#cbd5e1" }}>{nextSolutionName}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Teams, Scores & Quick Jump Image List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Teams & Points awarding */}
              <div
                style={{
                  background: "#131826",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <strong style={{ fontSize: "0.95rem" }}>👥 Teams & Punktevergabe</strong>
                  {lastAward && (
                    <button
                      onClick={undoLastAward}
                      style={{ fontSize: "0.78rem", padding: "3px 8px", background: "#450a0a", color: "#fecaca", border: "1px solid #991b1b" }}
                    >
                      ↩ Rückgängig (Strg+Z)
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(teams.length, 3)}, 1fr)`, gap: 10 }}>
                  {teams.map((t, i) => (
                    <div
                      key={t.name}
                      style={{
                        background: "#181f30",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: 10,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Team {t.name}</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#4ade80", margin: "2px 0" }}>
                        {t.score}
                      </div>
                      <button
                        onClick={() => awardTeam(i)}
                        style={{
                          width: "100%",
                          padding: "6px 0",
                          fontSize: "0.8rem",
                          background: "#312e81",
                          borderColor: "#6366f1",
                          color: "#fff",
                        }}
                      >
                        + {pointsForStep(stepIndex, stepsTotal, 20)} Pkt ({t.name})
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Image Jump Selector */}
              <div
                style={{
                  background: "#131826",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: 16,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  maxHeight: "380px",
                }}
              >
                <strong style={{ fontSize: "0.95rem", marginBottom: 8 }}>
                  🖼️ Schnellwahl Bild ({files.length})
                </strong>
                <div
                  style={{
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    paddingRight: 4,
                  }}
                >
                  {files.map((f, i) => {
                    const isActive = i === current;
                    return (
                      <div
                        key={f.url + i}
                        onClick={() => selectImage(i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: isActive ? "rgba(99, 102, 241, 0.25)" : "#181f30",
                          border: isActive ? "1px solid #6366f1" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                          <img src={f.url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#fff" : "#cbd5e1" }}>
                          #{i + 1} {formatImageName(f.name)}
                        </span>
                        {isActive && (
                          <span style={{ marginLeft: "auto", fontSize: "0.72rem", background: "#4ade80", color: "#000", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                            AKTIV
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !isGameActive ? (
        /* VIEW 2: START SCREEN */
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "radial-gradient(ellipse at top, #141b2d 0%, #0c0e14 70%)",
            color: "#f1f5f9",
            paddingBottom: 40,
          }}
        >
          {/* Top Header */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 28px",
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              position: "sticky",
              top: 0,
              zIndex: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>🎯</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "0.5px" }}>
                  DALLI KLICK <span style={{ color: "#818cf8" }}>MODERN</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Interaktives Bilderrätsel für Teams & Partys
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowSolutionModal(true)}
                style={{
                  fontSize: "0.88rem",
                  background: "#1e293b",
                  borderColor: "#6366f1",
                  color: "#e0e7ff",
                }}
              >
                📋 Spielleiter-Lösungsliste
              </button>

              <button
                onClick={openControllerWindow}
                style={{
                  fontSize: "0.88rem",
                  background: "#312e81",
                  borderColor: "#818cf8",
                  color: "#fff",
                }}
                title="Öffnet ein zweites Steuerungs-Fenster für den Moderator"
              >
                🖥️ Spielleiter-Konsole (Zweitfenster)
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  fontSize: "0.88rem",
                  background: showHelp ? "#1e293b" : "transparent",
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "#cbd5e1",
                }}
              >
                ❓ {showHelp ? "Anleitung" : "Hilfe"}
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              padding: "24px 16px",
            }}
          >
            <div
              style={{
                width: "min(960px, 100%)",
                display: "grid",
                gap: 24,
              }}
            >
              {/* Help / Game Rules Card */}
              {showHelp && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: "1.3rem" }}>💡</span>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#e2e8f0" }}>
                      So funktioniert das Spiel (Spielanleitung)
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 16,
                      fontSize: "0.9rem",
                      color: "#cbd5e1",
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <strong style={{ color: "#38bdf8", display: "block", marginBottom: 4 }}>1. Verdecktes Bild</strong>
                      Ein geheimes Motiv ist hinter Kacheln oder Masken verborgen.
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <strong style={{ color: "#38bdf8", display: "block", marginBottom: 4 }}>2. Aufdecken</strong>
                      Mit der <kbd>Leertaste</kbd> (oder Button) wird das Bild schrittweise sichtbar.
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <strong style={{ color: "#38bdf8", display: "block", marginBottom: 4 }}>3. Erraten & Rufen</strong>
                      Wer das Motiv zuerst erkennt, ruft die Lösung. Punkte per Taste <kbd>A</kbd>, <kbd>B</kbd>, ... vergeben.
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <strong style={{ color: "#4ade80", display: "block", marginBottom: 4 }}>4. Schnelligkeit zählt</strong>
                      Je früher (mit weniger Aufdeck-Schritten) gelöst wird, desto mehr Punkte gibt es (bis zu 20 Pkt)!
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Images */}
              <div
                style={{
                  background: "#131826",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: "24px",
                  display: "grid",
                  gap: 16,
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          background: "#4f46e5",
                          color: "#fff",
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          display: "inline-grid",
                          placeItems: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        1
                      </span>
                      <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Bildauswahl</h2>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.92rem" }}>
                      Du kannst <strong>ohne Vorbereitung sofort loslegen</strong>: Die mitgelieferten Standardbilder sind bereits geladen.
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 20,
                      background: isUsingDefaultOnly ? "rgba(34, 197, 94, 0.15)" : "rgba(99, 102, 241, 0.15)",
                      border: isUsingDefaultOnly ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(99, 102, 241, 0.4)",
                      color: isUsingDefaultOnly ? "#4ade80" : "#a5b4fc",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                    }}
                  >
                    <span>{isUsingDefaultOnly ? "✅" : "📁"}</span>
                    <span>
                      {isUsingDefaultOnly
                        ? `${files.length} Standard-Bilder aktiv (Sofort startklar!)`
                        : `${files.length} Bilder in der Spielliste`}
                    </span>
                  </div>
                </div>

                {/* Quick Image Preview Bar */}
                {files.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        overflowX: "auto",
                        padding: "8px 0",
                      }}
                    >
                      {files.slice(0, 7).map((f, i) => {
                        const isCurrentlyActive = i === current && hasStartedBefore;
                        return (
                          <div
                            key={f.url + i}
                            onClick={() => selectImage(i)}
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 10,
                              overflow: "hidden",
                              border: isCurrentlyActive
                                ? "2px solid #4ade80"
                                : "1px solid rgba(255,255,255,0.15)",
                              flexShrink: 0,
                              background: "#090d16",
                              position: "relative",
                              cursor: "pointer",
                            }}
                            title={`Bild ${i + 1}: ${formatImageName(f.name)} (Klicken zum Auswählen)`}
                          >
                            <img
                              src={f.url}
                              alt={f.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            {isCurrentlyActive && (
                              <span
                                style={{
                                  position: "absolute",
                                  top: 2,
                                  left: 2,
                                  background: "#4ade80",
                                  color: "#000",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  padding: "1px 4px",
                                  borderRadius: 4,
                                }}
                              >
                                AKTIV
                              </span>
                            )}
                            <span
                              style={{
                                position: "absolute",
                                bottom: 2,
                                right: 4,
                                background: "rgba(0,0,0,0.7)",
                                fontSize: "10px",
                                padding: "1px 4px",
                                borderRadius: 4,
                                color: "#fff",
                              }}
                            >
                              #{i + 1}
                            </span>
                          </div>
                        );
                      })}

                      {files.length > 7 && (
                        <button
                          onClick={() => setShowPreviewModal(true)}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 10,
                            background: "rgba(30, 41, 59, 0.8)",
                            border: "1px dashed rgba(255,255,255,0.25)",
                            color: "#94a3b8",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            flexShrink: 0,
                            padding: 4,
                            textAlign: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem", marginBottom: 2 }}>➕</span>
                          +{files.length - 7} weitere
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons for Images */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    style={{ background: "#252e42", borderColor: "rgba(255,255,255,0.15)" }}
                  >
                    🖼️ Alle {files.length} Bilder ansehen & sortieren
                  </button>

                  <button
                    onClick={() => setShowSolutionModal(true)}
                    style={{ background: "#252e42", borderColor: "#6366f1" }}
                  >
                    📋 Spielleiter-Lösungsliste
                  </button>

                  <button
                    onClick={shuffleFiles}
                    style={{ background: "#252e42", borderColor: "rgba(255,255,255,0.15)" }}
                    title="Mischt die Bilderreihenfolge per Zufall"
                  >
                    🔀 Reihenfolge zufällig mischen
                  </button>

                  <button
                    onClick={() => startScreenFileInputRef.current?.click()}
                    style={{ background: "#1e293b", borderColor: "#4f46e5" }}
                    title="Eigene Bilder von deiner Festplatte hinzufügen"
                  >
                    ➕ Eigene Bilder hochladen…
                  </button>
                  <input
                    ref={startScreenFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={onAddFiles}
                  />

                  {!isUsingDefaultOnly && (
                    <button
                      onClick={resetToDefaultImages}
                      style={{
                        background: "transparent",
                        borderColor: "rgba(239, 68, 68, 0.4)",
                        color: "#fca5a5",
                      }}
                      title="Setzt die Bilderliste zurück auf die 55 mitgelieferten Standardbilder"
                    >
                      ↩ Zurück zu Standard-Bildern (55)
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Game Mode & Rules */}
              <div
                style={{
                  background: "#131826",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: "24px",
                  display: "grid",
                  gap: 20,
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        background: "#4f46e5",
                        color: "#fff",
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        display: "inline-grid",
                        placeItems: "center",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      2
                    </span>
                    <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Aufdeck-Modus & Effekte</h2>
                  </div>
                  <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.92rem" }}>
                    Wähle das Muster, in dem die Bilder verdeckt und Schritt für Schritt enthüllt werden.
                  </p>
                </div>

                {/* Mode Selection Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  {/* Mode 1: Random Grid */}
                  <div
                    onClick={() => {
                      setRevealMode("GRID_RANDOM");
                      stateRef.current.revealMode = "GRID_RANDOM";
                      publishSync("ACTION_EXECUTE");
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: revealMode === "GRID_RANDOM" ? "rgba(99, 102, 241, 0.15)" : "#181f30",
                      border:
                        revealMode === "GRID_RANDOM"
                          ? "2px solid #6366f1"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: "1rem", color: revealMode === "GRID_RANDOM" ? "#fff" : "#cbd5e1" }}>
                        🔲 Zufälliges Raster
                      </strong>
                      {revealMode === "GRID_RANDOM" && (
                        <span style={{ fontSize: "0.75rem", background: "#4f46e5", padding: "2px 8px", borderRadius: 10, color: "#fff" }}>
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.4 }}>
                      Klassisches Dalli-Klick-Feeling: Kacheln ploppen an zufälligen Positionen auf.
                    </p>
                  </div>

                  {/* Mode 2: Radial Wedges */}
                  <div
                    onClick={() => {
                      setRevealMode("WEDGES_RADIAL");
                      stateRef.current.revealMode = "WEDGES_RADIAL";
                      publishSync("ACTION_EXECUTE");
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: revealMode === "WEDGES_RADIAL" ? "rgba(99, 102, 241, 0.15)" : "#181f30",
                      border:
                        revealMode === "WEDGES_RADIAL"
                          ? "2px solid #6366f1"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: "1rem", color: revealMode === "WEDGES_RADIAL" ? "#fff" : "#cbd5e1" }}>
                        🍰 Tortenstücke (Radial)
                      </strong>
                      {revealMode === "WEDGES_RADIAL" && (
                        <span style={{ fontSize: "0.75rem", background: "#4f46e5", padding: "2px 8px", borderRadius: 10, color: "#fff" }}>
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.4 }}>
                      Enthüllung kreisförmig wie bei einer Uhr oder Torte im Zufallsmuster.
                    </p>
                  </div>

                  {/* Mode 3: Spiral */}
                  <div
                    onClick={() => {
                      setRevealMode("SPIRAL_GRID");
                      stateRef.current.revealMode = "SPIRAL_GRID";
                      publishSync("ACTION_EXECUTE");
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: revealMode === "SPIRAL_GRID" ? "rgba(99, 102, 241, 0.15)" : "#181f30",
                      border:
                        revealMode === "SPIRAL_GRID"
                          ? "2px solid #6366f1"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: "1rem", color: revealMode === "SPIRAL_GRID" ? "#fff" : "#cbd5e1" }}>
                        🌀 Spirale
                      </strong>
                      {revealMode === "SPIRAL_GRID" && (
                        <span style={{ fontSize: "0.75rem", background: "#4f46e5", padding: "2px 8px", borderRadius: 10, color: "#fff" }}>
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#94a3b8", lineHeight: 1.4 }}>
                      Kacheln decken das Bild spiralförmig von außen nach innen (oder umgekehrt) auf.
                    </p>
                  </div>
                </div>

                {/* Spiral Direction Sub-option */}
                {revealMode === "SPIRAL_GRID" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#181f30", padding: "10px 16px", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>Spiralrichtung:</span>
                    <select
                      value={spiralDirection}
                      onChange={(e) => {
                        setSpiralDirection(e.target.value);
                        stateRef.current.spiralDirection = e.target.value;
                        publishSync("ACTION_EXECUTE");
                      }}
                    >
                      <option value="outside-in">Von Außen nach Innen</option>
                      <option value="inside-out">Von Innen nach Außen</option>
                    </select>
                  </div>
                )}

                {/* Slider Controls */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 18,
                    background: "rgba(15, 23, 42, 0.5)",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Disturb Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label htmlFor="disturb-slider" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        Störgrad & Verpixelung: <span style={{ color: "#818cf8" }}>{disturb} / 10</span>
                      </label>
                    </div>
                    <input
                      id="disturb-slider"
                      type="range"
                      min="0"
                      max="10"
                      value={disturb}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setDisturb(val);
                        stateRef.current.disturb = val;
                        publishSync("ACTION_EXECUTE");
                      }}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                      {disturb === 0
                        ? "0 = Kristallklar (nur abgedeckt)"
                        : disturb < 6
                        ? "Leichte bis mittlere Verpixelung"
                        : "Starke Verpixelung & Konfetti-Filter (Klassisch & spannend)"}
                    </div>
                  </div>

                  {/* Steps Input */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label htmlFor="steps-input" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        Aufdeck-Schritte pro Bild: <span style={{ color: "#818cf8" }}>{stepsTotal}</span>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        id="steps-input"
                        type="number"
                        min="5"
                        max="80"
                        value={stepsTotal}
                        onChange={(e) => {
                          const val = clamp(parseInt(e.target.value || "20", 10), 5, 80);
                          setStepsTotal(val);
                          stateRef.current.stepsTotal = val;
                          publishSync("ACTION_EXECUTE");
                        }}
                        style={{ width: 80 }}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        {[15, 20, 25, 30].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setStepsTotal(val);
                              stateRef.current.stepsTotal = val;
                              publishSync("ACTION_EXECUTE");
                            }}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.8rem",
                              background: stepsTotal === val ? "#4f46e5" : "#1e293b",
                            }}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                      Anzahl Tastendrücke (Space), bis das Bild vollständig gelöst ist.
                    </div>
                  </div>

                  {/* Grid resolution / Wedges */}
                  {revealMode !== "WEDGES_RADIAL" ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label htmlFor="tile-input" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Rastergröße: <span style={{ color: "#818cf8" }}>{tileN} × {tileN} ({tileN * tileN} Kacheln)</span>
                        </label>
                      </div>
                      <input
                        id="tile-input"
                        type="number"
                        min="6"
                        max="40"
                        value={tileN}
                        onChange={(e) => {
                          const val = clamp(parseInt(e.target.value || "18", 10), 6, 40);
                          setTileN(val);
                          stateRef.current.tileN = val;
                          publishSync("ACTION_EXECUTE");
                        }}
                        style={{ width: 80 }}
                      />
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                        Größe der einzelnen Abdeckkacheln (Standard: 18).
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label htmlFor="wedge-input" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Torten-Segmente: <span style={{ color: "#818cf8" }}>{wedgeSegments}</span>
                        </label>
                      </div>
                      <input
                        id="wedge-input"
                        type="number"
                        min="6"
                        max="36"
                        value={wedgeSegments}
                        onChange={(e) => {
                          const val = clamp(parseInt(e.target.value || "18", 10), 6, 36);
                          setWedgeSegments(val);
                          stateRef.current.wedgeSegments = val;
                          publishSync("ACTION_EXECUTE");
                        }}
                        style={{ width: 80 }}
                      />
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                        Anzahl der radialen Kuchenstücke (Standard: 18).
                      </div>
                    </div>
                  )}

                  {/* HUD Checkbox */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10 }}>
                    <input
                      id="hud-checkbox"
                      type="checkbox"
                      checked={showHud}
                      onChange={(e) => {
                        setShowHud(e.target.checked);
                        stateRef.current.showHud = e.target.checked;
                        publishSync("ACTION_EXECUTE");
                      }}
                      style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }}
                    />
                    <label htmlFor="hud-checkbox" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                      HUD-Anzeige (Schritt & Punkteinfo auf dem Spielfeld einblenden)
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Teams */}
              <div
                style={{
                  background: "#131826",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: "24px",
                  display: "grid",
                  gap: 16,
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          background: "#4f46e5",
                          color: "#fff",
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          display: "inline-grid",
                          placeItems: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        3
                      </span>
                      <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Teams & Punktestand</h2>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.92rem" }}>
                      Vergib im Spiel Punkte mit den Tasten <kbd>A</kbd>, <kbd>B</kbd>, <kbd>C</kbd>... oder per Mausklick.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addTeam} disabled={teams.length >= 8} style={{ background: "#252e42" }}>
                      ➕ Weiteres Team
                    </button>
                    <button onClick={resetScores} style={{ background: "#252e42", color: "#fca5a5" }}>
                      Punkte auf 0
                    </button>
                  </div>
                </div>

                {/* Team Cards Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  {teams.map((t, i) => (
                    <div
                      key={t.name}
                      style={{
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 12,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Taste <kbd>{t.name}</kbd></div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>
                          Team {t.name}
                        </div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#4ade80" }}>
                          {t.score} <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pkt</span>
                        </div>
                      </div>
                      {teams.length > 1 && (
                        <button
                          onClick={() => removeTeam(i)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#64748b",
                            padding: 4,
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                          title="Team entfernen"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Start or Resume CTA Button */}
              <div
                style={{
                  background: "linear-gradient(180deg, #1e1b4b 0%, #131826 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  gap: 16,
                  boxShadow: "0 10px 40px rgba(79, 70, 229, 0.2)",
                }}
              >
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                  {/* Main Action: Resume or Start */}
                  {hasStartedBefore ? (
                    <>
                      <button
                        onClick={resumeGame}
                        disabled={!canStart}
                        className="pulse-button"
                        style={{
                          background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)",
                          border: "none",
                          borderRadius: 14,
                          padding: "16px 40px",
                          fontSize: "1.3rem",
                          fontWeight: 800,
                          color: "#fff",
                          cursor: canStart ? "pointer" : "not-allowed",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 12,
                          boxShadow: "0 6px 20px rgba(34, 197, 94, 0.45)",
                        }}
                      >
                        <span>▶️</span>
                        <span>Spiel Fortsetzen (Bild {current + 1} von {files.length})</span>
                      </button>

                      <button
                        onClick={startNewGameFromBeginning}
                        disabled={!canStart}
                        style={{
                          background: "#1e293b",
                          borderColor: "rgba(255,255,255,0.2)",
                          borderRadius: 14,
                          padding: "16px 24px",
                          fontSize: "1.05rem",
                          fontWeight: 600,
                          color: "#cbd5e1",
                          cursor: canStart ? "pointer" : "not-allowed",
                        }}
                        title="Setzt das Bild auf Bild 1 zurück"
                      >
                        🔄 Von Bild 1 neu starten
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startNewGameFromBeginning}
                      disabled={!canStart}
                      className="pulse-button"
                      style={{
                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        border: "none",
                        borderRadius: 14,
                        padding: "16px 48px",
                        fontSize: "1.35rem",
                        fontWeight: 800,
                        color: "#fff",
                        cursor: canStart ? "pointer" : "not-allowed",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        boxShadow: "0 6px 20px rgba(99, 102, 241, 0.5)",
                      }}
                    >
                      <span>🚀</span>
                      <span>Spiel Jetzt Starten</span>
                    </button>
                  )}
                </div>

                <div style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                  🎮 <strong>{files.length} Bilder</strong> • Aktuell bei: <strong>Bild {current + 1} ({currentSolutionName || "—"})</strong> • Modus: <strong>{revealModeLabel}</strong> • <strong>{teams.length} Teams ({teams.map((t) => t.name).join(", ")})</strong>
                </div>

                {/* Controls Cheatsheet Bar */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: "10px 18px",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "12px 20px",
                    fontSize: "0.82rem",
                    color: "#cbd5e1",
                  }}
                >
                  <span><kbd>Space</kbd> Schritt aufdecken</span>
                  <span><kbd>A</kbd> / <kbd>B</kbd> Punkte vergeben</span>
                  <span><kbd>L</kbd> Sofort auflösen</span>
                  <span><kbd>S</kbd> Spicker / Lösung</span>
                  <span><kbd>N</kbd> Nächstes Bild</span>
                  <span><kbd>R</kbd> Bild neu starten</span>
                  <span><kbd>F</kbd> Vollbild</span>
                  <span><kbd>Strg</kbd>+<kbd>Z</kbd> Punkte rückgängig</span>
                </div>
              </div>
            </div>

            {/* Modal 1: Image Preview & Drag/Drop Order */}
            {showPreviewModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.85)",
                  backdropFilter: "blur(6px)",
                  zIndex: 100,
                  display: "grid",
                  placeItems: "center",
                  padding: 24,
                }}
              >
                <div
                  style={{
                    background: "#131826",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 16,
                    width: "min(100%, 880px)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
                        Bilder-Vorschau & Reihenfolge ({files.length} Bilder)
                      </h2>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                        Klicke auf ein Bild, um direkt dorthin zu springen, oder verschiebe es per Drag & Drop.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={shuffleFiles} style={{ background: "#1e293b" }}>
                        🔀 Zufällig mischen
                      </button>
                      <button
                        onClick={() => setShowPreviewModal(false)}
                        style={{ background: "#4f46e5", color: "#fff", border: "none" }}
                      >
                        Fertig
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 24,
                      overflowY: "auto",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      alignContent: "flex-start",
                    }}
                  >
                    {files.length === 0 && (
                      <div style={{ textAlign: "center", width: "100%", padding: "40px 0", color: "#94a3b8" }}>
                        <p>Keine Bilder mehr vorhanden.</p>
                        <button onClick={resetToDefaultImages} style={{ background: "#4f46e5", color: "#fff", border: "none", marginTop: 12 }}>
                          Standardbilder laden
                        </button>
                      </div>
                    )}
                    {files.map((f, i) => {
                      const isSelected = i === current;
                      return (
                        <div
                          key={f.url + i}
                          draggable
                          onClick={() => selectImage(i)}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedIdx(i);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedIdx === null || draggedIdx === i) return;
                            setFiles((fs) => {
                              const arr = [...fs];
                              const item = arr.splice(draggedIdx, 1)[0];
                              arr.splice(i, 0, item);
                              stateRef.current.files = arr;
                              publishSync("ACTION_EXECUTE");
                              return arr;
                            });
                            setDraggedIdx(i);
                          }}
                          onDragEnd={() => setDraggedIdx(null)}
                          style={{
                            position: "relative",
                            width: 140,
                            height: 140,
                            borderRadius: 10,
                            overflow: "hidden",
                            border: isSelected
                              ? "2px solid #4ade80"
                              : draggedIdx === i
                              ? "2px dashed #6366f1"
                              : "2px solid rgba(255,255,255,0.1)",
                            opacity: draggedIdx === i ? 0.4 : 1,
                            cursor: "grab",
                            background: "#090d16",
                            transition: "border-color 0.2s",
                          }}
                          title={`Bild ${i + 1}: ${formatImageName(f.name)}`}
                        >
                          <img
                            src={f.url}
                            alt={f.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                          />
                          {isSelected && (
                            <span
                              style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                background: "#4ade80",
                                color: "#000",
                                fontSize: "10px",
                                fontWeight: "bold",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              AKTUELL
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = files.filter((_, idx) => idx !== i);
                              setFiles(updated);
                              stateRef.current.files = updated;
                              publishSync("ACTION_EXECUTE");
                            }}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              background: "rgba(0,0,0,0.75)",
                              color: "#f87171",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "50%",
                              width: 26,
                              height: 26,
                              padding: 0,
                              display: "grid",
                              placeItems: "center",
                              cursor: "pointer",
                              fontSize: "12px",
                              lineHeight: 1,
                            }}
                            title="Bild entfernen"
                          >
                            ✕
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "rgba(0,0,0,0.75)",
                              color: "#fff",
                              fontSize: "11px",
                              padding: "4px 8px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {i + 1}. {formatImageName(f.name)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      padding: "12px 24px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#94a3b8",
                      fontSize: "0.88rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span>💡 Klicke auf ein Bild, um es als nächstes Bild festzulegen, oder ziehe es per Drag & Drop.</span>
                    {!isUsingDefaultOnly && (
                      <button
                        onClick={resetToDefaultImages}
                        style={{ fontSize: "0.8rem", background: "transparent", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                      >
                        ↩ Auf Standard-Bilder (55) zurücksetzen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal 2: Solution List / Cheat Sheet for Presenter */}
            {showSolutionModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.88)",
                  backdropFilter: "blur(6px)",
                  zIndex: 110,
                  display: "grid",
                  placeItems: "center",
                  padding: 24,
                }}
              >
                <div
                  style={{
                    background: "#131826",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 16,
                    width: "min(100%, 940px)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📋</span>
                        <span>Spielleiter-Lösungsliste ({files.length} Bilder)</span>
                      </h2>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                        Reihenfolge & deutsche Lösungsbegriffe für den Moderator
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={copySolutionList}
                        style={{ background: copiedNotification ? "#059669" : "#1e293b", fontSize: "0.85rem" }}
                      >
                        {copiedNotification ? "✅ Kopiert!" : "📋 Liste kopieren"}
                      </button>
                      <button
                        onClick={() => window.print()}
                        style={{ background: "#4f46e5", color: "#fff", border: "none", fontSize: "0.85rem" }}
                      >
                        🖨️ Drucken / PDF
                      </button>
                      <button
                        onClick={() => setShowSolutionModal(false)}
                        style={{ background: "#252e42", fontSize: "0.85rem" }}
                      >
                        Schließen
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 24,
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {files.map((f, i) => (
                      <div
                        key={f.url + i}
                        style={{
                          background: "#181f30",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 10,
                          padding: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#000",
                            flexShrink: 0,
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <img
                            src={f.url}
                            alt={f.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 700 }}>
                            #{i + 1}
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color: "#f8fafc",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={formatImageName(f.name)}
                          >
                            {formatImageName(f.name)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: "12px 24px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#94a3b8",
                      fontSize: "0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>💡 Tipp: Du kannst diese Liste vorab ausdrucken oder auf deinem Smartphone öffnen.</span>
                    <button
                      onClick={() => setShowSolutionModal(false)}
                      style={{ fontSize: "0.8rem", background: "transparent", color: "#cbd5e1" }}
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* VIEW 3: ACTIVE IN-GAME SCREEN (BEAMER / MAIN) */
        <div style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr", background: "#0c0e14" }}>
          <header
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "10px 16px",
              background: "#0f172a",
              color: "#fff",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexWrap: "wrap",
              position: "relative",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => {
                  setIsGameActive(false);
                  stateRef.current.isGameActive = false;
                  publishSync("ACTION_EXECUTE");
                }}
                style={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#cbd5e1",
                  fontSize: "0.82rem",
                  padding: "4px 10px",
                }}
                title="Zurück zum Startbildschirm & Einstellungen"
              >
                🏠 Menü
              </button>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong style={{ fontSize: "1.05rem" }}>Dalli Klick</strong>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  (Bild {current + 1} von {files.length})
                </span>
              </div>
            </div>

            {/* In-Game Action Buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <button style={{ fontSize: "0.78rem", padding: "4px 8px" }} onClick={prevStep}>◀ Schritt</button>
              <button
                style={{ fontSize: "0.78rem", padding: "4px 10px", background: "#312e81", borderColor: "#6366f1", color: "#e0e7ff" }}
                onClick={nextStep}
              >
                Schritt ▶ (Space)
              </button>
              <button style={{ fontSize: "0.78rem", padding: "4px 8px" }} onClick={solveRound}>Lösen (L)</button>
              <button style={{ fontSize: "0.78rem", padding: "4px 8px" }} onClick={nextImage}>Nächstes Bild (N)</button>
              <button style={{ fontSize: "0.78rem", padding: "4px 8px" }} onClick={resetRound}>Runde reset (R)</button>
              <button style={{ fontSize: "0.78rem", padding: "4px 8px" }} onClick={() => fileInputRef.current?.click()}>➕ Bilder</button>
              <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={onAddFiles} />
            </div>

            {/* Spielleiter Spicker Dropdown Button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowCheatPopover(!showCheatPopover)}
                onMouseEnter={() => setShowCheatPopover(true)}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 10px",
                  background: showCheatPopover ? "#312e81" : "#1e293b",
                  borderColor: showCheatPopover ? "#818cf8" : "rgba(255,255,255,0.15)",
                  color: "#e0e7ff",
                }}
                title="Zeigt die deutsche Lösung für den Spielleiter an (Taste S)"
              >
                🕵️‍♂️ Spicker (S)
              </button>

              {/* Cheat Sheet Popover */}
              {showCheatPopover && (
                <div
                  onMouseLeave={() => setShowCheatPopover(false)}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 8,
                    background: "#131826",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    borderRadius: 12,
                    padding: 14,
                    width: 280,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    zIndex: 50,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6 }}>
                    <strong style={{ fontSize: "0.85rem", color: "#818cf8" }}>🕵️‍♂️ Spielleiter-Spickzettel</strong>
                    <button
                      onClick={() => setShowCheatPopover(false)}
                      style={{ background: "transparent", border: "none", padding: 2, color: "#64748b", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Current Image Solution */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                      {currentFile && (
                        <img src={currentFile.url} alt={currentFile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 700 }}>AKTUELLE LÖSUNG:</div>
                      <strong style={{ fontSize: "0.95rem", color: "#fff", display: "block", wordBreak: "break-word" }}>
                        {currentSolutionName || "—"}
                      </strong>
                    </div>
                  </div>

                  {/* Next Image Teaser */}
                  {nextFile && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                        <img src={nextFile.url} alt={nextFile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>NÄCHSTES BILD:</div>
                        <span style={{ fontSize: "0.85rem", color: "#cbd5e1", display: "block", wordBreak: "break-word" }}>
                          {nextSolutionName || "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={openControllerWindow}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      fontSize: "0.78rem",
                      background: "#1e293b",
                      borderColor: "rgba(255,255,255,0.15)",
                    }}
                  >
                    🖥️ Spielleiter-Konsole öffnen
                  </button>
                </div>
              )}
            </div>

            {/* Right Header Area: Scores & Undo */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {lastAward && (
                <button
                  onClick={undoLastAward}
                  style={{
                    fontSize: "0.8rem",
                    padding: "4px 10px",
                    background: "#450a0a",
                    border: "1px solid #991b1b",
                    color: "#fecaca",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                  title="Punktevergabe rückgängig machen (Strg+Z)"
                >
                  ↩ Rückgängig
                </button>
              )}
              {teams.map((t, i) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 12px",
                    background: "#1e293b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#94a3b8" }}>{t.name}</span>
                  <span
                    key={t._lastAward}
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: "900",
                      color: "#4ade80",
                      display: "inline-block",
                      minWidth: "2ch",
                      textAlign: "center",
                      animation: t._lastAward ? "scorePop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
                    }}
                  >
                    {t.score}
                  </span>
                  <button
                    onClick={() => awardTeam(i)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      background: "#334155",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                    title={`Punkte geben (Taste ${t.name})`}
                  >
                    + Pkt
                  </button>
                </div>
              ))}
            </div>
          </header>

          {/* Interactive Game Canvas */}
          <div style={{ position: "relative", background: "#0b0e14" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        </div>
      )}
    </>
  );
}
