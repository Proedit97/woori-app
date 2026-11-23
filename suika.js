// 우리기록 · 수박게임 (같은 과일을 합쳐 수박을 만드는 물리 퍼즐)
// window.WooriSuika.open({ best, onEnd(score) }) / close()
(function () {
  "use strict";
  const W = 400, H = 620, TOP = 96, LINE = 150, WALL = 40;
  const FRUITS = [
    { e: "🍒", n: "체리", r: 15, c: "#ff4d6d" },
    { e: "🍓", n: "딸기", r: 20, c: "#ff6b81" },
    { e: "🍇", n: "포도", r: 27, c: "#a06cd5" },
    { e: "🍋", n: "레몬", r: 33, c: "#ffd43b" },
    { e: "🍊", n: "오렌지", r: 40, c: "#ff922b" },
    { e: "🍎", n: "사과", r: 49, c: "#f03e3e" },
    { e: "🍐", n: "배", r: 58, c: "#c0eb75" },
    { e: "🍑", n: "복숭아", r: 67, c: "#ffa8a8" },
    { e: "🍍", n: "파인애플", r: 78, c: "#fcc419" },
    { e: "🍈", n: "멜론", r: 91, c: "#8ce99a" },
    { e: "🍉", n: "수박", r: 106, c: "#2f9e44" },
  ];
  const PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
  const DROPPABLE = 5;

  let root, cv, ctx, M, engine, raf = 0, running = false, opts = {};
  let score = 0, cur = 0, next = 0, aimX = W / 2, canDrop = true, over = false, overTimer = 0, lastT = 0, acc = 0;
  let merges = [], pops = [], dpr = 1, scale = 1, offX = 0, offY = 0;

  const rnd = () => Math.floor(Math.random() * DROPPABLE);
  const $ = s => root.querySelector(s);

  function css() {
    if (document.getElementById("suika-css")) return;
    const st = document.createElement("style"); st.id = "suika-css";
    st.textContent = `
#suika{position:fixed;inset:0;z-index:70;background:linear-gradient(170deg,#fff6e9,#ffe3c4);display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
#suika .sk-top{display:flex;align-items:center;gap:10px;padding:10px 14px;font-family:Inter,"Noto Sans KR",sans-serif;color:#5c3d1e}
#suika .sk-x{width:36px;height:36px;border-radius:12px;background:#fff8;font-size:18px;border:0;color:#5c3d1e}
#suika .sk-sc{flex:1}#suika .sk-sc b{font-size:26px;font-weight:800;display:block;line-height:1}#suika .sk-sc small{font-size:12px;opacity:.75}
#suika .sk-nx{text-align:center;font-size:11px;font-weight:700;opacity:.85}#suika .sk-nx span{display:block;font-size:28px;line-height:1.2}
#suika .sk-stage{flex:1;position:relative;min-height:0}
#suika canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#suika .sk-over{position:absolute;inset:0;background:#3b2a1a99;display:none;align-items:center;justify-content:center;z-index:3}
#suika .sk-over.on{display:flex}
#suika .sk-card{background:#fff;border-radius:24px;padding:26px 22px;width:min(320px,86%);text-align:center;font-family:Inter,"Noto Sans KR",sans-serif;color:#3b2a1a;box-shadow:0 20px 50px #0004}
#suika .sk-card h2{margin:0 0 4px;font-size:22px}#suika .sk-card .big{font-size:44px;font-weight:800;margin:6px 0}
#suika .sk-card .nb{display:inline-block;background:#ffe066;border-radius:999px;padding:4px 12px;font-weight:800;font-size:13px;margin-bottom:6px}
#suika .sk-card button{display:block;width:100%;border:0;border-radius:14px;padding:14px;font-weight:800;font-size:15px;margin-top:10px}
#suika .sk-again{background:#ff922b;color:#fff}#suika .sk-close{background:#f1e6d8;color:#5c3d1e}
#suika .sk-help{position:absolute;left:0;right:0;bottom:14px;text-align:center;font:600 12px "Noto Sans KR",sans-serif;color:#8a6a4a;pointer-events:none;transition:opacity .5s}`;
    document.head.appendChild(st);
  }

  function build() {
    css();
    root = document.createElement("div"); root.id = "suika";
    root.innerHTML = `<div class="sk-top"><button class="sk-x" aria-label="닫기">✕</button><div class="sk-sc"><b id="skScore">0</b><small id="skBest"></small></div><div class="sk-nx">다음<span id="skNext"></span></div></div>
      <div class="sk-stage"><canvas></canvas><div class="sk-help" id="skHelp">좌우로 움직이고 손을 떼면 떨어져요 · 같은 과일끼리 합쳐요</div>
      <div class="sk-over"><div class="sk-card"><h2>게임 끝!</h2><div id="skNew"></div><div class="big" id="skFinal">0</div><div id="skMax" style="font-size:14px;opacity:.8"></div><button class="sk-again">다시 하기</button><button class="sk-close">그만하기</button></div></div></div>`;
    document.body.appendChild(root);
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d");
    $(".sk-x").onclick = () => api.close();
    $(".sk-close").onclick = () => api.close();
    $(".sk-again").onclick = () => start();
    const stage = $(".sk-stage");
    const toX = e => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) - offX) / scale; };
    let down = false;
    stage.addEventListener("pointerdown", e => { if (over) return; down = true; aimX = toX(e); try { stage.setPointerCapture(e.pointerId); } catch { } });
    stage.addEventListener("pointermove", e => { if (over) return; aimX = toX(e); });
    stage.addEventListener("pointerup", e => { if (!down || over) return; down = false; aimX = toX(e); drop(); });
    stage.addEventListener("pointercancel", () => { down = false; });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { lastT = 0; });
  }

  function resize() {
    if (!root) return;
    const st = $(".sk-stage"), w = st.clientWidth, h = st.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = Math.min(w / W, h / H); offX = (w - W * scale) / 2; offY = (h - H * scale) / 2;
  }

  function makeFruit(lv, x, y, still) {
    const f = FRUITS[lv];
    const b = M.Bodies.circle(x, y, f.r, { restitution: 0.15, friction: 0.08, frictionStatic: 0.3, density: 0.0012, slop: 0.02 });
    b.lv = lv; b.born = performance.now(); b.fruit = true;
    if (still) M.Body.setVelocity(b, { x: 0, y: 0 });
    M.Composite.add(engine.world, b);
    return b;
  }

  function start() {
    M = window.Matter;
    if (engine) { M.Composite.clear(engine.world, false); M.Engine.clear(engine); }
    engine = M.Engine.create({ gravity: { y: 1.1 } });
    engine.positionIterations = 10; engine.velocityIterations = 8;
    const opt = { isStatic: true, friction: 0.2, restitution: 0.1 };
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(W / 2, H + WALL / 2, W + WALL * 2, WALL, opt),
      M.Bodies.rectangle(-WALL / 2, H / 2, WALL, H * 2, opt),
      M.Bodies.rectangle(W + WALL / 2, H / 2, WALL, H * 2, opt),
    ]);
    M.Events.on(engine, "collisionStart", onHit);
    M.Events.on(engine, "collisionActive", onHit);
    score = 0; cur = rnd(); next = rnd(); over = false; overTimer = 0; canDrop = true; merges = []; pops = [];
    $(".sk-over").classList.remove("on");
    $("#skHelp").style.opacity = 1;
    hud();
    if (!running) { running = true; lastT = 0; raf = requestAnimationFrame(loop); }
  }

  function onHit(ev) {
    for (const p of ev.pairs) {
      const a = p.bodyA, b = p.bodyB;
      if (!a.fruit || !b.fruit || a.lv !== b.lv || a.gone || b.gone) continue;
      a.gone = b.gone = true;
      merges.push([a, b]);
    }
  }

  function applyMerges() {
    for (const [a, b] of merges) {
      M.Composite.remove(engine.world, a); M.Composite.remove(engine.world, b);
      const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2, lv = a.lv;
      if (lv + 1 < FRUITS.length) {
        const n = makeFruit(lv + 1, x, y);
        M.Body.setVelocity(n, { x: (a.velocity.x + b.velocity.x) / 4, y: -1.2 });
        score += PTS[lv + 1];
        pops.push({ x, y, r: FRUITS[lv + 1].r, t: performance.now(), c: FRUITS[lv + 1].c });
      } else {
        score += 100; // 수박 두 개 → 보너스
        pops.push({ x, y, r: 130, t: performance.now(), c: "#2f9e44" });
      }
    }
    if (merges.length) { merges = []; hud(); try { navigator.vibrate && navigator.vibrate(12); } catch { } }
  }

  function drop() {
    if (!canDrop || over) return;
    const r = FRUITS[cur].r, x = Math.max(r + 2, Math.min(W - r - 2, aimX));
    makeFruit(cur, x, TOP - 10);
    cur = next; next = rnd(); canDrop = false;
    $("#skHelp").style.opacity = 0;
    hud();
    setTimeout(() => { canDrop = true; }, 520);
  }

  function hud() {
    $("#skScore").textContent = score.toLocaleString("ko-KR");
    const best = Math.max(opts.best || 0, score);
    $("#skBest").textContent = "최고 " + best.toLocaleString("ko-KR");
    $("#skNext").textContent = FRUITS[next].e;
  }

  function checkOver(now, dt) {
    let danger = false;
    for (const b of M.Composite.allBodies(engine.world)) {
      if (!b.fruit || b.gone) continue;
      if (now - b.born < 1200) continue;
      if (b.position.y - FRUITS[b.lv].r < LINE && Math.abs(b.velocity.y) < 0.6) { danger = true; break; }
    }
    overTimer = danger ? overTimer + dt : 0;
    if (overTimer > 2000) endGame();
    return danger;
  }

  function endGame() {
    if (over) return; over = true;
    const prev = opts.best || 0, isNew = score > prev && score > 0;
    $("#skFinal").textContent = score.toLocaleString("ko-KR") + "점";
    $("#skNew").innerHTML = isNew ? `<span class="nb">🎉 최고 기록!</span>` : "";
    let mx = 0; for (const b of M.Composite.allBodies(engine.world)) if (b.fruit) mx = Math.max(mx, b.lv);
    $("#skMax").textContent = `가장 큰 과일: ${FRUITS[mx].e} ${FRUITS[mx].n}`;
    $(".sk-over").classList.add("on");
    if (isNew) opts.best = score;
    try { opts.onEnd && opts.onEnd(score, mx); } catch (e) { console.warn(e); }
  }

  function drawFruit(lv, x, y, ang, alpha) {
    const f = FRUITS[lv];
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(x, y); ctx.rotate(ang || 0);
    const g = ctx.createRadialGradient(-f.r * .35, -f.r * .35, f.r * .1, 0, 0, f.r);
    g.addColorStop(0, "#ffffffcc"); g.addColorStop(.35, f.c); g.addColorStop(1, shade(f.c, -28));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = shade(f.c, -40); ctx.stroke();
    ctx.font = `${Math.round(f.r * 1.15)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(f.e, 0, f.r * .06);
    ctx.restore();
  }
  function shade(hex, p) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, v + p)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

  function draw(now, danger) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.translate(offX, offY); ctx.scale(scale, scale);
    // 상자
    ctx.fillStyle = "#fffaf2"; roundRect(0, 0, W, H, 18); ctx.fill();
    ctx.strokeStyle = "#e8c9a0"; ctx.lineWidth = 4; roundRect(0, 0, W, H, 18); ctx.stroke();
    // 경고선
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
    ctx.strokeStyle = danger ? (Math.floor(now / 180) % 2 ? "#ff4d4d" : "#ffb3b3") : "#f0c9a0";
    ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke(); ctx.setLineDash([]);
    // 조준
    if (!over) {
      const r = FRUITS[cur].r, x = Math.max(r + 2, Math.min(W - r - 2, aimX));
      ctx.strokeStyle = "#d9b48c88"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x, H); ctx.stroke(); ctx.setLineDash([]);
      drawFruit(cur, x, TOP - 10 - (canDrop ? 0 : 0), 0, canDrop ? 1 : .35);
    }
    for (const b of M.Composite.allBodies(engine.world)) if (b.fruit && !b.gone) drawFruit(b.lv, b.position.x, b.position.y, b.angle);
    // 합쳐질 때 반짝
    pops = pops.filter(p => now - p.t < 380);
    for (const p of pops) { const k = (now - p.t) / 380; ctx.strokeStyle = p.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * .5), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!lastT) lastT = now;
    let dt = Math.min(100, now - lastT); lastT = now;
    if (document.hidden) return;
    let danger = false;
    if (!over) {
      acc += dt; const step = 1000 / 60;
      while (acc >= step) { M.Engine.update(engine, step); applyMerges(); acc -= step; }
      danger = checkOver(now, dt);
    }
    draw(now, danger);
  }

  const api = {
    open(o) {
      opts = o || {};
      if (!window.Matter) { alert("게임을 불러오지 못했어요"); return; }
      if (!root) build();
      root.style.display = "flex";
      resize(); start();
    },
    close(fromPop) {
      if (!root) return;
      running = false; cancelAnimationFrame(raf);
      root.style.display = "none";
      if (opts.onClose) try { opts.onClose(!!fromPop); } catch { }
    },
    isOpen() { return !!root && root.style.display !== "none"; },
    FRUITS,
    // 테스트용
    _state() { return { score, over, n: engine ? M.Composite.allBodies(engine.world).filter(b => b.fruit).length : 0 }; },
    _drop(x) { aimX = x; canDrop = true; drop(); },
    _end() { endGame(); },
  };
  window.WooriSuika = api;
})();
