// 전투 엔진 — 시드 고정 난수로 같은 결과를 재현한다.
// 결과는 렌더러가 그대로 재생할 수 있는 이벤트 목록으로 반환.
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
      status: {}, // poison, stun, charm, slow, fly, bound, forged, weather
      used: {},
      firstStrike: true,
    };
  }

  function fight(aId, bId, seed) {
    const R = rng(seed);
    const rand = (a, b) => a + (b - a) * R();
    const F = [makeFighter(aId), makeFighter(bId)];
    const events = [];
    const snap = () => F.map(f => ({ hp: Math.max(0, Math.round(f.hp)), sta: Math.round(f.sta), status: Object.keys(f.status).filter(k => f.status[k] > 0) }));

    const spdOf = f => Math.max(2, f.s.spd - (f.status.slow > 0 ? 2 : 0) - (f.status.weather > 0 ? 1 : 0));
    const has = (f, k) => f.status[k] > 0;

    function damage(att, def, kind, power, opt = {}) {
      // kind: 'str'(물리) or 'mag'(마법)
      let base = kind === 'str' ? 10 + att.s.str * 3.2 : 10 + att.s.mag * 3.2;
      if (kind === 'str' && has(att, 'forged')) base *= 1.25;
      let reduce = kind === 'str' ? def.s.def * 0.045 : def.s.res * 0.045;
      if (has(def, 'forged') && kind === 'str') reduce += 0.12;
      if (def.id === 'orochi') reduce += 0.03; // 거대한 몸집
      if (att.sta < att.maxSta * 0.2 && att.id !== 'orochi') base *= 0.8; // 지쳐 있음
      let dmg = base * power * (1 - Math.min(0.7, reduce)) * rand(0.85, 1.15);
      // 회피
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

    function act(me, foe) {
      const e = { actor: F.indexOf(me), name: '', fx: 'hit', hits: [], notes: [] };
      const hit = (kind, power, opt) => {
        const r = damage(me, foe, kind, power, opt);
        foe.hp -= r.dmg;
        e.hits.push(r);
        return r;
      };
      const cost = n => { if (me.id !== 'orochi') me.sta -= n; };
      const once = k => !me.used[k] && (me.used[k] = true);
      const smart = R() < 0.4 + me.s.int * 0.06; // 지능이 높을수록 좋은 판단
      const low = me.hp < me.maxHp * 0.5;

      // 헤롱 상태(구미호 현혹)
      if (has(me, 'charm')) {
        me.status.charm = 0;
        if (R() < 0.6) {
          const self = Math.round((10 + me.s.str * 2.5) * rand(0.8, 1.1));
          me.hp -= self;
          e.name = '현혹되어 자기를 공격!'; e.fx = 'confuse'; e.self = self;
          return e;
        }
        e.notes.push('현혹에서 깨어났다');
      }
      if (me.sta < 12 && me.id !== 'orochi') {
        me.sta = Math.min(me.maxSta, me.sta + 18 + me.s.end * 2);
        e.name = '지쳐서 숨을 고른다'; e.fx = 'rest';
        return e;
      }

      switch (me.id) {
        case 'furfur':
          if (!me.used.gale && smart && foe.s.spd >= 5 && once('gale')) {
            e.name = '강풍'; e.fx = 'wind'; hit('mag', 0.6); foe.status.slow = 3; e.notes.push(`${foe.m.name}의 스피드 저하`); cost(15);
          } else if (low && once('batwing')) {
            e.name = '박쥐 날개 비행'; e.fx = 'fly'; me.status.fly = 3; e.notes.push('하늘로 날아올라 회피율 상승'); cost(10);
          } else if (R() < 0.6) {
            e.name = '낙뢰'; e.fx = 'lightning'; hit('mag', 1.8, { crit: 0.05 }); cost(16);
          } else { e.name = '발굽 차기'; e.fx = 'claw'; hit('str', 1.0); cost(8); }
          break;
        case 'naga':
          if (once('weather')) {
            e.name = '날씨 조작'; e.fx = 'rain'; foe.status.weather = 99; e.notes.push(`폭우! ${foe.m.name}에게 불리한 날씨`); cost(10);
          } else if (low && once('fury')) {
            e.name = '파괴적인 분노'; e.fx = 'storm'; hit('mag', 1.2, { sure: true }); hit('mag', 1.2, { sure: true }); cost(20);
          } else if (!has(foe, 'poison') && R() < 0.7) {
            e.name = '강력한 독'; e.fx = 'poison'; const r = hit('str', 0.7);
            if (!r.miss) { foe.status.poison = 4; e.notes.push(`${foe.m.name} 중독!`); } cost(12);
          } else { e.name = '물기'; e.fx = 'bite'; hit('str', 1.0); cost(8); }
          break;
        case 'amdusias':
          if (has(foe, 'bound')) {
            e.name = '외뿔 찌르기'; e.fx = 'horn'; hit('str', 2.1, { sure: true, crit: 0.1 }); foe.status.bound = 0; cost(15);
          } else if (R() < (smart ? 0.5 : 0.3)) {
            e.name = '나뭇가지 속박'; e.fx = 'branches'; const r = hit('mag', 0.5);
            if (!r.miss) { foe.status.bound = 1; e.notes.push(`${foe.m.name}의 팔다리를 휘감았다!`); } cost(18);
          } else if (!me.used.trumpet && once('trumpet')) {
            e.name = '지옥의 나팔'; e.fx = 'music'; foe.sta -= 30; e.notes.push(`${foe.m.name}의 지구력 -30`); cost(10);
          } else { e.name = '외뿔 찌르기'; e.fx = 'horn'; hit('str', 1.1); cost(12); }
          break;
        case 'gumiho':
          if (!has(foe, 'charm') && R() < 0.35 && foe.id !== 'sukuna') {
            e.name = '정신 홀리기'; e.fx = 'charm'; foe.status.charm = 1; e.notes.push(`${foe.m.name}이(가) 홀렸다!`); cost(15);
          } else if (!me.used.para && R() < 0.35 && once('para')) {
            e.name = '마비독'; e.fx = 'poison'; const r = hit('mag', 0.6);
            if (!r.miss) { foe.status.stun = 1; e.notes.push(`${foe.m.name} 마비! 움직일 수 없다`); } cost(15);
          } else if (R() < 0.6) {
            e.name = '비바람 요술'; e.fx = 'storm'; hit('mag', 1.6); cost(14);
          } else { e.name = '물어뜯기'; e.fx = 'bite'; hit('str', 1.0); cost(8); }
          if (foe.id === 'sukuna' && e.name === '비바람 요술' && !me.used.note2) { me.used.note2 = true; e.notes.push('(앞뒤의 얼굴 때문에 현혹은 통하지 않는다)'); }
          break;
        case 'jotun':
          if (once('forge')) {
            e.name = '무기·갑옷 제작'; e.fx = 'forge'; me.status.forged = 99; e.notes.push('공격력·방어력 상승'); cost(10);
          } else if (!has(foe, 'slow') && R() < 0.35) {
            e.name = '얼음 마법'; e.fx = 'ice'; const r = hit('mag', 1.0); if (!r.miss) { foe.status.slow = 3; e.notes.push(`${foe.m.name}이(가) 얼어붙어 느려졌다`); } cost(15);
          } else { e.name = '강력한 팔의 힘'; e.fx = 'smash'; hit('str', 1.45); cost(18); }
          break;
        case 'orochi':
          if (R() < 0.5) {
            e.name = '8개 머리 물어뜯기'; e.fx = 'eightbite';
            for (let i = 0; i < 8; i++) hit('str', 0.18);
          } else { e.name = '거대한 몸집으로 짓누르기'; e.fx = 'slam'; hit('str', 1.1); }
          e.notes.push('무한한 지구력 — 지치지 않는다');
          break;
        case 'griffin':
          if (me.firstStrike) {
            e.name = '급강하 기습'; e.fx = 'dive';
            const r = hit('str', 1.6, { crit: foe.id === 'sukuna' ? 0 : 1, sure: foe.id !== 'sukuna' });
            if (foe.id === 'sukuna') e.notes.push('앞뒤의 얼굴! 기습을 간파했다');
            cost(15);
          } else if (R() < 0.55) {
            e.name = '부리와 발톱'; e.fx = 'claw'; hit('str', 0.6); hit('str', 0.6); hit('str', 0.5); cost(16);
          } else { e.name = '날아올라 낚아채기'; e.fx = 'dive'; hit('str', 1.2); cost(12); }
          break;
        case 'sukuna':
          if (R() < 0.55) {
            e.name = '칼·도끼·활의 협공'; e.fx = 'triple'; hit('str', 0.55); hit('str', 0.55); hit('str', 0.5); cost(18);
          } else { e.name = '대도 베기'; e.fx = 'slash'; hit('str', 1.15); cost(10); }
          break;
      }
      me.firstStrike = false;
      return e;
    }

    let tick = 0;
    events.push({ type: 'start', state: snap() });
    while (F[0].hp > 0 && F[1].hp > 0 && tick < 5000) {
      tick++;
      for (const f of F) f.gauge += 8 + spdOf(f) * 2;
      // 먼저 가득 찬 쪽이 행동 (동시면 스피드 높은 쪽)
      const ready = F.filter(f => f.gauge >= 100).sort((x, y) => y.gauge - x.gauge || y.s.spd - x.s.spd);
      for (const me of ready) {
        if (F[0].hp <= 0 || F[1].hp <= 0) break;
        me.gauge -= 100;
        const foe = F[1 - F.indexOf(me)];
        let ev;
        if (has(me, 'stun') || has(me, 'bound')) {
          ev = { actor: F.indexOf(me), name: has(me, 'bound') ? '나뭇가지에 묶여 움직일 수 없다' : '마비되어 움직일 수 없다', fx: 'stuck', hits: [], notes: [] };
          me.status.stun = 0;
          if (has(me, 'bound') && me.s.str >= 8 && R() < 0.5) { me.status.bound = 0; ev.name = '괴력으로 나뭇가지를 끊었다!'; }
        } else if (!has(me, 'guard') && me.hp < me.maxHp * 0.65 && R() < 0.08 + me.s.def * 0.012) {
          ev = { actor: F.indexOf(me), name: me.m.guardName, fx: 'guard', hits: [], notes: ['다음 공격을 막고 반격을 노린다'] };
          me.status.guard = 1;
          me.sta = Math.min(me.maxSta, me.sta + 15);
        } else {
          ev = act(me, foe);
        }
        // 턴 종료 처리
        if (me.id !== 'orochi') me.sta = Math.min(me.maxSta, me.sta + 6 + me.s.end * 1.0);
        if (has(me, 'poison')) { const p = Math.round(me.maxHp * 0.035); me.hp -= p; ev.poison = p; me.status.poison--; }
        if (me.id === 'naga' && me.hp > 0) { const h = Math.round(me.maxHp * 0.03); me.hp = Math.min(me.maxHp, me.hp + h); ev.regen = h; }
        for (const k of ['slow', 'fly']) if (me.status[k] > 0) me.status[k]--;
        ev.type = 'action';
        ev.state = snap();
        events.push(ev);
      }
    }
    const winner = F[0].hp > 0 ? 0 : 1;
    events.push({ type: 'end', winner, state: snap() });
    return { ids: [aId, bId], maxHp: F.map(f => f.maxHp), maxSta: F.map(f => f.maxSta), events, winner: [aId, bId][winner] };
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

  const api = { fight, tournament };
  if (typeof module !== 'undefined') module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
