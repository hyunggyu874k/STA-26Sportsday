// 캔버스 렌더러 — 토너먼트 결과를 프레임 단위 장면으로 그린다.
// drawFrame(n)이 n번째 프레임을 그리므로 실시간 재생과 영상 추출 모두 같은 코드를 쓴다.
(function () {
  const W = 1280, H = 720, FPS = 30, ACT = 20;
  const FONT = '"Noto Sans KR","NanumGothic","WenQuanYi Zen Hei",sans-serif';
  const M = MONSTERS;
  let ctx;

  // ---------- 유틸 ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function font(px, w = 'bold') { ctx.font = `${w} ${px}px ${FONT}`; }
  function text(s, x, y, px, color = '#fff', align = 'left', w = 'bold', stroke = true) {
    font(px, w); ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineWidth = Math.max(3, px / 6); ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function sizeScale(id) { return clamp(0.85 + 0.32 * Math.log2(M[id].meters / 2.5), 0.8, 1.4); }

  function background(f, tint = '#1b2a6b') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05081a'); g.addColorStop(0.6, tint); g.addColorStop(1, '#03040c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 도감 느낌의 푸른 불꽃
    for (let i = 0; i < 18; i++) {
      const x = (i / 18) * W + 30 * Math.sin(f / 20 + i);
      const h = 220 + 120 * hash(i) + 40 * Math.sin(f / 9 + i * 2);
      const gr = ctx.createLinearGradient(0, H, 0, H - h);
      gr.addColorStop(0, 'rgba(80,140,255,.35)'); gr.addColorStop(1, 'rgba(80,140,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x - 50, H);
      ctx.quadraticCurveTo(x - 30, H - h * 0.5, x + 10 * Math.sin(f / 7 + i), H - h);
      ctx.quadraticCurveTo(x + 30, H - h * 0.5, x + 50, H); ctx.fill();
    }
  }

  // ---------- 몬스터 그림 (원작 그림이 아닌 단순화한 자체 묘사) ----------
  // 원점 = 발 위치, 오른쪽을 바라봄, 키 약 200
  function limb(x1, y1, x2, y2, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function ell(x, y, rx, ry, c, rot = 0) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }
  function poly(pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
  function eye(x, y, c = '#ffb020', r = 4) { ell(x, y, r, r * 0.8, c); ell(x + 1, y, r * 0.35, r * 0.6, '#200'); }

  const DRAW = {
    furfur(t) {
      const flap = Math.sin(t / 4) * 0.25;
      for (const s of [-1, 1]) { // 박쥐 날개
        ctx.save(); ctx.translate(-10, -150); ctx.rotate(s * 0.15 + flap * s);
        poly([0, 0, -120, -90, -100, -40, -140, -30, -95, 0, -120, 30, -60, 10], s < 0 ? '#8e2240' : '#b8325a');
        ctx.restore();
      }
      limb(-15, -70, -30, -30, 16, '#4d3f9e'); limb(-30, -30, -10, 0, 10, '#4d3f9e');
      limb(15, -70, 25, -30, 16, '#5a4bb5'); limb(25, -30, 40, 0, 10, '#5a4bb5');
      ell(-10, 0, 8, 5, '#222'); ell(42, 0, 8, 5, '#222');
      ell(0, -110, 38, 50, '#5d4fbf'); ell(8, -120, 26, 30, '#776ad8');
      limb(20, -130, 60, -100, 13, '#5a4bb5'); limb(60, -100, 75, -75, 9, '#5a4bb5');
      ell(30, -170, 22, 18, '#6a5cc9', -0.3); ell(52, -162, 16, 10, '#8a7fe0', -0.2);
      eye(38, -175);
      ctx.strokeStyle = '#d8d4f5'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const s of [0, 1]) {
        const bx = 22 + s * 10;
        ctx.beginPath(); ctx.moveTo(bx, -185); ctx.lineTo(bx - 10, -230); ctx.lineTo(bx - 25, -250);
        ctx.moveTo(bx - 8, -215); ctx.lineTo(bx + 10, -240); ctx.moveTo(bx - 14, -232); ctx.lineTo(bx - 35, -235); ctx.stroke();
      }
    },
    naga(t) {
      const w = Math.sin(t / 6) * 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2d7a4a'; ctx.lineWidth = 34;
      ctx.beginPath(); ctx.ellipse(-20, -30, 80, 30, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#3d9a5e'; ctx.lineWidth = 30;
      ctx.beginPath(); ctx.ellipse(-10, -60, 60, 24, 0, Math.PI, Math.PI * 2.2); ctx.stroke();
      ctx.strokeStyle = '#9aa0a0'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.ellipse(-20, -30, 80, 30, 0, 0.2, 1.4); ctx.stroke();
      ell(10, -120 + w, 30, 45, '#3550c0');
      poly([-15, -95, 35, -95, 30, -75, -10, -75], '#d4a53a');
      limb(30, -140 + w, 70, -120, 12, '#3a58cc'); limb(70, -120, 85, -150, 10, '#3a58cc');
      limb(-10, -140 + w, -40, -110, 12, '#2f49b0');
      ell(18, -178 + w, 18, 22, '#3f5fd0'); eye(26, -182 + w, '#ffd040', 3.5);
      poly([0, -195 + w, 36, -195 + w, 40, -225 + w, 26, -212 + w, 18, -235 + w, 10, -212 + w, -4, -225 + w], '#e0b030');
      ell(70, -122, 6, 6, '#e0b030');
    },
    amdusias(t) {
      const b = Math.sin(t / 5) * 2;
      limb(-15, -80, -25, -35, 20, '#5b3420'); limb(-25, -35, -15, 0, 14, '#5b3420');
      limb(15, -80, 25, -35, 20, '#6e4129'); limb(25, -35, 35, 0, 14, '#6e4129');
      ell(0, -125 + b, 38, 52, '#7a4a2e'); ell(10, -135 + b, 22, 26, '#8e5a38');
      limb(-20, -150, -50, -170, 13, '#6e4129'); limb(-50, -170, -40, -215, 10, '#6e4129');
      ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-42, -215); ctx.lineTo(-20, -255); ctx.stroke();
      poly([-24, -255, -10, -272, -32, -262], '#e8c050');
      limb(25, -150, 55, -120, 13, '#6e4129');
      ctx.save(); ctx.translate(30, -190 + b); ctx.rotate(0.35);
      ell(0, 0, 20, 26, '#6b3b22'); ell(24, 10, 26, 14, '#7c4a2a'); ell(40, 14, 12, 10, '#eee');
      eye(10, -6, '#ff3030', 4);
      poly([8, -18, 70, -38, 10, -8], '#c8c8c8');
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-15, -20); ctx.quadraticCurveTo(-40, 20, -30, 60); ctx.lineTo(-10, 10); ctx.fill();
      poly([-6, -22, 10, -40, 22, -22], '#c8a030'); ell(8, -38, 4, 4, '#c03030');
      ctx.restore();
    },
    gumiho(t) {
      for (let i = 0; i < 9; i++) { // 9개의 꼬리
        const a = -2.6 + i * 0.22 + Math.sin(t / 8 + i) * 0.06;
        ctx.strokeStyle = '#e8c75a'; ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-50, -60);
        const ex = -50 + Math.cos(a) * 130, ey = -60 + Math.sin(a) * 130;
        ctx.quadraticCurveTo(-50 + Math.cos(a - 0.4) * 80, -60 + Math.sin(a - 0.4) * 80, ex, ey); ctx.stroke();
        ell(ex, ey, 11, 11, '#fff6dc');
      }
      limb(-40, -50, -45, 0, 12, '#c9b48a'); limb(30, -50, 40, 0, 12, '#c9b48a');
      ell(-5, -65, 60, 28, '#ddd2b6'); ell(-5, -55, 50, 16, '#e8dfc6');
      ell(60, -90, 24, 20, '#e0d6bc'); poly([70, -88, 102, -80, 72, -74], '#d8ccb0');
      poly([48, -104, 52, -132, 62, -106], '#d8ccb0'); poly([62, -106, 72, -130, 74, -100], '#d8ccb0');
      eye(70, -96, '#ffd020', 3.5);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, -80); ctx.lineTo(98, -80); ctx.stroke();
    },
    jotun(t) {
      const b = Math.sin(t / 6) * 2;
      poly([-45, -190, -80, -40, -30, -60, 20, -40, 40, -180], '#8a4a24');
      limb(-20, -70, -30, 0, 26, '#7a8fc0'); limb(20, -70, 30, 0, 26, '#8ea4d4');
      ell(0, -125 + b, 50, 62, '#a8c6ec'); ell(0, -95, 40, 22, '#5a5aa0');
      limb(-35, -160, -70, -110, 22, '#9cb8e0'); limb(-70, -110, -60, -70, 18, '#9cb8e0');
      limb(35, -160, 60, -200, 22, '#b4d0f2');
      ctx.save(); ctx.translate(62, -205); ctx.rotate(-0.7);
      poly([-5, 0, 5, 0, 8, -110, 0, -125, -8, -110], 'rgba(200,235,255,.9)'); limb(-14, 0, 14, 0, 6, '#557');
      ctx.restore();
      ell(10, -200 + b, 24, 26, '#c4dcf6');
      for (let i = 0; i < 7; i++) poly([-10 + i * 6, -190 + b, -4 + i * 6, -190 + b, -8 + i * 6 + (i - 3) * 3, -150 + b + Math.abs(i - 3) * 6], '#f0faff');
      eye(20, -206 + b, '#ffffff', 4);
      poly([30, -210, 46, -214, 34, -202], '#c4dcf6');
    },
    orochi(t) {
      ell(-40, -40, 150, 55, '#5e6270'); ell(-40, -55, 130, 35, '#757a88');
      for (let i = 0; i < 8; i++) {
        const bx = -150 + i * 32, ph = t / 7 + i * 0.9;
        const hx = bx + 60 + Math.sin(ph) * 15 + (i % 2) * 20, hy = -120 - (i % 4) * 28 - Math.cos(ph) * 10;
        ctx.strokeStyle = i % 2 ? '#8a8f9c' : '#a2a7b4'; ctx.lineWidth = 22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, -60); ctx.bezierCurveTo(bx - 30, hy + 60, hx - 60, hy + 30, hx, hy); ctx.stroke();
        ctx.save(); ctx.translate(hx, hy);
        poly([-14, -16, -30, -24, -22, -2, -32, 10, -10, 12], '#b39a6a');
        ell(6, -2, 20, 13, '#9aa0b0');
        const open = 0.5 + 0.5 * Math.sin(ph * 2);
        poly([10, 2, 40, 2 + open * 4, 34, 10 + open * 6, 8, 10], '#b02040');
        poly([10, -8, 42, -4, 40, 2, 10, 2], '#a8aebe');
        eye(8, -6, '#ff2020', 3.5);
        ctx.restore();
      }
    },
    griffin(t) {
      const flap = Math.sin(t / 3) * 0.35;
      ctx.save(); ctx.translate(10, -120); ctx.rotate(-0.4 + flap);
      poly([0, 0, -60, -120, -20, -110, -10, -150, 20, -100, 40, -120, 30, -20], '#cfe0f4'); ctx.restore();
      limb(-50, -50, -60, 0, 14, '#b48a52'); limb(-25, -50, -20, 0, 14, '#a07844');
      limb(40, -60, 60, -20, 12, '#d8b060'); limb(60, -20, 75, -5, 8, '#d8b060');
      ell(-30, -70, 55, 30, '#c9a36a'); ell(30, -90, 32, 40, '#e8eef6');
      ctx.strokeStyle = '#c9a36a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-82, -70); ctx.quadraticCurveTo(-110, -60, -105, -95); ctx.stroke();
      ell(45, -140, 22, 20, '#d9cbb4'); poly([58, -146, 82, -136, 62, -126], '#e8c040');
      eye(50, -146, '#ffe020', 4);
      ctx.save(); ctx.translate(-10, -110); ctx.rotate(0.3 - flap);
      poly([0, 0, -70, -110, -30, -100, -20, -140, 10, -90, 30, -100, 30, -10], '#e4eefa'); ctx.restore();
    },
    sukuna(t) {
      const b = Math.sin(t / 5) * 2;
      limb(-30, -70, -45, 0, 16, '#3a3b42'); limb(-10, -70, -15, 0, 16, '#45464e');
      limb(15, -70, 25, 0, 16, '#45464e'); limb(30, -70, 50, 0, 16, '#3a3b42');
      poly([-35, -95, 40, -95, 50, -55, -45, -55], '#b9984e');
      ell(0, -130 + b, 40, 48, '#55565e');
      limb(25, -150, 70, -170, 12, '#4a4b52'); // 칼
      limb(70, -170, 140, -215, 5, '#ddd');
      limb(25, -130, 70, -110, 12, '#4a4b52'); // 도끼
      limb(70, -110, 95, -80, 5, '#8a6a3a'); poly([88, -90, 108, -100, 104, -70], '#bbb');
      limb(-25, -150, -60, -175, 12, '#3f4047'); // 활
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-60, -175, 35, -2.2, 0.6); ctx.stroke();
      limb(-25, -130, -60, -110, 12, '#3f4047');
      ell(0, -190 + b, 22, 24, '#5d5e66');
      ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.ellipse(-4, -210 + b, 28, 14, 0, Math.PI, 0); ctx.fill();
      eye(12, -194 + b, '#ffb000', 3.5); eye(-14, -194 + b, '#ffb000', 3.5); // 앞뒤의 얼굴
      limb(10, -180 + b, 20, -180 + b, 3, '#e8c050');
    },
  };

  // 사용자 제공 일러스트 스프라이트 (sprites/*.png). face = 원본 그림이 바라보는 방향
  const SPRITE_FACE = { sukuna: -1, griffin: -1, orochi: 1, jotun: -1, gumiho: 1, amdusias: 1, naga: -1, furfur: 1 };
  const IMG = {};
  const ready = Promise.all(Object.keys(SPRITE_FACE).map(id => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[id] = im; res(); }; im.onerror = () => res(); im.src = `sprites/${id}.png`;
  })));

  function drawMonster(id, x, y, facing, t, s = 1, alpha = 1, glow = null) {
    ctx.save(); ctx.globalAlpha = alpha;
    const sc = s * sizeScale(id);
    const im = IMG[id];
    if (im) {
      const h = 330 * s * (0.55 + 0.45 * sizeScale(id)) * (1 + 0.015 * Math.sin(t / 6)), w = h * im.width / im.height;
      ctx.save(); ctx.translate(x, y); ell(0, 4, w * 0.35, 12 * sc, 'rgba(0,0,0,.4)'); ctx.restore();
      ctx.translate(x, y + 18 * sc);
      if (facing !== SPRITE_FACE[id]) ctx.scale(-1, 1);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 35; }
      ctx.drawImage(im, -w / 2, -h, w, h);
      ctx.restore();
      if (glow === '#ff3030') { // 피격 시 붉게 번쩍
        ctx.save(); ctx.globalAlpha = 0.35 * alpha; ctx.translate(x, y + 18 * sc);
        if (facing !== SPRITE_FACE[id]) ctx.scale(-1, 1);
        ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'; ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      }
      return;
    }
    ctx.translate(x, y); ctx.scale(facing * sc, sc);
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 30; }
    ell(0, 2, 90, 12, 'rgba(0,0,0,.35)');
    DRAW[id](t);
    ctx.restore();
  }

  // ---------- 능력치 차트 (도감식 원형) ----------
  function radar(stats, cx, cy, r, color = '#2f8cff') {
    ell(cx, cy, r + 6, r + 6, '#111'); ell(cx, cy, r, r, '#8c8c8c');
    STAT_KEYS.forEach((k, i) => {
      const a0 = -Math.PI / 2 - Math.PI / 4 + i * Math.PI / 4, a1 = a0 + Math.PI / 4;
      const rr = r * stats[k] / 10;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rr, a0, a1); ctx.closePath(); ctx.fill();
    });
    for (let i = 1; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * i / 4, 0, 7); ctx.stroke(); }
    STAT_KEYS.forEach((k, i) => {
      const a = -Math.PI / 2 - Math.PI / 8 + i * Math.PI / 4;
      text(STAT_NAMES[k], cx + Math.cos(a) * (r + 22), cy + Math.sin(a) * (r + 16), Math.max(11, r / 5), '#fff', 'center', 'bold');
    });
  }

  // ---------- 장면 구성 ----------
  let scenes = [], total = 0, T;
  function add(dur, draw, kind, label = '') { scenes.push({ start: total, dur, draw, kind, label }); total += dur; }

  function build(seed) {
    T = Engine.tournament(seed);
    scenes = []; total = 0;
    add(100, sceneTitle, 'title');
    add(170, sceneRoster, 'roster');
    add(110, f => sceneBracket(f, 0), 'bracket');
    T.rounds.forEach((round, ri) => {
      round.matches.forEach((m, mi) => {
        const label = `${round.name} ${round.matches.length > 1 ? (mi + 1) + '경기' : ''}`.trim();
        add(120, f => sceneVs(f, m, label), 'vs', label);
        const fightDur = (m.events.length - 2) * ACT + 40;
        add(fightDur, f => sceneFight(f, m, label), 'fight', label);
        add(70, f => sceneResult(f, m), 'result', label);
      });
      if (ri < T.rounds.length - 1) add(100, f => sceneBracket(f, ri + 1), 'bracket');
    });
    add(200, sceneChampion, 'champion');
    return total;
  }

  function sceneTitle(f) {
    background(f);
    const a = ease(f / 25);
    ctx.globalAlpha = a;
    text('몬스터 대전', W / 2, 250, 96, '#ffd83a', 'center');
    text('토너먼트 시뮬레이션', W / 2, 345, 48, '#fff', 'center');
    text('도감 능력치 · 특기 그대로 반영 — 8마리 출전', W / 2, 420, 26, '#9fc3ff', 'center', 'normal');
    ctx.globalAlpha = 1;
    const ids = Object.keys(M);
    ids.forEach((id, i) => drawMonster(id, 110 + i * 152, 690, 1, f + i * 10, 0.42, ease((f - 20 - i * 5) / 20)));
  }

  function sceneRoster(f) {
    background(f, '#162055');
    text('출전 몬스터', W / 2, 40, 36, '#ffd83a', 'center');
    Object.keys(M).forEach((id, i) => {
      const m = M[id], col = i % 4, row = Math.floor(i / 4);
      const x = 20 + col * 315, y = 75 + row * 322;
      const a = ease((f - i * 6) / 18);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 30);
      rrect(x, y, 300, 310, 14); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
      ctx.strokeStyle = m.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); rrect(x, y, 300, 310, 14); ctx.clip();
      drawMonster(id, x + 205, y + 235, -1, f, id === 'orochi' ? 0.42 : 0.55);
      ctx.restore();
      text(m.title, x + 14, y + 22, 15, '#9fe0a0');
      text(m.name, x + 14, y + 52, 30, '#ffd83a');
      radar(m.stats, x + 75, y + 160, 46);
      text(`${m.region} · ${m.length}`, x + 14, y + 260, 15, '#fff', 'left', 'normal');
      text(m.source, x + 14, y + 284, 14, '#bbb', 'left', 'normal');
      ctx.restore();
    });
  }

  function sceneBracket(f, upto) {
    background(f, '#1d1d55');
    text(upto === 0 ? '대진표' : `대진표 — ${T.rounds[upto - 1].name} 결과`, W / 2, 50, 40, '#ffd83a', 'center');
    const firstIds = T.rounds[0].matches.flatMap(m => m.ids);
    const slotY = i => 120 + i * 72;
    const colX = [60, 380, 700, 1000];
    const pos = {};
    firstIds.forEach((id, i) => { pos['0-' + i] = { x: colX[0], y: slotY(i), id }; });
    for (let r = 0; r < T.rounds.length; r++) {
      T.rounds[r].matches.forEach((m, mi) => {
        const p1 = pos[`${r}-${mi * 2}`], p2 = pos[`${r}-${mi * 2 + 1}`];
        const nx = colX[r + 1], ny = (p1.y + p2.y) / 2;
        const shown = r < upto;
        const prog = shown ? 1 : 0;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p1.x + 250, p1.y); ctx.lineTo(nx - 20, p1.y); ctx.lineTo(nx - 20, p2.y); ctx.lineTo(p2.x + 250, p2.y); ctx.stroke();
        if (shown) {
          const wy = m.winner === p1.id ? p1.y : p2.y;
          ctx.strokeStyle = '#ffd83a'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo((m.winner === p1.id ? p1 : p2).x + 250, wy); ctx.lineTo(nx - 20, wy); ctx.lineTo(nx - 20, ny); ctx.lineTo(nx, ny); ctx.stroke();
        }
        pos[`${r + 1}-${mi}`] = { x: nx, y: ny, id: shown ? m.winner : null, prog };
      });
    }
    Object.entries(pos).forEach(([k, p]) => {
      const r = +k.split('-')[0];
      const lost = p.id && r < upto && T.rounds[r] && !T.rounds[r].matches.some(m => m.winner === p.id);
      const a = r === upto && upto > 0 ? ease(f / 20) : 1;
      ctx.save(); ctx.globalAlpha = a;
      rrect(p.x, p.y - 26, 250, 52, 10);
      ctx.fillStyle = p.id ? (lost ? 'rgba(60,60,70,.8)' : 'rgba(10,20,60,.9)') : 'rgba(255,255,255,.08)'; ctx.fill();
      ctx.strokeStyle = p.id && !lost ? (p.id ? M[p.id].color : '#555') : '#555'; ctx.lineWidth = 2; ctx.stroke();
      if (p.id) {
        text(M[p.id].name, p.x + 18, p.y, 24, lost ? '#888' : '#fff');
        if (lost) { ctx.strokeStyle = '#e33'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + 14, p.y); ctx.lineTo(p.x + 150, p.y); ctx.stroke(); }
      } else text('?', p.x + 125, p.y, 24, '#777', 'center');
      ctx.restore();
    });
    if (T.rounds.length) {
      text('우승', colX[3] + 125, 120 + 3.5 * 72 - 50, 22, '#ffd83a', 'center');
    }
  }

  function skillList(id, x, y, align) {
    const m = M[id];
    m.skills.forEach((s, i) => {
      text(`${s.name}`, x, y + i * 32, 19, '#ffe680', align);
      font(19); const off = ctx.measureText(s.name + '  ').width;
      text(s.desc, align === 'left' ? x + off : x - off, y + i * 32, 13, '#ddd', align, 'normal');
    });
  }

  function sceneVs(f, m, label) {
    const [a, b] = m.ids;
    background(f, '#20185a');
    const sa = ease(f / 25);
    rrect(W / 2 - 110, 18, 220, 44, 22); ctx.fillStyle = '#1f9d55'; ctx.fill();
    text(label, W / 2, 40, 24, '#fff', 'center');
    drawMonster(a, lerp(-200, 330, sa), 600, 1, f, 1);
    drawMonster(b, lerp(W + 200, 950, sa), 600, -1, f, 1);
    text('VS', W / 2, 330, 120 + 10 * Math.sin(f / 4), '#2f8cff', 'center');
    const ia = ease((f - 20) / 20);
    ctx.globalAlpha = ia;
    text(M[a].title, 40, 100, 20, '#9fe0a0'); text(M[a].name, 40, 140, 48, '#ffd83a');
    text(M[b].title, W - 40, 100, 20, '#9fe0a0', 'right'); text(M[b].name, W - 40, 140, 48, '#ffd83a', 'right');
    text(`전체 길이 ${M[a].length}`, 40, 182, 17, '#fff', 'left', 'normal');
    text(`전체 길이 ${M[b].length}`, W - 40, 182, 17, '#fff', 'right', 'normal');
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 610, W, 110);
    skillList(a, 24, 632, 'left'); // 3개까지
    skillList(b, W - 24, 632, 'right');
    ctx.globalAlpha = 1;
    // 겹치지 않도록 스킬은 첫 줄만 크게 보이므로 영역 내에서만
  }

  // ---- 전투 ----
  const FX_COLOR = { lightning: '#fff36a', storm: '#bcd6ff', poison: '#6dff6a', ice: '#aee8ff', charm: '#ff8ad8', branches: '#8a5a2a', music: '#ffd83a' };
  const STATUS_KO = { poison: ['중독', '#3c3'], stun: ['마비', '#cc3'], bound: ['속박', '#a63'], charm: ['현혹', '#e6c'], slow: ['둔화', '#39c'], fly: ['비행', '#88f'], forged: ['무장', '#c84'], weather: ['폭우', '#47a'] };
  const HOME = [330, 950], GROUND = 610;

  function hud(m, st, i) {
    const id = m.ids[i], right = i === 1;
    const x = right ? W - 40 - 480 : 40, y = 30;
    text(M[id].name, right ? x + 480 : x, y + 8, 30, '#ffd83a', right ? 'right' : 'left');
    const hp = st.hp / m.maxHp[i], sta = clamp(st.sta / m.maxSta[i], 0, 1);
    rrect(x, y + 32, 480, 26, 6); ctx.fillStyle = '#300'; ctx.fill();
    const hw = 480 * hp;
    rrect(right ? x + 480 - hw : x, y + 32, Math.max(0, hw), 26, 6);
    ctx.fillStyle = hp > 0.5 ? '#36d46a' : hp > 0.25 ? '#e8c020' : '#e83a30'; ctx.fill();
    text(`HP ${Math.round(st.hp)} / ${m.maxHp[i]}`, right ? x + 470 : x + 10, y + 45, 15, '#fff', right ? 'right' : 'left');
    rrect(x, y + 62, 480, 9, 4); ctx.fillStyle = '#123'; ctx.fill();
    rrect(right ? x + 480 - 480 * sta : x, y + 62, 480 * sta, 9, 4); ctx.fillStyle = '#4ab0ff'; ctx.fill();
    text('지구력', right ? x + 480 : x, y + 84, 12, '#9cf', right ? 'right' : 'left', 'normal');
    let cx = right ? x + 420 : x + 50;
    (st.status || []).forEach(s => {
      if (!STATUS_KO[s]) return;
      const [n, c] = STATUS_KO[s];
      rrect(right ? cx - 50 : cx, y + 76, 50, 20, 10); ctx.fillStyle = c; ctx.fill();
      text(n, (right ? cx - 50 : cx) + 25, y + 86, 12, '#fff', 'center', 'bold', false);
      cx += right ? -56 : 56;
    });
  }

  function lightning(x1, y1, x2, y2, seed, color = '#fff36a', w = 5) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.shadowColor = color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let i = 1; i <= 8; i++) { const t = i / 8; ctx.lineTo(lerp(x1, x2, t) + (hash(seed + i) - 0.5) * 60 * (i < 8), lerp(y1, y2, t)); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  function drawFx(fx, lf, ax, tx, ty, dir, seed) {
    const p = clamp((lf - 5) / 10, 0, 1);
    if (lf < 4 || lf > 17) return;
    ctx.save();
    switch (fx) {
      case 'lightning':
        ctx.fillStyle = `rgba(255,255,200,${0.25 * (1 - p)})`; ctx.fillRect(0, 0, W, H);
        lightning(tx + 20, 0, tx, ty, seed + lf % 3); lightning(tx - 30, 0, tx - 10, ty + 30, seed + 9 + lf % 2, '#fff', 3); break;
      case 'storm':
        ctx.fillStyle = `rgba(20,30,60,${0.4 * (1 - p)})`; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) lightning(tx - 80 + i * 80, 0, tx - 40 + i * 40, ty + 20, seed * 3 + i + lf % 2, '#cfe0ff', 4);
        rainDrops(lf + seed, 60, 'rgba(180,200,255,.6)'); break;
      case 'wind':
        ctx.strokeStyle = 'rgba(230,240,255,.8)'; ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) { const yy = ty - 120 + i * 40; ctx.beginPath(); ctx.arc(lerp(ax, tx, p) + i * 10 * dir, yy, 40, 0.2, 2.4 + p); ctx.stroke(); } break;
      case 'rain': rainDrops(lf * 3 + seed, 160, 'rgba(160,190,255,.8)'); break;
      case 'poison':
        for (let i = 0; i < 10; i++) { const t = clamp(p * 1.4 - i * 0.04, 0, 1); ell(lerp(ax + 60 * dir, tx, t) + (hash(i + seed) - 0.5) * 40, lerp(ty - 40, ty, t) + (hash(i * 3) - 0.5) * 60, 9, 9, 'rgba(90,255,90,.8)'); } break;
      case 'bite': case 'eightbite': {
        const n = fx === 'eightbite' ? 8 : 1;
        for (let i = 0; i < n; i++) {
          const k = clamp(p * n - i, 0, 1); if (k <= 0) continue;
          const bx = tx + (hash(i + seed) - 0.5) * 120, by = ty + (hash(i * 7 + seed) - 0.5) * 120;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(bx, by - 18 + 14 * k, 26, 0.3, Math.PI - 0.3); ctx.stroke();
          ctx.beginPath(); ctx.arc(bx, by + 18 - 14 * k, 26, Math.PI + 0.3, -0.3); ctx.stroke();
        } break;
      }
      case 'claw': case 'slash': case 'triple': {
        const n = fx === 'slash' ? 1 : 3;
        for (let i = 0; i < n; i++) {
          const k = clamp(p * 2 - i * 0.3, 0, 1); if (k <= 0) continue;
          ctx.strokeStyle = fx === 'triple' ? ['#fff', '#ffcc66', '#c8ff9a'][i] : '#fff'; ctx.lineWidth = 6; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(tx - 70 + i * 25, ty - 90 + i * 20); ctx.lineTo(lerp(tx - 70, tx + 70, k) + i * 25, lerp(ty - 90, ty + 60, k) + i * 20); ctx.stroke();
        }
        if (fx === 'triple') { const ax2 = lerp(ax, tx, p); limb(ax2, ty - 40, ax2 + 40 * dir, ty - 40, 3, '#ddd'); }
        break;
      }
      case 'horn': case 'smash': case 'slam': case 'dive':
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(tx, ty, 40 + 120 * p, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = `rgba(255,220,120,${1 - p})`; ctx.stroke();
        for (let i = 0; i < 10; i++) { const a = i / 10 * 7; limb(tx + Math.cos(a) * 30 * (1 + p * 2), ty + Math.sin(a) * 30 * (1 + p * 2), tx + Math.cos(a) * 60 * (1 + p * 2), ty + Math.sin(a) * 60 * (1 + p * 2), 4, `rgba(255,240,180,${1 - p})`); }
        break;
      case 'branches':
        ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath(); ctx.moveTo(tx - 140 + i * 70, GROUND);
          ctx.quadraticCurveTo(tx - 60 + i * 30, ty, tx + Math.cos(i + p * 6) * 60, ty - 60 + i * 25 - 50 * (1 - p)); ctx.stroke();
          ell(tx + Math.cos(i + p * 6) * 60, ty - 60 + i * 25, 8, 5, '#3a8a2a');
        } break;
      case 'music':
        for (let i = 0; i < 6; i++) text('♪', lerp(ax, tx, clamp(p * 1.3 - i * 0.05, 0, 1)), ty - 140 + Math.sin(lf / 2 + i) * 30 + i * 15, 40, '#ffd83a', 'center'); break;
      case 'charm':
        for (let i = 0; i < 7; i++) text('♥', tx + Math.cos(lf / 3 + i) * 80, ty - 60 + Math.sin(lf / 3 + i) * 60, 34, '#ff7ad0', 'center'); break;
      case 'ice':
        for (let i = 0; i < 9; i++) { const t = clamp(p * 1.5 - i * 0.05, 0, 1); const x = lerp(ax + 50 * dir, tx, t), y = ty - 40 + (hash(i) - 0.5) * 100; poly([x, y - 8, x + 30 * dir, y, x, y + 8], '#bdf0ff'); }
        if (p > 0.6) { ctx.fillStyle = 'rgba(170,230,255,.35)'; ctx.fillRect(tx - 100, ty - 140, 200, 220); } break;
      case 'forge':
        for (let i = 0; i < 16; i++) { const a = hash(i + seed) * 7; ell(ax + Math.cos(a) * 90 * p, ty - 60 + Math.sin(a) * 90 * p, 4, 4, '#ffb040'); }
        ctx.strokeStyle = 'rgba(255,200,80,.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ax, ty - 60, 120, 0, 7); ctx.stroke(); break;
      case 'fly':
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(ax - 60 + i * 30, GROUND - 20); ctx.lineTo(ax - 60 + i * 30, GROUND - 120 * p); ctx.stroke(); } break;
      case 'confuse': case 'stuck':
        for (let i = 0; i < 5; i++) text('★', ax + Math.cos(lf / 2 + i * 1.3) * 60, GROUND - 300 + Math.sin(lf / 2 + i * 1.3) * 15, 26, '#ffe040', 'center'); break;
      case 'rest':
        text('Z z z', ax + 50, GROUND - 260 - lf * 2, 30, '#cde', 'center'); break;
    }
    ctx.restore();
  }

  function rainDrops(seed, n, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = (hash(i * 13.1) * W + seed * 7) % W, y = (hash(i * 7.7) * H + seed * 22) % H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 24); ctx.stroke();
    }
  }

  function sceneFight(f, m, label) {
    const evs = m.events.slice(1, -1);
    const idx = clamp(Math.floor(f / ACT), 0, evs.length - 1);
    const lf = f - idx * ACT;
    const ev = evs[idx];
    const prev = idx === 0 ? m.events[0].state : evs[idx - 1].state;
    const done = f >= evs.length * ACT;
    const cur = done ? m.events.at(-1).state : ev.state;
    const k = done ? 1 : ease((lf - 6) / 8);
    const st = [0, 1].map(i => ({ hp: lerp(prev[i].hp, cur[i].hp, k), sta: lerp(prev[i].sta, cur[i].sta, k), status: (k > 0.5 ? cur : prev)[i].status }));

    let shake = 0;
    if (!done && ['smash', 'slam', 'storm', 'lightning', 'eightbite'].includes(ev.fx) && lf > 6 && lf < 14) shake = 8;
    ctx.save(); ctx.translate((hash(f) - 0.5) * shake, (hash(f + 1) - 0.5) * shake);
    background(f, '#1b2a6b');
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(-20, GROUND, W + 40, H - GROUND + 20);
    ctx.fillStyle = '#2a2a36'; ctx.fillRect(-20, GROUND, W + 40, 6);
    // 나가의 날씨 조작: 비가 계속 내림
    if (st.some(s => s.status.includes('weather'))) { ctx.fillStyle = 'rgba(10,20,50,.25)'; ctx.fillRect(0, 0, W, H); rainDrops(f, 90, 'rgba(150,180,255,.45)'); }

    const a = done ? -1 : ev.actor;
    const pos = [0, 1].map(i => {
      let x = HOME[i], y = GROUND;
      const dir = i === 0 ? 1 : -1;
      const melee = !done && ['claw', 'slash', 'triple', 'bite', 'eightbite', 'horn', 'smash', 'slam', 'dive'].includes(ev.fx);
      if (i === a && melee) { const l = lf < 7 ? ease(lf / 7) : 1 - ease((lf - 9) / 8); x += dir * (m.ids[i] === 'orochi' ? 120 : 330) * l; if (ev.fx === 'dive') y -= 200 * Math.sin(Math.min(1, lf / 9) * Math.PI) * (lf < 9 ? 1 : 0); }
      if (st[i].status.includes('fly')) y -= 80 + Math.sin(f / 5) * 10;
      if (!done && i !== a && ev.hits.some(h => !h.miss) && lf > 7 && lf < 15) x -= dir * 12 * Math.sin(lf * 2);
      if (!done && i !== a && ev.hits.length && ev.hits.every(h => h.miss) && lf > 5 && lf < 15) x -= dir * 60 * Math.sin((lf - 5) / 10 * Math.PI);
      if (done && i !== M[m.winner] && m.ids[i] !== m.winner) y += 0;
      return { x, y };
    });
    [0, 1].forEach(i => {
      const loser = done && m.ids[i] !== m.winner;
      const alpha = loser ? clamp(1 - (f - evs.length * ACT) / 30, 0.25, 1) : 1;
      const hitFlash = !done && i !== a && ev.hits.some(h => !h.miss) && lf > 7 && lf < 11;
      const glow = !done && i === a && ['lightning', 'storm', 'ice', 'charm', 'branches', 'forge', 'music', 'rain'].includes(ev.fx) && lf < 12 ? (FX_COLOR[ev.fx] || '#fff') : hitFlash ? '#ff3030' : null;
      ctx.save();
      if (loser) { ctx.translate(pos[i].x, pos[i].y); ctx.rotate((i === 0 ? -1 : 1) * clamp((f - evs.length * ACT) / 20, 0, 1) * 0.5); ctx.translate(-pos[i].x, -pos[i].y); }
      drawMonster(m.ids[i], pos[i].x, pos[i].y, i === 0 ? 1 : -1, f, 1, alpha, glow);
      ctx.restore();
    });

    if (!done) {
      const t = 1 - a, dir = a === 0 ? 1 : -1;
      const tx = ev.fx === 'confuse' || ev.fx === 'rest' || ev.fx === 'stuck' || ev.fx === 'forge' || ev.fx === 'fly' ? pos[a].x : pos[t].x;
      drawFx(ev.fx, lf, pos[a].x, tx, GROUND - 130, dir, idx * 5 + 1);
      // 피해 숫자
      if (lf >= 8) {
        const up = (lf - 8) * 3;
        ev.hits.forEach((h, hi) => {
          const x = pos[t].x + (ev.hits.length > 1 ? (hi - (ev.hits.length - 1) / 2) * 42 : 0);
          const y = GROUND - 280 - up - (hi % 2) * 22;
          if (h.miss) text('회피!', x, y, 30, '#9cf', 'center');
          else text(`${h.dmg}${h.crit ? '!' : ''}`, x, y, h.crit ? 40 : 32, h.crit ? '#ff5050' : '#fff', 'center');
        });
        if (ev.self) text(`-${ev.self}`, pos[a].x, GROUND - 280 - up, 34, '#ff7ad0', 'center');
        if (ev.poison) text(`독 -${ev.poison}`, pos[a].x, GROUND - 240 - up, 22, '#6f6', 'center');
        if (ev.regen) text(`재생 +${ev.regen}`, pos[a].x, GROUND - 210 - up, 22, '#8ff', 'center');
      }
      // 스킬 이름 배너
      const ba = ease(lf / 4);
      ctx.globalAlpha = ba;
      rrect(W / 2 - 300, 150, 600, 64, 32); ctx.fillStyle = a === 0 ? 'rgba(30,90,200,.85)' : 'rgba(180,40,60,.85)'; ctx.fill();
      text(`${M[m.ids[a]].name}의 ${ev.name}`, W / 2, 182, 30, '#fff', 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    hud(m, st[0], 0); hud(m, st[1], 1);
    rrect(W / 2 - 80, 120, 160, 26, 13); ctx.fillStyle = 'rgba(31,157,85,.9)'; ctx.fill();
    text(label, W / 2, 133, 15, '#fff', 'center');

    // 전투 기록
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H - 92, W, 92);
    const lines = [];
    for (let i = Math.max(0, idx - 2); i <= Math.min(idx, evs.length - 1); i++) lines.push(logLine(m, evs[i]));
    lines.forEach((l, i) => text(l, 24, H - 74 + i * 28, 18, i === lines.length - 1 ? '#fff' : '#999', 'left', 'normal', false));
    if (done) {
      const p = ease((f - evs.length * ACT) / 20);
      ctx.globalAlpha = p;
      text('K.O.!', W / 2, 330, 120, '#ff4040', 'center');
      ctx.globalAlpha = 1;
    }
  }

  function logLine(m, e) {
    const me = M[m.ids[e.actor]].name, foe = M[m.ids[1 - e.actor]].name;
    let s = `▶ ${me}: ${e.name}`;
    const dealt = e.hits.filter(h => !h.miss);
    if (e.hits.length) s += dealt.length ? ` → ${foe}에게 ${dealt.reduce((a, h) => a + h.dmg, 0)} 피해${e.hits.length > 1 ? ` (${dealt.length}/${e.hits.length}회 명중)` : ''}${dealt.some(h => h.crit) ? ' 치명타!' : ''}` : ` → ${foe} 회피!`;
    if (e.self) s += ` (${e.self} 자해)`;
    if (e.notes.length) s += ' · ' + e.notes.join(' · ');
    return s;
  }

  function sceneResult(f, m) {
    const w = m.winner, l = m.ids.find(i => i !== w);
    background(f, '#3a2a0a');
    const a = ease(f / 20);
    drawMonster(w, W / 2, 620, 1, f, 1.25 * a + 0.01, 1, '#ffd83a');
    text('승리', W / 2, 90, 44, '#fff', 'center');
    text(M[w].name, W / 2, 160, 80 * a + 1, '#ffd83a', 'center');
    const fin = m.events.at(-1).state[m.ids.indexOf(w)].hp;
    text(`남은 HP ${fin} / ${m.maxHp[m.ids.indexOf(w)]} · ${m.events.length - 2}번의 공방 끝에 ${M[l].name} 격파`, W / 2, 680, 22, '#fff', 'center', 'normal');
  }

  function sceneChampion(f) {
    background(f, '#4a3410');
    const c = T.champion;
    for (let i = 0; i < 40; i++) { const x = hash(i) * W, y = (hash(i * 3) * H + f * (2 + hash(i) * 3)) % H; ctx.fillStyle = ['#ffd83a', '#ff5a5a', '#5ad1ff', '#9aff6a'][i % 4]; ctx.fillRect(x, y, 8, 14); }
    drawMonster(c, W / 2, 660, 1, f, 1.1, 1, '#ffd83a');
    text('최종 우승', W / 2, 80, 40, '#fff', 'center');
    text(M[c].name, W / 2, 150, 90, '#ffd83a', 'center');
    text(M[c].title, W / 2, 215, 26, '#9fe0a0', 'center');
    const path = T.rounds.map(r => { const m = r.matches.find(m => m.winner === c); return `${r.name}: ${M[m.ids.find(i => i !== c)].name} 격파`; }).join('   ');
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H - 60, W, 60);
    text(path, W / 2, H - 30, 22, '#fff', 'center', 'normal');
  }

  function drawFrame(n) {
    const s = scenes.find(s => n >= s.start && n < s.start + s.dur) || scenes[scenes.length - 1];
    ctx.save(); s.draw(n - s.start); ctx.restore();
    // 장면 전환 페이드
    const lf = n - s.start, fade = Math.min(lf, s.dur - lf);
    if (fade < 8) { ctx.fillStyle = `rgba(0,0,0,${1 - fade / 8})`; ctx.fillRect(0, 0, W, H); }
  }

  window.Sim = {
    init(canvas, seed) { ctx = canvas.getContext('2d'); return build(seed); }, ready,
    drawFrame, FPS, get total() { return total; },
    get timeline() { return scenes.map(({ start, dur, kind, label }) => ({ start, dur, kind, label })); }, get result() { return T; },
  };
})();
