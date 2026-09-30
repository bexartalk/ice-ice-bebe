/* Ice Ice Bebé — a standalone HD cartoon runner (no images, no network, no frameworks).
   Jose, a cheerful Tejano in a sombrero, runs home across San Antonio in 5 levels:
   The Street → Home Dehole (a parody orange hardware store) → The Job Site (scaffolding, lumber, a cement mixer)
   → La Taquería (lunch, papel picado) → Home (Mom's house, the family party).
   Jump (tap / Space / ↑ / W; again in the air for a double jump), 🌯 Throw a burrito (button / X / F) to bonk an agent,
   land on an agent's cap to stomp him flat. Agents are generic, faceless and slapstick; nobody gets hurt: if Jose is
   caught it's a big "¡Ay no!" / "¡Fuera!" / "¡Vámonos, amigo!" and back to the last 🚩 checkpoint.
   ☕ coffee = speed boost, 🩴 flip-flop = shield. WebAudio beeps (mutable). Best score in localStorage "ice-ice-bebe".
   Reduce motion: no parallax, shake, particles or confetti.
   The world is 156 × 220–340 game units; the canvas renders at CSS size × devicePixelRatio with smooth vector art.
   Originally built as a mini-game (v41 HD); this file is the standalone app's copy.
   mount(el, ctx): ctx.onTitle(info) shows the app's title screen, ctx.onPlay() hides it. */
