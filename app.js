/* ==============================
   FILE: app.js
   Cyber Portfolio (Lock Gate + Matrix + Focus Zoom + Command Palette)
================================== */

(() => {
  "use strict";

  /* -----------------------------------------------------------
    Helpers
  ----------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const now = () => performance.now();

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function toast(title, body, ttl = 1800) {
    const host = $("#toasts");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="t-title">${escapeHtml(title)}</div>
      <div class="t-body">${escapeHtml(body)}</div>
    `;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "opacity .22s ease, transform .22s ease";
      setTimeout(() => el.remove(), 240);
    }, ttl);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function smoothScrollTo(target) {
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function isInViewport(el, pad = 0) {
    const r = el.getBoundingClientRect();
    return r.bottom >= -pad && r.top <= window.innerHeight + pad;
  }

  /* -----------------------------------------------------------
    Global Elements
  ----------------------------------------------------------- */
  const gate = $("#gate");
  const app = $("#app");
  const meterFill = $("#meterFill");
  const meterPct = $("#meterPct");
  const meterHint = $("#meterHint");
  const gateStatusText = $("#gateStatusText");
  const terminalBody = $("#terminalBody");

  const focusOverlay = $("#focusOverlay");
  const cmdPalette = $("#cmdPalette");

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* -----------------------------------------------------------
    Cursor FX (desktop only)
  ----------------------------------------------------------- */
  (function initCursorFX() {
    const host = $("#cursorFX");
    if (!host) return;

    const dot = $(".cursor-dot", host);
    const ring = $(".cursor-ring", host);
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
    }, { passive: true });

    function tick() {
      rx = lerp(rx, mx, 0.14);
      ry = lerp(ry, my, 0.14);
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      requestAnimationFrame(tick);
    }
    tick();
  })();

  /* -----------------------------------------------------------
    Matrix Background (Canvas)
  ----------------------------------------------------------- */
  function initMatrix() {
    const c = $("#bgMatrix");
    if (!c) return null;
    const ctx = c.getContext("2d", { alpha: true });
    let w = 0, h = 0, dpr = 1;
    let cols = 0;
    let drops = [];
    let fontSize = 16;

    const glyphs = "01▌▐░▒▓<>/\\{}[]()*+-=|:;,.#@$%&".split("");

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = c.width = Math.floor(window.innerWidth * dpr);
      h = c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = "100%";
      c.style.height = "100%";
      fontSize = Math.floor(16 * dpr);
      cols = Math.floor(w / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * h);
      ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    let last = now();
    function draw(t) {
      const dt = t - last;
      last = t;

      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, w, h);

      // Slight color variability via alpha; actual colors are in CSS
      ctx.fillStyle = "rgba(102,247,255,0.65)";

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize;
        const y = drops[i];

        const text = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillText(text, x, y);

        // Speed variation
        drops[i] += (dt * (0.08 + Math.random() * 0.10)) * fontSize;

        // Reset if off-screen
        if (drops[i] > h && Math.random() > 0.975) {
          drops[i] = -Math.random() * h * 0.25;
        }
      }
      requestAnimationFrame(draw);
    }

    if (!prefersReducedMotion()) requestAnimationFrame(draw);
    return { resize };
  }

  /* -----------------------------------------------------------
    Particles Background (Canvas)
  ----------------------------------------------------------- */
  function initParticles() {
    const c = $("#bgParticles");
    if (!c) return null;
    const ctx = c.getContext("2d", { alpha: true });
    let w = 0, h = 0, dpr = 1;

    let particles = [];
    const maxP = 90;

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = c.width = Math.floor(window.innerWidth * dpr);
      h = c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = "100%";
      c.style.height = "100%";
      particles = new Array(maxP).fill(0).map(() => spawn());
    }

    function spawn() {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = (0.6 + Math.random() * 1.8) * dpr;
      const vx = (-0.08 + Math.random() * 0.16) * dpr;
      const vy = (-0.10 + Math.random() * 0.20) * dpr;
      const a = 0.12 + Math.random() * 0.24;
      return { x, y, r, vx, vy, a };
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let last = now();
    function draw(t) {
      const dt = t - last;
      last = t;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
          Object.assign(p, spawn());
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(231,241,255,${p.a})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    if (!prefersReducedMotion()) requestAnimationFrame(draw);
    return { resize };
  }

  initMatrix();
  initParticles();

  /* -----------------------------------------------------------
    Gate Terminal Stream
  ----------------------------------------------------------- */
  function termLine(kind, msg) {
    if (!terminalBody) return;
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;
    const el = document.createElement("div");
    el.className = "term-line";
    const cls = kind === "ok" ? "term-ok" : kind === "warn" ? "term-warn" : "term-bad";
    const tag = kind === "ok" ? "OK" : kind === "warn" ? "WARN" : "ERR";
    el.innerHTML = `<span class="term-ts">${stamp}</span> <span class="${cls}">${tag}</span> ${escapeHtml(msg)}`;
    terminalBody.appendChild(el);
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  /* -----------------------------------------------------------
    Gate: Scroll-to-Unlock
    - "Bamboozling" feel via rhythm sensitivity + micro-events
  ----------------------------------------------------------- */
  const gateState = {
    progress: 0,
    unlocked: false,
    lastScrollT: 0,
    rhythm: 0, // measure of scroll consistency
    burstCooldown: 0,
  };

  function setGateProgress(p) {
    gateState.progress = clamp(p, 0, 100);
    if (meterFill) meterFill.style.width = gateState.progress.toFixed(0) + "%";
    if (meterPct) meterPct.textContent = gateState.progress.toFixed(0) + "%";

    if (meterHint) {
      if (gateState.progress < 15) meterHint.textContent = "Searching for cipher resonance…";
      else if (gateState.progress < 35) meterHint.textContent = "Aligning tumbler rings…";
      else if (gateState.progress < 60) meterHint.textContent = "Decrypting handshake packets…";
      else if (gateState.progress < 85) meterHint.textContent = "Stabilizing access tunnel…";
      else meterHint.textContent = "Finalizing key imprint…";
    }
  }

  function gateUnlock() {
    if (gateState.unlocked) return;
    gateState.unlocked = true;

    if (gateStatusText) gateStatusText.textContent = "UNLOCKED";
    gate?.classList.add("is-unlocking");

    termLine("ok", "Cipher alignment reached threshold.");
    termLine("ok", "Decrypting interface layer…");
    termLine("ok", "Opening secure viewport…");

    // Reveal app after a short "boom"
    setTimeout(() => {
      gate?.classList.add("is-unlocked");
      app?.classList.add("is-visible");
      if (app) app.setAttribute("aria-hidden", "false");
      if (gate) gate.setAttribute("aria-hidden", "true");
      document.body.style.overflowY = "auto";
      toast("ACCESS GRANTED", "Welcome to the portfolio node.");

      // subtle initial scroll nudge
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 650);
  }

  // Lock the page at top while gate is active
  function lockScrollWhileGated() {
    if (!gate) return;
    document.body.style.overflowY = "hidden";
    window.scrollTo(0, 0);
  }
  if (gate && !gateState.unlocked) lockScrollWhileGated();

  // "Flying code" burst overlay (DOM-based for simplicity)
  function spawnCodeBurst(intensity = 1) {
    if (!gate || gateState.unlocked) return;
    const count = Math.floor(10 * intensity + Math.random() * 8 * intensity);
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.inset = "0";
    wrap.style.pointerEvents = "none";
    wrap.style.zIndex = "4";
    wrap.className = "code-burst";
    gate.appendChild(wrap);

    const words = [
      "AUTH", "KEY", "NEON/1.7", "NODE", "GLITCH", "VECTOR", "ECS", "MESH", "BEZIER", "OPENGL",
      "PACKET", "TRACE", "RUNTIME", "SYNC", "Δt", "0xA9", "0xFF", "SIG", "ACCESS", "KERNEL"
    ];

    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.textContent = words[(Math.random() * words.length) | 0];
      s.style.position = "absolute";
      s.style.left = (Math.random() * 100) + "%";
      s.style.top = (40 + Math.random() * 50) + "%";
      s.style.fontFamily = `"IBM Plex Mono", monospace`;
      s.style.fontSize = (10 + Math.random() * 12) + "px";
      s.style.letterSpacing = "0.12em";
      s.style.opacity = String(0.10 + Math.random() * 0.45);
      s.style.color = Math.random() < 0.5 ? "rgba(102,247,255,.95)" : "rgba(184,107,255,.85)";
      s.style.textShadow = "0 0 18px rgba(102,247,255,.18)";
      s.style.transform = `translate(-50%,-50%) rotate(${(-18 + Math.random() * 36)}deg)`;

      const dx = (-260 + Math.random() * 520);
      const dy = (-260 + Math.random() * 420);
      const dur = 420 + Math.random() * 520;

      s.animate([
        { transform: s.style.transform + " translate(0px,0px) scale(1)", opacity: s.style.opacity },
        { transform: s.style.transform + ` translate(${dx}px,${dy}px) scale(${0.7 + Math.random() * 0.6})`, opacity: 0 }
      ], { duration: dur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" });

      wrap.appendChild(s);
    }

    setTimeout(() => wrap.remove(), 1200);
  }

  // Gate rhythm: more progress if scroll cadence is "clean"
  function onGateScroll(deltaY) {
    if (!gate || gateState.unlocked) return;

    const t = now();
    const dt = t - gateState.lastScrollT;
    gateState.lastScrollT = t;

    // Rhythm score: best around ~60-140ms spacing
    const ideal = 95;
    const miss = Math.abs(dt - ideal);
    const hit = clamp(1 - miss / 260, 0, 1);
    gateState.rhythm = lerp(gateState.rhythm, hit, 0.35);

    // Base progress from delta magnitude
    const mag = clamp(Math.abs(deltaY) / 60, 0, 2.2);
    const rhythmBoost = 0.7 + gateState.rhythm * 0.9;

    // Anti-bot bamboozle: if you spam huge scrolls, you get diminishing returns
    const spamPenalty = mag > 1.8 ? 0.6 : 1.0;

    const gain = (mag * rhythmBoost * spamPenalty) * 2.2;

    // Minor decay if user "jiggles" (tiny scrolls)
    const decay = mag < 0.25 ? 0.18 : 0.0;

    setGateProgress(gateState.progress + gain - decay);

    // Gate micro feedback
    if (gateState.progress > 10 && gateState.progress < 12.5) termLine("warn", "Cipher jitter detected. Maintain rhythm.");
    if (gateState.progress > 32 && gateState.progress < 35) termLine("ok", "Handshake locked. Continue alignment.");
    if (gateState.progress > 58 && gateState.progress < 61) termLine("ok", "Key imprint stable. Pushing final phase.");
    if (gateState.progress > 82 && gateState.progress < 84) termLine("warn", "Final ring resisting. Slow down slightly.");

    // Burst control
    gateState.burstCooldown -= dt;
    if (gateState.burstCooldown <= 0) {
      spawnCodeBurst(0.6 + gateState.rhythm * 1.2);
      gateState.burstCooldown = 180 - gateState.rhythm * 70;
    }

    // Visual state class
    if (gateState.progress > 35) gate.classList.add("is-unlocking");

    // Unlock threshold
    if (gateState.progress >= 100) {
      setGateProgress(100);
      gateUnlock();
    }
  }

  // Attach wheel listener for gate
  window.addEventListener("wheel", (e) => {
    if (!gate || gateState.unlocked) return;
    e.preventDefault();
    onGateScroll(e.deltaY);
  }, { passive: false });

  // Also allow keyboard "scroll" for accessibility
  window.addEventListener("keydown", (e) => {
    if (!gate || gateState.unlocked) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      onGateScroll(80);
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      onGateScroll(40);
    }
  });

  // Initial terminal spam to feel alive
  if (gate) {
    const phrases = [
      ["ok", "Establishing secure lane…"],
      ["ok", "Initializing neon shader bus…"],
      ["warn", "Input locked: scroll key required."],
      ["ok", "Waiting on cipher resonance…"]
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (gateState.unlocked) { clearInterval(iv); return; }
      const [k, m] = phrases[i++ % phrases.length];
      termLine(k, m);
    }, 900);
  }

  /* -----------------------------------------------------------
    Smooth Scrolling (data-scroll links)
  ----------------------------------------------------------- */
  $$("#app a[data-scroll]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target);
    });
  });

  /* -----------------------------------------------------------
    Projects: Filter + Search
  ----------------------------------------------------------- */
  const projectGrid = $("#projectGrid");
  const projectCards = projectGrid ? $$(".card", projectGrid) : [];
  let activeFilter = "all";

  function applyProjectFilter() {
    const q = ($("#projectSearch")?.value || "").trim().toLowerCase();

    projectCards.forEach(card => {
      const tags = (card.getAttribute("data-tags") || "").toLowerCase();
      const title = (card.getAttribute("data-title") || "").toLowerCase();
      const desc = (card.getAttribute("data-desc") || "").toLowerCase();

      const matchesFilter = (activeFilter === "all") || tags.includes(activeFilter);
      const matchesQuery = !q || title.includes(q) || desc.includes(q) || tags.includes(q);

      const show = matchesFilter && matchesQuery;
      card.style.display = show ? "" : "none";
    });
  }

  $$(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.getAttribute("data-filter") || "all";
      applyProjectFilter();
      toast("FILTER", `Projects: ${activeFilter.toUpperCase()}`);
    });
  });

  $("#projectSearch")?.addEventListener("input", () => applyProjectFilter(), { passive: true });

  /* -----------------------------------------------------------
    Focus Mode: Cinematic Zoom/Fade for Cards
  ----------------------------------------------------------- */
  const focus = {
    open: false,
    index: 0,
    cards: projectCards.filter(c => c.style.display !== "none"),
  };

  function visibleCards() {
    // re-evaluate based on display state
    return projectCards.filter(c => c.style.display !== "none");
  }

  function setSelectedCard(card) {
    projectCards.forEach(c => c.classList.remove("is-selected"));
    card.classList.add("is-selected");
  }

  function openFocus(card) {
    if (!focusOverlay || !card) return;

    const vc = visibleCards();
    focus.cards = vc;
    focus.index = Math.max(0, vc.indexOf(card));
    focus.open = true;

    document.body.classList.add("is-focusing");
    setSelectedCard(card);

    // Fill modal content from card dataset
    const title = card.getAttribute("data-title") || "Project";
    const desc = card.getAttribute("data-desc") || "Description unavailable.";
    const tags = (card.getAttribute("data-tags") || "").split(/\s+/).filter(Boolean);

    $("#focusTitle").textContent = title;
    $("#focusDesc").textContent = desc;

    // Kicker: first tag
    $("#focusKicker").textContent = (tags[0] || "DOSSIER").toUpperCase();

    // Tags chips
    const tagHost = $("#focusTags");
    if (tagHost) {
      tagHost.innerHTML = "";
      const base = [];
      for (const t of tags) base.push(t.toUpperCase());
      const uniq = Array.from(new Set(base));
      uniq.slice(0, 6).forEach(t => {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tagHost.appendChild(s);
      });
    }

    // Highlights: generate from tags (simple, looks good)
    const hlHost = $("#focusHighlights");
    if (hlHost) {
      hlHost.innerHTML = "";
      const map = {
        engine: ["Deterministic update phases", "Debug tooling & inspection", "Data-oriented design"],
        graphics: ["Stylized rendering pipeline", "Realtime procedural shapes", "Shader-driven polish"],
        gameplay: ["Clear mechanics & iteration", "Responsive feedback loops", "Tunable difficulty knobs"],
        tools: ["Workflow acceleration", "Telemetry + profiling hooks", "Developer UX focus"],
        animation: ["Readable arcs & timing", "Impact and anticipation", "Pose beats"],
      };
      const picks = [];
      tags.forEach(t => {
        const k = t.toLowerCase();
        if (map[k]) picks.push(...map[k]);
      });
      const final = (picks.length ? picks : ["Clean architecture", "Polished UI/UX", "Performance-conscious"]).slice(0, 5);
      final.forEach(x => {
        const li = document.createElement("li");
        li.textContent = x;
        hlHost.appendChild(li);
      });
    }

    // Signal box (flair)
    $("#focusBuild").textContent = "Release";
    $("#focusStatus").textContent = "Active";
    $("#focusComplexity").textContent = tags.includes("engine") ? "High" : "Medium";

    // Primary link placeholder (set your real links per card later)
    const primary = $("#focusPrimary");
    if (primary) {
      primary.href = "#";
      primary.textContent = "Open Link";
      primary.style.pointerEvents = "none";
      primary.style.opacity = "0.65";
    }

    // Show overlay
    focusOverlay.classList.add("is-open");
    focusOverlay.setAttribute("aria-hidden", "false");

    // Prevent background scroll
    document.body.style.overflow = "hidden";
  }

  function closeFocus() {
    if (!focusOverlay) return;
    focus.open = false;
    focusOverlay.classList.remove("is-open");
    focusOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-focusing");
    projectCards.forEach(c => c.classList.remove("is-selected"));
    document.body.style.overflow = "";
  }

  function focusPrevNext(dir) {
    const vc = visibleCards();
    if (!vc.length) return;
    focus.index = (focus.index + dir + vc.length) % vc.length;
    openFocus(vc[focus.index]);
  }

  projectCards.forEach((card) => {
    const open = () => openFocus(card);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  // Close on backdrop or close button
  focusOverlay?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-close]") || t.closest("[data-close]")) closeFocus();
  });
  // ESC, arrows
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (cmdPalette?.classList.contains("is-open")) closeCmdPalette();
      else if (focusOverlay?.classList.contains("is-open")) closeFocus();
      return;
    }
    if (focusOverlay?.classList.contains("is-open")) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); focusPrevNext(-1); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); focusPrevNext(+1); }
    }
  });

  // Copy summary
  $("#focusCopy")?.addEventListener("click", async () => {
    const t = $("#focusTitle")?.textContent || "Project";
    const d = $("#focusDesc")?.textContent || "";
    const payload = `${t}\n\n${d}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast("COPIED", "Project summary copied to clipboard.");
    } catch {
      toast("COPY FAILED", "Clipboard permission denied.");
    }
  });

  /* -----------------------------------------------------------
    Copy-to-Clipboard (contact pills)
  ----------------------------------------------------------- */
  $$("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        toast("COPIED", text);
      } catch {
        toast("COPY FAILED", "Clipboard permission denied.");
      }
    });
  });

  /* -----------------------------------------------------------
    Message Terminal Buttons (demo)
  ----------------------------------------------------------- */
  $("#clearMsg")?.addEventListener("click", () => {
    const box = $("#msgBox");
    if (box) box.value = "";
    toast("CLEARED", "Message buffer cleared.");
  });

  $("#sendMsg")?.addEventListener("click", () => {
    const box = $("#msgBox");
    const v = (box?.value || "").trim();
    if (!v) {
      toast("EMPTY", "Type a message first.");
      return;
    }
    toast("SENT", "This is a demo. Wire this to your email/form endpoint.");
    box.value = "";
  });

  /* -----------------------------------------------------------
    Theme Toggle
  ----------------------------------------------------------- */
  $("#themeToggle")?.addEventListener("click", (e) => {
    const b = e.currentTarget;
    document.body.classList.toggle("alt-theme");
    const on = document.body.classList.contains("alt-theme");
    if (b instanceof HTMLElement) b.setAttribute("aria-pressed", on ? "true" : "false");
    toast("MODE", on ? "Alternate theme enabled." : "Primary theme enabled.");
  });

  /* -----------------------------------------------------------
    Command Palette
  ----------------------------------------------------------- */
  const commands = [
    { label: "Go: Home", hint: "#home", run: () => smoothScrollTo($("#home")) },
    { label: "Go: About", hint: "#about", run: () => smoothScrollTo($("#about")) },
    { label: "Go: Projects", hint: "#projects", run: () => smoothScrollTo($("#projects")) },
    { label: "Go: Skills", hint: "#skills", run: () => smoothScrollTo($("#skills")) },
    { label: "Go: Timeline", hint: "#timeline", run: () => smoothScrollTo($("#timeline")) },
    { label: "Go: Contact", hint: "#contact", run: () => smoothScrollTo($("#contact")) },
    { label: "Toggle Mode", hint: "theme", run: () => $("#themeToggle")?.click() },
    { label: "Open First Project", hint: "focus", run: () => visibleCards()[0] && openFocus(visibleCards()[0]) },
  ];

  function renderCmdList(items, activeIndex = 0) {
    const list = $("#cmdList");
    if (!list) return;
    list.innerHTML = "";
    items.forEach((c, idx) => {
      const el = document.createElement("div");
      el.className = "cmd-item" + (idx === activeIndex ? " is-active" : "");
      el.setAttribute("role", "option");
      el.setAttribute("data-idx", String(idx));
      el.innerHTML = `<div>${escapeHtml(c.label)}</div><div class="hint">${escapeHtml(c.hint)}</div>`;
      el.addEventListener("click", () => {
        c.run();
        closeCmdPalette();
      });
      list.appendChild(el);
    });
  }

  let cmdActive = 0;
  let cmdItems = commands.slice();

  function openCmdPalette() {
    if (!cmdPalette) return;
    cmdPalette.classList.add("is-open");
    cmdPalette.setAttribute("aria-hidden", "false");
    cmdItems = commands.slice();
    cmdActive = 0;
    renderCmdList(cmdItems, cmdActive);
    const input = $("#cmdInput");
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 0);
    }
  }

  function closeCmdPalette() {
    if (!cmdPalette) return;
    cmdPalette.classList.remove("is-open");
    cmdPalette.setAttribute("aria-hidden", "true");
  }

  $("#cmdPaletteBtn")?.addEventListener("click", openCmdPalette);

  cmdPalette?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-cmd-close]") || t.closest("[data-cmd-close]")) closeCmdPalette();
  });

  $("#cmdInput")?.addEventListener("input", (e) => {
    const v = (e.target instanceof HTMLInputElement) ? e.target.value.trim().toLowerCase() : "";
    cmdItems = commands
      .map((c) => ({ ...c, score: scoreCmd(c, v) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
    cmdActive = 0;
    renderCmdList(cmdItems, cmdActive);
  });

  function scoreCmd(cmd, q) {
    if (!q) return 10;
    const hay = (cmd.label + " " + cmd.hint).toLowerCase();
    if (hay.startsWith(q)) return 14;
    if (hay.includes(q)) return 9;
    // fuzzy-ish: all chars in order
    let i = 0;
    for (const ch of q) {
      i = hay.indexOf(ch, i);
      if (i === -1) return 0;
      i++;
    }
    return 4;
  }

  window.addEventListener("keydown", (e) => {
    // CMD palette quick key: Ctrl+K or /
    if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
      // avoid typing "/" into inputs
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      const typing = ["INPUT", "TEXTAREA"].includes(tag);
      if (!typing) {
        e.preventDefault();
        if (cmdPalette?.classList.contains("is-open")) closeCmdPalette();
        else openCmdPalette();
      }
    }

    if (!cmdPalette?.classList.contains("is-open")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      cmdActive = (cmdActive + 1) % Math.max(1, cmdItems.length);
      renderCmdList(cmdItems, cmdActive);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      cmdActive = (cmdActive - 1 + cmdItems.length) % Math.max(1, cmdItems.length);
      renderCmdList(cmdItems, cmdActive);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const c = cmdItems[cmdActive];
      if (c) {
        c.run();
        closeCmdPalette();
      }
    }
  });

  /* -----------------------------------------------------------
    Audio Toggle (optional)
  ----------------------------------------------------------- */
  const ambientAudio = $("#ambientAudio");
  $("#audioToggle")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!(btn instanceof HTMLElement)) return;

    if (!ambientAudio || ambientAudio.children.length === 0) {
      toast("AUDIO", "No audio file is configured in index.html.");
      return;
    }

    try {
      if (ambientAudio.paused) {
        await ambientAudio.play();
        btn.setAttribute("aria-pressed", "true");
        toast("AUDIO", "Ambient audio enabled.");
      } else {
        ambientAudio.pause();
        btn.setAttribute("aria-pressed", "false");
        toast("AUDIO", "Ambient audio paused.");
      }
    } catch {
      toast("AUDIO BLOCKED", "Browser prevented autoplay. Click again after interacting.");
    }
  });

  /* -----------------------------------------------------------
    Minor polish: nav active highlight on scroll (lightweight)
  ----------------------------------------------------------- */
  const navLinks = $$("#app .nav-links a[data-scroll]");
  const sectionIds = navLinks.map(a => a.getAttribute("href")).filter(Boolean);
  function updateNavActive() {
    if (!app || app.getAttribute("aria-hidden") === "true") return;
    let best = null;
    let bestTop = -Infinity;

    for (const id of sectionIds) {
      const el = $(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top < 160 && top > bestTop) {
        bestTop = top;
        best = id;
      }
    }
    navLinks.forEach(a => {
      const on = a.getAttribute("href") === best;
      a.style.borderColor = on ? "rgba(102,247,255,.22)" : "transparent";
      a.style.background = on ? "rgba(102,247,255,.06)" : "transparent";
    });
  }
  window.addEventListener("scroll", () => {
    if (!prefersReducedMotion()) updateNavActive();
  }, { passive: true });

  /* -----------------------------------------------------------
    Gate HUD ping (flair)
  ----------------------------------------------------------- */
  const hudPing = $("#hudPing");
  if (hudPing) {
    setInterval(() => {
      if (gateState.unlocked) return;
      const v = 8 + Math.floor(Math.random() * 24);
      hudPing.textContent = v + "ms";
    }, 500);
  }

  /* -----------------------------------------------------------
    Startup Toast (after unlock)
  ----------------------------------------------------------- */
  // The gate already locks scrolling; we’ll keep user at top.
  // If you want to bypass the gate during dev, uncomment:
  // setGateProgress(100); gateUnlock();

})();
