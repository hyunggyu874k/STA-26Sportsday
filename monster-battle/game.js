// 조작형 대전 게임 — 캐릭터 선택, 토너먼트/1:1 모드, 내 차례에 기술을 골라 싸운다.
// 전투 규칙은 engine.js(createBattle), 화면은 render.js(Sim.gfx)를 그대로 쓴다.
(function () {
  const $ = s => document.querySelector(s);
  const IDS = Object.keys(MONSTERS);
  const gfx = Sim.gfx;
  const canvas = $('#c');
  gfx.setCtx(canvas.getContext('2d'));

  const G = { p1: null, p2: null, mode: 'tour', diff: 1, auto: false, speed: 1, sound: true };

  // ---------- 소리 ----------
  const AUD = {};
  ['menu', 'battle', 'final', 'win', 'lose', 'champion'].forEach(n => { const a = new Audio(`audio/${n}.mp3`); a.loop = ['menu', 'battle', 'final'].includes(n); a.volume = 0.55; AUD[n] = a; });
  let bgm = null;
  function music(name) {
    if (bgm === name) return;
    Object.values(AUD).forEach(a => { if (a.loop) a.pause(); });
    bgm = name;
    if (name && G.sound) { AUD[name].currentTime = 0; AUD[name].play().catch(() => {}); }
  }
  function sting(name) { if (!G.sound) return; music(null); AUD[name].currentTime = 0; AUD[name].play().catch(() => {}); }

  // ---------- 캐릭터 선택 ----------
  function buildSelect() {
    $('#grid').innerHTML = IDS.map(id => {
      const m = MONSTERS[id];
      const bars = STAT_KEYS.map(k => `<span>${STAT_NAMES[k]}</span><div class="bar"><i style="width:${m.stats[k] * 10}%"></i></div>`).join('');
      return `<div class="card" data-id="${id}"><img src="sprites/${id}.png" alt="${m.name}"><div class="t">${m.title}</div><div class="n">${m.name}</div><div class="bars">${bars}</div></div>`;
    }).join('');
    $('#grid').querySelectorAll('.card').forEach(c => c.onclick = () => pick(c.dataset.id));
    segment('#modeSeg', v => { G.mode = v; if (v === 'tour') G.p2 = null; refreshSelect(); });
    segment('#diffSeg', v => { G.diff = +v; });
    $('#startBtn').onclick = () => { unlockAudio(); G.mode === 'tour' ? startTournament() : startVs(); };
    refreshSelect();
  }
  function segment(sel, cb) {
    document.querySelectorAll(`${sel} button`).forEach(b => b.onclick = () => {
      document.querySelectorAll(`${sel} button`).forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.v);
    });
  }
  function pick(id) {
    unlockAudio();
    if (G.mode === 'vs' && G.p1 && !G.p2 && id !== G.p1) G.p2 = id;
    else { G.p1 = id; G.p2 = null; }
    showDetail(id);
    refreshSelect();
  }
  function showDetail(id) {
    const m = MONSTERS[id];
    const sk = Engine.SKILLS[id].map(s => `<b>${s.name}</b>(${s.kind}${s.cost ? ` · 지구력 ${s.cost}` : ''}) ${s.desc}`).join('<br>');
    $('#detail').innerHTML = `<b style="font-size:18px">${m.name}</b> — ${m.title} · ${m.region} · ${m.length}<br>${m.traits.join(' / ')}<br>${sk}<br><b>${m.guardName}</b>(방어) 다음 공격을 막고 반격을 노린다`;
  }
  function refreshSelect() {
    document.querySelectorAll('.card').forEach(c => {
      const id = c.dataset.id;
      c.classList.toggle('p1', id === G.p1); c.classList.toggle('p2', id === G.p2);
      c.querySelector('.tag')?.remove();
      if (id === G.p1 || id === G.p2) c.insertAdjacentHTML('beforeend', `<span class="tag" style="background:${id === G.p1 ? '#3f8cff' : '#ff4a5a'}">${id === G.p1 ? '나' : '상대'}</span>`);
    });
    const ready = G.mode === 'tour' ? !!G.p1 : !!(G.p1 && G.p2);
    $('#startBtn').disabled = !ready;
    $('#selHint').textContent = !G.p1 ? '① 내가 조종할 몬스터를 고르세요'
      : G.mode === 'vs' && !G.p2 ? '② 싸울 상대 몬스터를 고르세요' : '준비 완료! 전투 시작을 누르세요';
  }
  let audioUnlocked = false;
  function unlockAudio() { if (!audioUnlocked) { audioUnlocked = true; music('menu'); } }

  function show(which) {
    $('#select').classList.toggle('on', which === 'select');
    $('#stage').style.display = which === 'select' ? 'none' : 'block';
    $('#panel').classList.toggle('on', which === 'battle');
    $('#ovBracket').classList.remove('on'); $('#ovResult').classList.remove('on');
  }

  // ---------- 토너먼트 ----------
  let T = null; // { slots:[id...8], rounds:[[{a,b,winner}]], r }
  const RN = ['8강', '4강', '결승'];
  function startTournament() {
    const others = IDS.filter(i => i !== G.p1).sort(() => Math.random() - 0.5);
    const slots = [G.p1, ...others];
    T = { r: 0, rounds: [[0, 1, 2, 3].map(k => ({ a: slots[k * 2], b: slots[k * 2 + 1], winner: null }))] };
    showBracket();
  }
  function myMatch() { return T.rounds[T.r].find(x => x.a === G.p1 || x.b === G.p1); }
  function showBracket() {
    show('stage');
    const mm = myMatch(), foe = mm.a === G.p1 ? mm.b : mm.a;
    intro = { a: G.p1, b: foe };
    $('#brTitle').textContent = `토너먼트 ${RN[T.r]} — 상대: ${MONSTERS[foe].name}`;
    $('#bracket').innerHTML = T.rounds.map((round, ri) => `<div><b style="color:#ffd83a">${RN[ri]}</b> ` + round.map(x => {
      const nm = id => `<span class="${id === G.p1 ? 'me' : ''} ${x.winner && x.winner !== id ? 'lost' : ''}">${MONSTERS[id].name}</span>`;
      return `${nm(x.a)} vs ${nm(x.b)}`;
    }).join(' · ') + '</div>').join('');
    $('#brGo').onclick = () => startBattle(G.p1, foe, `토너먼트 ${RN[T.r]}`);
    $('#ovBracket').classList.add('on');
    phase = 'intro';
    music('menu');
  }
  function advanceTournament() {
    const round = T.rounds[T.r];
    round.forEach(x => { if (!x.winner) x.winner = Engine.fight(x.a, x.b, (Math.random() * 1e9) | 0).winner; });
    if (round.length === 1) return true;
    const next = [];
    for (let k = 0; k < round.length; k += 2) next.push({ a: round[k].winner, b: round[k + 1].winner, winner: null });
    T.rounds.push(next); T.r++;
    return false;
  }

  function startVs() { T = null; startBattle(G.p1, G.p2, '1:1 대전'); }

  // ---------- 전투 ----------
  let B = null, m = null, f = 0, phase = 'none', aiDelay = 0, aiActor = 1, koAt = 0, intro = null, label = '';
  const ACT = gfx.ACT;
  const actions = () => B.events.filter(e => e.type === 'action').length;

  function startBattle(a, b, lbl) {
    show('battle');
    label = lbl;
    B = Engine.createBattle(a, b, (Math.random() * 1e9) | 0);
    const cpu = B.F[1];
    cpu.maxHp = Math.round(cpu.maxHp * G.diff); cpu.hp = cpu.maxHp; B.maxHp[1] = cpu.maxHp; B.events[0].state[1].hp = cpu.hp;
    m = { live: true, ids: B.ids, maxHp: B.maxHp, maxSta: B.maxSta, events: B.events, winner: null, clock: 0 };
    f = 0; phase = 'start'; aiDelay = 25;
    music(T && T.r === 2 ? 'final' : 'battle');
    setTurn(`${MONSTERS[a].name} VS ${MONSTERS[b].name} — 전투 시작!`);
    $('#cmds').innerHTML = '';
  }

  function decide() {
    if (B.winner !== null) { m.winner = B.ids[B.winner]; phase = 'ko'; koAt = f; $('#cmds').innerHTML = ''; setTurn(`K.O.! ${MONSTERS[m.winner].name}의 승리`); return; }
    const i = B.nextActor();
    if (B.forcedTurn(i)) { phase = 'anim'; setTurn(`${MONSTERS[B.ids[i]].name}이(가) 움직일 수 없다!`); return; }
    if (i === 0 && !G.auto) { phase = 'input'; showCommands(); return; }
    phase = 'ai'; aiActor = i; aiDelay = i === 0 ? 8 : 14;
    setTurn(i === 0 ? `${MONSTERS[B.ids[0]].name} 자동 행동 중…` : `상대 ${MONSTERS[B.ids[1]].name}의 차례…`);
    $('#cmds').innerHTML = '';
  }

  function setTurn(t) { $('#turn').innerHTML = t; }

  function showCommands() {
    const me = B.F[0];
    setTurn(`<span style="color:#6fb0ff">▶ ${me.m.name}의 차례!</span> 기술을 고르세요 <span style="font-size:.8em;color:#9cf">(HP ${Math.max(0, Math.round(me.hp))}/${me.maxHp} · 지구력 ${Math.round(me.sta)}/${me.maxSta})</span>`);
    const opts = B.options(0);
    $('#cmds').innerHTML = opts.map((o, k) => `<button class="cmd ${o.id === 'guard' ? 'guard' : o.id === 'rest' ? 'rest' : ''}" data-id="${o.id}" ${o.ok ? '' : 'disabled'}>
      <span class="c">${o.cost && me.id !== 'orochi' ? `지구력 ${o.cost}` : ''}</span>
      <span class="k">${k + 1}</span><span class="nm">${o.name}</span><span class="ty ${o.kind}">${o.kind}</span>
      <div class="d">${o.ok ? o.desc : '⛔ ' + o.why}</div></button>`).join('');
    $('#cmds').querySelectorAll('.cmd').forEach(b => b.onclick = () => choose(b.dataset.id));
  }

  function choose(id) {
    if (phase !== 'input') return;
    const o = B.options(0).find(x => x.id === id);
    if (!o || !o.ok) return;
    B.perform(0, id);
    phase = 'anim';
    $('#cmds').innerHTML = '';
    setTurn(`${MONSTERS[B.ids[0]].name}의 ${o.name}!`);
  }

  document.addEventListener('keydown', e => {
    if (phase === 'input' && /^[1-9]$/.test(e.key)) {
      const b = $('#cmds').querySelectorAll('.cmd')[+e.key - 1];
      if (b && !b.disabled) choose(b.dataset.id);
    }
  });

  function finish() {
    phase = 'result';
    const won = B.winner === 0;
    const me = MONSTERS[B.ids[0]].name, foe = MONSTERS[B.ids[1]].name;
    let btns = [];
    if (won) {
      if (T) {
        const mm = myMatch(); mm.winner = G.p1;
        const champ = advanceTournament();
        if (champ) {
          sting('champion');
          $('#resTitle').textContent = '🏆 토너먼트 우승!';
          $('#resSub').textContent = `${me}이(가) 3연승으로 최강의 몬스터가 되었다!`;
          btns = [['다시 도전', 'gold', () => { G.p1 && startTournament(); }], ['캐릭터 선택', 'gray', toSelect]];
        } else {
          sting('win');
          $('#resTitle').textContent = '승리!';
          $('#resSub').textContent = `${foe}을(를) 쓰러뜨렸다! 다음은 ${RN[T.r]}`;
          btns = [['다음 경기로', 'gold', showBracket], ['캐릭터 선택', 'gray', toSelect]];
        }
      } else {
        sting('win');
        $('#resTitle').textContent = '승리!';
        $('#resSub').textContent = `${me}이(가) ${foe}을(를) 쓰러뜨렸다!`;
        btns = [['다시 하기', 'gold', startVs], ['캐릭터 선택', 'gray', toSelect]];
      }
    } else {
      sting('lose');
      $('#resTitle').textContent = '패배…';
      $('#resSub').textContent = `${foe}에게 졌다. 방어 자세와 상태이상 기술을 활용해 보자!`;
      const retry = T ? () => startBattle(G.p1, B.ids[1], label) : startVs;
      btns = [['다시 도전', 'gold', retry], ['캐릭터 선택', 'gray', toSelect]];
    }
    $('#resBtns').innerHTML = '';
    btns.forEach(([t, cls, fn]) => { const b = document.createElement('button'); b.className = `btn ${cls}`; b.textContent = t; b.onclick = fn; $('#resBtns').appendChild(b); });
    $('#ovResult').classList.add('on');
  }

  function toSelect() { phase = 'none'; show('select'); music('menu'); }

  // ---------- 도구 버튼 ----------
  $('#autoBtn').onclick = () => { G.auto = !G.auto; $('#autoBtn').textContent = `자동 전투: ${G.auto ? '켬' : '끔'}`; $('#autoBtn').classList.toggle('on', G.auto); if (G.auto && phase === 'input') { phase = 'ai'; aiActor = 0; aiDelay = 4; $('#cmds').innerHTML = ''; } };
  $('#speedBtn').onclick = () => { G.speed = G.speed === 1 ? 2 : 1; $('#speedBtn').textContent = `속도: ${G.speed === 1 ? '보통' : '빠르게'}`; };
  $('#soundBtn').onclick = () => {
    G.sound = !G.sound; $('#soundBtn').textContent = `소리: ${G.sound ? '켬' : '끔'}`;
    if (!G.sound) Object.values(AUD).forEach(a => a.pause()); else { const n = bgm; bgm = null; music(n || 'battle'); }
  };
  $('#quitBtn').onclick = toSelect;

  // ---------- 메인 루프 (30fps) ----------
  function tick() {
    for (let s = 0; s < (phase === 'anim' || phase === 'ko' ? G.speed : 1); s++) step();
    draw();
  }
  function step() {
    if (!m) return;
    const endF = actions() * ACT;
    switch (phase) {
      case 'start': m.clock++; if (--aiDelay <= 0) decide(); break;
      case 'anim': f++; if (f >= endF) { f = endF; decide(); } break;
      case 'input': m.clock++; break;
      case 'ai': m.clock++; if (--aiDelay <= 0) { B.perform(aiActor, B.aiChoose(aiActor)); phase = 'anim'; } break;
      case 'ko': f++; if (f - koAt > 75) finish(); break;
      case 'result': if (f - koAt < 200) f++; break;
    }
  }
  let introT = 0;
  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    if (phase === 'intro' && intro) {
      introT++;
      gfx.background(introT, '#20185a');
      gfx.drawMonster(intro.a, 330, 640, 1, introT, 1);
      gfx.drawMonster(intro.b, 950, 640, -1, introT, 1);
      gfx.text('VS', 640, 360, 120, '#2f8cff', 'center');
    } else if (m) {
      gfx.sceneFight(f, m, label);
    }
    ctx.restore();
  }

  let last = 0;
  function loop(t) {
    if (t - last >= 1000 / 30 - 2) { last = t; tick(); }
    requestAnimationFrame(loop);
  }

  buildSelect();
  show('select');
  Sim.ready.then(() => requestAnimationFrame(loop));
  window.Game = { G, get B() { return B; }, get phase() { return phase; }, choose, pick, startVs, startTournament }; // 테스트용
})();