(function (root) {
  "use strict";
  const KEY = "ice-ice-bebe";
  const W = 156, H0 = 276, STREET = 70, GROUND = 124, END = 2400, CHECKS = [0, 800, 1600], HERO_X = 36;   // the ground line sits STREET units above the bottom
  const GRAV = 720, JUMP = -250, JUMP2 = -215;
  const OR = "#ff6c1c", ORD = "#d4480c", PK = "#ff3d8b", PKD = "#c81f66", PKL = "#ff8fbf", TQ = "#00b8b0", TQD = "#007f7a", TQL = "#3ee8eb", WH = "#ffffff", INK = "#1d1426";
  // v41: the levels follow the original plan, in order: the Street → Home Dehole (a parody orange hardware store) → the Job Site
  // (scaffolding, lumber, a cement mixer) → La Taquería (lunch, papel picado) → Home (Mom's house, the family party).
  // Speeds and hazard mixes still ramp up level by level exactly like before.
  const LEVELS = [
    { name: "The Street", sign: "THE STREET", speed: 78, sky: ["#4fb0e8", "#d6f3ff"], far: "#a3c3d8", mid: "#7fa3bd", win: "#c4dbe8",
      near: [OR, TQ, PK, "#dfe4ea"], shops: ["BAKERY", "BOOTS", "LAUNDRY", "BARBER"], board: "COLD DRINKS", agents: 0.42, suv: 0.12, hint: "Down the street. Let's go, Jose!" },
    { name: "Home Dehole", sign: "HOME DEHOLE", speed: 86, sky: ["#3fa9e0", "#ffe0ec"], far: "#9cc0d9", mid: "#6f97b8", win: "#bcd6e8",
      near: ["#dfe4ea", "#c9ced6", "#e3d2c8", "#b7c4cf"], shops: ["PAINT", "LUMBER", "GARDEN", "TOOLS"], board: "BIG SALE", agents: 0.48, suv: 0.15, hint: "The big orange hardware store and its parking lot." },
    { name: "The Job Site", sign: "JOB SITE", speed: 92, sky: ["#ff9a6b", "#ffc9dc"], far: "#e69aa8", mid: "#c77a8e", win: "#f2bccb",
      near: ["#dfe4ea", OR, "#c9ced6", TQ], shops: [], board: "NOW BUILDING", agents: 0.52, suv: 0.18, hint: "Scaffolding, lumber and a cement mixer. Hard hats on!" },
    { name: "La Taquería", sign: "LA TAQUERÍA", speed: 98, sky: ["#35b6e6", "#ffd6e6"], far: "#9cc0d9", mid: "#8f6f9e", win: "#d7c4e6",
      near: [TQ, PK, OR, "#dfe4ea"], shops: ["TACOS", "TORTAS", "AGUAS", "BAKERY"], board: "LUNCH SPECIAL", agents: 0.55, suv: 0.2, hint: "Lunchtime! Tacos under the papel picado." },
    { name: "Home", sign: "MOM'S HOUSE", speed: 104, sky: ["#141a3f", "#4a2f6e"], far: "#221f4a", mid: "#2e2858", win: "#7ff0f2",
      near: ["#3d6b8a", "#8a3d6b", "#3d8a7a", "#6b4a8a"], shops: [], board: "", agents: 0.58, suv: 0.22, hint: "Almost home to Mom's. The party's starting!" },
  ];
  // the hero's colors (warm tones all at hue ≤ 23°)
  const SKIN = "#b87350", SKIN_D = "#8f5236", SKIN_L = "#d08c68", STRAW = "#d18d68", STRAW_D = "#a8643f", STRAW_L = "#e8b294", STACHE = "#3a1f17",
    JEAN = "#2d4a8a", JEAN_D = "#223a6e", JEAN_L = "#4466aa", BOOT = "#6b3b1f", BOOT_D = "#45220f", BREAD = "#c97a52", WOOD = "#b8683c", WOOD_D = "#7a3f22", WOOD_L = "#d4895c";
  const FIESTA = [PK, TQ, OR, WH];
  const mod = (a, n) => ((a % n) + n) % n;

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  // A level's layout is the same every time (seeded by level number), so checkpoints restart the same course.
  function buildLevel(n) {
    const L = LEVELS[n - 1], r = rng(1000 + n * 7919), ents = [];
    let x = 240;
    const clearOf = (x) => CHECKS.some((c) => c && x + 90 > c - 40 && x - 40 < c + 60);   // the whole group (cone before, pair/SUV after) stays off the flag
    const power = { 1: [[520, "cup"], [1250, "chancla"]], 2: [[700, "chancla"], [1400, "cup"]], 3: [[450, "cup"], [1100, "chancla"], [1900, "cup"]],
      4: [[600, "chancla"], [1300, "cup"], [2000, "chancla"]], 5: [[500, "cup"], [1000, "chancla"], [1700, "chancla"], [2100, "cup"]] }[n];
    for (const [px, kind] of power) ents.push({ t: kind, x: px, y: GROUND - 34, w: 9, h: 8 });
    while (x < END - 160) {
      const gap = 92 - n * 5 + Math.floor(r() * 70);
      x += gap;
      if (clearOf(x) || x > END - 170) continue;
      const roll = r();
      if (roll < L.suv) {
        ents.push({ t: "suv", x, y: GROUND - 22, w: 40, h: 22 });
        for (let k = 0; k < 3; k++) ents.push({ t: "coin", x: x + 8 + k * 11, y: GROUND - 36, w: 7, h: 4 });
        x += 30;
      } else if (roll < L.suv + L.agents) {
        ents.push({ t: "agent", x, y: GROUND - 15, w: 10, h: 15, vx: -14 - n * 2, st: "walk", tt: 0, home: x });
        if (n >= 3 && r() < 0.3) { ents.push({ t: "agent", x: x + 44, y: GROUND - 15, w: 10, h: 15, vx: -14 - n * 2, st: "walk", tt: 0, home: x + 44 }); x += 44; }
        if (r() < 0.35) ents.push({ t: "cone", x: x - 34, y: GROUND - 7, w: 7, h: 7 });   // an agent may trip on it: slapstick
      } else if (roll < 0.85) {
        ents.push({ t: "cone", x, y: GROUND - 7, w: 7, h: 7 });
        if (r() < 0.5) for (let k = 0; k < 3; k++) ents.push({ t: "coin", x: x - 10 + k * 11, y: GROUND - 30 - (k === 1 ? 6 : 0), w: 7, h: 4 });
      } else {
        const hh = 18 + Math.floor(r() * 10);
        ents.push({ t: "crate", x, y: GROUND - hh, w: 24, h: hh });
        for (let k = 0; k < 2; k++) ents.push({ t: "coin", x: x + 3 + k * 11, y: GROUND - hh - 12, w: 7, h: 4 });
      }
    }
    for (const c of CHECKS.slice(1)) ents.push({ t: "flag", x: c, y: GROUND - 26, w: 6, h: 26 });
    return ents;
  }
  const hit = (a, b, pad = 2) => a.x + pad < b.x + b.w && a.x + a.w - pad > b.x && a.y + pad < b.y + b.h && a.y + a.h - pad > b.y;

  function load() { try { return Object.assign({ best: 0, muted: false, levelMax: 1, wins: 0 }, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { best: 0, muted: false, levelMax: 1, wins: 0 }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  function mount(el, ctx) {
    const reduced = () => (ctx && ctx.reducedMotion ? ctx.reducedMotion() : matchMedia("(prefers-reduced-motion: reduce)").matches);
    const st = load();
    let H = H0;
    el.innerHTML = `
      <div class="ice-wrap">
        <canvas id="ice-cv" class="ice-cv no-swipe" width="${W * 3}" height="${H * 3}" role="img" aria-label="Ice Ice Bebé game screen. Tap it, or press Space, to jump."></canvas>
        <div id="ice-ov" class="ice-ov" aria-live="polite"></div>
      </div>
      <p class="ice-note" id="ice-note" aria-live="polite"></p>
      <div class="ice-controls" role="group" aria-label="Game controls">
        <button type="button" id="ice-jump" class="lot-btn lot-main ice-jump no-swipe">⤒ Jump</button>
        <button type="button" id="ice-throw" class="lot-btn ice-throw no-swipe" aria-label="Throw a burrito"><svg class="ice-burr" viewBox="0 0 40 24" aria-hidden="true" focusable="false"><g stroke="#1d1426" stroke-width="2.2" stroke-linejoin="round"><path d="M6 17 C3 12 7 5 14 4 L31 3 C37 3 39 9 37 14 C35 19 30 21 24 21 L12 21 C9 21 7 19 6 17Z" fill="#e8b294"/><path d="M31 3 C37 3 39 9 37 14 C34 13 32 9 31 3Z" fill="#ff6c1c"/></g><path d="M33 5.5 C35 7 35.5 10 35 12" stroke="#00b8b0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M13 9 L27 8 M11 14 L25 14" stroke="#c98a6e" stroke-width="1.6" stroke-linecap="round"/></svg><span class="ice-tlbl">Throw</span></button>
        <button type="button" id="ice-pause" class="lot-btn"></button>
        <button type="button" id="ice-restart" class="lot-btn" aria-label="Restart level"><span aria-hidden="true">↺</span><span class="ice-lbl"> Restart level</span></button>
        <button type="button" id="ice-sound" class="lot-btn" aria-pressed="true"></button>
      </div>
      <p class="lot-stats" id="ice-stats"></p>`;
    const cv = el.querySelector("#ice-cv"), g = cv.getContext("2d"), ov = el.querySelector("#ice-ov"), wrap = el.querySelector(".ice-wrap");
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";   // v41: HD vector art, no pixelation
    // ---- full screen while playing (portrait): the canvas grows to the screen's shape
    const fs = { on: true, enter() {}, exit() {} };   // standalone: the app is always full screen (see index.html / app.css)
    // ---- sound: tiny square-wave beeps
    let ac = null;
    const audio = () => { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch (e) {} } if (ac && ac.state === "suspended") ac.resume(); return ac; };
    function beep(f, d = 0.08, f2 = null, type = "square", vol = 0.045, at = 0) {
      if (st.muted) return; const a = audio(); if (!a) return;
      try { const o = a.createOscillator(), v = a.createGain(), t0 = a.currentTime + at;
        o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
        v.gain.setValueAtTime(vol, t0); v.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
        o.connect(v); v.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02); } catch (e) {}
    }
    const SFX = {
      jump: () => beep(330, 0.11, 660), jump2: () => beep(520, 0.09, 900), coin: () => { beep(988, 0.05); beep(1319, 0.08, null, "square", 0.04, 0.05); },
      power: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.07, null, "square", 0.045, i * 0.06)),
      caught: () => [392, 330, 262, 196].forEach((f, i) => beep(f, 0.12, null, "triangle", 0.06, i * 0.1)),
      cone: () => beep(200, 0.08, 120, "square", 0.04), shield: () => beep(700, 0.15, 300, "sawtooth", 0.03),
      clear: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, null, "square", 0.045, i * 0.09)),
      toss: () => beep(260, 0.09, 520, "triangle", 0.05), bonk: () => { beep(180, 0.1, 90, "square", 0.05); beep(620, 0.08, null, "triangle", 0.04, 0.08); },
      stomp: () => { beep(150, 0.08, 70, "square", 0.06); beep(880, 0.1, 1320, "square", 0.04, 0.06); }, splat: () => beep(120, 0.06, 60, "triangle", 0.04),
      check: () => { beep(784, 0.07); beep(1047, 0.1, null, "square", 0.04, 0.07); },
    };
    // ---- game state
    const CAUGHT = ["¡Ay no!", "¡Fuera!", "¡Vámonos, amigo!"];   // one at random, in big cartoon letters (v39: kept in Spanish on purpose; everything else is English)
    let caughtMsg = CAUGHT[0];
    let level = 1, ents = [], hero, camX = 0, score = 0, ckScore = 0, ck = 0, mode = "title", t = 0, raf = null, last = 0, shake = 0, parts = [], msgT = 0, msg = "";
    let fx = [], fxMade = 0, dustT = 0, paused = false;
    let burr = [], throwCD = 0, throwT = 0, thrown = 0, bonks = 0, stomps = 0;   // v41: burritos in the air, the throw cooldown / arm pose, counters
    const oy = () => GROUND - (H - STREET);   // world y at the top of the screen
    function spawn(atCheck) {
      ents = buildLevel(level);
      const x0 = CHECKS[atCheck];
      ents = ents.filter((e) => !(e.t === "coin" && e.x < x0));
      hero = { x: x0 + 8, y: GROUND - 18, w: 10, h: 18, vy: 0, ground: true, jumps: 2, boost: 0, shield: 0, stumble: 0, inv: 0, frame: 0 };
      camX = hero.x - HERO_X; score = ckScore; parts = []; fx = []; burr = []; throwCD = 0; throwT = 0; msgT = 0; shake = 0;
    }
    function startLevel(n, keepScore) {
      level = n; ck = 0; paused = false; if (!keepScore) ckScore = 0; spawn(0); mode = "run"; overlay(null); if (ctx && ctx.onPlay) ctx.onPlay(); fit();
      el.querySelector("#ice-note").textContent = `Level ${n}: run to ${LEVELS[n - 1].name}. ${LEVELS[n - 1].hint}`; loop(); ctrl();
    }
    function overlay(html, cls = "") { ov.className = "ice-ov" + (html ? " on " + cls : ""); ov.innerHTML = html || ""; }
    const speed = () => LEVELS[level - 1].speed * (reduced() ? 0.85 : 1) * (hero.boost > 0 ? 1.45 : 1) * (hero.stumble > 0 ? 0.5 : 1);
    function jump() {
      if (mode === "title") { startLevel(Math.min(st.levelMax, 1)); return; }
      if (mode !== "run") return;
      audio();
      if (hero.ground) { hero.vy = JUMP; hero.ground = false; hero.jumps = 1; SFX.jump(); puff(hero.x + 4, hero.y + hero.h, 3, "dust"); }
      else if (hero.jumps > 0) { hero.vy = JUMP2; hero.jumps = 0; SFX.jump2(); puff(hero.x + 5, hero.y + hero.h, 4, "spark"); }
    }
    // v41: 🌯 throw a burrito ahead (a gentle arc); up to 3 in the air, a short cooldown
    function throwB() {
      if (mode === "title") { startLevel(1); return; }
      if (mode !== "run" || throwCD > 0 || burr.length >= 3) return;
      audio(); throwCD = 0.38; throwT = 0.22; thrown++; SFX.toss();
      burr.push({ x: hero.x + 9, y: hero.y + 5, vx: speed() + 150, vy: -34, rot: 0 });
    }
    function release() { if (mode === "run" && hero.vy < -110) hero.vy *= 0.55; }   // short tap = short hop
    // ---- particles: dust when he runs and lands, sparkles on conchas and power-ups (none with reduce motion)
    const SPARK = ["#ff3d8b", "#c8fbfb", "#ffc2dc", "#ff7ab0"];   // pinks + icy white: no orange (over teal) or turquoise (over orange) sparks, those blends read olive
    function puff(x, y, n, kind) {
      if (reduced()) return;
      for (let i = 0; i < n; i++) {
        fxMade++;
        if (kind === "dust") fx.push({ k: "dust", x: x + Math.random() * 4 - 2, y: y - 1 - Math.random() * 2, vx: -6 - Math.random() * 20, vy: -6 - Math.random() * 14, life: 0.3 + Math.random() * 0.25, c: Math.random() < 0.5 ? "#e8edf2" : "#b7bdc6" });
        else { const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, sp = 24 + Math.random() * 40;
          fx.push({ k: "spark", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8, life: 0.4 + Math.random() * 0.35, c: SPARK[i % 4] }); }
      }
      if (fx.length > 180) fx.splice(0, fx.length - 180);
    }
    function caught() {
      mode = "caught"; caughtMsg = CAUGHT[Math.floor(Math.random() * CAUGHT.length)]; SFX.caught(); if (!reduced()) shake = 0.25;
      st.best = Math.max(st.best, score); save(st); stats();
      overlay(`<p class="sr-only">${caughtMsg}</p><p class="ice-caught">Try again, from the ${ck ? "checkpoint 🚩" : "start"}.</p>`, "soft caught");
      setTimeout(() => { if (mode === "caught") { spawn(ck); mode = "run"; overlay(null); } }, 1400);
    }
    function clear() {
      const L = LEVELS[level - 1]; score += 500; ckScore = score; st.best = Math.max(st.best, score);
      SFX.clear(); puff(hero.x + 5, hero.y, 16, "spark");
      if (level === 5) {
        mode = "win"; st.wins++; st.levelMax = 5; save(st); stats();
        if (!reduced()) for (let i = 0; i < 110; i++) parts.push({ x: Math.random() * W, y: -Math.random() * H, vy: 20 + Math.random() * 40, c: ["#00b8b0", "#ff3d8b", "#ff6c1c", "#c9d0d8", "#ffffff"][i % 5] });
        overlay(`<p class="ice-big">Welcome home, kid!</p><p class="ice-win-score">Final score <b>${score}</b></p><p class="ice-btns"><button type="button" class="lot-btn lot-main" data-act="again">▶ Play again</button><button type="button" class="lot-btn" data-act="menu">☰ Title screen</button></p>`, "win");
        el.querySelector("#ice-note").innerHTML = `🎉 He made it to Mom's house, and the whole family's celebrating. What a party! <span class="ice-score">Final score <b>${score}</b> · Best <b>${st.best}</b></span> <button type="button" class="lot-btn lot-main" data-act="again">▶ Play again</button>`;
        return;
      }
      st.levelMax = Math.max(st.levelMax, level + 1); save(st); stats();
      mode = "clear";
      overlay(`<p class="ice-big">You made it to ${L.name}!</p><p>+500 · Score <b>${score}</b></p><button type="button" class="lot-btn lot-main" data-act="next">▶ Level ${level + 1}: ${LEVELS[level].name}</button>`, "clear");
      el.querySelector("#ice-note").textContent = `Next up: ${LEVELS[level].name}. ${LEVELS[level].hint}`;
    }
    function update(dt) {
      t += dt;
      for (const p of fx) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.k === "dust" ? 18 : 70) * dt; }
      if (fx.length) fx = fx.filter((p) => p.life > 0);
      if (mode === "win") { for (const p of parts) { p.y += p.vy * dt; if (p.y > H) p.y -= H + 10; } return; }
      if (mode !== "run") return;
      const h = hero, vx = speed(), wasGround = h.ground;
      h.boost = Math.max(0, h.boost - dt); h.stumble = Math.max(0, h.stumble - dt); h.inv = Math.max(0, h.inv - dt);
      throwCD = Math.max(0, throwCD - dt); throwT = Math.max(0, throwT - dt);
      for (const b of burr) {   // burritos: fly, spin, bonk the first walking agent they touch, splat on the ground, crates and SUVs
        b.x += b.vx * dt; b.vy += 150 * dt; b.y += b.vy * dt; b.rot += dt * 14;
        const bb = { x: b.x - 3, y: b.y - 1.5, w: 6, h: 3 };
        const ag = ents.find((e) => e.t === "agent" && !e.gone && e.st === "walk" && hit(bb, e, 0));
        if (ag) { ag.st = "bonked"; ag.tt = 2.8; b.dead = true; bonks++; score += 100; SFX.bonk(); msg = "Burrito bonk!"; msgT = 1.1; puff(ag.x + 5, ag.y + 2, 10, "spark"); continue; }
        const wall = ents.find((e) => (e.t === "crate" || e.t === "suv") && hit(bb, e, 0));
        if (wall || b.y >= GROUND - 1.5) { b.dead = true; SFX.splat(); puff(b.x, Math.min(b.y, GROUND - 1), 5, "dust"); continue; }
        if (b.x > camX + W + 30) b.dead = true;
      }
      if (burr.length) burr = burr.filter((b) => !b.dead);
      h.x += vx * dt; h.frame += vx * dt / 7;
      const prevBottom = h.y + h.h;
      h.vy += GRAV * dt; h.y += h.vy * dt; h.ground = false;
      if (h.y + h.h >= GROUND) { h.y = GROUND - h.h; h.vy = 0; h.ground = true; h.jumps = 2; }
      for (const e of ents) {
        if (e.gone) continue;
        if (e.t === "agent") {
          e.tt = Math.max(0, e.tt - dt);
          if (e.st === "walk") { e.x += e.vx * dt; if (e.x < e.home - 60 || e.x > e.home + 10) e.vx = -e.vx;
            const cone = ents.find((c) => c.t === "cone" && !c.down && Math.abs(c.x - e.x) < 5);
            if (cone) { e.st = "tripped"; e.tt = 2.2; cone.down = true; puff(e.x + 4, GROUND, 4, "dust"); } }
          else if (e.tt === 0) e.st = "walk";
        }
        if (e.t === "flag" && !e.done && h.x >= e.x) { e.done = true; ck = CHECKS.indexOf(e.x); ckScore = score; SFX.check(); msg = "Checkpoint!"; msgT = 1.2; puff(e.x + 4, e.y + 3, 10, "spark"); }
        if ((e.t === "suv" || e.t === "crate") && h.x + h.w - 2 > e.x && h.x + 2 < e.x + e.w) {
          if (h.vy >= 0 && prevBottom <= e.y + 3 && h.y + h.h >= e.y) { h.y = e.y - h.h; h.vy = 0; h.ground = true; h.jumps = 2; }   // landed on the roof
          else if (h.y + h.h > e.y + 3 && h.x + h.w - 2 < e.x + 8) {
            if (h.shield > 0 || h.inv > 0) { if (!h.inv) { h.shield = 0; h.inv = 1; SFX.shield(); puff(h.x + 5, h.y + 8, 8, "spark"); } h.vy = JUMP; h.y = e.y - h.h - 1; }
            else if (e.t === "suv") { caught(); return; }
            else { h.x = e.x - h.w + 1; h.stumble = 0.4; puff(h.x + 8, h.y + h.h, 3, "dust"); }   // bumped a crate: a stumble
          }
        }
        // v41: land on an agent's cap = a cartoon stomp (he's squashed flat for a moment) and a bounce
        if (e.t === "agent" && e.st === "walk" && h.vy > 0 && prevBottom <= e.y + 4 && hit(h, e, 1)) {
          e.st = "stomped"; e.tt = 3; h.vy = JUMP * 0.8; h.y = e.y - h.h; h.ground = false; h.jumps = 1; stomps++; score += 150;
          SFX.stomp(); msg = "Stomp!"; msgT = 1.1; puff(e.x + 5, e.y, 10, "spark"); continue;
        }
        if (!hit(h, e)) continue;
        if (e.t === "coin") { e.gone = true; score += 10; SFX.coin(); puff(e.x + 3, e.y + 2, 5, "spark"); }
        else if (e.t === "cup") { e.gone = true; h.boost = 5; score += 50; SFX.power(); msg = "Coffee! Speed boost"; msgT = 1.5; puff(e.x + 4, e.y + 4, 16, "spark"); }
        else if (e.t === "chancla") { e.gone = true; h.shield = 1; score += 50; SFX.power(); msg = "Flip-flop! Shield on"; msgT = 1.5; puff(e.x + 4, e.y + 3, 16, "spark"); }
        else if (e.t === "cone" && !e.down) { e.down = true; h.stumble = 0.6; SFX.cone(); puff(e.x + 3, GROUND, 4, "dust"); }
        else if (e.t === "agent" && e.st === "walk" && hit(h, e, 3)) {
          if (h.inv > 0) continue;
          if (h.shield > 0) { h.shield = 0; h.inv = 1.2; e.st = "dizzy"; e.tt = 2.5; SFX.shield(); msg = "Huh? He's dizzy!"; msgT = 1.3; score += 100; puff(e.x + 5, e.y, 10, "spark"); }
          else { caught(); return; }
        }
      }
      // a clean hop over an agent: a few bonus points
      for (const e of ents) if (e.t === "agent" && !e.passed && h.x > e.x + e.w) { e.passed = true; score += 25; }
      // dust: little puffs behind his boots while he runs, a bigger one when he lands
      if (h.ground && !wasGround) puff(h.x + 5, h.y + h.h, 6, "dust");
      else if (h.ground) { dustT -= dt; if (dustT <= 0) { dustT = h.boost > 0 ? 0.06 : 0.13; puff(h.x + 1, h.y + h.h, 1, "dust"); } }
      camX = h.x - HERO_X;
      if (h.x >= END) clear();
      msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt);
    }
    // ======================================================================================================
    // ---- v41 HD drawing kit. Everything is in game units; the context is scaled by S backing px per unit.
    // World drawing is translated so GROUND sits STREET units above the bottom; the translate is whole backing px.
    // ======================================================================================================
    let S = 3, TX = 0, TY = 0, cacheLv = 0;
    const cache = new Map();
    const dropCache = () => { for (const sp of cache.values()) { sp.cv.width = 0; sp.cv.height = 0; } cache.clear(); };
    const OL = () => Math.max(0.5, 1.5 / S);                     // outline width: never thinner than ~1.5 backing px
    const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function shade(hex, k) {   // toward black (k < 0) or white (k > 0): the hue never moves
      const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
      return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("");
    }
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    function lin(c, x0, y0, x1, y1, ...stops) { const gr = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / Math.max(1, stops.length - 1), s)); return gr; }
    function rad(c, x, y, r0, r1, ...stops) { const gr = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => gr.addColorStop(i / Math.max(1, stops.length - 1), s)); return gr; }
    function rrect(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function oval(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
    function poly(c, pts, close = true) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); if (close) c.closePath(); }
    function paint(c, fillStyle, stroke = INK, w = 0) { if (fillStyle) { c.fillStyle = fillStyle; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w || OL(); c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); } }
    function line(c, pts, col, w) { poly(c, pts, false); c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
    function limb(c, pts, w, col) {   // an outlined capsule chain (arms, legs)
      poly(c, pts, false); c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = INK; c.lineWidth = w + OL() * 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    }
    function words(c, s, x, y, size, col, o = {}) {
      c.save(); c.font = `${o.weight || 900} ${size}px ${FONT}`; c.textAlign = o.align || "center"; c.textBaseline = "middle";
      if (o.max) { const w = c.measureText(s).width; if (w > o.max) { c.translate(x, y); c.scale(o.max / w, 1); c.translate(-x, -y); } }
      if (o.stroke) { c.lineJoin = "round"; c.miterLimit = 2; c.lineWidth = o.sw || size * 0.3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
      if (o.drop) { c.fillStyle = o.drop; c.fillText(s, x + size * 0.05, y + size * 0.1); }
      if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = size * 0.7 * S; }
      c.fillStyle = col; c.fillText(s, x, y); c.restore();
    }
    function measure(c, s, size, weight = 900) { c.save(); c.font = `${weight} ${size}px ${FONT}`; const w = c.measureText(s).width; c.restore(); return w; }
    function star(c, x, y, r, r2 = r * 0.4, n = 4, rot = 0) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r2 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
    // offscreen sprites at full resolution: drawn once (per level / per scale) and blitted on whole backing pixels
    function sprite(key, x0, y0, w, h, fn) {
      let sp = cache.get(key); if (sp) return sp;
      const cvs = document.createElement("canvas"); cvs.width = Math.max(1, Math.ceil(w * S)); cvs.height = Math.max(1, Math.ceil(h * S));
      const c = cvs.getContext("2d"); c.setTransform(S, 0, 0, S, -x0 * S, -y0 * S); fn(c);
      sp = { cv: cvs, x0, y0 }; cache.set(key, sp); return sp;
    }
    function blit(sp, x, y) { const bx = Math.round((x + sp.x0) * S), by = Math.round((y + sp.y0) * S); g.drawImage(sp.cv, bx / S, by / S, sp.cv.width / S, sp.cv.height / S); }
    const worldT = () => g.setTransform(S, 0, 0, S, TX, TY), screenT = () => g.setTransform(S, 0, 0, S, 0, 0);
    const par = () => (reduced() ? 0 : 1);
    const night = () => level === 5;
    // a parallax layer: one period drawn once (3× so shapes that cross the seam wrap), tiled across the screen
    function layer(key, per, y0, h, f, fn) {
      const sp = sprite(key, 0, y0, per, h, (c) => { for (const k of [-1, 0, 1]) { c.save(); c.translate(k * per, 0); fn(c); c.restore(); } });
      const off = -mod(camX * f * par(), per);
      for (let x = off; x < W; x += per) blit(sp, x, 0);
    }
    // ---- sky: gradient, sun / sunset / moon with a glow, stars, puffy clouds, grackles
    function cloud(c, big, cols) {
      const puffs = big ? [[6, 5, 5], [13, 3, 6.5], [21, 4.5, 5.5], [27, 6, 4]] : [[5, 4, 4], [11, 2.5, 5], [17, 4.5, 4]];
      const w = big ? 33 : 22;
      c.save(); c.beginPath(); for (const [x, y, r] of puffs) { c.moveTo(x + r, y + 3); c.arc(x, y + 3, r, 0, TAU); } rrect(c, 1, 5, w - 2, 5, 2.5);
      c.fillStyle = lin(c, 0, -3, 0, 10, cols[0], cols[0], cols[1]); c.fill();
      c.globalCompositeOperation = "source-atop"; c.fillStyle = rgba(cols[1], 0.5); c.fillRect(0, 8, w, 3);
      c.fillStyle = "rgba(255,255,255,.55)"; for (const [x, y, r] of puffs) { oval(c, x - r * 0.25, y + 3 - r * 0.45, r * 0.45, r * 0.25); c.fill(); }
      c.restore();
    }
    function sky() {
      const L = LEVELS[level - 1], top = oy();
      g.fillStyle = lin(g, 0, top, 0, GROUND, L.sky[0], L.sky[0], L.sky[1]); g.fillRect(-4, top - 4, W + 8, GROUND - top + 8);
      const glow = (x, y, r, col, a) => { g.fillStyle = rad(g, x, y, 0, r, rgba(col, a), rgba(col, a * 0.35), rgba(col, 0)); g.fillRect(x - r, y - r, r * 2, r * 2); };
      if (night()) {   // stars (a few twinkle) and the moon
        for (let i = 0; i < 58; i++) { const sx = (i * 53 + 7) % W + ((i * 7) % 5) * 0.3, sy = top + 26 + (i * 29) % Math.max(40, GROUND - top - 110), tw = reduced() ? 1 : 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
          g.globalAlpha = tw; g.fillStyle = i % 7 === 0 ? "#7ff0f2" : i % 5 === 0 ? PKL : WH;
          if (i % 9 === 0) { star(g, sx, sy, 1.3, 0.35); g.fill(); } else { oval(g, sx, sy, 0.45, 0.45); g.fill(); } }
        g.globalAlpha = 1;
        glow(120, top + 46, 28, "#bfd4ff", 0.35);
        oval(g, 120, top + 46, 8, 8); paint(g, rad(g, 117, top + 43, 1, 9, "#ffffff", "#e6ecf2", "#b9c4d6"), null);
        g.fillStyle = "rgba(120,135,170,.35)"; for (const [cx, cy, r] of [[117, 43, 1.8], [123, 49, 1.3], [118.5, 50, 0.9], [124, 42, 0.8]]) { oval(g, cx, top + cy, r, r); g.fill(); }
      } else if (level !== 3) {
        glow(122, top + 44, 40, "#ffffff", 0.55);
        if (!reduced()) { g.save(); g.translate(122, top + 44); g.rotate(t * 0.05); g.fillStyle = "rgba(255,255,255,.10)";
          for (let i = 0; i < 10; i++) { g.rotate(TAU / 10); poly(g, [0, 0, -3.5, -75, 3.5, -75]); g.fill(); } g.restore(); }
        oval(g, 122, top + 44, 9, 9); paint(g, rad(g, 120, top + 42, 1, 9, "#ffffff", "#f4fbff", "#dff3ff"), null);
      } else { glow(42, GROUND - 58, 46, "#ffb8a6", 0.7); oval(g, 42, GROUND - 58, 13, 13); paint(g, lin(g, 0, GROUND - 71, 0, GROUND - 45, "#ffe3dc", "#ffb8a6", "#ff8e7a"), null); }
      if (!night()) {   // drifting clouds (still with reduce motion)
        const cols = level === 3 ? ["#fff2f6", "#f4bfd3"] : ["#ffffff", "#cfe2f0"], span = W + 80;
        const big = sprite("cloudB" + level, -2, -6, 38, 20, (c) => cloud(c, true, cols)), small = sprite("cloudS" + level, -2, -6, 26, 18, (c) => cloud(c, false, cols));
        [[10, 30, 1], [70, 52, 0], [128, 22, 1], [190, 70, 0], [240, 40, 1]].forEach(([cx, cy, b]) => {
          const x = mod(cx - camX * 0.05 * par() - t * 3 * par(), span) - 40; blit(b ? big : small, x, top + cy - 4); });
        if (!reduced()) for (let i = 0; i < 3; i++) {   // grackles flapping across
          const bx = mod(60 * i - t * (10 + i * 3) - camX * 0.08, W + 40) - 20, by = top + 58 + i * 13 + Math.sin(t * 2 + i) * 2, f = Math.sin(t * 12 + i * 2) * 1.6;
          g.beginPath(); g.moveTo(bx - 3, by - f); g.quadraticCurveTo(bx - 1.3, by - 0.6, bx, by + 0.4); g.quadraticCurveTo(bx + 1.3, by - 0.6, bx + 3, by - f);
          g.strokeStyle = "#2b2346"; g.lineWidth = 0.7; g.lineCap = "round"; g.stroke();
        }
      }
    }
    // ---- far skyline (a generic observation tower, a mission-style dome, high-rises), hazy
    function farTile(c) {
      const L = LEVELS[level - 1], G = GROUND, nt = night(), base = L.far, r = rng(77 + level);
      const bl = (x, w, h) => { c.fillStyle = lin(c, x, 0, x + w, 0, shade(base, -0.05), base, shade(base, 0.06)); c.fillRect(x, G - h, w, h); c.fillStyle = shade(base, -0.1); c.fillRect(x, G - h, w, 1.2); };
      bl(10, 24, 104); bl(80, 22, 128); bl(190, 30, 116); bl(240, 18, 146); bl(262, 26, 98); bl(40, 32, 86);
      c.fillStyle = base; c.fillRect(243, G - 152, 12, 6); c.fillRect(84, G - 134, 14, 6); line(c, [249, G - 152, 249, G - 162], base, 0.8);
      oval(c, 249, G - 162.5, 0.9, 0.9); c.fillStyle = nt ? PKL : shade(base, -0.15); c.fill();
      // the tower: a tapered shaft, a round pod with a window band, a spire
      poly(c, [140.5, G, 146.5, G, 145, G - 168, 142, G - 168]); c.fillStyle = lin(c, 140, 0, 147, 0, shade(base, -0.06), shade(base, 0.05)); c.fill();
      rrect(c, 135, G - 178, 18, 11, 4); c.fillStyle = lin(c, 0, G - 178, 0, G - 167, shade(base, 0.05), shade(base, -0.06)); c.fill();
      c.fillStyle = nt ? rgba("#7ff0f2", 0.8) : rgba(L.win, 0.9); c.fillRect(136, G - 174.5, 16, 1.6);
      poly(c, [138, G - 178, 150, G - 178, 144, G - 182]); c.fillStyle = base; c.fill(); line(c, [144, G - 182, 144, G - 190], base, 0.7);
      // the dome: drum, dome, lantern
      c.fillStyle = base; c.fillRect(46, G - 94, 20, 8); c.beginPath(); c.ellipse(56, G - 94, 10, 9, 0, Math.PI, 0); c.fill();
      c.fillRect(54, G - 107, 4, 5); oval(c, 56, G - 108, 1.3, 1.3); c.fill();
      c.fillStyle = rgba(shade(base, 0.25), 0.6); c.beginPath(); c.ellipse(53, G - 96, 3, 6, -0.3, Math.PI * 1.1, Math.PI * 1.7); c.lineTo(53, G - 96); c.fill();
      // windows
      const wins = (x, y, cols, rows, dx, dy, w, h) => { for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const on = nt ? r() < 0.55 : true; if (!on) continue; c.fillStyle = nt ? (r() < 0.5 ? rgba(PKL, 0.85) : rgba("#7ff0f2", 0.85)) : rgba(L.win, 0.55 + r() * 0.3);
        c.fillRect(x + i * dx, y + j * dy, w, h); } };
      wins(13, G - 98, 3, 9, 7, 10, 3.2, 4.4); wins(83, G - 122, 3, 11, 6.5, 10, 2.8, 4); wins(193, G - 110, 4, 10, 7, 10, 3.4, 4.4); wins(243, G - 140, 2, 13, 7, 10.5, 4, 5); wins(265, G - 92, 3, 8, 7.5, 10, 3.6, 4.4);
      if (level === 3) for (const [bx, hh, jib] of [[120, 170, 1], [215, 150, -1]]) crane(c, bx, G, hh, jib, base, 0.8);
      // atmospheric haze toward the horizon
      c.fillStyle = lin(c, 0, G - 150, 0, G, rgba(L.sky[1], 0), rgba(L.sky[1], 0.12), rgba(L.sky[1], 0.5)); c.fillRect(0, G - 196, 300, 196);
    }
    function palm(c, x, base, hgt, lean, sc, outline) {   // a curved, ringed trunk and drooping fronds
      const topX = x + lean, topY = base - hgt;
      c.beginPath(); c.moveTo(x - 1.4 * sc, base); c.quadraticCurveTo(x + lean * 0.2 - 1 * sc, base - hgt * 0.55, topX - 0.7 * sc, topY);
      c.lineTo(topX + 0.7 * sc, topY); c.quadraticCurveTo(x + lean * 0.2 + 1 * sc, base - hgt * 0.55, x + 1.4 * sc, base); c.closePath();
      paint(c, lin(c, x - 2, 0, x + 2, 0, "#6a3430", "#8a4a44", "#6a3430"), outline, OL() * 0.8);   // reddish bark: no olive where the fronds blend in
      c.strokeStyle = "rgba(40,20,20,.35)"; c.lineWidth = 0.35;
      for (let k = 1; k < 9; k++) { const f = k / 9, yy = base - hgt * f, xx = x + lean * f * f; c.beginPath(); c.moveTo(xx - 1.2 * sc, yy + 0.4); c.quadraticCurveTo(xx, yy - 0.5, xx + 1.2 * sc, yy + 0.4); c.stroke(); }
      const fronds = [[-2.7, 1], [-2.2, 1.05], [-1.6, 0.9], [-0.9, 0.8], [-0.35, 0.95], [0.35, 1.05], [0.9, 0.85], [-3.0, 0.7]];
      for (const [a0, len] of fronds) {
        const L = 13 * sc * len, a = a0, ex = topX + Math.cos(a) * L, ey = topY + Math.sin(a) * L * 0.55 + L * 0.35, mx = topX + Math.cos(a) * L * 0.5, my = topY + Math.sin(a) * L * 0.5 - 1.5 * sc;
        const nx = -Math.sin(a) * 1.6 * sc, ny = Math.cos(a) * 1.6 * sc;
        c.beginPath(); c.moveTo(topX, topY); c.quadraticCurveTo(mx + nx, my + ny, ex, ey); c.quadraticCurveTo(mx - nx, my - ny, topX, topY); c.closePath();
        paint(c, lin(c, topX, topY - 3, ex, ey, "#3fae74", "#23875a", "#16663f"), outline || "#11492d", OL() * 0.8);
        c.beginPath(); c.moveTo(topX, topY); c.quadraticCurveTo(mx, my, ex, ey); c.strokeStyle = "rgba(10,50,30,.45)"; c.lineWidth = 0.3; c.stroke();
      }
      if (outline) { oval(c, topX - 0.6, topY + 0.8, 1.1, 1.1); paint(c, "#5a2618", outline, OL() * 0.6); oval(c, topX + 0.9, topY + 1.1, 1, 1); paint(c, "#6a2e1e", outline, OL() * 0.6); }   // coconuts (outlined palms only)
    }
    function crane(c, x, G, hh, dir, col, k) {   // a tower crane: lattice mast, jib, counter-jib, hook
      const m = 3.2 * k; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 0.7 * k;
      c.strokeRect(x, G - hh, m, hh); c.beginPath(); for (let y = G; y > G - hh; y -= m * 1.2) { c.moveTo(x, y); c.lineTo(x + m, y - m * 1.2); c.moveTo(x + m, y); c.lineTo(x, y - m * 1.2); } c.stroke();
      const jy = G - hh, jl = 58 * k * dir, cl = -18 * k * dir; c.fillRect(Math.min(x + m / 2 + cl, x + m / 2), jy - 1.2 * k, Math.abs(cl), 1.4 * k);
      c.beginPath(); c.moveTo(x + m / 2, jy - 9 * k); c.lineTo(x + m / 2 + jl, jy - 0.5); c.moveTo(x + m / 2, jy - 9 * k); c.lineTo(x + m / 2 + cl, jy - 0.5); c.stroke();
      c.fillRect(Math.min(x + m / 2, x + m / 2 + jl), jy - 1.6 * k, Math.abs(jl), 1.6 * k); c.fillRect(x + m / 2 + cl - 3 * k * dir - (dir < 0 ? 0 : 0), jy - 0.2, 5 * k, 4 * k);
      rrect(c, x - 1 * k, jy - 4 * k, m + 2 * k, 3.4 * k, 0.6); c.fill();
      const hx = x + m / 2 + jl * 0.7; c.beginPath(); c.moveTo(hx, jy); c.lineTo(hx, jy + 26 * k); c.lineWidth = 0.35 * k; c.stroke(); rrect(c, hx - 1.4 * k, jy + 26 * k, 2.8 * k, 1.6 * k, 0.4); c.fill();
    }
    function frame(c, x, G, w, hh, col) {   // a steel-frame building going up, with a green safety net on the top floors
      c.strokeStyle = shade(col, -0.1); c.lineWidth = 1.3;
      for (let fx = 0; fx <= w; fx += w / 3) { c.beginPath(); c.moveTo(x + fx, G); c.lineTo(x + fx, G - hh); c.stroke(); }
      for (let fy = 0; fy <= hh; fy += 12) { c.beginPath(); c.moveTo(x - 1, G - fy); c.lineTo(x + w + 1, G - fy); c.stroke(); }
      c.lineWidth = 0.4; for (let fy = 0; fy < hh - 12; fy += 12) for (let k = 0; k < 3; k++) { const x0 = x + k * w / 3; c.beginPath(); c.moveTo(x0, G - fy); c.lineTo(x0 + w / 3, G - fy - 12); c.stroke(); }
      c.fillStyle = rgba(TQ, 0.35); c.fillRect(x - 1, G - hh, w + 2, 24);
    }
    // ---- mid-rise blocks with windows, a water tower, a billboard, palms
    function midTile(c) {
      const L = LEVELS[level - 1], G = GROUND, nt = night(), m = L.mid, r = rng(313 + level);
      const block = (x, y, w, h) => {
        c.fillStyle = lin(c, x, 0, x + w, 0, shade(m, -0.12), m, m, shade(m, 0.08)); c.fillRect(x, y, w, h);
        c.fillStyle = shade(m, -0.2); c.fillRect(x - 1, y - 1.5, w + 2, 2); c.fillStyle = shade(m, 0.15); c.fillRect(x - 1, y - 1.5, w + 2, 0.5);
      };
      block(0, G - 108, 46, 108); block(180, G - 94, 52, 94);
      c.fillStyle = shade(m, -0.08); c.fillRect(4, G - 113, 10, 5); c.fillRect(30, G - 112, 7, 4); c.fillRect(190, G - 98, 12, 4);   // rooftop boxes
      const win = (x, y, w, h, lit) => { rrect(c, x - 0.6, y - 0.6, w + 1.2, h + 1.2, 0.6); c.fillStyle = shade(m, -0.25); c.fill();
        c.fillStyle = nt ? (lit ? lin(c, 0, y, 0, y + h, lit, shade(lit, -0.25)) : shade(m, -0.35)) : lin(c, 0, y, 0, y + h, shade(L.win, 0.3), L.win, shade(L.win, -0.12)); c.fillRect(x, y, w, h);
        if (!nt) { c.fillStyle = "rgba(255,255,255,.35)"; poly(c, [x, y + h * 0.7, x + w * 0.6, y, x + w, y, x, y + h]); c.fill(); }
        c.fillStyle = shade(m, -0.3); c.fillRect(x - 0.5, y + h, w + 1, 0.7); };
      for (let i = 0; i < 16; i++) win(5 + (i % 4) * 10, G - 102 + Math.floor(i / 4) * 11, 5, 6, nt && i % 3 !== 1 ? PKL : null);
      for (let i = 0; i < 12; i++) win(186 + (i % 4) * 11, G - 88 + Math.floor(i / 4) * 11, 6, 6, nt && i % 4 !== 2 ? "#7ff0f2" : null);
      if (nt) { c.save(); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 16; i++) if (i % 3 !== 1) { const x = 7.5 + (i % 4) * 10, y = G - 99 + Math.floor(i / 4) * 11; c.fillStyle = rad(c, x, y, 0, 6, "rgba(255,143,191,.18)", "rgba(255,143,191,0)"); c.fillRect(x - 6, y - 6, 12, 12); } c.restore(); }
      // water tower on legs
      const tc = shade(m, -0.06);
      line(c, [60.5, G, 61.5, G - 86], tc, 1.6); line(c, [73.5, G, 72.5, G - 86], tc, 1.6); line(c, [61, G - 70, 73, G - 52], tc, 0.6); line(c, [73, G - 70, 61, G - 52], tc, 0.6);
      line(c, [61, G - 52, 73, G - 34], tc, 0.6); line(c, [73, G - 52, 61, G - 34], tc, 0.6); line(c, [61, G - 70, 73, G - 70], tc, 0.8); line(c, [61, G - 52, 73, G - 52], tc, 0.8);
      rrect(c, 58, G - 102, 18, 16, 2); c.fillStyle = lin(c, 58, 0, 76, 0, shade(m, -0.15), shade(m, 0.08), shade(m, -0.1)); c.fill();
      c.fillStyle = shade(m, -0.22); for (const yy of [G - 98, G - 92]) c.fillRect(58, yy, 18, 0.8);
      poly(c, [57, G - 102, 77, G - 102, 67, G - 110]); c.fillStyle = lin(c, 57, 0, 77, 0, shade(m, -0.12), shade(m, 0.1)); c.fill(); line(c, [67, G - 110, 67, G - 113], tc, 0.6);
      if (L.board) {   // a billboard (plain words, no brands)
        const bw = Math.max(50, measure(c, L.board, 7) + 12), bx = 98;
        line(c, [bx + 9, G, bx + 9, G - 82], shade(m, -0.1), 1.6); line(c, [bx + bw - 9, G, bx + bw - 9, G - 82], shade(m, -0.1), 1.6); line(c, [bx + 9, G - 60, bx + bw - 9, G - 72], shade(m, -0.1), 0.6);
        rrect(c, bx, G - 105, bw, 23, 1.5); paint(c, INK, null);
        rrect(c, bx + 1.6, G - 103.4, bw - 3.2, 19.8, 1); c.fillStyle = lin(c, 0, G - 103, 0, G - 84, "#ffffff", "#eef1f5"); c.fill();
        c.fillStyle = PK; c.fillRect(bx + 1.6, G - 88.5, bw - 3.2, 4.8);
        c.fillStyle = TQ; c.fillRect(bx + 1.6, G - 88.5, bw - 3.2, 0.9);
        words(c, L.board, bx + bw / 2, G - 95, 7, INK, { max: bw - 8 });
        for (let i = 0; i < 3; i++) { const lx = bx + 8 + i * ((bw - 16) / 2); line(c, [lx, G - 105, lx, G - 107.5], "#8a93a8", 0.5); oval(c, lx, G - 108, 1.3, 0.8); paint(c, level === 4 ? "#ffe0ec" : "#c9d0d8", INK, 0.3); }
      }
      if (level === 3) { frame(c, 150, G, 34, 84, m); crane(c, 88, G, 104, 1, shade(m, -0.1), 1); }
      else if (level !== 5) { palm(c, 88, G, 76, 3, 1, null); palm(c, 172, G, 72, -3, 1, null); }
      c.fillStyle = lin(c, 0, G - 60, 0, G, rgba(L.sky[1], 0), rgba(L.sky[1], 0.28)); c.fillRect(0, G - 120, 240, 120);
    }
    // ---- storefronts: stucco facade, cornice, neon sign, scalloped striped awning, window display, door
    function shop(c, x, i, L) {
      const G = GROUND, hh = [58, 50, 62, 54][i], top = G - 6 - hh, wall = L.near[i], stripe = FIESTA[(i + level) % 3], bot = G - 6;
      rrect(c, x, top, 70, hh + 1, 0.8); paint(c, lin(c, x, 0, x + 70, 0, shade(wall, -0.1), wall, wall, shade(wall, -0.06)), INK);
      c.save(); rrect(c, x, top, 70, hh + 1, 0.8); c.clip();
      c.fillStyle = rgba(shade(wall, -0.5), 0.07); for (let yy = top + 4; yy < bot; yy += 3.2) for (let xx = x + ((yy / 3.2) % 2) * 3; xx < x + 70; xx += 6) c.fillRect(xx, yy, 5.4, 0.35);   // brick/stucco texture
      c.fillStyle = lin(c, 0, top + 29, 0, top + 36, "rgba(29,20,38,.28)", "rgba(29,20,38,0)"); c.fillRect(x, top + 29, 70, 7);   // the awning's shadow
      c.restore();
      rrect(c, x - 1.2, top - 1.4, 72.4, 3.2, 0.8); paint(c, lin(c, 0, top - 1.4, 0, top + 1.8, shade(wall, 0.35), shade(wall, -0.25)), INK);   // cornice
      for (let k = x + 3; k < x + 68; k += 5) { c.fillStyle = shade(wall, -0.3); c.fillRect(k, top + 1.8, 2, 1); }
      const word = L.shops[i] || "", sw = Math.max(measure(c, word, 6.4) + 9, 28), sx = x + (70 - sw) / 2;
      rrect(c, sx, top + 5, sw, 12, 2); paint(c, lin(c, 0, top + 5, 0, top + 17, "#2a2140", INK), INK);
      rrect(c, sx + 1, top + 6, sw - 2, 10, 1.4); c.strokeStyle = rgba(["#3ee8eb", "#ffffff", PKL, "#3ee8eb"][i], 0.35); c.lineWidth = 0.35; c.stroke();
      words(c, word, x + 35, top + 11.2, 6.4, ["#3ee8eb", "#ffffff", PKL, "#3ee8eb"][i], { glow: ["#3ee8eb", "#ffffff", PKL, "#3ee8eb"][i], max: sw - 6 });
      // the awning: stripes, a scalloped hem, shading
      const ay = top + 20, ah = 8;
      c.save(); c.beginPath(); c.moveTo(x - 2, ay); c.lineTo(x + 72, ay); c.lineTo(x + 73, ay + ah);
      for (let s = 72; s >= -2; s -= 6) c.arc(x + s - 3 + 1, ay + ah, 3, 0, Math.PI, false);
      c.closePath(); c.fillStyle = WH; c.fill(); c.clip();
      for (let s = -2; s < 74; s += 12) { c.fillStyle = stripe; c.fillRect(x + s, ay, 6, ah + 4); }
      c.fillStyle = lin(c, 0, ay, 0, ay + ah + 3, "rgba(255,255,255,.35)", "rgba(29,20,38,0)", "rgba(29,20,38,.28)"); c.fillRect(x - 2, ay, 76, ah + 4);
      c.restore();
      c.beginPath(); c.moveTo(x - 2, ay); c.lineTo(x + 72, ay); c.lineTo(x + 73, ay + ah); for (let s = 72; s >= -2; s -= 6) c.arc(x + s - 2, ay + ah, 3, 0, Math.PI, false); c.closePath(); paint(c, null, INK);
      rrect(c, x - 2.5, ay - 1.2, 75, 2.2, 1); paint(c, shade(stripe === WH ? PK : stripe, -0.2), INK);
      // display window
      const wy = top + 32, wh = bot - wy - 2;
      rrect(c, x + 5, wy, 38, wh, 1); paint(c, INK, null);
      rrect(c, x + 6.4, wy + 1.4, 35.2, wh - 2.8, 0.6); c.fillStyle = lin(c, 0, wy, 0, wy + wh, "#d8f0ff", "#9fd8ff", "#7cc2ec"); c.fill();
      c.save(); rrect(c, x + 6.4, wy + 1.4, 35.2, wh - 2.8, 0.6); c.clip();
      const gy = bot - 4;   // goods on a shelf in the window
      c.fillStyle = "rgba(29,20,38,.25)"; c.fillRect(x + 6, gy + 0.2, 36, 1);
      for (let d = 0; d < 4; d++) { const gx = x + 9 + d * 8.3, col = FIESTA[(d + i) % 3], gh = 4 + ((d + i) % 3);
        if ((d + i) % 2) { rrect(c, gx, gy - gh, 5, gh, 1); paint(c, lin(c, gx, 0, gx + 5, 0, shade(col, 0.2), col, shade(col, -0.2)), INK, 0.35); rrect(c, gx - 0.3, gy - gh - 1, 5.6, 1.3, 0.4); paint(c, "#dfe4ea", INK, 0.3); oval(c, gx + 2.5, gy - gh / 2 + 0.3, 1.1, 1.1); c.fillStyle = WH; c.fill(); }
        else { oval(c, gx + 2.5, gy - gh / 2, 2.6, gh / 2); paint(c, rad(c, gx + 1.5, gy - gh * 0.7, 0.3, 3, shade(col, 0.45), col), INK, 0.35); } }
      c.fillStyle = "rgba(255,255,255,.45)"; poly(c, [x + 9, wy + wh, x + 22, wy, x + 27, wy, x + 14, wy + wh]); c.fill(); poly(c, [x + 29, wy + wh, x + 37, wy, x + 39, wy, x + 31, wy + wh]); c.fill();
      c.restore();
      rrect(c, x + 4, bot - 2.2, 40, 2, 0.6); paint(c, shade(wall, -0.2), INK, 0.4);   // sill
      // door
      rrect(c, x + 48, wy, 16, bot - wy + 0.5, 1); paint(c, lin(c, 0, wy, 0, bot, "#3a4460", "#2b3346"), INK);
      rrect(c, x + 50.5, wy + 3, 11, 10, 1); paint(c, lin(c, 0, wy + 3, 0, wy + 13, "#d8f0ff", "#9fd8ff"), INK, 0.4);
      c.fillStyle = "rgba(255,255,255,.5)"; poly(c, [x + 52, wy + 12, x + 57, wy + 4, x + 59, wy + 4, x + 54, wy + 12]); c.fill();
      oval(c, x + 60.5, bot - 11, 0.9, 0.9); paint(c, "#dfe4ea", INK, 0.3);
      rrect(c, x + 46.5, bot - 0.5, 19, 1.6, 0.5); paint(c, "#8a8f99", INK, 0.35);
    }
    function house(c, x, i, L) {   // Mom's street at night: little houses with porches, lit windows and a chain-link fence
      const G = GROUND, top = G - 44 - (i % 2) * 6, wall = L.near[i];
      rrect(c, x + 4, top, 62, G - 6 - top, 0.6); paint(c, lin(c, x + 4, 0, x + 66, 0, shade(wall, -0.18), wall, shade(wall, -0.08)), INK);
      c.fillStyle = rgba("#000000", 0.08); for (let yy = top + 3; yy < G - 6; yy += 2.5) c.fillRect(x + 4, yy, 62, 0.3);   // siding
      poly(c, [x - 1, top + 0.5, x + 35, top - 13, x + 71, top + 0.5]); paint(c, lin(c, 0, top - 13, 0, top, "#2a2248", "#1a1530"), INK);
      c.strokeStyle = "rgba(255,255,255,.07)"; c.lineWidth = 0.4; for (let k = 1; k < 5; k++) { const f = k / 5; c.beginPath(); c.moveTo(x - 1 + 36 * f, top + 0.5 - 13.5 * f); c.lineTo(x + 71 - 36 * f, top + 0.5 - 13.5 * f); c.stroke(); }
      const winLit = (wx, col) => {
        c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rad(c, wx + 6, top + 15, 0, 14, rgba(col, 0.28), rgba(col, 0)); c.fillRect(wx - 8, top + 1, 28, 28); c.restore();
        rrect(c, wx - 0.8, top + 9.2, 13.6, 11.6, 0.6); paint(c, "#2a2248", INK, 0.4);
        c.fillStyle = lin(c, 0, top + 10, 0, top + 20, shade(col, 0.4), col); c.fillRect(wx, top + 10, 12, 10);
        c.fillStyle = shade(wall, -0.2); c.fillRect(wx + 5.6, top + 10, 0.8, 10); c.fillRect(wx, top + 14.6, 12, 0.8);
      };
      winLit(x + 10, "#7ff0f2"); winLit(x + 46, PKL);
      rrect(c, x + 28, G - 26, 12, 20, 0.8); paint(c, lin(c, 0, G - 26, 0, G - 6, "#4a2c24", "#2b1d17"), INK);
      oval(c, x + 37.5, G - 16, 0.7, 0.7); paint(c, "#dfe4ea", null);
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rad(c, x + 26.5, G - 29, 0, 9, "rgba(255,224,236,.5)", "rgba(255,224,236,0)"); c.fillRect(x + 17, G - 38, 19, 19); c.restore();
      oval(c, x + 26.5, G - 29, 1.2, 1.2); paint(c, "#ffe0ec", INK, 0.3);
      // chain-link fence
      c.strokeStyle = "rgba(170,180,200,.6)"; c.lineWidth = 0.3;
      for (let f = -6; f < 76; f += 2.2) { c.beginPath(); c.moveTo(x + f, G - 14); c.lineTo(x + f + 8, G - 6); c.moveTo(x + f + 8, G - 14); c.lineTo(x + f, G - 6); c.stroke(); }
      line(c, [x, G - 14, x + 70, G - 14], "#c9d0d8", 0.6);
      for (let f = 0; f <= 70; f += 17.5) line(c, [x + f, G - 15, x + f, G - 6], "#8a93a8", 0.8);
    }
    function jobsite(c, x, i, L) {   // the job site: a half-built block wrapped in scaffolding behind a plywood fence, lumber stacks
      const G = GROUND, top = G - 6 - [70, 58, 76, 62][i], wall = L.near[i];
      rrect(c, x + 6, top, 58, G - 6 - top, 0.6); paint(c, lin(c, x + 6, 0, x + 64, 0, "#aeb3bb", "#c9ced6", "#9aa0aa"), INK);   // bare concrete
      c.fillStyle = "rgba(60,64,80,.35)"; for (let yy = top + 12; yy < G - 6; yy += 12) c.fillRect(x + 6, yy, 58, 1);
      for (let yy = top + 3; yy < G - 14; yy += 12) for (let xx = x + 10; xx < x + 58; xx += 13) { rrect(c, xx, yy, 8, 6, 0.4); paint(c, "#3a3f52", null); }
      // scaffolding: poles, ledgers, braces, planks
      c.strokeStyle = INK; c.lineWidth = 0.9 + OL(); const poles = [x + 2, x + 24, x + 46, x + 68];
      const sc = (col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (const px of poles) { c.moveTo(px, G - 6); c.lineTo(px, top - 4); }
        for (let yy = G - 18; yy > top - 4; yy -= 12) { c.moveTo(x + 1, yy); c.lineTo(x + 69, yy); }
        for (let k = 0; k < 3; k++) for (let yy = G - 6; yy > top + 8; yy -= 24) { c.moveTo(poles[k], yy); c.lineTo(poles[k + 1], yy - 12); } c.stroke(); };
      sc(INK, 0.9 + OL() * 2); sc("#8a93a8", 0.9);
      for (let yy = G - 18; yy > top - 4; yy -= 12) { rrect(c, x + 1, yy - 1.4, 68, 1.4, 0.3); paint(c, lin(c, 0, yy - 1.4, 0, yy, WOOD_L, WOOD), INK, 0.35); }
      if (i % 2 === 0) { c.fillStyle = rgba(TQ, 0.28); c.fillRect(x + 2, top - 4, 22, G - top - 14); }   // a safety net on one bay
      // the plywood site fence with a warning stripe
      rrect(c, x - 1, G - 20, 72, 14, 0.4); paint(c, lin(c, 0, G - 20, 0, G - 6, WOOD_L, "#c47a4e"), INK);
      c.strokeStyle = rgba(WOOD_D, 0.6); c.lineWidth = 0.35; for (let k = x + 11; k < x + 70; k += 12) { c.beginPath(); c.moveTo(k, G - 20); c.lineTo(k, G - 6); c.stroke(); }
      c.save(); rrect(c, x - 1, G - 17, 72, 3, 0); c.clip(); c.fillStyle = WH; c.fillRect(x - 1, G - 17, 72, 3); c.fillStyle = OR; for (let k = -4; k < 74; k += 6) { poly(c, [x + k, G - 14, x + k + 3, G - 17, x + k + 6, G - 17, x + k + 3, G - 14]); c.fill(); } c.restore();
      c.strokeStyle = INK; c.lineWidth = 0.35; c.strokeRect(x - 1, G - 17, 72, 3);
      if (i === 1) { rrect(c, x + 22, G - 13, 26, 6, 1); paint(c, "#2a2140", INK); words(c, "HARD HAT AREA", x + 35, G - 10, 3.4, WH, { max: 23 }); }
    }
    function nearTile(c) { const L = LEVELS[level - 1]; for (let i = 0; i < 4; i++) (night() ? house : level === 3 ? jobsite : shop)(c, i * 74, i, L); }
    function papel() {   // papel picado (day) or string lights (night) across the street, level 4 and 5
      const off2 = -mod(camX * 0.6 * par(), 20), y0 = GROUND - 78;
      g.beginPath(); for (let x = off2 - 20; x <= W + 20; x += 20) { g.moveTo(x, y0); g.quadraticCurveTo(x + 10, y0 + 1.6, x + 20, y0); }
      g.strokeStyle = INK; g.lineWidth = 0.5; g.stroke();
      for (let x = off2 - 20, i = 0; x < W + 20; x += 10, i++) {
        const c = FIESTA[mod(i + Math.round(camX * 0.6 * par() / 10), 4)], yy = y0 + (i % 2 ? 0.8 : 0.3);
        if (night()) {
          const on = reduced() || Math.floor(t * 3 + i) % 4 !== 0;
          if (on) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rad(g, x + 3.5, yy + 3, 0, 6, rgba(c, 0.55), rgba(c, 0)); g.fillRect(x - 3, yy - 3, 13, 13); g.restore(); }
          line(g, [x + 3.5, yy, x + 3.5, yy + 1.4], INK, 0.5); oval(g, x + 3.5, yy + 3.1, 1.4, 1.9); paint(g, on ? rad(g, x + 3, yy + 2.5, 0.2, 2, WH, c) : shade(c === WH ? "#8a93a8" : c, -0.55), INK, 0.35);
        } else {
          const sway = reduced() ? 0 : Math.sin(t * 2.2 + i) * 0.08;
          g.save(); g.translate(x + 3.5, yy); g.rotate(sway);
          g.beginPath(); g.moveTo(-3.5, 0); g.lineTo(3.5, 0); g.lineTo(3.5, 5.2); for (let k = 0; k < 4; k++) g.quadraticCurveTo(2.6 - k * 1.75, 7.2, 1.75 - k * 1.75, 5.2 + (k === 3 ? 0 : 0)); g.lineTo(-3.5, 5.2); g.closePath();
          paint(g, c, INK, 0.35);
          g.fillStyle = c === WH ? PK : WH; oval(g, 0, 2.6, 1.1, 1.1); g.fill(); star(g, -2, 1.3, 0.8, 0.3); g.fill(); star(g, 2, 1.3, 0.8, 0.3); g.fill(); g.fillRect(-2.6, 4.2, 5.2, 0.4);
          g.restore();
        }
      }
    }
    // ---- the street: sidewalk slabs, curb, textured asphalt, lane lines, manholes, a lowrider, the talavera-tile wall
    function asphaltTile(c, h) {
      const r = rng(4242);
      for (let i = 0; i < 260; i++) { c.fillStyle = r() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.12)"; const s = 0.3 + r() * 0.6; c.fillRect(r() * 48, r() * h, s, s); }
      c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 0.35; c.beginPath(); c.moveTo(7, h * 0.3); c.lineTo(11, h * 0.36); c.lineTo(10, h * 0.45); c.moveTo(31, h * 0.7); c.lineTo(36, h * 0.66); c.stroke();
    }
    function lowrider(c, nt) {   // 32 × 11, pink with a turquoise pinstripe and chrome wires
      c.beginPath(); c.moveTo(0.5, 7.5); c.lineTo(0.8, 4.4); c.quadraticCurveTo(2, 3.3, 6, 3.2); c.lineTo(8.5, 0.6); c.quadraticCurveTo(14, -0.4, 21, 0.4); c.lineTo(24.5, 3.2); c.quadraticCurveTo(30.5, 3.3, 31.5, 4.8); c.lineTo(31.6, 7.6); c.closePath();
      paint(c, lin(c, 0, 0, 0, 8, "#ff8fbf", PK, PKD), INK);
      poly(c, [9.3, 1.3, 14.5, 0.9, 14.5, 3.2, 7.6, 3.2]); paint(c, lin(c, 0, 1, 0, 3, "#d8f0ff", "#8cc6e8"), INK, 0.35);
      poly(c, [15.6, 0.9, 20.6, 1.1, 23.3, 3.2, 15.6, 3.2]); paint(c, lin(c, 0, 1, 0, 3, "#d8f0ff", "#8cc6e8"), INK, 0.35);
      line(c, [1.5, 5.3, 30.5, 5.3], TQ, 0.55); line(c, [0.6, 7.3, 31.5, 7.3], "#c9d0d8", 0.7);
      oval(c, 31, 4.8, 0.7, 0.55); c.fillStyle = WH; c.fill(); oval(c, 1, 4.9, 0.6, 0.5); c.fillStyle = "#ff2a5f"; c.fill();
      for (const wx of [7, 24.5]) { oval(c, wx, 8, 2.9, 2.9); paint(c, "#15121c", INK, 0.3); oval(c, wx, 8, 1.8, 1.8); paint(c, rad(c, wx - 0.5, 7.5, 0.1, 1.9, "#ffffff", "#aeb6c2", "#6c7482"), null);
        c.strokeStyle = "rgba(60,64,80,.8)"; c.lineWidth = 0.18; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.beginPath(); c.moveTo(wx, 8); c.lineTo(wx + Math.cos(a) * 1.7, 8 + Math.sin(a) * 1.7); c.stroke(); } }
    }
    function talavera(c, col, nt) {   // one 10 × 10 glazed tile
      const wh = nt ? "#3a3f52" : WH;
      rrect(c, 0, 0, 10, 10, 1); paint(c, lin(c, 0, 0, 10, 10, shade(col, 0.15), col, shade(col, -0.18)), null);
      rrect(c, 1.3, 1.3, 7.4, 7.4, 3.7); c.fillStyle = wh; c.fill();
      star(c, 5, 5, 3.1, 1.2, 4, Math.PI / 4); c.fillStyle = col; c.fill(); oval(c, 5, 5, 0.9, 0.9); c.fillStyle = wh; c.fill();
      for (const [qx, qy] of [[0, 0], [10, 0], [0, 10], [10, 10]]) { c.beginPath(); c.moveTo(qx, qy); c.arc(qx, qy, 1.5, 0, TAU); c.fillStyle = wh; c.fill(); }
      c.fillStyle = "rgba(255,255,255,.3)"; oval(c, 3, 2.2, 2.2, 0.7, -0.4); c.fill();
    }
    function street() {
      const bot = oy() + H, nt = night(), road = GROUND + 14, lane = road + Math.round((bot - road - 16) / 2);
      g.fillStyle = lin(g, 0, GROUND - 6, 0, GROUND, nt ? "#3a3f55" : "#a3aab5", nt ? "#4b5170" : "#bfc5ce"); g.fillRect(0, GROUND - 6, W, 6);   // the back of the sidewalk (props stand here)
      g.fillStyle = lin(g, 0, GROUND, 0, GROUND + 11, nt ? "#6a7092" : "#eceef1", nt ? "#50567a" : "#c3c8d0"); g.fillRect(0, GROUND, W, 11);
      g.fillStyle = nt ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.8)"; g.fillRect(0, GROUND, W, 0.6);
      const j = nt ? "rgba(20,20,40,.45)" : "rgba(60,64,80,.28)";
      for (let x = -mod(camX, 16); x < W + 16; x += 16) { line(g, [x, GROUND + 0.6, x - 1.5, GROUND + 11], j, 0.4); line(g, [x - 6, GROUND - 6, x - 6, GROUND], j, 0.35); }
      g.fillStyle = lin(g, 0, GROUND + 11, 0, GROUND + 14, nt ? "#8a93a8" : "#dfe3e8", "#8a8f99", "#5d626d"); g.fillRect(0, GROUND + 11, W, 3);   // curb
      g.fillStyle = lin(g, 0, road, 0, bot, nt ? "#1f2132" : "#2e2f37", nt ? "#2a2c40" : "#3d3e47", nt ? "#222436" : "#34353d"); g.fillRect(0, road, W, bot - road);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, road, W, 1.2);
      const ah = Math.max(10, Math.ceil(bot - road)), at = sprite("asph" + ah, 0, 0, 48, ah, (c) => asphaltTile(c, ah));
      for (let x = -mod(camX, 48); x < W; x += 48) blit(at, x, road);
      if (level === 2) {   // the big-box parking lot: white stall lines
        for (let x = -mod(camX, 22); x < W + 22; x += 22) { rrect(g, x, road + 4, 0.9, 16, 0.4); g.fillStyle = "rgba(235,240,245,.85)"; g.fill(); rrect(g, x, bot - 26, 0.9, 16, 0.4); g.fill(); }
        g.fillStyle = "rgba(235,240,245,.85)"; g.fillRect(0, lane + 1, W, 0.9);
      } else for (let x = -mod(camX, 24); x < W + 24; x += 24) { rrect(g, x, lane, 12, 1.8, 0.8); g.fillStyle = nt ? "#9aa3b5" : "#eef1f4"; g.fill(); }
      for (let x = -mod(camX, 190) + 60; x < W + 12; x += 190) { oval(g, x + 6, lane + 11.5, 6.4, 2.1); paint(g, lin(g, 0, lane + 9, 0, lane + 14, "#4a4d57", "#22232b"), "#15161c", 0.5);
        g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 0.3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + 6 + k * 2 - 1, lane + 10.3); g.lineTo(x + 6 + k * 2 + 1, lane + 12.7); g.stroke(); } }
      if (!reduced()) {   // a lowrider cruising by the other way
        const cx = W + 40 - mod(t * 34 + camX, W + 110), cy = lane + 3.5, lr = sprite("lowrider" + (nt ? 1 : 0), -1, -1.5, 34, 13.5, (c) => lowrider(c, nt));
        g.fillStyle = "rgba(0,0,0,.3)"; oval(g, cx + 16, cy + 11, 16, 1.4); g.fill();
        if (nt) { g.save(); g.globalCompositeOperation = "lighter"; poly(g, [cx + 1, cy + 4.5, cx - 22, cy + 1, cx - 22, cy + 10]); g.fillStyle = lin(g, cx, 0, cx - 22, 0, "rgba(255,255,255,.35)", "rgba(255,255,255,0)"); g.fill(); g.restore(); }
        blit(lr, cx, cy);
      }
      // the near curb and a talavera-tile planter wall in the foreground (a touch faster: it's closer)
      g.fillStyle = lin(g, 0, bot - 14, 0, bot - 12, "#aeb3bb", "#6e737d"); g.fillRect(0, bot - 14, W, 2);
      g.fillStyle = nt ? "#2c3042" : "#d5d9df"; g.fillRect(0, bot - 12, W, 12);
      const fk = reduced() ? 1 : 1.25, fo = -mod(camX * fk, 12), cols = [TQ, PK, "#2d4a8a", OR];
      for (let x = fo - 12, i = Math.floor(camX * fk / 12) - 1; x < W + 12; x += 12, i++) blit(sprite("tile" + mod(i, 4) + (nt ? "n" : ""), -0.5, -0.5, 11, 11, (c) => talavera(c, cols[mod(i, 4)], nt)), x + 1, bot - 11);
      g.fillStyle = INK; g.fillRect(0, bot - 12.4, W, 0.8);
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, bot - 11.6, W, 0.4);
    }
    // ---- sidewalk props, behind the runner: lamp posts, hydrants, bins, benches, palms, news boxes, meters
    function propArt(c, kind, nt) {   // origin: the prop's left foot on the sidewalk line (b = 0)
      if (kind === 0) {
        if (nt) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rad(c, 8, -40, 0, 16, "rgba(255,224,236,.45)", "rgba(255,224,236,0)"); c.fillRect(-8, -56, 32, 32);
          poly(c, [6, -41, 10, -41, 17, 0, -1, 0]); c.fillStyle = lin(c, 0, -41, 0, 0, "rgba(255,224,236,.22)", "rgba(255,224,236,0)"); c.fill(); c.restore(); }
        rrect(c, -1.2, -3, 4.4, 3, 0.8); paint(c, "#4a505e", INK);
        poly(c, [0.2, -3, 1.8, -3, 1.5, -44, 0.5, -44]); paint(c, lin(c, 0, 0, 2, 0, "#707786", "#4a505e"), INK);
        c.beginPath(); c.moveTo(1, -43.5); c.quadraticCurveTo(2, -46.5, 7.5, -45); c.strokeStyle = INK; c.lineWidth = 1.4 + OL(); c.lineCap = "round"; c.stroke(); c.strokeStyle = "#5b6270"; c.lineWidth = 1.2; c.stroke();
        poly(c, [5, -45, 10, -45, 11, -42.2, 4, -42.2]); paint(c, "#4a505e", INK);
        oval(c, 7.5, -41.8, 3, 1); paint(c, nt ? "#ffe0ec" : "#f4f7fa", INK, 0.35);
        return;
      }
      if (kind === 1) {   // hydrant
        rrect(c, -0.6, -1.4, 6.2, 1.4, 0.4); paint(c, "#a02a22", INK);
        rrect(c, 0.2, -7.5, 4.6, 6.4, 1.2); paint(c, lin(c, 0, 0, 5, 0, "#ff6a5e", "#e0453a", "#a8302a"), INK);
        c.beginPath(); c.ellipse(2.5, -7.5, 2.3, 1.8, 0, Math.PI, 0); paint(c, "#e0453a", INK);
        rrect(c, -1.2, -5.6, 7.4, 1.8, 0.7); paint(c, "#c8392f", INK);
        oval(c, 2.5, -4.7, 0.9, 0.9); paint(c, "#dfe4ea", INK, 0.3); c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(1, -7, 0.6, 5);
        return;
      }
      if (kind === 2) {   // trash bin
        rrect(c, 0, -9, 7, 9, 1); paint(c, lin(c, 0, 0, 7, 0, "#4fa392", "#3d8a7a", "#2c6a5e"), INK);
        c.fillStyle = "rgba(0,0,0,.18)"; for (let k = 1.6; k < 7; k += 1.8) c.fillRect(k, -7.5, 0.5, 6.5);
        rrect(c, -1, -10.4, 9, 2, 0.8); paint(c, "#2c6a5e", INK); rrect(c, 2.3, -11.4, 2.4, 1.1, 0.5); paint(c, "#2c6a5e", INK, 0.35);
        return;
      }
      if (kind === 3 && level === 3) {   // a sawhorse barricade (job site)
        for (const lx of [1, 12]) { line(c, [lx - 1, 0, lx + 1, -9], INK, 1.2 + OL()); line(c, [lx - 1, 0, lx + 1, -9], "#8a93a8", 1.2); line(c, [lx + 3, 0, lx + 1, -9], INK, 1.2 + OL()); line(c, [lx + 3, 0, lx + 1, -9], "#8a93a8", 1.2); }
        rrect(c, -1.5, -10.5, 18, 3, 0.5); paint(c, WH, INK); c.save(); rrect(c, -1.5, -10.5, 18, 3, 0.5); c.clip(); c.fillStyle = OR; for (let k = -3; k < 18; k += 4) { poly(c, [k, -7.5, k + 2, -10.5, k + 4, -10.5, k + 2, -7.5]); c.fill(); } c.restore();
        return;
      }
      if (kind === 4 && level === 3) {   // an orange-and-white construction barrel
        rrect(c, -0.5, -10, 8, 10, 2); paint(c, lin(c, -0.5, 0, 7.5, 0, "#ff9a66", OR, ORD), INK);
        c.fillStyle = WH; c.fillRect(-0.4, -7.6, 7.8, 1.5); c.fillRect(-0.4, -4.2, 7.8, 1.5); rrect(c, -1, -1, 9, 1.2, 0.5); paint(c, "#2b2346", INK, 0.35);
        return;
      }
      if (kind === 3) {   // bench
        for (const lx of [1, 12]) { line(c, [lx + 0.5, 0, lx + 0.5, -10.5], INK, 1.3); line(c, [lx + 0.5, 0, lx + 0.5, -10.5], "#5b6270", 0.8); }
        rrect(c, -0.4, -6.4, 14.8, 1.8, 0.6); paint(c, lin(c, 0, -6.4, 0, -4.6, WOOD_L, WOOD), INK);
        rrect(c, -0.4, -10.4, 14.8, 1.4, 0.6); paint(c, lin(c, 0, -10.4, 0, -9, WOOD_L, WOOD), INK); rrect(c, -0.4, -8.4, 14.8, 1.2, 0.6); paint(c, WOOD, INK, 0.35);
        return;
      }
      if (kind === 4) {   // a palm in a round planter (daytime only)
        palm(c, 2, -5, 25, 1.5, 0.62, INK);
        rrect(c, -3, -6.5, 10, 6.5, 1.5); paint(c, lin(c, -3, 0, 7, 0, "#e8ecf0", "#c9d0d8", "#a9b1bc"), INK);
        c.fillStyle = TQ; c.fillRect(-3, -4, 10, 1);
        return;
      }
      if (kind === 5) {   // news box
        rrect(c, 0, -9.5, 6.4, 9.5, 0.8); paint(c, lin(c, 0, 0, 6.4, 0, "#26d1c8", TQ, TQD), INK);
        rrect(c, 0.9, -8.6, 4.6, 3.4, 0.4); paint(c, lin(c, 0, -8.6, 0, -5.2, "#e8f6ff", "#9fd8ff"), INK, 0.3);
        c.fillStyle = "#c9d0d8"; c.fillRect(1.4, -8, 3.6, 0.35); c.fillRect(1.4, -7.2, 2.6, 0.35); rrect(c, 2, -4, 2.4, 0.8, 0.3); paint(c, "#1f6f6a", null);
        rrect(c, -0.3, -0.9, 7, 0.9, 0.3); paint(c, TQD, INK, 0.3);
        return;
      }
      line(c, [1.5, 0, 1.5, -9], INK, 1.2); line(c, [1.5, 0, 1.5, -9], "#5b6270", 0.7);   // parking meter
      rrect(c, -0.2, -13.5, 3.4, 4.8, 1.3); paint(c, lin(c, 0, 0, 3.4, 0, "#aab2bc", "#7c848f"), INK); oval(c, 1.5, -12, 1, 0.9); paint(c, "#3ee8eb", INK, 0.3);
    }
    function props() {
      const step = 64, first = Math.floor((camX - 30) / step), nt = night();
      for (let i = first; i < first + 5; i++) {
        const wx = i * step + 20, x = wx - camX, b = GROUND - 2; if (wx < 30 || wx > END - 140) continue;
        const kind = (Math.imul(i + level * 13, 2654435761) >>> 0) % 7; if (kind === 4 && nt) continue;
        if (kind !== 0) { g.fillStyle = "rgba(29,20,38,.2)"; oval(g, x + 3, b + 0.3, 5, 0.9); g.fill(); }
        blit(sprite("prop" + kind + (nt ? "n" : ""), -20, -60, 44, 62, (c) => propArt(c, kind, nt)), x, b);
      }
    }
    const destW = () => (level === 2 ? 150 : 120);
    const destX = () => END - HERO_X + Math.round((W - destW()) / 2);   // centered on screen when he arrives
    function signBoard(c, x, y, word, size, col) { const sw = measure(c, word, size) + 10; rrect(c, x - sw / 2, y - size * 0.95, sw, size * 1.9, 2.2); paint(c, lin(c, 0, y - size, 0, y + size, "#2a2140", INK), INK);
      words(c, word, x, y + 0.2, size, col, { glow: col, max: sw - 6 }); }
    function destArt(c) {   // the level's destination, drawn once at full resolution (origin: its left edge on the ground)
      const L = LEVELS[level - 1], G = GROUND;
      if (level === 1) {   // the end of the street: a corner with a bus stop, a street sign and a crosswalk
        const top = G - 84;
        rrect(c, 60, top, 60, G - top, 0.8); paint(c, lin(c, 60, 0, 120, 0, shade(PK, -0.15), PK, shade(PK, -0.1)), INK);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { rrect(c, 66 + i * 18, top + 18 + j * 18, 11, 11, 0.8); paint(c, lin(c, 0, top, 0, top + 70, "#e4f5fc", "#9fd8ff"), INK, 0.4); }
        rrect(c, 58.5, top - 1.5, 63, 3.4, 0.8); paint(c, shade(PK, -0.3), INK);
        rrect(c, 4, G - 30, 40, 2.6, 0.8); paint(c, lin(c, 0, G - 30, 0, G - 27, TQL, TQD), INK);   // the bus-stop shelter
        rrect(c, 6, G - 27.4, 36, 20, 0.4); c.fillStyle = "rgba(223,243,255,.45)"; c.fill(); c.strokeStyle = INK; c.lineWidth = OL(); c.stroke();
        for (const px of [5, 42]) { rrect(c, px, G - 27.4, 1.6, 27.4, 0.4); paint(c, "#8a93a8", INK, 0.4); }
        rrect(c, 10, G - 11, 28, 2, 0.6); paint(c, WOOD, INK, 0.4); for (const lx of [12, 35]) { rrect(c, lx, G - 9, 1.2, 9, 0.3); paint(c, "#5b6270", null); }
        rrect(c, 24, G - 25, 14, 10, 0.8); paint(c, "#2a2140", INK, 0.4); words(c, "BUS", 31, G - 20, 4.2, TQL, { glow: TQ });
        line(c, [52, G, 52, G - 44], INK, 1.3 + OL()); line(c, [52, G, 52, G - 44], "#8a93a8", 1.3);   // the street sign
        rrect(c, 37, G - 48, 30, 6, 1); paint(c, TQD, INK); words(c, "MAIN ST", 52, G - 45, 4.2, WH, { max: 27 });
        rrect(c, 44, G - 41, 16, 4.5, 0.8); paint(c, PKD, INK); words(c, "END", 52, G - 38.8, 3.4, WH);
        return;
      }
      if (level === 3) {   // the job site: a scaffolded frame, lumber stacks and a cement mixer truck
        const top = G - 92;
        c.strokeStyle = INK; c.lineWidth = 1.5 + OL() * 2; const cols = [8, 36, 64, 92];
        const grid = (col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (const px of cols) { c.moveTo(px, G); c.lineTo(px, top); } for (let yy = G - 16; yy >= top; yy -= 19) { c.moveTo(6, yy); c.lineTo(94, yy); }
          for (let k = 0; k < 3; k++) for (let yy = G; yy > top + 19; yy -= 38) { c.moveTo(cols[k], yy); c.lineTo(cols[k + 1], yy - 19); } c.stroke(); };
        grid(INK, 1.4 + OL() * 2); grid("#8a93a8", 1.4);
        for (let yy = G - 16; yy >= top; yy -= 19) { rrect(c, 6, yy - 1.8, 88, 1.8, 0.4); paint(c, lin(c, 0, yy - 1.8, 0, yy, WOOD_L, WOOD), INK, 0.4); }
        c.fillStyle = rgba(TQ, 0.3); c.fillRect(36, top, 28, G - top - 16);
        for (const [lx, ly, n] of [[-30, G, 5], [-18, G - 7.5, 3]]) for (let k = 0; k < n; k++) { rrect(c, lx, ly - 1.6 * (k + 1), 26, 1.5, 0.4); paint(c, lin(c, 0, 0, 26, 0, WOOD_L, WOOD, WOOD_L), INK, 0.35); }   // lumber
        // the cement mixer truck (drum striped, no markings)
        const mx = 84;
        rrect(c, mx, G - 11, 40, 5, 1); paint(c, "#3a3f52", INK);
        c.beginPath(); c.moveTo(mx + 28, G - 11); c.lineTo(mx + 29, G - 22); c.quadraticCurveTo(mx + 30, G - 24, mx + 33, G - 24); c.lineTo(mx + 37, G - 24); c.quadraticCurveTo(mx + 40, G - 23, mx + 40, G - 18); c.lineTo(mx + 40, G - 11); c.closePath();
        paint(c, lin(c, 0, G - 24, 0, G - 11, "#ffffff", "#c9d0d8"), INK); rrect(c, mx + 31, G - 22, 6.5, 5, 0.8); paint(c, lin(c, 0, G - 22, 0, G - 17, "#e4f5fc", "#8cc6e8"), INK, 0.4);
        c.save(); c.translate(mx + 14, G - 19); c.rotate(-0.12); oval(c, 0, 0, 14, 8); paint(c, lin(c, 0, -8, 0, 8, "#ffffff", "#dfe4ea", "#aeb6c2"), INK);
        c.save(); oval(c, 0, 0, 14, 8); c.clip(); c.strokeStyle = OR; c.lineWidth = 2; for (let k = -16; k < 18; k += 7) { c.beginPath(); c.moveTo(k, -9); c.quadraticCurveTo(k + 4, 0, k, 9); c.stroke(); } c.restore();
        oval(c, 0, 0, 14, 8); paint(c, null, INK); c.restore();
        for (const wx of [mx + 7, mx + 17, mx + 34]) { oval(c, wx, G - 3.4, 3.4, 3.4); paint(c, "#15161c", INK); oval(c, wx, G - 3.4, 1.6, 1.6); paint(c, "#aeb6c2", INK, 0.3); }
        signBoard(c, 50, top - 6, L.sign, 6.6, "#3ee8eb"); return;
      }
      if (level === 4) {   // La Taquería: papel picado, a walk-up window, a menu board, umbrellas and a picnic table
        const top = G - 80;
        rrect(c, 0, top, 120, G - top, 0.8); paint(c, lin(c, 0, 0, 120, 0, shade(TQ, -0.15), TQ, shade(TQ, 0.12), shade(TQ, -0.1)), INK);
        c.fillStyle = "rgba(255,255,255,.1)"; for (let yy = top + 6; yy < G; yy += 4) for (let xx = (yy / 4) % 2 * 4; xx < 120; xx += 8) c.fillRect(xx, yy, 4, 0.5);
        rrect(c, -2, top - 2, 124, 4, 1); paint(c, lin(c, 0, top - 2, 0, top + 2, "#ff9a66", ORD), INK);
        c.save(); poly(c, [4, top + 20, 116, top + 20, 118, top + 28, 2, top + 28]); c.clip(); for (let i = 0; i < 20; i++) { c.fillStyle = [PK, WH, OR, WH][i % 4]; c.fillRect(2 + i * 6, top + 20, 6, 9); } c.restore();
        poly(c, [4, top + 20, 116, top + 20, 118, top + 28, 2, top + 28]); paint(c, null, INK);
        rrect(c, 12, top + 32, 44, 22, 1); paint(c, INK, null); rrect(c, 13.4, top + 33.4, 41.2, 19.2, 0.6); c.fillStyle = lin(c, 0, top + 33, 0, top + 52, "#fff0f4", "#ffd6e4"); c.fill();   // walk-up window
        rrect(c, 10, top + 53, 48, 2.4, 0.6); paint(c, "#dfe4ea", INK, 0.4);
        for (let k = 0; k < 3; k++) { oval(c, 22 + k * 12, top + 51, 3.5, 1); paint(c, "#dfe4ea", INK, 0.3); }
        rrect(c, 66, top + 32, 42, 26, 1.2); paint(c, "#2a2140", INK); words(c, "MENU", 87, top + 36.5, 4.4, TQL, { glow: TQ });
        ["TACOS", "TORTAS", "AGUAS"].forEach((w, k) => words(c, w, 87, top + 43 + k * 5, 3.6, WH));
        rrect(c, 44, G - 30, 14, 30, 1); paint(c, lin(c, 0, G - 30, 0, G, "#8a4a2c", "#5e3020"), INK);
        // papel picado on the roofline
        c.beginPath(); c.moveTo(-34, top - 2); c.quadraticCurveTo(60, top + 8, 154, top - 2); c.strokeStyle = INK; c.lineWidth = 0.45; c.stroke();
        const cols = [PK, TQL, OR, WH, "#c9d0d8"];
        for (let i = 0; i < 20; i++) { const fx = -32 + i * 9.4, fy = top - 1.6 + Math.sin((i / 19) * Math.PI) * 4.4; poly(c, [fx, fy, fx + 6, fy, fx + 6, fy + 5, fx + 4.5, fy + 6.2, fx + 3, fy + 5, fx + 1.5, fy + 6.2, fx, fy + 5]); paint(c, cols[i % 5], INK, 0.3);
          oval(c, fx + 3, fy + 2.4, 1, 1); c.fillStyle = cols[i % 5] === WH ? PK : WH; c.fill(); }
        // a picnic table with an umbrella and a plate of tacos
        const px = -32; line(c, [px + 16, G, px + 16, G - 26], INK, 0.9 + OL()); line(c, [px + 16, G, px + 16, G - 26], "#dfe4ea", 0.9);
        c.beginPath(); c.moveTo(px + 2, G - 22); c.quadraticCurveTo(px + 16, G - 34, px + 30, G - 22); c.closePath(); paint(c, PK, INK);
        c.save(); c.beginPath(); c.moveTo(px + 2, G - 22); c.quadraticCurveTo(px + 16, G - 34, px + 30, G - 22); c.closePath(); c.clip(); c.fillStyle = WH; for (let k = 0; k < 4; k++) { poly(c, [px + 16, G - 30, px + 5 + k * 7, G - 21, px + 8.5 + k * 7, G - 21]); c.fill(); } c.restore();
        rrect(c, px + 4, G - 9, 24, 2, 0.6); paint(c, WOOD, INK, 0.4); for (const lx of [px + 7, px + 24]) { line(c, [lx, G - 7, lx - 1, G], INK, 1 + OL()); line(c, [lx, G - 7, lx - 1, G], WOOD_D, 1); }
        c.beginPath(); c.arc(px + 12, G - 9.2, 2.2, Math.PI, 0); c.closePath(); paint(c, "#e89a6a", INK, 0.3);
        signBoard(c, 60, top + 11, L.sign, 6.8, "#ffffff"); return;
      }
      if (level === 2) {   // Home Dehole: a parody big-box hardware store. Orange, with a wide banner and white letters. No logo.
        const bw = 150, top = G - 96, beige = "#e3d2c8";
        rrect(c, 0, top, bw, G - top, 0.8); paint(c, lin(c, 0, 0, bw, 0, shade(OR, -0.18), OR, shade(OR, 0.12), OR, shade(OR, -0.15)), INK);
        rrect(c, -1, top - 1, bw + 2, 6, 0.8); paint(c, lin(c, 0, top - 1, 0, top + 5, shade(beige, -0.12), shade(beige, -0.28)), INK);
        c.fillStyle = rgba(ORD, 0.45); for (let i = 15; i < bw; i += 15) c.fillRect(i, top + 5, 0.6, G - top - 5);
        rrect(c, 9, top + 11, 132, 21, 2.5); paint(c, lin(c, 0, top + 11, 0, top + 32, "#ff8a4a", ORD, "#b83a08"), INK);
        c.fillStyle = "rgba(255,255,255,.28)"; rrect(c, 11, top + 12.3, 128, 3.2, 1.6); c.fill();
        words(c, "HOME DEHOLE", 75, top + 21.8, 13, WH, { drop: rgba(ORD, 0.9), stroke: rgba(INK, 0.35), sw: 1.4, max: 124 });
        rrect(c, 42, G - 47, 66, 5, 1.2); paint(c, lin(c, 0, G - 47, 0, G - 42, "#eef1f4", "#aeb6c2"), INK);   // entrance canopy
        rrect(c, 50, G - 42, 50, 42, 0.6); paint(c, "#7c848f", INK);
        for (const dx of [53, 76]) { rrect(c, dx, G - 39, 21, 39, 0.4); paint(c, lin(c, 0, G - 39, 0, G, "#e4f5fc", "#bfe6f5", "#8fcbe4"), INK, 0.4);
          c.fillStyle = "rgba(255,255,255,.55)"; poly(c, [dx + 3, G - 12, dx + 12, G - 37, dx + 16, G - 37, dx + 7, G - 12]); c.fill(); }
        for (const cx of [6, 19, 121, 134]) {   // stacked carts, generic
          for (let k = 0; k < 3; k++) { const ox = cx + k * 1.2; poly(c, [ox, G - 13, ox + 10, G - 13, ox + 8.5, G - 6, ox + 1.5, G - 6]); paint(c, k === 2 ? lin(c, 0, G - 13, 0, G - 6, "#eef1f4", "#aeb6c2") : shade("#c9d0d8", -0.2 + k * 0.08), INK, 0.4); }
          c.strokeStyle = rgba(INK, 0.5); c.lineWidth = 0.3; for (let s = 1; s < 4; s++) { c.beginPath(); c.moveTo(cx + 2.4 + s * 2, G - 12.5); c.lineTo(cx + 2.4 + s * 1.8, G - 6.5); c.stroke(); }
          for (const wx of [cx + 3, cx + 9]) { oval(c, wx, G - 1.8, 1.3, 1.3); paint(c, "#3a3f52", INK, 0.35); }
        }
        for (const [bx, by, bw2] of [[107, G - 8, 11], [108.5, G - 14, 8]]) { rrect(c, bx, by, bw2, 6, 1.6); paint(c, lin(c, 0, by, 0, by + 6, "#d6c3b8", "#b59f93"), INK, 0.45); }   // bags of soil by the door
        return;
      }
      const bw = 120, top = G - 84, wall = PK;
      if (level === 5) {   // Mom's house: pitched roof, porch, lit windows, papel picado, the family party
        rrect(c, 0, top, bw, G - top, 0.8); paint(c, lin(c, 0, 0, bw, 0, shade(wall, -0.25), shade(wall, -0.05), shade(wall, -0.2)), INK);
        c.fillStyle = "rgba(0,0,0,.08)"; for (let yy = top + 3; yy < G; yy += 3) c.fillRect(0, yy, bw, 0.35);
        poly(c, [-8, top + 1, bw / 2, top - 25, bw + 8, top + 1]); paint(c, lin(c, 0, top - 25, 0, top, "#c8483a", "#9a3226"), INK);
        c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 0.4; for (let k = 1; k < 6; k++) { const f = k / 6; c.beginPath(); c.moveTo(-8 + (bw / 2 + 8) * f, top + 1 - 26 * f); c.lineTo(bw + 8 - (bw / 2 + 8) * f, top + 1 - 26 * f); c.stroke(); }
        for (const wx of [12, 90]) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rad(c, wx + 9, top + 25, 0, 20, "rgba(127,240,242,.35)", "rgba(127,240,242,0)"); c.fillRect(wx - 12, top + 4, 42, 42); c.restore();
          rrect(c, wx - 1, top + 17, 20, 16, 0.8); paint(c, "#2a2248", INK); c.fillStyle = lin(c, 0, top + 18, 0, top + 32, "#d8fbfc", "#7ff0f2"); c.fillRect(wx, top + 18, 18, 14);
          c.fillStyle = PK; c.fillRect(wx + 8.5, top + 18, 1, 14); c.fillRect(wx, top + 24.5, 18, 1);
          rrect(c, wx - 2, top + 32.5, 22, 1.8, 0.5); paint(c, "#dfe4ea", INK, 0.4); }
        rrect(c, 36, G - 41, 48, 3.4, 0.8); paint(c, "#eef1f4", INK); for (const px of [39, 79]) { rrect(c, px, G - 37.6, 2.4, 37.6, 0.5); paint(c, "#dfe4ea", INK, 0.4); }   // porch
        rrect(c, 52, G - 34, 16, 34, 1); paint(c, lin(c, 0, G - 34, 0, G, "#8a4a2c", "#5e3020"), INK); rrect(c, 55, G - 31, 10, 12, 0.8); paint(c, "rgba(0,0,0,.18)", null);
        oval(c, 65, G - 17, 0.9, 0.9); paint(c, "#dfe4ea", INK, 0.3);
        c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = rad(c, 60, G - 40, 0, 16, "rgba(255,224,236,.45)", "rgba(255,224,236,0)"); c.fillRect(44, G - 56, 32, 32); c.restore();
        const cols = [PK, TQ, OR, WH, "#c9d0d8"];   // papel picado along the eaves
        c.beginPath(); c.moveTo(-32, top - 4); c.quadraticCurveTo(bw / 2, top + 2, bw + 34, top - 4); c.strokeStyle = INK; c.lineWidth = 0.45; c.stroke();
        for (let i = 0; i < 20; i++) { const fx = -30 + i * 9, fy = top - 3.8 + Math.sin((i / 19) * Math.PI) * 2.4; poly(c, [fx, fy, fx + 6, fy, fx + 6, fy + 5, fx + 4.5, fy + 6.2, fx + 3, fy + 5, fx + 1.5, fy + 6.2, fx, fy + 5]); paint(c, cols[i % 5], INK, 0.3);
          oval(c, fx + 3, fy + 2.4, 1, 1); c.fillStyle = cols[i % 5] === WH ? PK : WH; c.fill(); }
      }
      signBoard(c, bw / 2, top + 9.5, L.sign, 6.6, "#3ee8eb");
    }
    function destination() {
      const x = destX() - camX; if (x > W + 10) return;
      blit(sprite("dest", -42, GROUND - 160, destW() + 84, 162, destArt), x, 0);
      if (level === 5) [[6, PK], [112, TQ], [118, OR]].forEach(([bx, c], i) => {   // balloons, bobbing
        const X = x + bx + 2, by = GROUND - 84 + 2 + (reduced() ? 0 : Math.sin(t * 2 + i) * 1.5);
        g.beginPath(); g.moveTo(X, by + 8); g.quadraticCurveTo(X + 1.4, by + 14, X, by + 20); g.strokeStyle = "#c9d0d8"; g.lineWidth = 0.35; g.stroke();
        oval(g, X, by + 3.8, 3.1, 3.8); paint(g, rad(g, X - 1, by + 2.4, 0.3, 4.2, shade(c, 0.5), c, shade(c, -0.2)), INK, 0.4);
        poly(g, [X - 0.8, by + 8.2, X + 0.8, by + 8.2, X, by + 7.3]); paint(g, shade(c, -0.2), null);
        oval(g, X - 1.1, by + 2.2, 0.7, 1.1, -0.4); g.fillStyle = "rgba(255,255,255,.75)"; g.fill();
      });
    }
    function family(x) {   // the party at Mom's: the family, arms up and dancing
      const kin = [[PK, "#8f5236", 14, 1], [TQ, "#b87350", 12, 0], [OR, "#6e3d28", 10, 2], [PKL, "#b87350", 16, 0], ["#c9d0d8", "#8f5236", 13, 1]];
      kin.forEach(([shirt, skin, hgt, hair], i) => {
        const cx = x + i * 13 + 3.5, move = !reduced() && mode === "win", bob = move ? -Math.abs(Math.sin(t * 6 + i)) * 1.6 : 0, wave = move ? Math.sin(t * 8 + i * 1.3) : 0.6, fy = GROUND;
        g.fillStyle = "rgba(29,20,38,.25)"; oval(g, cx, fy + 0.3, 4, 0.8); g.fill();
        const hip = fy - hgt * 0.36 + bob, sh = fy - hgt + 4 + bob;
        limb(g, [cx - 1.2, hip, cx - 1.6 - (move ? wave * 0.6 : 0), fy - 0.5], 1.5, "#223a6e"); limb(g, [cx + 1.2, hip, cx + 1.6 + (move ? wave * 0.6 : 0), fy - 0.5], 1.5, "#223a6e");
        limb(g, [cx - 2.6, sh + 1, cx - 4.5, sh - 1.5 - wave, cx - 4.2 - wave, sh - 4.2], 1.3, shirt); limb(g, [cx + 2.6, sh + 1, cx + 4.5, sh - 1.5 + wave, cx + 4.2 + wave, sh - 4.2], 1.3, shirt);
        for (const hx of [cx - 4.2 - wave, cx + 4.2 + wave]) { oval(g, hx, sh - 4.6, 0.9, 0.9); paint(g, skin, INK, 0.35); }
        rrect(g, cx - 3, sh, 6, hip - sh + 1, 2); paint(g, lin(g, cx - 3, 0, cx + 3, 0, shade(shirt, 0.15), shirt, shade(shirt, -0.2)), INK);
        const hy = sh - 3.2; oval(g, cx, hy, 2.9, 3.1); paint(g, rad(g, cx + 0.6, hy - 1, 0.3, 3.4, shade(skin, 0.25), skin, shade(skin, -0.15)), INK);
        g.beginPath(); g.ellipse(cx, hy - 0.8, 3, 2.6, 0, Math.PI * 1.02, TAU * 0.99); if (hair === 1) g.lineTo(cx + 3, hy + 1.5); paint(g, hair === 2 ? "#5a2e1c" : STACHE, INK, 0.35);
        if (hair === 0 && i === 3) { poly(g, [cx - 1.8, hy - 2.8, cx + 1.8, hy - 2.8, cx + 0.3, hy - 8]); paint(g, TQ, INK, 0.35); oval(g, cx + 0.3, hy - 8.2, 0.8, 0.8); paint(g, WH, INK, 0.25); }   // a party hat
        for (const ex of [-1, 1]) { oval(g, cx + ex, hy - 0.2, 0.35, 0.5); g.fillStyle = INK; g.fill(); }
        g.beginPath(); g.arc(cx, hy + 0.9, 1.2, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = INK; g.lineWidth = 0.4; g.stroke();
      });
    }
    // ---- entities
    function coneArt(c) {   // 7 × 7, origin top-left of the hit box
      rrect(c, -0.3, 5.9, 7.6, 1.3, 0.5); paint(c, "#2b2346", INK);
      poly(c, [1, 6, 2.9, 0.4, 4.1, 0.4, 6, 6]); paint(c, lin(c, 1, 0, 6, 0, "#ff9a66", OR, ORD), INK);
      c.save(); poly(c, [1, 6, 2.9, 0.4, 4.1, 0.4, 6, 6]); c.clip(); c.fillStyle = WH; c.fillRect(0, 2.1, 7, 1.1); c.fillRect(0, 3.9, 7, 1.1);
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(2.3, 0, 0.6, 6); c.restore();
      oval(c, 3.5, 0.45, 0.65, 0.3); paint(c, "#ff9a66", INK, 0.3);
    }
    function conchaArt(c) {   // 7 × 4: a pink concha on a bread base
      c.beginPath(); c.ellipse(3.5, 3, 3.6, 1.3, 0, 0, Math.PI); c.closePath(); paint(c, lin(c, 0, 2.5, 0, 4.3, BREAD, shade(BREAD, -0.25)), INK, 0.4);
      c.beginPath(); c.ellipse(3.5, 3, 3.5, 3, 0, Math.PI, 0); c.closePath(); paint(c, rad(c, 2.5, 1, 0.3, 4, "#ffc2da", PK, PKD), INK, 0.4);
      c.save(); c.beginPath(); c.ellipse(3.5, 3, 3.5, 3, 0, Math.PI, 0); c.clip(); c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 0.32;
      for (const a of [-0.9, -0.3, 0.3, 0.9]) { c.beginPath(); c.moveTo(3.5, 3.4); c.lineTo(3.5 + Math.sin(a) * 4.5, 3.4 - Math.cos(a) * 4.5); c.stroke(); }
      c.beginPath(); c.ellipse(3.5, 3.1, 2.2, 1.7, 0, Math.PI, 0); c.stroke(); c.restore();
    }
    function cupArt(c) {   // 8 × 7: a white mug of café
      c.beginPath(); c.arc(6.4, 3.4, 1.6, -Math.PI / 2, Math.PI / 2); c.strokeStyle = INK; c.lineWidth = 1.1 + OL(); c.stroke(); c.strokeStyle = WH; c.lineWidth = 1.1; c.stroke();
      c.beginPath(); c.moveTo(0.4, 1.6); c.lineTo(6.2, 1.6); c.lineTo(5.6, 6.3); c.quadraticCurveTo(3.3, 7.2, 1, 6.3); c.closePath(); paint(c, lin(c, 0.4, 0, 6.2, 0, "#ffffff", "#eef1f4", "#b9c0ca"), INK, 0.45);
      oval(c, 3.3, 1.7, 2.9, 0.8); paint(c, lin(c, 0, 1, 0, 2.5, "#8f5436", "#5e2e18"), INK, 0.35);
      c.fillStyle = PK; c.fillRect(0.9, 3.5, 4.9, 1); oval(c, 3.3, 4.02, 0.9, 0.9); c.fillStyle = WH; c.fill();
    }
    function chanclaArt(c) {   // 9 × 5: a pink flip-flop, side view
      c.beginPath(); c.moveTo(0.4, 3.4); c.quadraticCurveTo(0.2, 2.2, 1.8, 2.2); c.lineTo(8, 2.5); c.quadraticCurveTo(9.2, 2.9, 8.8, 4); c.lineTo(8.4, 4.6); c.lineTo(0.9, 4.6); c.closePath();
      paint(c, lin(c, 0, 2.2, 0, 4.6, PKL, PK, PKD), INK, 0.4);
      c.fillStyle = "#2b2346"; c.fillRect(0.9, 4.1, 7.6, 0.55);
      c.beginPath(); c.moveTo(1.8, 2.4); c.quadraticCurveTo(3.8, -0.8, 6.2, 2.5); c.strokeStyle = INK; c.lineWidth = 0.9 + OL(); c.lineCap = "round"; c.stroke(); c.strokeStyle = WH; c.lineWidth = 0.9; c.stroke();
      oval(c, 4.1, 1.05, 0.7, 0.55); paint(c, TQ, INK, 0.3);
    }
    function lumberArt(c, w, h) {   // the job site's "crate": a strapped bundle of lumber, plank ends showing
      const n = Math.max(3, Math.round(h / 3.4)), ph = h / n;
      for (let k = 0; k < n; k++) { rrect(c, 0, k * ph, w, ph, 0.5); paint(c, lin(c, 0, k * ph, 0, (k + 1) * ph, WOOD_L, WOOD), INK, 0.4);
        c.strokeStyle = "rgba(90,40,20,.35)"; c.lineWidth = 0.25; c.beginPath(); c.moveTo(2, k * ph + ph * 0.5); c.lineTo(w - 2, k * ph + ph * 0.45); c.stroke();
        oval(c, w - 1.4, k * ph + ph / 2, 0.9, ph * 0.35); paint(c, "#e8a07a", INK, 0.25); }
      for (const sx of [4, w - 7]) { rrect(c, sx, -0.3, 2.2, h + 0.6, 0.3); paint(c, "#3a3f52", INK, 0.3); }
    }
    function burritoArt(c) {   // a foil-wrapped burrito, 7 × 3.4, centered
      rrect(c, -3.5, -1.7, 7, 3.4, 1.7); paint(c, lin(c, 0, -1.7, 0, 1.7, "#f0b48c", "#e89a6a", "#c97a52"), INK, 0.4);
      c.save(); rrect(c, -3.5, -1.7, 7, 3.4, 1.7); c.clip(); c.fillStyle = lin(c, 0, -1.7, 0, 1.7, "#ffffff", "#c9d0d8", "#8a93a8"); c.fillRect(0.6, -2, 3.2, 4);
      c.strokeStyle = "rgba(60,64,80,.5)"; c.lineWidth = 0.2; for (const k of [1.3, 2.3, 3.1]) { c.beginPath(); c.moveTo(k, -1.7); c.lineTo(k - 0.3, 1.7); c.stroke(); } c.restore();
      c.strokeStyle = "rgba(143,82,54,.5)"; c.lineWidth = 0.25; c.beginPath(); c.moveTo(-2.6, -0.4); c.quadraticCurveTo(-1.4, 0.4, -0.2, -0.4); c.stroke();
    }
    function crateArt(c, w, h) {
      if (level === 3) { lumberArt(c, w, h); return; }
      rrect(c, 0, 0, w, h, 0.8); paint(c, lin(c, 0, 0, 0, h, WOOD_L, WOOD, shade(WOOD, -0.12)), INK);
      c.save(); rrect(c, 0, 0, w, h, 0.8); c.clip(); c.strokeStyle = "rgba(90,40,20,.35)"; c.lineWidth = 0.3;
      for (let yy = 3.4; yy < h - 2; yy += 3.3) { c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke(); }
      c.strokeStyle = "rgba(255,230,210,.18)"; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(3 + k * 3.5, 2.6 + (k % 3)); c.quadraticCurveTo(5 + k * 3.5, 3.4 + (k % 3), 7 + k * 3.5, 2.6 + (k % 3)); c.stroke(); }
      c.restore();
      const fr = (pts) => { poly(c, pts); paint(c, lin(c, 0, 0, 0, h, WOOD, WOOD_D), INK, 0.45); };
      fr([0, 0, w, 0, w, 2.2, 0, 2.2]); fr([0, h - 2.2, w, h - 2.2, w, h, 0, h]); fr([0, 0, 2.4, 0, 2.4, h, 0, h]); fr([w - 2.4, 0, w, 0, w, h, w - 2.4, h]);
      fr([2.4, h - 3.8, w - 5.2, 2.2, w - 2.4, 2.2, w - 2.4, 3.8, 5.2, h - 2.2, 2.4, h - 2.2]);
      for (const [nx, ny] of [[1.2, 1.1], [w - 1.2, 1.1], [1.2, h - 1.1], [w - 1.2, h - 1.1]]) { oval(c, nx, ny, 0.45, 0.45); c.fillStyle = "#e8edf2"; c.fill(); }
    }
    function suvArt(c) {   // 40 × 22, a generic dark SUV facing right: no markings
      c.beginPath(); c.moveTo(0.6, 17.5); c.lineTo(0.4, 9); c.quadraticCurveTo(0.6, 6.6, 3, 6.4); c.lineTo(5, 6.2); c.lineTo(7.5, 0.8); c.quadraticCurveTo(8, 0.1, 9, 0.1);
      c.lineTo(27, 0.1); c.quadraticCurveTo(28.4, 0.2, 29.3, 1.2); c.lineTo(33, 6.2); c.quadraticCurveTo(38.8, 6.6, 39.5, 9); c.lineTo(39.6, 17.5); c.closePath();
      paint(c, lin(c, 0, 0, 0, 18, "#3a4252", "#1f232c", "#14171d"), INK);
      poly(c, [8.8, 1.4, 17.4, 1.4, 17.4, 6, 6.6, 6]); paint(c, lin(c, 0, 1.4, 0, 6, "#9fb6c8", "#4a5f72", "#2f3e4c"), INK, 0.4);
      poly(c, [18.6, 1.4, 27, 1.4, 31, 6, 18.6, 6]); paint(c, lin(c, 0, 1.4, 0, 6, "#9fb6c8", "#4a5f72", "#2f3e4c"), INK, 0.4);
      c.fillStyle = "rgba(255,255,255,.35)"; poly(c, [10.5, 6, 13.5, 1.4, 15, 1.4, 12, 6]); c.fill(); poly(c, [21, 6, 24, 1.4, 25.2, 1.4, 22.2, 6]); c.fill();
      line(c, [18, 6.5, 18, 15.5], "rgba(0,0,0,.6)", 0.35); line(c, [30.5, 6.6, 31, 15.5], "rgba(0,0,0,.6)", 0.35);
      rrect(c, 13.5, 8.2, 2.4, 0.7, 0.3); paint(c, "#8a929c", null); rrect(c, 25.5, 8.2, 2.4, 0.7, 0.3); paint(c, "#8a929c", null);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(1, 7.2, 38, 1.1);
      rrect(c, -0.2, 12, 40.4, 1.6, 0.6); paint(c, lin(c, 0, 12, 0, 13.6, "#eef1f4", "#8a929c"), INK, 0.35);
      rrect(c, 37.4, 8.2, 2.4, 2.4, 0.6); paint(c, rad(c, 38.3, 9, 0.2, 2, "#ffffff", "#dfe4ea"), INK, 0.35);
      rrect(c, 0, 8.2, 1.6, 2.4, 0.4); paint(c, "#ff2a5f", INK, 0.3);
      for (const wx of [9, 31]) { c.beginPath(); c.arc(wx, 17.6, 5.6, Math.PI, 0); c.fillStyle = "#0b0c10"; c.fill();
        oval(c, wx, 18.2, 3.8, 3.8); paint(c, "#15161c", INK); oval(c, wx, 18.2, 2.1, 2.1); paint(c, rad(c, wx - 0.6, 17.6, 0.2, 2.2, "#dfe4ea", "#8a929c", "#5b6270"), INK, 0.3);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; line(c, [wx + Math.cos(a) * 0.6, 18.2 + Math.sin(a) * 0.6, wx + Math.cos(a) * 1.8, 18.2 + Math.sin(a) * 1.8], "rgba(40,44,56,.9)", 0.35); } }
    }
    function flagArt(e, x) {   // a pole and a waving pennant with a star (pink, turquoise once it's reached)
      const y = e.y, col = e.done ? TQ : PK, ph = reduced() ? 0 : t * 7;
      rrect(g, x - 1.5, GROUND - 1.6, 4, 1.6, 0.5); paint(g, "#8a8f99", INK, 0.4);
      line(g, [x + 0.5, GROUND - 1, x + 0.5, y], INK, 1 + OL()); line(g, [x + 0.5, GROUND - 1, x + 0.5, y], "#dfe4ea", 0.9);
      oval(g, x + 0.5, y - 0.6, 1, 1); paint(g, WH, INK, 0.35);
      g.beginPath(); const N = 8; g.moveTo(x + 1, y + 0.4);
      for (let k = 1; k <= N; k++) { const u = k / N; g.lineTo(x + 1 + u * 9, y + 0.4 + Math.sin(ph - u * 3) * 0.9 * u + u * 1); }
      for (let k = N; k >= 0; k--) { const u = k / N; g.lineTo(x + 1 + u * 9, y + 6 + Math.sin(ph - u * 3) * 0.9 * u - u * 1.2); }
      g.closePath(); paint(g, lin(g, x + 1, 0, x + 10, 0, shade(col, 0.2), col, shade(col, -0.2)), INK, 0.45);
      star(g, x + 5, y + 3.1 + Math.sin(ph - 1.5) * 0.45, 1.6, 0.7, 5); g.fillStyle = WH; g.fill();
    }
    function groundShadow(cx, w, air) { const k = 1 - Math.min(0.7, air); g.fillStyle = `rgba(29,20,38,${0.3 * k})`; oval(g, cx, GROUND - 0.2, w * k, 1.1 * k); g.fill(); }
    // an agent: faceless, in a plain cap, vest and slacks; rigged walk, a pratfall when tripped, a wobble when dizzy
    function drawAgent(e, x) {
      const cx = x + 5, dir = e.vx > 0 ? 1 : -1;
      if (e.st === "stomped") {   // squashed flat like a pancake, stars, his cap popped up: he peels himself up in a moment
        const k = e.tt > 2.7 ? (3 - e.tt) / 0.3 : 1;
        groundShadow(cx, 7, 0);
        g.save(); g.translate(cx, GROUND); g.scale(1 + 0.5 * k, 1 - 0.68 * k);
        rrect(g, -3.4, -11, 6.8, 11, 2); paint(g, lin(g, 0, -11, 0, 0, "#2a3650", "#1f2a3d"), INK); g.fillStyle = "#c9d0d8"; g.fillRect(-3.4, -6.4, 6.8, 1.1);
        oval(g, 0.2, -13.2, 2.3, 2.5); paint(g, rad(g, 0.9, -14, 0.3, 2.8, "#7a8290", "#5b6270"), INK);
        g.restore();
        const cy = GROUND - 9 - (reduced() ? 0 : Math.abs(Math.sin(t * 5)) * 3);
        g.save(); g.translate(cx + 1, cy); g.rotate(reduced() ? 0 : Math.sin(t * 6) * 0.3); g.beginPath(); g.ellipse(0, 0, 2.5, 2, 0, Math.PI, 0); g.closePath(); paint(g, "#2b3346", INK, 0.4); g.restore();
        for (let s2 = 0; s2 < 3; s2++) { const a = (reduced() ? 0 : t * 5) + s2 * 2.1; star(g, cx + Math.cos(a) * 6, GROUND - 6 + Math.sin(a) * 1.5, 1.4, 0.55, 5, a); paint(g, [PK, TQL, WH][s2], INK, 0.3); }
        return;
      }
      if (e.st === "tripped") {   // flat on his back, legs kicking in the air, cap rolling away: slapstick, gets back up
        const k = reduced() ? 0 : Math.sin(t * 16);
        groundShadow(cx + 1, 9, 0);
        limb(g, [cx + 5, GROUND - 2.4, cx + 7.5, GROUND - 7 - k, cx + 8.5, GROUND - 10 - k * 1.5], 1.8, "#9c8f80"); limb(g, [cx + 5, GROUND - 2.4, cx + 9, GROUND - 6 + k, cx + 11.5, GROUND - 8 + k * 1.5], 1.8, "#8a7d70");
        for (const [fx, fy] of [[cx + 8.5, GROUND - 10.5 - k * 1.5], [cx + 11.8, GROUND - 8.4 + k * 1.5]]) { oval(g, fx, fy, 1.3, 0.8, -0.8); paint(g, "#111111", INK, 0.3); }
        rrect(g, cx - 4, GROUND - 5, 10, 4.6, 2.2); paint(g, lin(g, 0, GROUND - 5, 0, GROUND, "#2a3650", "#1f2a3d"), INK); g.fillStyle = "#c9d0d8"; g.fillRect(cx - 1, GROUND - 5, 1, 4.6);
        limb(g, [cx - 1, GROUND - 4, cx - 3, GROUND - 8.5 + k], 1.3, "#3d4658"); oval(g, cx - 3, GROUND - 9 + k, 0.9, 0.9); paint(g, "#5b6270", INK, 0.3);
        oval(g, cx - 6.3, GROUND - 2.8, 2.4, 2.3); paint(g, rad(g, cx - 7, GROUND - 3.6, 0.3, 2.6, "#7a8290", "#5b6270"), INK);
        const rx = cx - 12 - (reduced() ? 0 : mod(t * 4, 4)), ra = reduced() ? 0 : -t * 6;
        g.save(); g.translate(rx, GROUND - 1.4); g.rotate(ra); g.beginPath(); g.ellipse(0, 0, 2.2, 1.4, 0, Math.PI, 0); g.closePath(); paint(g, "#2b3346", INK, 0.4); g.fillRect(-2.2, -0.2, 3.8, 0.8); g.restore();
        words(g, "!?", cx - 1, GROUND - 16, 6.4, PK, { stroke: INK, sw: 1.6 });
        return;
      }
      groundShadow(cx, 5.5, 0);
      const walk = e.st === "walk" && !reduced(), ph = walk ? t * 8 * (Math.PI / 2) : 0, bonked = e.st === "bonked", dizzy = e.st === "dizzy" || bonked;
      g.save(); g.translate(cx, GROUND);
      if (dizzy && !reduced()) g.rotate(Math.sin(t * 14) * 0.12);
      g.scale(dir, 1);
      const bob = walk ? -Math.abs(Math.sin(ph)) * 0.6 : 0, hipY = -6 + bob;
      const leg = (p, col) => { const a = walk ? Math.sin(p) * 0.55 : 0, kb = walk ? 0.2 + Math.max(0, Math.cos(p)) * 0.6 : 0.05;
        const kx = Math.sin(a) * 2.9, ky = hipY + Math.cos(a) * 2.9, fx = kx + Math.sin(a - kb) * 2.8, fy = Math.min(-0.6, ky + Math.cos(a - kb) * 2.8);
        limb(g, [0, hipY, kx, ky, fx, fy], 2, col); oval(g, fx + 0.8, fy + 0.1, 1.5, 0.75); paint(g, "#111111", INK, 0.35); };
      leg(ph + Math.PI, "#8a7d70"); leg(ph, "#9c8f80");
      const arm = (p, col, back) => { const u = walk ? -Math.sin(p) * 0.6 : dizzy ? -2.3 + Math.sin(t * 9 + (back ? 1 : 0)) * 0.4 : 0.15, ex = Math.sin(u) * 2.5, ey = -10 + bob + Math.cos(u) * 2.5, e2 = u + (walk ? 0.6 : 0.2);
        limb(g, [0, -10 + bob, ex, ey, ex + Math.sin(e2) * 2.2, ey + Math.cos(e2) * 2.2], 1.4, col); oval(g, ex + Math.sin(e2) * 2.3, ey + Math.cos(e2) * 2.3, 0.85, 0.85); paint(g, "#5b6270", INK, 0.35); };
      arm(ph, "#2f3748", true);
      rrect(g, -3.2, -11.2 + bob, 6.4, 6.2, 1.8); paint(g, lin(g, -3, 0, 3, 0, "#2a3650", "#1f2a3d", "#161f2e"), INK);   // vest
      g.fillStyle = "#c9d0d8"; g.fillRect(-3.2, -8.4 + bob, 6.4, 1.1); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(-3.2, -8.4 + bob, 6.4, 0.3);
      rrect(g, -3.3, -5.6 + bob, 6.6, 1, 0.4); paint(g, "#15161c", null);
      oval(g, 0.4, -13.2 + bob, 2.3, 2.5); paint(g, rad(g, 1.1, -14, 0.3, 2.8, "#7a8290", "#5b6270", "#454b58"), INK);   // a faceless head
      g.beginPath(); g.ellipse(0.4, -14.3 + bob, 2.5, 2, 0, Math.PI, 0); g.closePath(); paint(g, lin(g, 0, -16.5, 0, -14, "#3a4460", "#2b3346"), INK);   // plain cap
      rrect(g, 1.2, -14.8 + bob, 3.6, 1, 0.5); paint(g, "#232a3a", INK, 0.4);
      arm(ph + Math.PI, "#3d4658", false);
      if (bonked) {   // a burrito's tortilla draped over his cap, beans on the vest
        g.beginPath(); g.moveTo(-2.8, -14.6 + bob); g.quadraticCurveTo(0.4, -18.2 + bob, 3.6, -14.6 + bob); g.lineTo(3.2, -12.4 + bob); g.quadraticCurveTo(2.2, -13.6 + bob, 1.4, -12 + bob); g.quadraticCurveTo(0.2, -13.4 + bob, -0.8, -11.8 + bob); g.quadraticCurveTo(-1.8, -13.4 + bob, -2.9, -12.2 + bob); g.closePath();
        paint(g, lin(g, 0, -18, 0, -12, "#f0b48c", "#e89a6a"), INK, 0.4);
        for (const [bx, by] of [[-1.5, -9], [1.2, -7.6], [-0.2, -6.8]]) { oval(g, bx, by + bob, 0.6, 0.45); paint(g, "#6a2e1e", null); }
      }
      g.restore();
      if (dizzy) {   // little stars circling his cap
        for (let k = 0; k < 3; k++) { const a = (reduced() ? 0 : t * 5) + k * 2.1, sx = cx + Math.cos(a) * 6, sy = e.y - 3 + Math.sin(a) * 1.8;
          star(g, sx, sy, 1.5, 0.6, 5, a); paint(g, [PK, TQL, WH][k], INK, 0.3); }
        words(g, "?", cx - 2, e.y - 9 + (reduced() ? 0 : Math.sin(t * 6)), 6.6, PK, { stroke: INK, sw: 1.6 });
      }
    }
    function drawEnt(e) {
      const x = e.x - camX; if (x < -50 || x > W + 10 || e.gone) return;
      if (e.t === "cone") {
        if (e.down) { g.save(); g.translate(x + 3.5, GROUND - 1.6); g.rotate(-1.35); blit(sprite("cone", -1, -1, 9, 9, coneArt), -3.5, -5.5); g.restore(); }
        else { groundShadow(x + 3.5, 4, 0); blit(sprite("cone", -1, -1, 9, 9, coneArt), x, e.y); }
      } else if (e.t === "coin") {
        const sp = sprite("concha", -1, -1, 9, 6.5, conchaArt), y = e.y + (reduced() ? 0 : Math.sin(t * 5 + e.x) * 0.8);
        if (reduced()) blit(sp, x, y); else { const k = 0.25 + 0.75 * Math.abs(Math.cos(t * 3.4 + e.x / 11)); g.save(); g.translate(x + 3.5, 0); g.scale(k, 1); g.drawImage(sp.cv, -4.5, y - 1, sp.cv.width / S, sp.cv.height / S); g.restore(); }
        if (!reduced() && mod(t * 3.4 + e.x / 11, Math.PI) < 0.35) { star(g, x + 5.5, y, 1.4, 0.35); g.fillStyle = "#c8fbfb"; g.fill(); }   // an icy glint: pure white over the bread reads cream
      } else if (e.t === "cup" || e.t === "chancla") {
        const y = e.y + (reduced() ? 0 : Math.sin(t * 4 + (e.t === "cup" ? 0 : 1)) * 1.5);
        g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = rad(g, x + 4.5, y + 3.5, 0, 9, rgba(e.t === "cup" ? TQL : PKL, 0.35), rgba(PK, 0)); g.fillRect(x - 5, y - 6, 19, 19); g.restore();
        if (e.t === "cup") { blit(sprite("cup", -1, -1, 10.5, 9, cupArt), x, y);
          if (!reduced()) for (let k = 0; k < 2; k++) { const p = mod(t * 0.9 + k * 0.5, 1); g.beginPath(); g.moveTo(x + 2.4 + k * 2, y + 0.6 - p * 5); g.bezierCurveTo(x + 1.2 + k * 2, y - 0.6 - p * 5, x + 3.6 + k * 2, y - 1.8 - p * 5, x + 2.4 + k * 2, y - 3 - p * 5);
            g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; g.lineWidth = 0.55; g.lineCap = "round"; g.stroke(); } }
        else blit(sprite("chancla", -1, -1, 11, 7, chanclaArt), x, y);
        if (!reduced()) { const a = t * 3, sx = x + 4 + Math.cos(a) * 8, sy = y + 3 + Math.sin(a) * 6; star(g, sx, sy, 1.6, 0.4, 4, a); g.fillStyle = WH; g.fill();
          star(g, x + 10, y - 2, 0.9, 0.3); g.fillStyle = Math.floor(t * 6) % 2 ? TQL : PKL; g.fill(); }
      } else if (e.t === "crate") { groundShadow(x + e.w / 2, e.w / 2 + 1, 0); blit(sprite("crate" + e.h, -1, -1, e.w + 2, e.h + 2, (c) => crateArt(c, e.w, e.h)), x, e.y); }
      else if (e.t === "flag") flagArt(e, x);
      else if (e.t === "suv") { g.fillStyle = "rgba(29,20,38,.3)"; oval(g, x + 20, GROUND - 0.3, 21, 1.4); g.fill(); blit(sprite("suv", -1, -1, 42, 25, suvArt), x, e.y); }
      else if (e.t === "agent") drawAgent(e, x);
    }
    function drawBurritos() {
      const sp = sprite("burrito", -4.5, -2.7, 9, 5.4, burritoArt);
      for (const b of burr) { const x = b.x - camX; g.save(); g.translate(x, b.y); g.rotate(b.rot); g.scale(1.35, 1.35); g.drawImage(sp.cv, -4.5, -2.7, sp.cv.width / S, sp.cv.height / S); g.restore();
        if (!reduced()) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.5; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 5, b.y - 1); g.lineTo(x - 9, b.y - 1 - b.vy * 0.012); g.moveTo(x - 5, b.y + 1); g.lineTo(x - 8, b.y + 1 - b.vy * 0.012); g.stroke(); } }
    }
    // ---- our hero: a rigged cartoon Tejano (sombrero, pearl-snap shirt, jeans, boots), facing right
    let wasAir = false, landT = 0, lastT = 0;
    function drawHero() {
      const h = hero, cx = h.x - camX + 5, fy = h.y + h.h, air = h.ground ? 0 : Math.min(1, (GROUND - fy) / 48);
      const dt = Math.max(0, Math.min(0.05, t - lastT)); lastT = t;
      if (h.ground && wasAir) landT = 0.16; wasAir = !h.ground; landT = Math.max(0, landT - dt);
      groundShadow(cx, 6, air);
      if (h.inv > 0 && !reduced() && Math.floor(t * 12) % 2) return;
      const rm = reduced(), run = mode === "run" && h.ground, cheer = mode === "win", idle = mode === "title" || mode === "clear" || mode === "paused" || mode === "caught";
      const ph = h.frame * (Math.PI / 2);   // 4 frames per stride, like before
      let lean = 0, bob = 0, sx = 1, sy = 1, legs, arms, hatTilt = 0, grin = false;
      if (cheer) {
        const j = rm ? 0 : Math.abs(Math.sin(t * 6)); bob = -j * 2.2; grin = true;
        legs = [[0.25, 0.5 * j], [-0.25, 0.5 * j]]; arms = [[-2.7 + (rm ? 0 : Math.sin(t * 8) * 0.25), -0.4], [-2.5 - (rm ? 0 : Math.sin(t * 8) * 0.25), -0.4]]; hatTilt = rm ? 0 : Math.sin(t * 6) * 0.12;
      } else if (idle || (mode === "run" && !h.ground && false)) {
        const br = rm ? 0 : Math.sin(t * 2.4); bob = br * 0.15; legs = [[0.08, 0.05], [-0.08, 0.05]]; arms = [[0.2, 0.35], [-0.15, 0.3]];
      } else if (!h.ground) {
        const up = h.vy < 0; grin = true;
        const k = clamp(-h.vy / 250, -1, 1); sy = 1 + k * 0.1; sx = 1 - k * 0.07;
        legs = up ? [[1.05, 1.5], [-0.35, 1.1]] : [[0.45, 0.35], [-0.3, 0.25]];
        arms = up ? [[-2.6, -0.3], [-2.2, -0.5]] : [[-1.7, 0.4], [-1.3, 0.2]];
        lean = up ? 0.08 : 0.02; hatTilt = clamp(h.vy / 700, -0.25, 0.25);
      } else {
        const boost = h.boost > 0, stumble = h.stumble > 0;
        legs = [0, 1].map((i) => { const p = ph + i * Math.PI; return [Math.sin(p) * 0.85, 0.25 + Math.max(0, Math.cos(p)) * 1.05]; });
        arms = [0, 1].map((i) => { const p = ph + i * Math.PI + Math.PI; return [Math.sin(p) * 0.8, -(0.35 + Math.max(0, Math.sin(p)) * 0.6)]; });
        bob = -Math.abs(Math.cos(ph)) * 0.9 + 0.45; lean = boost ? 0.24 : 0.13; hatTilt = Math.sin(ph * 2) * 0.05;
        if (stumble) { lean = -0.18; arms = [[-2 + Math.sin(t * 20) * 0.5, -0.4], [-1.6 - Math.sin(t * 20) * 0.5, -0.4]]; }
        if (rm) bob *= 0.5;
      }
      if (throwT > 0 && !cheer) { const k = throwT / 0.22; arms = [[-1.9 + (1 - k) * 3.2, -0.2], arms[1]]; lean += 0.05; }   // the throwing arm whips forward
      if (landT > 0 && !rm) { const k = landT / 0.16; sy = 1 - 0.14 * k; sx = 1 + 0.12 * k; }
      g.save(); g.translate(cx, fy); g.scale(sx, sy);
      if (h.shield > 0) {   // a pink bubble shield
        g.fillStyle = rad(g, 0, -11, 2, 14, "rgba(255,61,139,0)", "rgba(255,61,139,.12)", "rgba(255,143,191,.45)"); oval(g, 0, -11, 11, 13.5); g.fill();
        g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.5; g.beginPath(); g.ellipse(0, -11, 11, 13.5, 0, -2.4 + (rm ? 0 : t * 2), -1.5 + (rm ? 0 : t * 2)); g.stroke();
      }
      if (h.boost > 0 && !rm) for (let i = 0; i < 4; i++) { const l = 7 + ((t * 40 + i * 13) % 9), yy = -16 + i * 3.6;   // speed lines
        g.beginPath(); g.moveTo(-6 - l, yy); g.lineTo(-5, yy); g.strokeStyle = i % 2 ? rgba("#c8fbfb", 0.85) : "rgba(255,255,255,.85)"; g.lineWidth = 0.8; g.lineCap = "round"; g.stroke(); }
      const hipY = -7.3 + bob;
      const leg = ([a, kb], back) => {
        const kx = Math.sin(a) * 3.5, ky = hipY + Math.cos(a) * 3.5, a2 = a - kb, ax = kx + Math.sin(a2) * 3.3, ay = Math.min(-0.9, ky + Math.cos(a2) * 3.3);
        limb(g, [0.2, hipY, kx, ky, ax, ay], 2.5, back ? JEAN_D : JEAN);
        if (!back) line(g, [kx - 0.5, ky - 0.2, kx + 0.3, ky + 0.6], rgba(JEAN_L, 0.8), 0.35);
        const fa = (h.ground && run) ? clamp(a2 * 0.5, -0.5, 0.5) : a2 * 0.35;
        g.save(); g.translate(ax, ay); g.rotate(-fa);
        g.beginPath(); g.moveTo(-1.3, -1.3); g.lineTo(1.1, -1.3); g.quadraticCurveTo(1.3, -0.2, 2.9, 0); g.quadraticCurveTo(3.7, 0.3, 3.3, 1); g.lineTo(-1.5, 1); g.quadraticCurveTo(-1.7, -0.3, -1.3, -1.3); g.closePath();
        paint(g, lin(g, 0, -1.3, 0, 1, back ? shade(BOOT, -0.15) : "#8f5436", back ? BOOT_D : BOOT), INK);
        g.fillStyle = BOOT_D; g.fillRect(-1.5, 0.35, 1.5, 0.65); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(0.4, -1, 1.6, 0.35);
        g.restore();
      };
      const arm = ([u, e], back) => {
        const shX = 0.4, shY = -5.4, ex = shX + Math.sin(u) * 2.8, ey = shY + Math.cos(u) * 2.8, u2 = u - e, hx = ex + Math.sin(u2) * 2.5, hy = ey + Math.cos(u2) * 2.5;
        limb(g, [shX, shY, ex, ey, hx, hy], 1.75, back ? TQD : TQ);
        if (!back) line(g, [shX + 0.2, shY - 0.3, ex + 0.1, ey - 0.2], "rgba(255,255,255,.35)", 0.35);
        oval(g, hx, hy, 1.05, 1.05); paint(g, rad(g, hx - 0.3, hy - 0.4, 0.1, 1.2, SKIN_L, back ? SKIN_D : SKIN), INK);
      };
      arm(arms[1], true); leg(legs[1], true); leg(legs[0], false);
      g.save(); g.translate(0.2, hipY); g.rotate(lean);
      // torso: pearl-snap western shirt with a yoke and piping, belt + silver buckle
      g.beginPath(); g.moveTo(-2.7, 0.6); g.lineTo(-3.1, -4.4); g.quadraticCurveTo(-3.2, -6.6, -0.6, -6.7); g.lineTo(1.4, -6.7); g.quadraticCurveTo(3.8, -6.6, 3.6, -4.2); g.quadraticCurveTo(3.7, -1.5, 2.9, 0.6); g.closePath();
      paint(g, lin(g, -3, 0, 3.6, 0, "#009a93", TQ, "#35d3cb"), INK);
      g.save(); g.clip(); g.fillStyle = TQD; g.beginPath(); g.moveTo(-3.5, -7); g.lineTo(4, -7); g.lineTo(4, -5); g.quadraticCurveTo(1.8, -3.4, 0.6, -5); g.quadraticCurveTo(-0.8, -3.4, -3.5, -5); g.closePath(); g.fill();
      g.strokeStyle = WH; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-3.5, -5); g.quadraticCurveTo(-0.8, -3.4, 0.6, -5); g.quadraticCurveTo(1.8, -3.4, 4, -5); g.stroke();
      g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(-3.5, -1.2, 8, 2); g.restore();
      line(g, [0.9, -6.4, 0.9, 0.3], "rgba(0,80,76,.6)", 0.3);
      for (const yy of [-4.6, -3, -1.4]) { oval(g, 1.25, yy, 0.33, 0.33); g.fillStyle = "#f4f7fa"; g.fill(); }
      rrect(g, -3, -0.3, 6.1, 1.5, 0.5); paint(g, "#2b1d2a", INK, 0.4);
      rrect(g, 0.6, -0.55, 1.9, 2, 0.45); paint(g, lin(g, 0, -0.5, 0, 1.5, "#ffffff", "#c9d0d8", "#8a93a8"), INK, 0.35);
      // head
      const hx = 1, hy = -9.3;
      oval(g, hx - 0.2, hy + 2.1, 1.1, 0.8); paint(g, SKIN_D, null);   // neck
      oval(g, hx, hy, 2.95, 3.1); paint(g, rad(g, hx + 1, hy - 1, 0.3, 3.6, SKIN_L, SKIN, SKIN_D), INK);
      g.beginPath(); g.moveTo(hx - 2.8, hy - 1); g.quadraticCurveTo(hx - 3.1, hy + 1.2, hx - 2.2, hy + 1.5); g.lineTo(hx - 1.7, hy - 1.2); g.closePath(); paint(g, STACHE, null);   // sideburn
      oval(g, hx - 1.9, hy + 0.2, 0.7, 0.9); paint(g, SKIN_D, INK, 0.4);   // ear
      oval(g, hx + 0.4, hy + 1.2, 0.95, 0.55); g.fillStyle = "rgba(255,61,139,.3)"; g.fill();   // cheek
      if (mode === "caught") { line(g, [hx + 0.7, hy - 1, hx + 1.9, hy - 0.1], INK, 0.45); line(g, [hx + 0.7, hy - 0.1, hx + 1.9, hy - 1], INK, 0.45); }
      else { oval(g, hx + 1.3, hy - 0.45, 0.72, 0.92); paint(g, WH, INK, 0.3); oval(g, hx + 1.6, hy - 0.35, 0.4, 0.6); g.fillStyle = INK; g.fill(); oval(g, hx + 1.72, hy - 0.62, 0.15, 0.15); g.fillStyle = WH; g.fill(); }
      line(g, [hx + 0.4, hy - 1.75, hx + 1.3, hy - 2.05, hx + 2.2, hy - 1.75], STACHE, 0.5);   // eyebrow
      if (grin) { g.beginPath(); g.ellipse(hx + 1.9, hy + 1.95, 0.85, 0.7, 0, 0, Math.PI); g.closePath(); paint(g, "#5a1a22", INK, 0.3); oval(g, hx + 1.9, hy + 2.3, 0.4, 0.22); g.fillStyle = PK; g.fill(); }
      else { g.beginPath(); g.arc(hx + 1.9, hy + 1.45, 0.8, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = INK; g.lineWidth = 0.35; g.stroke(); }
      g.beginPath(); g.moveTo(hx + 0.6, hy + 1.35); g.quadraticCurveTo(hx + 1.6, hy + 0.35, hx + 2.4, hy + 1.05); g.quadraticCurveTo(hx + 3.3, hy + 0.35, hx + 4.3, hy + 1.45);   // mustache
      g.quadraticCurveTo(hx + 3.7, hy + 2.05, hx + 2.4, hy + 1.5); g.quadraticCurveTo(hx + 1.2, hy + 2.15, hx + 0.6, hy + 1.35); g.closePath(); paint(g, STACHE, INK, 0.35);
      oval(g, hx + 3.05, hy + 0.3, 1.05, 0.88); paint(g, rad(g, hx + 2.8, hy - 0.05, 0.1, 1.1, SKIN_L, SKIN), INK, 0.4);   // nose
      // sombrero: wide straw brim, tall crown, pink band with stitching; the brim bounces
      g.save(); g.translate(hx - 0.3, hy - 2.95); g.rotate(-0.06 + hatTilt);
      oval(g, 0, 0.1, 6.6, 1.55); paint(g, lin(g, 0, -1.5, 0, 1.6, STRAW_L, STRAW, STRAW_D), INK);
      g.beginPath(); g.ellipse(0, 0.1, 6.6, 1.55, 0, 0, Math.PI); g.strokeStyle = STRAW_D; g.lineWidth = 0.35; g.stroke();
      g.strokeStyle = rgba(STRAW_D, 0.6); g.lineWidth = 0.22; g.beginPath(); g.ellipse(0, 0.1, 5, 1.1, 0, 0.1, Math.PI - 0.1); g.stroke();
      g.beginPath(); g.moveTo(-2.4, 0); g.quadraticCurveTo(-2.7, -3.4, -0.6, -3.9); g.quadraticCurveTo(0.2, -4.4, 1.2, -3.9); g.quadraticCurveTo(2.9, -3.4, 2.5, 0); g.quadraticCurveTo(0, 0.7, -2.4, 0); g.closePath();
      paint(g, lin(g, -2.5, 0, 2.6, 0, STRAW_D, STRAW, STRAW_L), INK);
      g.save(); g.clip(); g.fillStyle = PK; g.fillRect(-3, -1.3, 6, 1.1); g.fillStyle = WH; for (let k = -2; k <= 2; k++) { star(g, k * 1.05, -0.75, 0.38, 0.15, 4); g.fill(); } g.restore();
      line(g, [-0.4, -3.7, -1.3, -1.5], "rgba(255,255,255,.4)", 0.35);
      g.restore();
      g.restore();   // torso rotation
      g.save(); g.translate(0.2, hipY); g.rotate(lean); arm(arms[0], false); g.restore();
      g.restore();
    }
    function drawFx() {
      for (const p of fx) { const x = p.x - camX, y = p.y;
        if (p.k === "dust") { const r = 0.6 + (0.55 - p.life) * 3; g.fillStyle = rgba(p.c, clamp(p.life * 2.2, 0, 0.75)); oval(g, x, y, r, r * 0.8); g.fill(); }
        else { const r = p.life > 0.3 ? 1.6 : 1; star(g, x, y, r, r * 0.3, 4, p.life * 4); g.fillStyle = p.c; g.fill(); } }
    }
    // ---- HUD (screen space)
    function slotIcon(x, pic, on, frac) {
      rrect(g, x, 11, 22, 10, 2.4); g.fillStyle = on ? PK : "#3a4058"; g.fill();
      rrect(g, x + 0.9, 11.9, 20.2, 8.2, 1.8); g.fillStyle = "#141726"; g.fill();
      g.save(); g.globalAlpha = on ? 1 : 0.35;
      if (pic === "cup") blit(sprite("cup", -1, -1, 10.5, 9, cupArt), x + 3, 12.5); else blit(sprite("chancla", -1, -1, 11, 7, chanclaArt), x + 2.2, 13);
      g.restore();
      if (pic === "cup" && on) { rrect(g, x + 13, 17.6, 7, 1.4, 0.7); g.fillStyle = "#3a4058"; g.fill(); rrect(g, x + 13, 17.6, Math.max(1, 7 * frac), 1.4, 0.7); g.fillStyle = OR; g.fill(); }
      if (pic === "chancla" && on) { star(g, x + 17, 14.6, 1.6, 0.5); g.fillStyle = WH; g.fill(); }
    }
    function hud() {
      screenT();
      g.fillStyle = "#141726"; g.fillRect(0, 0, W, 23); g.fillStyle = PK; g.fillRect(0, 23, W, 1.1);
      rrect(g, 2, 2, 17, 8, 2); g.fillStyle = PK; g.fill(); words(g, `LV${level}`, 10.5, 6.25, 5.6, WH);
      const sc = `${score}`, scw = measure(g, sc, 6.2);
      words(g, LEVELS[level - 1].sign, 23, 6.25, 5.2, "#c9d0d8", { align: "left", weight: 800, max: W - scw - 30 });
      words(g, sc, W - 3, 6.25, 6.2, TQL, { align: "right" });
      const px = Math.min(1, Math.max(0, hero.x / END)), pw = 58;   // progress to the destination
      rrect(g, 3, 14.6, pw, 3.4, 1.7); g.fillStyle = "#3a4058"; g.fill();
      if (px > 0) { rrect(g, 3, 14.6, Math.max(3.4, pw * px), 3.4, 1.7); g.fillStyle = lin(g, 3, 0, 3 + pw, 0, TQ, TQL); g.fill(); }
      for (const c of CHECKS.slice(1)) { rrect(g, 2.6 + pw * c / END, 13.2, 1, 6.2, 0.5); g.fillStyle = hero.x >= c ? TQ : PK; g.fill(); }
      oval(g, 3 + pw * px, 16.3, 1.9, 1.9); paint(g, WH, PK, 0.6);
      const hx = pw + 6.5; poly(g, [hx - 3, 16, hx, 13.3, hx + 3, 16]); paint(g, OR, null); g.fillStyle = OR; g.fillRect(hx - 2.2, 15.8, 4.4, 3.4); g.fillStyle = "#141726"; g.fillRect(hx - 0.6, 17.2, 1.2, 2);
      slotIcon(72, "cup", hero.boost > 0, hero.boost / 5); slotIcon(96, "chancla", hero.shield > 0, 1);
      words(g, `HI ${Math.max(st.best, score)}`, W - 3, 16.6, 5, "#8a93a8", { align: "right", weight: 800, max: 32 });
      if (msgT > 0) { const w = measure(g, msg, 5.6) + 10, a = clamp(msgT * 3, 0, 1); g.save(); g.globalAlpha = a;
        rrect(g, (W - w) / 2, 27.5, w, 10, 5); g.fillStyle = "rgba(20,23,38,.8)"; g.fill(); g.strokeStyle = TQ; g.lineWidth = 0.5; g.stroke();
        words(g, msg, W / 2, 32.7, 5.6, TQL); g.restore(); }
    }
    function vignette() {
      const sp = sprite("vig" + H + (night() ? "n" : ""), 0, 0, W, H, (c) => { c.fillStyle = rad(c, W / 2, H * 0.52, H * 0.3, H * 0.78, "rgba(29,20,38,0)", `rgba(29,20,38,${night() ? 0.45 : 0.22})`); c.fillRect(0, 0, W, H); });
      blit(sp, 0, 0);
    }
    function draw() {
      if (cacheLv !== level) { dropCache(); cacheLv = level; }
      const L = LEVELS[level - 1];
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#0d0f1a"; g.fillRect(0, 0, cv.width, cv.height);
      TX = shake > 0 && !reduced() ? Math.round((Math.random() - 0.5) * 4 * S) : 0; TY = Math.round(-oy() * S);
      worldT();
      sky();
      layer("far", 300, GROUND - 196, 197, 0.12, farTile);
      layer("mid", 240, GROUND - 124, 125, 0.3, midTile);
      layer("near", 296, GROUND - 100, 101, 0.6, nearTile);
      if (level >= 4) papel();
      street(); props(); destination();
      if (level === 5 && destX() - camX < W) family(destX() + 44 - camX);
      for (const e of ents) drawEnt(e);
      drawHero(); drawBurritos(); drawFx();
      screenT();
      vignette();
      if (mode === "win") parts.forEach((p, i) => { g.save(); g.translate(p.x, p.y); g.rotate(i + (reduced() ? 0 : t * (2 + (i % 3)))); g.scale(1, reduced() ? 1 : Math.cos(t * 6 + i));
        g.fillStyle = p.c; g.fillRect(-1.7, -0.9, 3.4, 1.8); g.restore(); });
      hud();
      if (mode === "caught") {
        const size = 17, w0 = measure(g, caughtMsg, size), k = Math.min(1, (W - 22) / w0), w = w0 * k, y = Math.round(H * 0.3);
        rrect(g, (W - w) / 2 - 7, y - size * 0.75, w + 14, size * 1.5, 7); g.fillStyle = "rgba(20,23,38,.7)"; g.fill();
        words(g, caughtMsg, W / 2, y, size * k, PK, { stroke: INK, sw: 3.2 * k, drop: PKD });
        words(g, caughtMsg, W / 2 - 0.3, y - 0.6, size * k, "rgba(255,255,255,.18)");
      }
      void L;
    }
    // the "ICE ICE BEBÉ" badge at the top of the full-screen game (HD)
    function badge() {
      for (const b of document.querySelectorAll(".iib-logo")) {
        const cw = b.getBoundingClientRect().width || 150, dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        const bs = Math.max(2, (cw * dpr) / 60), want = Math.round(60 * bs);
        if (b.dataset.drawn === String(want)) continue;
        b.dataset.drawn = String(want); b.width = want; b.height = Math.round(15 * bs);
        const c = b.getContext("2d"); c.setTransform(bs, 0, 0, bs, 0, 0); c.clearRect(0, 0, 60, 15);
        rrect(c, 0.6, 0.6, 58.8, 13.8, 4.6); c.fillStyle = lin(c, 0, 0, 0, 15, "#2a2140", "#141726"); c.fill(); c.strokeStyle = TQ; c.lineWidth = 1.1; c.stroke();
        rrect(c, 6, 11.4, 48, 1.1, 0.55); c.fillStyle = OR; c.fill();
        c.font = `900 7.6px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
        const tw0 = c.measureText("ICE ICE BEBÉ").width, k = Math.min(1, 50 / tw0);
        c.save(); c.translate(30, 7); c.scale(k, 1);
        c.lineJoin = "round"; c.lineWidth = 1.8; c.strokeStyle = INK; c.strokeText("ICE ICE BEBÉ", 0, 0);
        c.fillStyle = PK; c.fillText("ICE ICE BEBÉ", 0.4, 0.6); c.fillStyle = WH; c.fillText("ICE ICE BEBÉ", 0, 0);
        c.restore();
      }
    }
    // the canvas is sized to the screen: full screen fills the space; the backing store is CSS size × devicePixelRatio
    function fit() {
      let nh = H0, cssW = 0;
      if (fs.on) {
        const r = wrap.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) {
          nh = Math.max(220, Math.min(340, Math.round(W * r.height / r.width)));
          const sc = Math.min(r.width / W, r.height / nh);
          cssW = Math.floor(W * sc); cv.style.width = cssW + "px"; cv.style.height = Math.floor(nh * sc) + "px";
        }
      } else { cv.style.width = ""; cv.style.height = ""; }
      if (!cssW) { const r = cv.getBoundingClientRect(); cssW = r.width > 20 ? r.width : W * 2; }
      H = nh;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const s = Math.max(2, Math.min(cssW * dpr / W, 8, 2600 / H));
      const bw = Math.round(W * s), bh = Math.round(H * (bw / W));
      if (bw !== cv.width || bh !== cv.height) { cv.width = bw; cv.height = bh; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; }
      if (bw / W !== S) { S = bw / W; dropCache(); }
      if (!raf && hero) draw();
      badge();
    }
    // re-fit when the canvas changes size on the page (first show, rotation, window resize)
    let fitQ = 0; const refit = () => { if (fitQ) return; fitQ = requestAnimationFrame(() => { fitQ = 0; if (el.isConnected) fit(); }); };
    const onWinResize = () => refit();
    window.addEventListener("resize", onWinResize);
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(refit) : null; if (ro) ro.observe(cv);
    function title() {
      paused = false; level = st.levelMax > 1 ? st.levelMax : 1; spawn(0); mode = "title"; overlay(null); draw(); ctrl();
      el.querySelector("#ice-note").textContent = "";
      if (ctx && ctx.onTitle) ctx.onTitle({ best: st.best, levelMax: st.levelMax, wins: st.wins, muted: st.muted, levels: LEVELS.map((l) => l.name) });
    }
    function loop() {
      cancelAnimationFrame(raf); last = performance.now();
      const step = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw();
        if (mode === "run" || mode === "caught" || (mode === "win" && parts.length) || fx.length) raf = requestAnimationFrame(step); else raf = null; };
      raf = requestAnimationFrame(step);
    }
    function pause() {
      if ((mode === "run" || mode === "caught") && !paused) {
        if (mode === "caught") { spawn(ck); }   // caught right as you leave: come back at the checkpoint
        paused = true; mode = "paused"; cancelAnimationFrame(raf); raf = null; draw();
        overlay(`<p class="ice-big">Paused</p><p class="ice-btns"><button type="button" class="lot-btn lot-main" data-act="resume">▶ Resume</button><button type="button" class="lot-btn" data-act="menu">☰ Title screen</button></p>`, "soft"); ctrl();
      }
    }
    function resume() { if (paused) { paused = false; mode = "run"; overlay(null); fit(); loop(); ctrl(); } }
    function stats() { el.querySelector("#ice-stats").innerHTML = `⭐ Best score <b>${st.best}</b> · 🏠 Made it home <b>${st.wins}</b>× · Furthest level <b>${st.levelMax}</b>`; }
    function ctrl() {
      const p = el.querySelector("#ice-pause");
      p.innerHTML = paused ? '<span aria-hidden="true">▶</span><span class="ice-lbl"> Resume</span>' : '<svg class="ice-pz" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="4" y="3" width="4.5" height="14" rx="1.5" fill="currentColor"/><rect x="11.5" y="3" width="4.5" height="14" rx="1.5" fill="currentColor"/></svg><span class="ice-lbl"> Pause</span>';
      p.setAttribute("aria-label", paused ? "Resume" : "Pause");
      const s = el.querySelector("#ice-sound");
      s.innerHTML = `<span aria-hidden="true">${st.muted ? "🔇" : "🔊"}</span><span class="ice-lbl"> Sound</span>`; s.setAttribute("aria-label", st.muted ? "Sound is off" : "Sound is on"); s.setAttribute("aria-pressed", st.muted ? "false" : "true");
    }
    // ---- input: tap / click the game, the Jump button, Space / ↑ / W
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); });
    cv.addEventListener("pointerup", release);
    const tb = el.querySelector("#ice-throw");
    tb.addEventListener("pointerdown", (e) => { e.preventDefault(); throwB(); });
    tb.addEventListener("click", (e) => { if (e.detail === 0) throwB(); });   // keyboard activation
    const jb = el.querySelector("#ice-jump");
    jb.addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); }); jb.addEventListener("pointerup", release);
    jb.addEventListener("click", (e) => { if (e.detail === 0) jump(); });   // keyboard activation
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act; audio();
      if (a === "start") startLevel(1); else if (a === "cont") { ckScore = 0; startLevel(st.levelMax); } else if (a === "next") startLevel(level + 1, true); else if (a === "again") startLevel(1); else if (a === "resume") resume(); else if (a === "menu") title(); });
    el.querySelector("#ice-pause").onclick = () => (paused ? resume() : pause());
    el.querySelector("#ice-restart").onclick = () => { paused = false; ckScore = 0; startLevel(level); ctrl(); };
    el.querySelector("#ice-sound").onclick = () => { st.muted = !st.muted; save(st); ctrl(); if (!st.muted) SFX.coin(); };
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ctx && ctx.titleOpen && ctx.titleOpen()) return;   // the title screen handles its own keys
      if (e.target.closest && e.target.closest("input, textarea, select, dialog")) return;
      const k = e.key;
      if (e.code === "Space" || k === "ArrowUp" || k === "w" || k === "W") {
        if (e.target.closest && e.target.closest("button") && e.target !== jb && e.code === "Space" && mode !== "run") return;   // Space on a focused overlay button presses it
        e.preventDefault(); if (!e.repeat) jump();
      }
      else if (k === "x" || k === "X" || k === "f" || k === "F") { if (!e.repeat) { e.preventDefault(); throwB(); } }
      else if (k === "p" || k === "P") { e.preventDefault(); paused ? resume() : pause(); }
      else if (k === "Escape") { e.preventDefault(); if (mode === "run" || mode === "caught") pause(); else if (paused) resume(); }
      else if (k === "m" || k === "M") { e.preventDefault(); el.querySelector("#ice-sound").click(); }
      else if ((k === "r" || k === "R") && !e.repeat && (mode === "run" || mode === "caught" || paused)) { e.preventDefault(); el.querySelector("#ice-restart").click(); }
      else if (k === "Enter" && !(e.target.closest && e.target.closest("button"))) {
        const b = ov.querySelector(".lot-main"); if (b) { e.preventDefault(); b.click(); }
      }
    };
    const onKeyUp = (e) => { if (e.code === "Space" || e.key === "ArrowUp") release(); };
    document.addEventListener("keydown", onKey); document.addEventListener("keyup", onKeyUp);
    const onVis = () => { if (document.hidden) pause(); }; document.addEventListener("visibilitychange", onVis);
    if (ro) ro.observe(wrap);
    stats(); ctrl(); title();
    return {
      pause, resume, jump, throw: throwB, start: (n) => { audio(); ckScore = 0; startLevel(Math.max(1, Math.min(n || 1, st.levelMax, 5))); }, title, get muted() { return st.muted; }, toggleSound: () => el.querySelector("#ice-sound").click(),
      destroy() { fs.exit(true); cancelAnimationFrame(raf); dropCache(); if (ro) ro.disconnect(); window.removeEventListener("resize", onWinResize); document.removeEventListener("keydown", onKey); document.removeEventListener("keyup", onKeyUp); document.removeEventListener("visibilitychange", onVis); },
      get state() { return { caughtMsg, msg, mode, level, x: hero.x, y: hero.y, ground: hero.ground, jumps: hero.jumps, score, ck, best: st.best, muted: st.muted, boost: hero.boost, shield: hero.shield, levelMax: st.levelMax, parallax: !reduced(), overlay: ov.textContent.trim(),
        fullscreen: fs.on, W, H, fx: fx.length, fxMade, burritos: burr.length, thrown, bonks, stomps, scale: S, backing: [cv.width, cv.height] }; },
      // test hooks: jump to a spot in a level (as if you'd run there)
      warp(n, x) { if (n !== level || mode === "title" || mode === "win" || mode === "clear") startLevel(n, true); hero.x = x; camX = x - HERO_X; for (const e of ents) if (e.t === "flag" && e.x <= x) { e.done = true; ck = CHECKS.indexOf(e.x); } ents = ents.filter((e) => !["agent", "cone", "suv", "crate"].includes(e.t) || e.x > x + 30 || e.x < x - 40); },
      ents: () => ents.map((e) => ({ t: e.t, x: e.x, st: e.st })),
    };
  }

  const api = { KEY, LEVELS, END, CHECKS, W, H0, buildLevel, load, save, reset, mount };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IceIceBebe = api;
})(typeof window !== "undefined" ? window : this);
