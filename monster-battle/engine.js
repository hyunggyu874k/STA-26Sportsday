// 전투 엔진 — 한 행동씩 진행하는 Battle 객체.
// 플레이어(직접 기술 선택)와 AI(자동 선택) 모두 같은 규칙으로 싸운다.
// fight()는 양쪽을 AI로 끝까지 돌려 이벤트 목록을 만든다(시뮬레이션 영상용).
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : { MONSTERS, BRACKET };

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeFighter(id) {
    const m = D.MONSTERS[id];
    const s = m.stats;
    const maxSta = 60 + s.end * 8;
    return {
      id, m, s: { ...s },
      maxHp: 260 + s.vit * 22, hp: 260 + s.vit * 22,
      maxSta, sta: maxSta,
      gauge: 0,
      status: {}, // poison, stun, charm, slow, fly, bound, forged, weather, guard
      used: {},
      firstStrike: true,
    };
  }

  const has = (f, k) => f.status[k] > 0;

  // ---------- 기술 목록 ----------
  // cost: 지구력 소모, avail(me, foe): 사용 가능 여부(불가 사유 문자열 또는 true), run(c): 효과
  const SKILLS = {
    furfur: [
      { id: 'thunder', name: '낙뢰', kind: '마법', cost: 16, desc: '번개를 떨어뜨리는 강한 마법 공격', run: c => { c.fx('lightning'); c.hit('mag', 1.8, { crit: 0.05 }); } },
      { id: 'gale', name: '강풍', kind: '마법', cost: 15, desc: '약한 공격 + 상대 스피드 저하(3턴)', avail: (me, foe) => has(foe, 'slow') ? '이미 느려져 있음' : true,
        run: c => { c.fx('wind'); c.hit('mag', 0.6); c.foe.status.slow = 3; c.note(`${c.foe.m.name}의 스피드 저하`); } },
      { id: 'batwing', name: '박쥐 날개 비행', kind: '보조', cost: 10, desc: '3턴 동안 회피율 크게 상승', avail: me => has(me, 'fly') ? '이미 날고 있음' : true,
        run: c => { c.fx('fly'); c.me.status.fly = 3; c.note('하늘로 날아올라 회피율 상승'); } },
      { id: 'kick', name: '발굽 차기', kind: '물리', cost: 8, desc: '기본 물리 공격', run: c => { c.fx('claw'); c.hit('str', 1.0); } },
    ],
    naga: [
      { id: 'weather', name: '날씨 조작', kind: '보조', cost: 10, desc: '폭우로 상대 스피드 영구 저하 (1회)', avail: me => me.used.weather ? '이미 사용함' : true,
        run: c => { c.me.used.weather = 1; c.fx('rain'); c.foe.status.weather = 99; c.note(`폭우! ${c.foe.m.name}에게 불리한 날씨`); } },
      { id: 'venom', name: '강력한 독', kind: '물리', cost: 12, desc: '물어서 독 주입 (4턴 지속 피해)', avail: (me, foe) => has(foe, 'poison') ? '이미 중독됨' : true,
        run: c => { c.fx('poison'); const r = c.hit('str', 0.7); if (!r.miss) { c.foe.status.poison = 4; c.note(`${c.foe.m.name} 중독!`); } } },
      { id: 'fury', name: '파괴적인 분노', kind: '마법', cost: 20, desc: '체력 절반 이하일 때, 폭풍+벼락 2연타 (1회)',
        avail: me => me.used.fury ? '이미 사용함' : me.hp >= me.maxHp * 0.5 ? '체력이 절반 이하일 때만' : true,
        run: c => { c.me.used.fury = 1; c.fx('storm'); c.hit('mag', 1.2, { sure: true }); c.hit('mag', 1.2, { sure: true }); } },
      { id: 'bite', name: '물기', kind: '물리', cost: 8, desc: '기본 물리 공격', run: c => { c.fx('bite'); c.hit('str', 1.0); } },
    ],
    amdusias: [
      { id: 'branches', name: '나뭇가지 속박', kind: '마법', cost: 18, desc: '상대를 묶어 한 턴 행동 불가', avail: (me, foe) => has(foe, 'bound') ? '이미 묶여 있음' : true,
        run: c => { c.fx('branches'); const r = c.hit('mag', 0.5); if (!r.miss) { c.foe.status.bound = 1; c.note(`${c.foe.m.name}의 팔다리를 휘감았다!`); } } },
      { id: 'horn', name: '외뿔 찌르기', kind: '물리', cost: 12, desc: '묶인 상대에게는 2배 이상 확정 명중',
        run: c => { c.fx('horn'); if (has(c.foe, 'bound')) { c.hit('str', 2.1, { sure: true, crit: 0.1 }); c.foe.status.bound = 0; } else c.hit('str', 1.1); } },
      { id: 'trumpet', name: '지옥의 나팔', kind: '보조', cost: 10, desc: '상대 지구력 -30 (1회)', avail: me => me.used.trumpet ? '이미 사용함' : true,
        run: c => { c.me.used.trumpet = 1; c.fx('music'); c.foe.sta -= 30; c.note(`${c.foe.m.name}의 지구력 -30`); } },
    ],
    gumiho: [
      { id: 'rainwind', name: '비바람 요술', kind: '마법', cost: 14, desc: '강한 마법 공격', run: c => { c.fx('storm'); c.hit('mag', 1.6); } },
      { id: 'charm', name: '정신 홀리기', kind: '보조', cost: 15, desc: '상대가 다음 턴에 자기를 공격할 수 있음',
        avail: (me, foe) => has(foe, 'charm') ? '이미 홀려 있음' : true,
        run: c => { c.fx('charm'); if (c.foe.id === 'sukuna') c.note('앞뒤의 얼굴! 현혹이 통하지 않는다'); else { c.foe.status.charm = 1; c.note(`${c.foe.m.name}이(가) 홀렸다!`); } } },
      { id: 'paravenom', name: '마비독', kind: '마법', cost: 15, desc: '상대를 마비시켜 한 턴 행동 불가 (1회)', avail: me => me.used.para ? '이미 사용함' : true,
        run: c => { c.me.used.para = 1; c.fx('poison'); const r = c.hit('mag', 0.6); if (!r.miss) { c.foe.status.stun = 1; c.note(`${c.foe.m.name} 마비! 움직일 수 없다`); } } },
      { id: 'bite', name: '물어뜯기', kind: '물리', cost: 8, desc: '기본 물리 공격', run: c => { c.fx('bite'); c.hit('str', 1.0); } },
    ],
    jotun: [
      { id: 'armsmash', name: '강력한 팔의 힘', kind: '물리', cost: 18, desc: '산을 옮기는 힘으로 내려치기', run: c => { c.fx('smash'); c.hit('str', 1.45); } },
      { id: 'ice', name: '얼음 마법', kind: '마법', cost: 15, desc: '마법 공격 + 상대 스피드 저하(3턴)', avail: (me, foe) => has(foe, 'slow') ? '이미 느려져 있음' : true,
        run: c => { c.fx('ice'); const r = c.hit('mag', 1.0); if (!r.miss) { c.foe.status.slow = 3; c.note(`${c.foe.m.name}이(가) 얼어붙어 느려졌다`); } } },
      { id: 'forge', name: '무기·갑옷 제작', kind: '보조', cost: 10, desc: '전투 내내 공격력·방어력 상승 (1회)', avail: me => me.used.forge ? '이미 사용함' : true,
        run: c => { c.me.used.forge = 1; c.fx('forge'); c.me.status.forged = 99; c.note('공격력·방어력 상승'); } },
    ],
    orochi: [
      { id: 'eightbite', name: '8개 머리 물어뜯기', kind: '물리', cost: 0, desc: '8번 연속으로 물어뜯기', run: c => { c.fx('eightbite'); for (let i = 0; i < 8; i++) c.hit('str', 0.18); } },
      { id: 'slam', name: '거대한 몸집으로 짓누르기', kind: '물리', cost: 0, desc: '한 방의 강한 물리 공격', run: c => { c.fx('slam'); c.hit('str', 1.1); } },
    ],
    griffin: [
      { id: 'dive', name: '급강하 기습', kind: '물리', cost: 15, desc: '첫 공격이면 확정 치명타, 이후엔 강한 공격',
        run: c => {
          c.fx('dive');
          if (c.me.firstStrike) { c.hit('str', 1.6, { crit: c.foe.id === 'sukuna' ? 0 : 1, sure: c.foe.id !== 'sukuna' }); if (c.foe.id === 'sukuna') c.note('앞뒤의 얼굴! 기습을 간파했다'); }
          else c.hit('str', 1.2);
        } },
      { id: 'talons', name: '부리와 발톱', kind: '물리', cost: 16, desc: '3연속 공격', run: c => { c.fx('claw'); c.hit('str', 0.6); c.hit('str', 0.6); c.hit('str', 0.5); } },
    ],
    sukuna: [
      { id: 'triple', name: '칼·도끼·활의 협공', kind: '물리', cost: 18, desc: '3개의 무기로 동시 공격', run: c => { c.fx('triple'); c.hit('str', 0.55); c.hit('str', 0.55); c.hit('str', 0.5); } },
      { id: 'slash', name: '대도 베기', kind: '물리', cost: 10, desc: '기본 물리 공격', run: c => { c.fx('slash'); c.hit('str', 1.15); } },
    ],
  };
  const GUARD = { id: 'guard', name: '방어 자세', kind: '방어', cost: 0, desc: '다음 공격을 크게 줄여 막고 반격 확률↑ (지구력 +15)' };
  const REST = { id: 'rest', name: '숨 고르기', kind: '회복', cost: 0, desc: '지구력을 크게 회복' };

  function createBattle(aId, bId, seed) {
    const R = rng(seed);
    const rand = (a, b) => a + (b - a) * R();
    const F = [makeFighter(aId), makeFighter(bId)];
    const events = [];
    const queue = [];
    const snap = () => F.map(f => ({ hp: Math.max(0, Math.round(f.hp)), sta: Math.round(f.sta), status: Object.keys(f.status).filter(k => f.status[k] > 0) }));
    const spdOf = f => Math.max(2, f.s.spd - (f.status.slow > 0 ? 2 : 0) - (f.status.weather > 0 ? 1 : 0));

    function damage(att, def, kind, power, opt = {}) {
      let base = kind === 'str' ? 10 + att.s.str * 3.2 : 10 + att.s.mag * 3.2;
      if (kind === 'str' && has(att, 'forged')) base *= 1.25;
      let reduce = kind === 'str' ? def.s.def * 0.045 : def.s.res * 0.045;
      if (has(def, 'forged') && kind === 'str') reduce += 0.12;
      if (def.id === 'orochi') reduce += 0.03; // 거대한 몸집
      if (att.sta < att.maxSta * 0.2 && att.id !== 'orochi') base *= 0.8; // 지쳐 있음
      let dmg = base * power * (1 - Math.min(0.7, reduce)) * rand(0.85, 1.15);
      let dodge = 0.03 + (def.s.spd + def.s.int) * 0.006 + (has(def, 'fly') ? 0.25 : 0);
      if (has(def, 'stun') || has(def, 'bound')) dodge = 0;
      if (opt.sure) dodge = 0;
      if (R() < dodge) return { miss: true, dmg: 0 };
      // 방어: 방어 자세(guard)면 확실히, 아니면 방어력에 비례한 확률로 막는다
      const guarding = has(def, 'guard');
      const canBlock = !has(def, 'stun') && !has(def, 'bound') && !has(def, 'charm');
      if (canBlock && (guarding || R() < def.s.def * 0.022)) {
        dmg *= guarding ? 0.35 : 0.55;
        if (guarding) def.status.guard = 0;
        let counter = 0;
        if (kind === 'str' && def.hp > 0 && R() < (guarding ? 0.6 : 0.2) + def.s.int * 0.02) {
          counter = Math.round((8 + def.s.str * 2.2) * rand(0.85, 1.1));
          att.hp -= counter; // 반격
        }
        return { miss: false, block: true, counter, dmg: Math.round(dmg) };
      }
      let critChance = 0.05 + att.s.int * 0.015 + (opt.crit || 0);
      if (def.id === 'sukuna') critChance = 0; // 앞뒤의 얼굴: 빈틈이 없다
      const crit = R() < critChance;
      if (crit) dmg *= 1.6;
      return { miss: false, crit, dmg: Math.round(dmg) };
    }

    // 지금 i가 고를 수 있는 행동 목록
    function options(i) {
      const me = F[i], foe = F[1 - i];
      const list = SKILLS[me.id].map(sk => {
        let why = sk.avail ? sk.avail(me, foe) : true;
        if (why === true && me.id !== 'orochi' && me.sta < sk.cost) why = '지구력 부족';
        return { ...sk, ok: why === true, why: why === true ? '' : why };
      });
      list.push({ ...GUARD, name: me.m.guardName, ok: !has(me, 'guard'), why: has(me, 'guard') ? '이미 방어 중' : '' });
      if (me.id !== 'orochi') list.push({ ...REST, ok: me.sta < me.maxSta, why: me.sta < me.maxSta ? '' : '지구력이 가득 참' });
      return list;
    }

    // 본인 의지와 상관없이 정해지는 행동(묶임·마비·현혹). 없으면 null
    function forced(i) {
      const me = F[i];
      if (has(me, 'stun') || has(me, 'bound')) {
        const ev = { actor: i, name: has(me, 'bound') ? '나뭇가지에 묶여 움직일 수 없다' : '마비되어 움직일 수 없다', fx: 'stuck', hits: [], notes: [] };
        me.status.stun = 0;
        if (has(me, 'bound') && me.s.str >= 8 && R() < 0.5) { me.status.bound = 0; ev.name = '괴력으로 나뭇가지를 끊었다!'; }
        return ev;
      }
      if (has(me, 'charm')) {
        me.status.charm = 0;
        if (R() < 0.6) {
          const self = Math.round((10 + me.s.str * 2.5) * rand(0.8, 1.1));
          me.hp -= self;
          return { actor: i, name: '현혹되어 자기를 공격!', fx: 'confuse', hits: [], notes: [], self };
        }
      }
      return null;
    }

    function run(i, actionId) {
      const me = F[i], foe = F[1 - i];
      const e = { actor: i, name: '', fx: 'hit', hits: [], notes: [], action: actionId };
      if (actionId === 'guard') {
        e.name = me.m.guardName; e.fx = 'guard'; e.notes.push('다음 공격을 막고 반격을 노린다');
        me.status.guard = 1; me.sta = Math.min(me.maxSta, me.sta + 15);
        return e;
      }
      if (actionId === 'rest') {
        e.name = '숨 고르기'; e.fx = 'rest'; me.sta = Math.min(me.maxSta, me.sta + 18 + me.s.end * 2);
        return e;
      }
      const sk = SKILLS[me.id].find(s => s.id === actionId);
      e.name = sk.name;
      const c = {
        me, foe,
        fx: f => { e.fx = f; },
        note: n => e.notes.push(n),
        hit: (kind, power, opt) => { const r = damage(me, foe, kind, power, opt); foe.hp -= r.dmg; e.hits.push(r); return r; },
      };
      sk.run(c);
      if (me.id !== 'orochi') me.sta -= sk.cost;
      else e.notes.push('무한한 지구력 — 지치지 않는다');
      me.firstStrike = false;
      return e;
    }

    function endTurn(i, ev) {
      const me = F[i];
      if (me.id !== 'orochi') me.sta = Math.min(me.maxSta, me.sta + 6 + me.s.end * 1.0);
      if (has(me, 'poison')) { const p = Math.round(me.maxHp * 0.035); me.hp -= p; ev.poison = p; me.status.poison--; }
      if (me.id === 'naga' && me.hp > 0) { const h = Math.round(me.maxHp * 0.03); me.hp = Math.min(me.maxHp, me.hp + h); ev.regen = h; }
      for (const k of ['slow', 'fly']) if (me.status[k] > 0) me.status[k]--;
      ev.type = 'action';
      ev.state = snap();
      events.push(ev);
      if (F[0].hp <= 0 || F[1].hp <= 0) {
        battle.winner = F[0].hp > 0 ? 0 : 1;
        events.push({ type: 'end', winner: battle.winner, state: snap() });
      }
      return ev;
    }

    // AI: 지능이 높을수록 상황에 맞는 기술을 고른다
    function aiChoose(i) {
      const me = F[i], foe = F[1 - i];
      const opts = options(i);
      const ok = id => opts.some(o => o.id === id && o.ok);
      const smart = R() < 0.4 + me.s.int * 0.06;
      const low = me.hp < me.maxHp * 0.5;
      if (me.sta < 12 && ok('rest')) return 'rest';
      if (ok('guard') && me.hp < me.maxHp * 0.65 && R() < 0.08 + me.s.def * 0.012) return 'guard';
      const pick = (...ids) => ids.find(ok);
      let id;
      switch (me.id) {
        case 'furfur':
          if (smart && foe.s.spd >= 5 && !me.used.gale && ok('gale')) { me.used.gale = 1; id = 'gale'; }
          else if (low && !me.used.batwing && ok('batwing')) { me.used.batwing = 1; id = 'batwing'; }
          else id = R() < 0.6 ? pick('thunder', 'kick') : pick('kick', 'thunder');
          break;
        case 'naga':
          id = pick('weather') || (low ? pick('fury') : null) || (R() < 0.7 ? pick('venom') : null) || pick('bite', 'venom');
          break;
        case 'amdusias':
          if (has(foe, 'bound')) id = pick('horn');
          else if (R() < (smart ? 0.5 : 0.3)) id = pick('branches', 'horn');
          else id = pick('trumpet', 'horn', 'branches');
          break;
        case 'gumiho':
          if (foe.id !== 'sukuna' && R() < 0.35) id = pick('charm');
          if (!id && R() < 0.35) id = pick('paravenom');
          if (!id) id = R() < 0.6 ? pick('rainwind', 'bite') : pick('bite', 'rainwind');
          break;
        case 'jotun':
          id = pick('forge') || (R() < 0.35 ? pick('ice') : null) || pick('armsmash', 'ice');
          break;
        case 'orochi': id = R() < 0.5 ? 'eightbite' : 'slam'; break;
        case 'griffin': id = me.firstStrike ? pick('dive') : (R() < 0.55 ? pick('talons', 'dive') : pick('dive', 'talons')); break;
        case 'sukuna': id = R() < 0.55 ? pick('triple', 'slash') : pick('slash', 'triple'); break;
      }
      return id || pick(...opts.map(o => o.id)) || 'rest';
    }

    // 다음에 행동할 쪽(0/1)을 돌려준다
    function nextActor() {
      while (!queue.length) {
        for (const f of F) f.gauge += 8 + spdOf(f) * 2;
        const ready = F.filter(f => f.gauge >= 100).sort((x, y) => y.gauge - x.gauge || y.s.spd - x.s.spd);
        for (const f of ready) { f.gauge -= 100; queue.push(F.indexOf(f)); }
      }
      return queue.shift();
    }

    const battle = {
      F, events, winner: null, options, aiChoose, nextActor,
      ids: [aId, bId], maxHp: F.map(f => f.maxHp), maxSta: F.map(f => f.maxSta),
      // i의 차례를 진행. 강제 행동이 있으면 actionId는 무시된다.
      forcedTurn(i) { const ev = forced(i); return ev ? endTurn(i, ev) : null; },
      perform(i, actionId) { return endTurn(i, run(i, actionId)); },
    };
    events.push({ type: 'start', state: snap() });
    return battle;
  }

  function fight(aId, bId, seed) {
    const b = createBattle(aId, bId, seed);
    let n = 0;
    while (b.winner === null && n++ < 5000) {
      const i = b.nextActor();
      if (!b.forcedTurn(i)) b.perform(i, b.aiChoose(i));
    }
    return { ids: b.ids, maxHp: b.maxHp, maxSta: b.maxSta, events: b.events, winner: b.ids[b.winner] };
  }

  function tournament(seed) {
    const rounds = [];
    let current = D.BRACKET.map(p => p.slice());
    let r = 0;
    const roundNames = ['8강', '4강', '결승'];
    while (true) {
      const matches = current.map((p, i) => fight(p[0], p[1], seed * 97 + r * 13 + i * 7 + 1));
      rounds.push({ name: roundNames[r], matches });
      const winners = matches.map(m => m.winner);
      if (winners.length === 1) return { rounds, champion: winners[0] };
      current = [];
      for (let i = 0; i < winners.length; i += 2) current.push([winners[i], winners[i + 1]]);
      r++;
    }
  }

  const api = { fight, tournament, createBattle, SKILLS };
  if (typeof module !== 'undefined') module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
