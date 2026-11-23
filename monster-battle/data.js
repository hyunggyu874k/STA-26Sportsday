// 몬스터 데이터 — 도감 페이지 내용을 옮김.
// stats(0~10)는 도감의 8각 능력치 원형 차트를 사진에서 눈대중으로 읽은 값이라 근사치입니다.
// 순서: 힘, 마력, 방어력, 항마력, 생명력, 지구력, 스피드, 지능
const STAT_KEYS = ['str', 'mag', 'def', 'res', 'vit', 'end', 'spd', 'int'];
const STAT_NAMES = { str: '힘', mag: '마력', def: '방어력', res: '항마력', vit: '생명력', end: '지구력', spd: '스피드', int: '지능' };

const MONSTERS = {
  furfur: {
    name: '푸르푸르', title: '지옥의 백작', region: '유럽', source: '마법서 〈아르스 게티아〉', length: '약 3m', meters: 3,
    color: '#7b6fd6', style: 'mag',
    stats: { str: 6, mag: 8, def: 5, res: 4, vit: 7, end: 4, spd: 5, int: 7 },
    traits: ['26개 악마 군단을 지휘하는 지옥의 백작', '뛰어난 지능으로 감정을 조종하고 상대를 속인다'],
    skills: [
      { id: 'thunder', name: '낙뢰', from: '① 탁월한 마법 능력', desc: '목표물에 맞춰 번개를 떨어뜨린다' },
      { id: 'gale', name: '강풍', from: '① 탁월한 마법 능력', desc: '강한 바람으로 상대의 속도를 떨어뜨린다' },
      { id: 'batwing', name: '박쥐 날개 비행', from: '② 뛰어난 신체 능력', desc: '하늘로 날아올라 회피율 상승' },
    ],
  },
  naga: {
    name: '나가', title: '뱀의 정령', region: '인도, 동남아시아', source: '인도 신화', length: '3~5m', meters: 4,
    color: '#3f5fd0', style: 'mag',
    stats: { str: 4, mag: 7, def: 4, res: 5, vit: 5, end: 5, spd: 6, int: 7 },
    traits: ['재생 능력: 매 행동마다 상처가 낫는다', '날씨를 적에게 불리하게 바꾸는 작전을 쓴다'],
    skills: [
      { id: 'weather', name: '날씨 조작', from: '날씨를 바꾸는 몬스터', desc: '폭우로 적이 싸우기 불리한 날씨를 만든다(적 스피드↓)' },
      { id: 'venom', name: '강력한 독', from: '② 강력한 독', desc: '독을 뿜거나 물어서 독을 주입한다(지속 피해)' },
      { id: 'fury', name: '파괴적인 분노', from: '① 파괴적인 분노', desc: '체력이 절반 이하면 폭풍과 벼락을 일으킨다' },
    ],
  },
  amdusias: {
    name: '암두시아스', title: '지옥의 연주자', region: '유럽', source: '마법서 〈아르스 게티아〉', length: '약 2.5m', meters: 2.5,
    color: '#7a4a2e', style: 'mag',
    stats: { str: 5, mag: 7, def: 5, res: 6, vit: 5, end: 7, spd: 7, int: 7 },
    traits: ['지난 회 대결에서 우귀를 꺾고 올라왔다', '나뭇가지로 묶은 뒤 외뿔로 승부를 결정짓는다'],
    skills: [
      { id: 'branches', name: '나뭇가지 속박', from: '지난 회 대결', desc: '마법으로 나뭇가지를 뻗어 팔다리를 휘감는다(행동 불가)' },
      { id: 'horn', name: '외뿔 찌르기', from: '지난 회 대결', desc: '이마의 긴 외뿔로 찌른다. 묶인 상대에게 2배' },
      { id: 'trumpet', name: '지옥의 나팔', from: '지옥의 연주자', desc: '나팔 소리로 상대의 지구력을 깎는다' },
    ],
  },
  gumiho: {
    name: '구미호', title: '9개의 꼬리를 가진 여우', region: '한국, 중국, 일본', source: '〈삼국사기〉 등', length: '5~6m', meters: 5.5,
    color: '#e8c75a', style: 'mag',
    stats: { str: 5, mag: 9, def: 6, res: 6, vit: 3, end: 3, spd: 6, int: 8 },
    traits: ['수천 년을 살아온 여우 요괴', '꾀가 많고 뛰어난 요술 능력'],
    skills: [
      { id: 'rainwind', name: '비바람 요술', from: '① 요술 능력', desc: '비바람을 불러 날씨를 다룬다' },
      { id: 'charm', name: '정신 홀리기', from: '② 상대를 속이는 꾀', desc: '상대의 정신을 홀려 스스로를 공격하게 한다' },
      { id: 'paravenom', name: '마비독', from: '수천 년을 살아온 여우', desc: '독을 뿜어 움직이지 못하게 한다' },
    ],
  },
  jotun: {
    name: '요툰', title: '태고의 거인족', region: '유럽', source: '북유럽 신화', length: '5~8m', meters: 6.5,
    color: '#9fc3ea', style: 'str',
    stats: { str: 8, mag: 5, def: 5, res: 6, vit: 9, end: 8, spd: 5, int: 7 },
    traits: ['오딘, 토르 등 신들과 끊임없이 싸우는 거인', '근육질의 거대한 몸에서 나오는 무척 센 힘'],
    skills: [
      { id: 'forge', name: '무기·갑옷 제작', from: '② 풍부한 지식과 기술', desc: '강력한 무기와 갑옷을 만들어 공격·방어력↑' },
      { id: 'armsmash', name: '강력한 팔의 힘', from: '① 강력한 팔의 힘', desc: '산이나 섬을 옮길 만큼의 힘으로 내려친다' },
      { id: 'ice', name: '얼음 마법', from: '다양한 마법 지식', desc: '얼음 마법으로 공격하고 상대를 얼린다(스피드↓)' },
    ],
  },
  orochi: {
    name: '팔기대사', title: '8갈래의 거대한 뱀', region: '일본', source: '〈일본서기〉', length: '약 150m', meters: 150,
    color: '#8a8f9c', style: 'str',
    stats: { str: 10, mag: 3, def: 9, res: 8, vit: 7, end: 10, spd: 6, int: 3 },
    traits: ['무한한 지구력을 가진 요괴 (지구력이 줄지 않음)', '8개의 언덕과 8개의 계곡을 덮는 거대한 몸집'],
    skills: [
      { id: 'eightbite', name: '8개 머리 물어뜯기', from: '8갈래의 거대한 뱀', desc: '8개의 머리가 차례로 물어뜯는다' },
      { id: 'giantbody', name: '거대한 몸집', from: '① 거대한 몸집', desc: '거대한 몸으로 짓눌러 받는 피해 감소' },
    ],
  },
  griffin: {
    name: '그리핀', title: '금광을 지키는 파수꾼', region: '유럽, 서아시아', source: '인도 전설, 서아시아 전설', length: '4~6m', meters: 5,
    color: '#c9a36a', style: 'str',
    stats: { str: 5, mag: 2, def: 5, res: 5, vit: 7, end: 6, spd: 8, int: 4 },
    traits: ['상체는 독수리, 하체는 사자', '뛰어난 시력으로 먹이를 발견하면 빠르게 내려와 낚아챈다'],
    skills: [
      { id: 'dive', name: '급강하 기습', from: '기습에 능한 사냥꾼', desc: '높은 하늘에서 급강하해 낚아챈다(첫 공격 치명타)' },
      { id: 'talons', name: '부리와 발톱', from: '① 공중전에 특화된 무기', desc: '독수리 부리·앞발톱·사자 뒷발로 연속 공격' },
    ],
  },
  sukuna: {
    name: '양면숙나', title: '두 얼굴의 요괴', region: '일본', source: '〈일본서기〉, 〈천광사기〉 등', length: '약 3m', meters: 3,
    color: '#55565e', style: 'str',
    stats: { str: 7, mag: 3, def: 5, res: 5, vit: 5, end: 6, spd: 7, int: 6 },
    traits: ['8개의 손발을 가진 무사 — 요술·도술은 약하지만 힘이 세고 빠르다', '악마나 용을 쓰러뜨렸다고 전해진다'],
    skills: [
      { id: 'triple', name: '칼·도끼·활의 협공', from: '① 칼, 도끼, 활의 협공', desc: '4개의 손에 든 무기로 동시에 공격' },
      { id: 'twoface', name: '앞뒤에 있는 얼굴', from: '② 앞뒤에 있는 얼굴', desc: '항상 주위를 살펴 기습·현혹이 통하지 않는다' },
    ],
  },
};

// 8강 대진 (임의 구성 — 바꾸려면 이 배열만 수정)
const BRACKET = [
  ['orochi', 'sukuna'],
  ['furfur', 'griffin'],
  ['gumiho', 'amdusias'],
  ['naga', 'jotun'],
];

if (typeof module !== 'undefined') module.exports = { MONSTERS, BRACKET, STAT_KEYS, STAT_NAMES };
