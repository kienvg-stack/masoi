// Shared by server (require) and browser (<script>): roles, abilities, avatar items + SVG renderer
(function (root) {
const TEAM = { village: { n: 'Phe dân', c: '#3fa65a' }, wolf: { n: 'Phe sói', c: '#d0453f' }, solo: { n: 'Độc lập', c: '#d9a521' } };

// ab: k=kind, ph=night|day|any, n=targets, uses=limit, req=must act (or pass) before night can end early,
// self=can target self, dead=targets dead players, n1=first night only, nw=cannot target wolves
const ROLES = {
  villager:      { t: 'village', n: 'Dân làng', i: '🧑‍🌾', d: 'Không có kỹ năng đặc biệt. Dùng lý lẽ để tìm và treo cổ Ma sói.' },
  seer:          { t: 'village', n: 'Tiên tri', i: '🔮', d: 'Mỗi đêm soi 1 người để biết vai trò chính xác của họ.', ab: [{ k: 'see', ph: 'night', n: 1, req: 1 }] },
  aura_seer:     { t: 'village', n: 'Thầy bói hào quang', i: '🌈', d: 'Mỗi đêm xem hào quang 1 người: Tốt (phe dân), Ác (sói) hoặc Không rõ (độc lập).', ab: [{ k: 'aura', ph: 'night', n: 1, req: 1 }] },
  doctor:        { t: 'village', n: 'Bác sĩ', i: '💉', d: 'Mỗi đêm bảo vệ 1 người (kể cả bản thân) khỏi bị tấn công.', ab: [{ k: 'protect', ph: 'night', n: 1, req: 1, self: 1 }] },
  bodyguard:     { t: 'village', n: 'Vệ sĩ', i: '🛡️', d: 'Mỗi đêm canh gác 1 người, nếu họ bị tấn công bạn sẽ đỡ thay. Bạn chịu được 1 đòn đầu tiên.', ab: [{ k: 'guard', ph: 'night', n: 1, req: 1 }] },
  witch:         { t: 'village', n: 'Phù thủy', i: '🧪', d: 'Có 1 bình cứu người bị sói cắn và 1 bình độc giết 1 người.', ab: [{ k: 'heal', ph: 'night', n: 0, uses: 1, req: 1 }, { k: 'poison', ph: 'night', n: 1, uses: 1, req: 1 }] },
  avenger:       { t: 'village', n: 'Kẻ báo thù', i: '⚔️', d: 'Chọn 1 người (đổi được bất cứ lúc nào). Khi bạn chết, người đó chết theo.', ab: [{ k: 'mark', ph: 'any', n: 1 }] },
  gunner:        { t: 'village', n: 'Xạ thủ', i: '🔫', d: 'Ban ngày có thể bắn chết 1 người. Có 2 viên đạn, phát súng đầu tiên sẽ làm lộ thân phận.', ab: [{ k: 'shoot', ph: 'day', n: 1, uses: 2 }] },
  mayor:         { t: 'village', n: 'Thị trưởng', i: '🎩', d: 'Ban ngày có thể công khai thân phận, từ đó phiếu treo cổ của bạn tính x2.', ab: [{ k: 'reveal', ph: 'day', n: 0, uses: 1 }] },
  detective:     { t: 'village', n: 'Thám tử', i: '🕵️', d: 'Mỗi đêm chọn 2 người để biết họ cùng phe hay khác phe.', ab: [{ k: 'compare', ph: 'night', n: 2, req: 1 }] },
  priest:        { t: 'village', n: 'Linh mục', i: '✝️', d: 'Ban ngày ném nước thánh vào 1 người (1 lần). Trúng sói thì sói chết, không thì bạn chết.', ab: [{ k: 'water', ph: 'day', n: 1, uses: 1 }] },
  medium:        { t: 'village', n: 'Đồng cốt', i: '🕯️', d: 'Ban đêm trò chuyện với người chết. Có thể hồi sinh 1 người phe dân đã chết (1 lần).', ab: [{ k: 'revive', ph: 'night', n: 1, uses: 1, dead: 1 }] },
  cupid:         { t: 'village', n: 'Thần tình yêu', i: '💘', d: 'Đêm đầu ghép đôi 2 người. Nếu 1 người chết, người kia chết theo vì đau khổ.', ab: [{ k: 'link', ph: 'night', n: 2, uses: 1, req: 1, self: 1, n1: 1 }] },
  tough_guy:     { t: 'village', n: 'Gã cứng đầu', i: '💪', d: 'Sống sót qua lần đầu bị sói cắn, nhưng vết thương khiến bạn chết vào cuối ngày hôm sau.' },
  red_lady:      { t: 'village', n: 'Quý cô áo đỏ', i: '💃', d: 'Mỗi đêm đi thăm 1 người nên không bị tấn công tại nhà. Nhưng thăm phải kẻ xấu hoặc người bị tấn công thì bạn chết.', ab: [{ k: 'visit', ph: 'night', n: 1, req: 1 }] },
  loudmouth:     { t: 'village', n: 'Kẻ lắm mồm', i: '📢', d: 'Chọn 1 người. Khi bạn chết, vai trò của người đó bị công khai cho cả làng.', ab: [{ k: 'mark', ph: 'any', n: 1 }] },
  flower_child:  { t: 'village', n: 'Bé hoa', i: '🌸', d: 'Ban ngày tặng hoa cho 1 người để họ không thể bị treo cổ hôm đó (1 lần).', ab: [{ k: 'flower', ph: 'day', n: 1, uses: 1, self: 1 }] },
  werewolf:      { t: 'wolf', n: 'Ma sói', i: '🐺', d: 'Mỗi đêm cùng bầy sói chọn 1 người để cắn. Ban đêm được chat với đồng bọn.', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }] },
  alpha_werewolf:{ t: 'wolf', n: 'Sói đầu đàn', i: '👑', d: 'Thủ lĩnh bầy sói: phiếu cắn của bạn tính x2.', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }] },
  wolf_seer:     { t: 'wolf', n: 'Sói tiên tri', i: '👁️', d: 'Ngoài việc cắn, mỗi đêm được soi vai trò của 1 người.', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'see', ph: 'night', n: 1, nw: 1 }] },
  junior_werewolf:{ t: 'wolf', n: 'Sói con', i: '🐾', d: 'Chọn 1 người. Khi bạn chết, người đó cũng chết theo.', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'mark', ph: 'any', n: 1, nw: 1 }] },
  wolf_shaman:   { t: 'wolf', n: 'Sói pháp sư', i: '🪄', d: 'Mỗi đêm yểm bùa 1 người để họ hiện là Ma sói trước các thầy bói.', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'enchant', ph: 'night', n: 1 }] },
  nightmare_werewolf:{ t: 'wolf', n: 'Sói ác mộng', i: '😱', d: 'Gieo ác mộng cho 1 người: đêm sau họ ngủ say và không dùng được kỹ năng (2 lần).', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'nightmare', ph: 'night', n: 1, uses: 2, nw: 1 }] },
  fool:          { t: 'solo', n: 'Thằng ngốc', i: '🃏', d: 'Thắng một mình nếu bị dân làng treo cổ.' },
  headhunter:    { t: 'solo', n: 'Thợ săn đầu người', i: '🎯', d: 'Có 1 mục tiêu bí mật. Thắng nếu mục tiêu bị treo cổ. Mục tiêu chết cách khác thì bạn thành Dân làng.' },
  serial_killer: { t: 'solo', n: 'Sát nhân hàng loạt', i: '🔪', d: 'Mỗi đêm giết 1 người. Miễn nhiễm với sói. Thắng khi là người cuối cùng.', ab: [{ k: 'stab', ph: 'night', n: 1, req: 1 }] },
  arsonist:      { t: 'solo', n: 'Kẻ phóng hỏa', i: '🔥', d: 'Mỗi đêm tẩm xăng 2 người hoặc châm lửa thiêu chết tất cả người đã bị tẩm. Thắng khi là người cuối cùng.', ab: [{ k: 'douse', ph: 'night', n: 2, req: 1 }, { k: 'ignite', ph: 'night', n: 0, req: 1 }] },
};

const ABIL = {
  see: ['Soi', '🔮'], aura: ['Xem hào quang', '🌈'], protect: ['Bảo vệ', '💉'], guard: ['Canh gác', '🛡️'], heal: ['Bình cứu', '💚'],
  poison: ['Bình độc', '☠️'], mark: ['Chọn mục tiêu', '🎯'], shoot: ['Bắn', '🔫'], reveal: ['Công khai', '🎩'], compare: ['So sánh', '🕵️'],
  water: ['Nước thánh', '💧'], revive: ['Hồi sinh', '✨'], link: ['Ghép đôi', '💘'], visit: ['Ghé thăm', '💃'], flower: ['Tặng hoa', '🌸'],
  kill: ['Cắn', '🐺'], enchant: ['Yểm bùa', '🪄'], nightmare: ['Ác mộng', '😱'], stab: ['Đâm', '🔪'], douse: ['Tẩm xăng', '⛽'], ignite: ['Châm lửa', '🔥'],
};

// ---------------- avatar items ----------------
const INK = '#2b2027';
const S = (d, c, w = 3) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const F = (d, c, extra = '') => `<path d="${d}" fill="${c}" ${extra}/>`;
const torso = c => F('M38 136 Q36 100 60 95 Q84 100 82 136Z', c);
const arms = c => S('M43 103 Q31 111 31 126', c, 11) + S('M77 103 Q89 111 89 126', c, 11);
const shirt = (c, s = c, more = '') => arms(s) + torso(c) + more;

const SKIN = { s1: '#f8dcc4', s2: '#f1c6a0', s3: '#dca77c', s4: '#b77d52', s5: '#8a5634', s6: '#5e3a22', zombie: '#a9d39b', ghost: '#cfd3f7' };
const HAIRC = { black: '#2a2328', brown: '#6b3e1f', blonde: '#e8c26a', red: '#c4462e', white: '#e9e6ef', pink: '#f08fb8', blue: '#4f7fe0', green: '#4fae6a', purple: '#8e5bd6', silver: '#a7acbd' };

const HAIR = {
  none: { n: 'Trọc', f: () => '' },
  short: { n: 'Ngắn', f: c => F('M28 58 Q24 22 60 20 Q96 22 92 58 Q88 40 74 36 Q62 46 46 38 Q34 42 28 58Z', c) },
  spiky: { n: 'Dựng ngược', f: c => F('M28 58 L22 36 L36 36 L34 16 L48 28 L58 8 L66 28 L82 14 L82 34 L98 34 L92 58 Q84 40 60 40 Q36 40 28 58Z', c) },
  bob: { n: 'Bob', b: c => F('M24 62 Q20 22 60 20 Q100 22 96 62 L96 86 Q86 90 80 82 L40 82 Q34 90 24 86Z', c), f: c => F('M28 54 Q30 24 60 22 Q90 24 92 54 Q76 34 58 42 Q44 36 28 54Z', c) },
  long: { n: 'Dài', b: c => F('M24 58 Q20 20 60 20 Q100 20 96 58 L102 122 Q88 128 82 112 L38 112 Q32 128 18 122Z', c), f: c => F('M28 54 Q30 24 60 22 Q90 24 92 54 Q76 34 58 42 Q44 36 28 54Z', c) },
  ponytail: { n: 'Đuôi ngựa', b: c => F('M84 34 Q116 44 106 100 Q98 84 88 64Z', c), f: c => F('M28 58 Q24 22 60 20 Q96 22 92 58 Q88 40 74 36 Q62 46 46 38 Q34 42 28 58Z', c) },
  bun: { n: 'Búi tó', b: c => `<circle cx="60" cy="18" r="13" fill="${c}"/>`, f: c => F('M28 56 Q28 24 60 22 Q92 24 92 56 Q80 36 60 36 Q40 36 28 56Z', c) },
  mohawk: { n: 'Mohawk', f: c => F('M50 40 L46 10 L60 0 L74 10 L70 40Z', c) },
  curly: { n: 'Xoăn', f: c => [[30, 44], [38, 30], [50, 22], [62, 20], [74, 22], [84, 30], [90, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}"/>`).join('') },
  twintails: { n: 'Hai bím', b: c => `<ellipse cx="20" cy="76" rx="10" ry="24" fill="${c}"/><ellipse cx="100" cy="76" rx="10" ry="24" fill="${c}"/>`, f: c => F('M28 54 Q30 24 60 22 Q90 24 92 54 Q76 34 58 42 Q44 36 28 54Z', c) },
};

const eyePair = f => f(48) + f(72);
const EYES = {
  dot: { n: 'Tròn', f: () => eyePair(x => `<ellipse cx="${x}" cy="62" rx="5.4" ry="6" fill="#fff" stroke="${INK}" stroke-width="1.1"/><circle cx="${x + .6}" cy="62.8" r="3.6" fill="#6b4226"/><circle cx="${x + .6}" cy="62.8" r="1.8" fill="#160f0f"/><circle cx="${x + 1.9}" cy="61" r="1.2" fill="#fff"/>` + S(`M${x - 5.8} 59.6 Q${x} 54.6 ${x + 5.8} 59.6`, INK, 2)) },
  sparkle: { n: 'Lấp lánh', f: () => eyePair(x => `<circle cx="${x}" cy="62" r="6.5" fill="${INK}"/><circle cx="${x + 2}" cy="59.5" r="2.4" fill="#fff"/><circle cx="${x - 2}" cy="64.5" r="1.1" fill="#fff"/>`) },
  happy: { n: 'Vui vẻ', f: () => eyePair(x => S(`M${x - 5} 64 Q${x} 57 ${x + 5} 64`, INK, 3)) },
  closed: { n: 'Nhắm', f: () => eyePair(x => S(`M${x - 5} 61 Q${x} 66 ${x + 5} 61`, INK, 3)) },
  sleepy: { n: 'Buồn ngủ', f: () => eyePair(x => S(`M${x - 5} 62 L${x + 5} 62`, INK, 3) + `<ellipse cx="${x}" cy="64" rx="3" ry="2" fill="${INK}"/>`) },
  angry: { n: 'Giận dữ', f: () => eyePair(x => `<circle cx="${x}" cy="63" r="3.8" fill="${INK}"/>`) + S('M42 53 L54 57', INK, 3) + S('M78 53 L66 57', INK, 3) },
  wink: { n: 'Nháy mắt', f: () => `<ellipse cx="48" cy="62" rx="3.8" ry="4.8" fill="${INK}"/><circle cx="49.3" cy="60.3" r="1.3" fill="#fff"/>` + S('M67 63 Q72 57 77 63', INK, 3) },
  star: { n: 'Ngôi sao', f: () => eyePair(x => `<path d="M${x} 55 l2 5 5 .5 -4 3.5 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3.5 5 -.5Z" fill="#f5b81c" stroke="${INK}" stroke-width=".8"/>`) },
  wolf: { n: 'Mắt sói', f: () => eyePair(x => `<path d="M${x - 7} 62 Q${x} 54 ${x + 7} 62 Q${x} 68 ${x - 7} 62Z" fill="#ffcf3a"/><ellipse cx="${x}" cy="62" rx="1.6" ry="4" fill="#b3001b"/>`) },
  heart: { n: 'Trái tim', f: () => eyePair(x => `<path d="M${x} 67 l-5.5 -5.5 a3 3 0 0 1 5.5 -3.5 a3 3 0 0 1 5.5 3.5Z" fill="#e2445c"/>`) },
};

const MOUTH = {
  smile: { n: 'Cười mỉm', f: () => S('M53 76 Q60 83 67 76', '#7a3b2e', 2.5) },
  grin: { n: 'Cười toe', f: () => F('M51 74 Q60 88 69 74Z', '#7a2a2a') + F('M53 75 L67 75 L66 78 L54 78Z', '#fff') },
  open: { n: 'Há miệng', f: () => `<ellipse cx="60" cy="78" rx="5" ry="6" fill="#7a2a2a"/><ellipse cx="60" cy="81" rx="3.5" ry="2.5" fill="#ef7f86"/>` },
  flat: { n: 'Nghiêm túc', f: () => S('M54 78 L66 78', '#7a3b2e', 2.5) },
  smirk: { n: 'Nhếch mép', f: () => S('M54 78 Q62 80 67 73', '#7a3b2e', 2.5) },
  fangs: { n: 'Răng nanh', f: () => S('M52 76 Q60 82 68 76', '#7a3b2e', 2.5) + F('M54 77 L56 83 L58 78Z M66 77 L64 83 L62 78Z', '#fff', 'stroke="#ccc" stroke-width=".5"') },
  tongue: { n: 'Lè lưỡi', f: () => S('M53 76 Q60 81 67 76', '#7a3b2e', 2.5) + F('M57 78 Q60 87 63 78Z', '#ef7f86') },
  cat: { n: 'Mèo con', f: () => S('M53 75 Q56.5 80 60 75 Q63.5 80 67 75', '#7a3b2e', 2.5) },
  o: { n: 'Ngạc nhiên', f: () => `<circle cx="60" cy="78" r="3.6" fill="none" stroke="#7a3b2e" stroke-width="2.5"/>` },
};

const SHIRT = {
  tee_red: { n: 'Áo thun đỏ', f: () => shirt('#d24b4b') },
  tee_blue: { n: 'Áo thun xanh', f: () => shirt('#3f7fd6') },
  tee_green: { n: 'Áo thun lá', f: () => shirt('#4ea65b') },
  hoodie: { n: 'Áo hoodie', f: () => F('M42 100 Q60 112 78 100 L74 94 Q60 102 46 94Z', '#55596a') + shirt('#6c7186') + F('M48 118 L72 118 L70 130 L50 130Z', '#5a5e72') + S('M55 100 L54 112 M65 100 L66 112', '#ddd', 1.5) },
  suit: { n: 'Vest lịch lãm', f: () => shirt('#262a35') + F('M52 96 L60 116 L68 96Z', '#fff') + F('M58 100 L62 100 L63 118 L60 122 L57 118Z', '#c0392b') },
  armor: { n: 'Giáp hiệp sĩ', f: () => shirt('#aab3c2', '#8d97a8') + S('M42 112 Q60 118 78 112 M41 124 Q60 130 79 124', '#6f7889', 2) + F('M56 98 L64 98 L64 134 L56 134Z', '#d4a43a') },
  pirate: { n: 'Áo hải tặc', f: () => shirt('#f3ede0', '#f3ede0') + F('M40 136 Q38 104 50 98 L50 136Z M80 136 Q82 104 70 98 L70 136Z', '#2b2b33') + F('M40 118 L80 118 L80 124 L40 124Z', '#c0392b') },
  vampire: { n: 'Áo choàng bá tước', f: () => F('M30 136 L36 96 L22 78 L48 92 L60 96 L72 92 L98 78 L84 96 L90 136Z', '#8e1b2a') + shirt('#1d1a24') + F('M52 96 L60 112 L68 96Z', '#fff') + `<circle cx="60" cy="112" r="3" fill="#c0392b"/>` },
  wizard_robe: { n: 'Áo pháp sư', f: () => S('M43 103 Q26 116 28 128', '#3346a8', 16) + S('M77 103 Q94 116 92 128', '#3346a8', 16) + torso('#3d55c9') + F('M56 98 L64 98 L64 136 L56 136Z', '#f2c94c') + `<text x="46" y="122" font-size="9" fill="#f2c94c">✦</text><text x="68" y="130" font-size="7" fill="#f2c94c">✦</text>` },
  ninja: { n: 'Đồ ninja', f: () => shirt('#22283a') + F('M40 116 L80 116 L80 122 L40 122Z', '#c0392b') + S('M50 98 L70 116', '#2f3750', 3) },
  santa: { n: 'Áo ông già Noel', f: () => shirt('#d0312d') + F('M56 96 L64 96 L64 136 L56 136Z', '#fff') + F('M39 116 L81 116 L81 123 L39 123Z', '#222') + F('M55 115 L65 115 L65 124 L55 124Z', '#f2c94c') },
  royal: { n: 'Hoàng bào', f: () => shirt('#6a2fa0') + F('M38 100 Q60 112 82 100 L80 108 Q60 120 40 108Z', '#fff') + [44, 52, 60, 68, 76].map(x => `<circle cx="${x}" cy="${x === 60 ? 113 : 109}" r="1.3" fill="#222"/>`).join('') },
  chef: { n: 'Áo đầu bếp', f: () => shirt('#f7f7f7', '#eee') + [104, 114, 124].map(y => `<circle cx="54" cy="${y}" r="1.8" fill="#bbb"/><circle cx="66" cy="${y}" r="1.8" fill="#bbb"/>`).join('') + F('M50 96 L60 104 L70 96Z', '#d24b4b') },
  detective: { n: 'Áo khoác thám tử', f: () => shirt('#9a7448') + F('M48 96 L60 120 L72 96 L66 96 L60 108 L54 96Z', '#7a5a34') + S('M40 120 L80 120', '#6b4b2a', 3) },
  priest: { n: 'Áo linh mục', f: () => shirt('#1f1f26') + F('M54 96 L66 96 L66 101 L54 101Z', '#fff') + F('M58 108 L62 108 L62 124 L58 124Z M54 112 L66 112 L66 116 L54 116Z', '#e2c25a') },
  overalls: { n: 'Quần yếm nông dân', f: () => shirt('#d8574a') + S('M44 102 L48 136 M72 102 L76 136', '#d8574a', 1) + F('M46 112 L74 112 L78 136 L42 136Z', '#3f6fb5') + S('M48 112 L46 98 M72 112 L74 98', '#3f6fb5', 4) },
  sailor: { n: 'Áo thủy thủ', f: () => shirt('#fafafa', '#fafafa') + F('M42 98 L60 114 L78 98 L74 96 L60 106 L46 96Z', '#2f4fa3') + F('M56 112 L60 118 L64 112 L60 108Z', '#d0312d') },
  witch_dress: { n: 'Váy phù thủy', f: () => shirt('#5b2d82') + F('M40 136 L44 112 L76 112 L80 136Z', '#43206a') + F('M40 112 L80 112 L80 116 L40 116Z', '#2fd17a') },
  pumpkin_suit: { n: 'Bộ đồ bí ngô', f: () => shirt('#f08a24', '#e07a14') + F('M50 114 L54 108 L58 114Z M62 114 L66 108 L70 114Z', '#3a2210') + F('M50 122 Q60 132 70 122 L66 124 L62 121 L58 124 L54 121Z', '#3a2210') },
  angel_robe: { n: 'Áo thiên thần', f: () => S('M43 103 Q28 116 30 128', '#fdfbf3', 15) + S('M77 103 Q92 116 90 128', '#fdfbf3', 15) + torso('#ffffff') + F('M40 118 L80 118 L80 121 L40 121Z', '#f2c94c') },
};

const HAT = {
  none: { n: 'Không', f: () => '' },
  crown: { n: 'Vương miện', f: () => F('M34 32 L38 8 L49 22 L60 2 L71 22 L82 8 L86 32Z', '#f5c430', 'stroke="#b8860b" stroke-width="1.5"') + `<circle cx="60" cy="24" r="3.5" fill="#d0312d"/><circle cx="45" cy="27" r="2.5" fill="#2f80ed"/><circle cx="75" cy="27" r="2.5" fill="#27ae60"/>` },
  wizard: { n: 'Mũ pháp sư', f: () => `<ellipse cx="60" cy="32" rx="38" ry="7" fill="#2c3d9e"/>` + F('M36 32 Q50 0 70 -10 Q76 -2 74 4 Q78 16 84 32Z', '#3d55c9') + `<text x="54" y="22" font-size="11" fill="#f2c94c">★</text>` },
  tricorn: { n: 'Mũ hải tặc', f: () => F('M20 36 Q36 8 60 8 Q84 8 100 36 Q60 24 20 36Z', '#222') + S('M24 34 Q60 22 96 34', '#d4a43a', 2.5) + `<circle cx="60" cy="20" r="5" fill="#fff"/><path d="M57 21 h6 M58 25 l4 -3" stroke="#222" stroke-width="1.2"/>` },
  witch: { n: 'Mũ phù thủy', f: () => `<ellipse cx="60" cy="32" rx="40" ry="7" fill="#1d1626"/>` + F('M38 32 Q46 10 62 -8 Q70 -2 80 -2 Q70 4 70 12 Q76 24 82 32Z', '#2b2238') + F('M39 27 L81 27 L82 32 L38 32Z', '#9b4fd1') },
  santa: { n: 'Mũ Noel', f: () => F('M30 34 Q40 0 70 2 Q90 6 100 28 L92 30 Q84 14 74 14 Q86 26 88 34Z', '#d0312d') + `<rect x="27" y="28" width="66" height="10" rx="5" fill="#fff"/><circle cx="98" cy="30" r="7" fill="#fff"/>` },
  tophat: { n: 'Mũ chóp cao', f: () => `<ellipse cx="60" cy="30" rx="32" ry="6" fill="#16161c"/><rect x="40" y="-2" width="40" height="32" rx="3" fill="#22222b"/><rect x="40" y="20" width="40" height="6" fill="#b3263a"/>` },
  cowboy: { n: 'Mũ cao bồi', f: () => F('M14 32 Q20 40 60 38 Q100 40 106 32 Q96 26 84 30 Q84 8 72 10 Q60 16 48 10 Q36 8 36 30 Q24 26 14 32Z', '#a0703a') + F('M37 26 L83 26 L84 30 L36 30Z', '#5c3b1a') },
  chef: { n: 'Mũ đầu bếp', f: () => `<rect x="38" y="20" width="44" height="14" rx="3" fill="#fff" stroke="#ddd"/>` + [44, 60, 76].map(x => `<circle cx="${x}" cy="12" r="13" fill="#fff" stroke="#e3e3e3"/>`).join('') },
  bunny: { n: 'Tai thỏ', f: () => `<ellipse cx="44" cy="8" rx="8" ry="22" fill="#fff" transform="rotate(-12 44 8)"/><ellipse cx="44" cy="8" rx="4" ry="16" fill="#f7a6c4" transform="rotate(-12 44 8)"/><ellipse cx="76" cy="8" rx="8" ry="22" fill="#fff" transform="rotate(12 76 8)"/><ellipse cx="76" cy="8" rx="4" ry="16" fill="#f7a6c4" transform="rotate(12 76 8)"/>` },
  horns: { n: 'Sừng quỷ', f: () => F('M38 32 Q26 18 30 4 Q38 20 48 26Z M82 32 Q94 18 90 4 Q82 20 72 26Z', '#c0262d') },
  halo: { n: 'Vầng hào quang', f: () => `<ellipse cx="60" cy="10" rx="24" ry="6" fill="none" stroke="#ffd84a" stroke-width="5"/><ellipse cx="60" cy="10" rx="24" ry="6" fill="none" stroke="#fff6c2" stroke-width="1.5"/>` },
  headband: { n: 'Băng đô ninja', f: () => `<rect x="27" y="40" width="66" height="9" rx="3" fill="#c0392b"/><rect x="50" y="40" width="20" height="9" fill="#aab3c2"/>` + F('M92 42 Q106 46 110 58 Q100 50 92 49Z', '#c0392b') },
  helmet: { n: 'Mũ giáp', f: () => F('M24 66 Q20 16 60 14 Q100 16 96 66 L86 66 Q86 44 60 42 Q34 44 34 66Z', '#aab3c2', 'stroke="#6f7889" stroke-width="2"') + F('M58 4 Q66 -6 76 2 Q68 6 62 14Z', '#c0392b') },
  flowers: { n: 'Vòng hoa', f: () => [[32, 38, '#f78fb3'], [42, 28, '#fff07a'], [54, 22, '#f78fb3'], [66, 22, '#9be3ff'], [78, 28, '#fff07a'], [88, 38, '#f78fb3']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/><circle cx="${x}" cy="${y}" r="2" fill="#e8a33a"/>`).join('') },
  deerstalker: { n: 'Mũ thám tử', f: () => F('M26 40 Q24 14 60 12 Q96 14 94 40Z', '#9a7448') + S('M30 30 L90 30 M34 20 L86 20 M50 13 L48 40 M70 13 L72 40', '#7a5a34', 1.5) + F('M22 40 L44 36 L40 46Z M98 40 L76 36 L80 46Z', '#7a5a34') },
  pumpkin: { n: 'Mũ bí ngô', f: () => `<ellipse cx="60" cy="22" rx="30" ry="18" fill="#f08a24"/><ellipse cx="60" cy="22" rx="12" ry="18" fill="#e07a14"/>` + F('M58 4 Q60 -6 68 -6 L64 6Z', '#4e8a3a') + F('M46 20 L50 14 L54 20Z M66 20 L70 14 L74 20Z', '#3a2210') },
  beanie: { n: 'Mũ len', f: () => F('M26 44 Q26 12 60 10 Q94 12 94 44Z', '#3f9b8f') + `<rect x="24" y="38" width="72" height="10" rx="4" fill="#2e7a70"/><circle cx="60" cy="8" r="7" fill="#f2e2c4"/>` },
  cat_ears: { n: 'Tai mèo', f: () => F('M30 40 L32 12 L52 28Z M90 40 L88 12 L68 28Z', '#2a2328') + F('M35 34 L36 20 L46 29Z M85 34 L84 20 L74 29Z', '#f7a6c4') },
  wolf_ears: { n: 'Tai sói', f: () => F('M28 42 L28 6 L52 28Z M92 42 L92 6 L68 28Z', '#6d7382') + F('M33 34 L33 16 L45 28Z M87 34 L87 16 L75 28Z', '#c98a8a') },
  strawhat: { n: 'Nón rơm', f: () => `<ellipse cx="60" cy="32" rx="40" ry="8" fill="#d9a441"/>` + F('M38 32 Q40 8 60 8 Q80 8 82 32Z', '#efc35a') + `<rect x="38" y="25" width="44" height="5" fill="#b5462e"/>` },
};

const GLASSES = {
  none: { n: 'Không', f: () => '' },
  round: { n: 'Kính tròn', f: () => `<circle cx="48" cy="62" r="8" fill="rgba(200,230,255,.25)" stroke="${INK}" stroke-width="2"/><circle cx="72" cy="62" r="8" fill="rgba(200,230,255,.25)" stroke="${INK}" stroke-width="2"/>` + S('M56 62 L64 62', INK, 2) },
  sunglasses: { n: 'Kính râm', f: () => F('M38 57 L58 57 L56 68 Q48 72 40 67Z M62 57 L82 57 L80 67 Q72 72 64 68Z', '#111') + S('M58 59 L62 59', '#111', 2) + S('M42 59 L48 59 M66 59 L72 59', '#666', 1.5) },
  monocle: { n: 'Kính một mắt', f: () => `<circle cx="72" cy="62" r="8" fill="rgba(255,255,255,.2)" stroke="#d4a43a" stroke-width="2"/>` + S('M80 64 Q86 80 82 92', '#d4a43a', 1) },
  heart: { n: 'Kính trái tim', f: () => eyePair(x => `<path d="M${x} 70 l-9 -8 a5 5 0 0 1 9 -6 a5 5 0 0 1 9 6Z" fill="rgba(255,90,140,.55)" stroke="#e2445c" stroke-width="2"/>`) },
  star: { n: 'Kính ngôi sao', f: () => eyePair(x => `<path d="M${x} 52 l3 7 7 .6 -5.5 4.6 1.8 7 -6.3 -3.8 -6.3 3.8 1.8 -7 -5.5 -4.6 7 -.6Z" fill="rgba(255,215,60,.5)" stroke="#e0a800" stroke-width="1.6"/>`) },
  eyepatch: { n: 'Bịt mắt', f: () => `<ellipse cx="48" cy="62" rx="8" ry="7" fill="#111"/>` + S('M30 50 L90 70', '#111', 2) },
  goggles: { n: 'Kính bảo hộ', f: () => `<rect x="34" y="54" width="52" height="16" rx="8" fill="#6b4423"/><circle cx="48" cy="62" r="6.5" fill="#8fd3ff"/><circle cx="72" cy="62" r="6.5" fill="#8fd3ff"/>` },
  nerd: { n: 'Kính cận', f: () => `<rect x="39" y="55" width="18" height="14" rx="3" fill="none" stroke="#111" stroke-width="3"/><rect x="63" y="55" width="18" height="14" rx="3" fill="none" stroke="#111" stroke-width="3"/>` + S('M57 60 L63 60', '#111', 3) },
};

const MASK = {
  none: { n: 'Không', f: () => '' },
  ninja: { n: 'Khăn che mặt', f: () => F('M30 70 Q32 92 60 92 Q88 92 90 70 Q76 68 60 68 Q44 68 30 70Z', '#22283a') },
  masquerade: { n: 'Mặt nạ dạ hội', f: () => F('M34 58 Q48 50 60 60 Q72 50 86 58 Q84 72 72 70 Q64 68 60 64 Q56 68 48 70 Q36 72 34 58Z', '#7a2a8a') + `<circle cx="48" cy="62" r="3.5" fill="${INK}"/><circle cx="72" cy="62" r="3.5" fill="${INK}"/>` + F('M84 56 Q96 40 92 30 Q88 46 80 54Z', '#f2c94c') },
  medical: { n: 'Khẩu trang', f: () => F('M38 70 L82 70 Q82 90 60 90 Q38 90 38 70Z', '#cfe8f7') + S('M38 72 L28 64 M82 72 L92 64', '#cfe8f7', 1.5) + S('M42 78 L78 78 M44 84 L76 84', '#a9cfe6', 1) },
  mustache: { n: 'Ria mép', f: () => F('M60 72 Q52 66 44 72 Q40 76 36 72 Q40 80 50 76 Q56 74 60 76 Q64 74 70 76 Q80 80 84 72 Q80 76 76 72 Q68 66 60 72Z', '#4a2c18') },
  beard: { n: 'Râu quai nón', f: () => F('M28 62 Q28 100 60 102 Q92 100 92 62 Q86 82 72 82 Q66 74 60 74 Q54 74 48 82 Q34 82 28 62Z', '#6b3e1f') },
  beard_white: { n: 'Râu trắng', f: () => F('M28 62 Q26 108 60 116 Q94 108 92 62 Q86 82 72 82 Q66 74 60 74 Q54 74 48 82 Q34 82 28 62Z', '#f4f1ea', 'stroke="#ddd"') },
};

const FG = {
  none: { n: 'Không', f: () => '' },
  sword: { n: 'Kiếm', f: () => `<rect x="87" y="66" width="6" height="52" rx="2" fill="#dfe6ee" stroke="#9aa5b4"/><rect x="80" y="116" width="20" height="5" rx="2" fill="#d4a43a"/><rect x="87.5" y="120" width="5" height="12" fill="#6b4423"/>` },
  wand: { n: 'Đũa phép', f: () => S('M88 128 L100 92', '#5c3b1a', 4) + `<path d="M100 78 l3 7 7 1 -5 5 1.5 7 -6.5 -3.5 -6.5 3.5 1.5 -7 -5 -5 7 -1Z" fill="#ffd84a"/>` },
  lantern: { n: 'Đèn lồng', f: () => S('M89 126 L89 108', '#444', 2) + `<rect x="80" y="108" width="18" height="22" rx="4" fill="#ffcf5a" stroke="#6b4423" stroke-width="3"/><circle cx="89" cy="119" r="10" fill="#ffd84a" opacity=".35"/>` },
  pumpkin_bucket: { n: 'Giỏ kẹo bí ngô', f: () => S('M80 116 Q89 100 98 116', '#333', 2) + `<ellipse cx="89" cy="126" rx="12" ry="10" fill="#f08a24"/>` + F('M83 124 L86 120 L89 124Z M89 124 L92 120 L95 124Z M83 129 Q89 134 95 129Z', '#3a2210') },
  book: { n: 'Sách phép', f: () => `<rect x="78" y="112" width="22" height="26" rx="2" fill="#7a2a8a"/><rect x="80" y="114" width="18" height="22" fill="#9b4fd1"/><text x="85" y="130" font-size="11" fill="#f2c94c">✦</text>` },
  bouquet: { n: 'Bó hoa', f: () => F('M84 128 L94 128 L89 140Z', '#5fae5a') + [[84, 118, '#f78fb3'], [94, 118, '#fff07a'], [89, 110, '#e2445c']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/>`).join('') },
  shield: { n: 'Khiên', f: () => F('M18 104 L44 104 Q44 132 31 140 Q18 132 18 104Z', '#3f6fb5', 'stroke="#d4a43a" stroke-width="2.5"') + F('M29 110 L33 110 L33 132 L29 132Z M22 118 L40 118 L40 122 L22 122Z', '#f2c94c') },
  candy_cane: { n: 'Kẹo gậy', f: () => S('M90 138 L90 100 Q90 90 98 90 Q106 90 106 98', '#fff', 6) + S('M90 136 L90 130 M90 122 L90 116 M90 108 L90 102 M94 91 L98 90', '#d0312d', 6) },
  potion: { n: 'Bình thuốc', f: () => `<rect x="86" y="104" width="6" height="8" fill="#c9b7a0"/><circle cx="89" cy="120" r="10" fill="#53d36a"/><circle cx="85" cy="116" r="2.5" fill="#c9ffd2"/>` },
  pitchfork: { n: 'Cây chĩa', f: () => S('M90 138 L90 72', '#8b5a2b', 4) + S('M82 72 L82 84 Q90 90 98 84 L98 72 M90 72 L90 86', '#9aa5b4', 3) },
  teddy: { n: 'Gấu bông', f: () => `<circle cx="84" cy="106" r="5" fill="#a0703a"/><circle cx="96" cy="106" r="5" fill="#a0703a"/><circle cx="90" cy="114" r="9" fill="#b98250"/><ellipse cx="90" cy="130" rx="10" ry="11" fill="#b98250"/><circle cx="87" cy="113" r="1.4" fill="#222"/><circle cx="93" cy="113" r="1.4" fill="#222"/><ellipse cx="90" cy="117" rx="3" ry="2" fill="#e8c9a0"/>` },
  balloon: { n: 'Bóng bay', f: () => S('M89 126 Q94 100 98 76', '#888', 1) + `<ellipse cx="98" cy="62" rx="12" ry="15" fill="#e2445c"/><ellipse cx="94" cy="56" rx="3" ry="5" fill="#ff9aa8"/>` },
  torch: { n: 'Đuốc', f: () => S('M89 138 L92 100', '#6b4423', 5) + F('M92 100 Q80 86 92 70 Q90 82 98 86 Q104 94 92 100Z', '#ff8a1c') + F('M92 98 Q86 90 92 80 Q94 90 97 92Z', '#ffe36e') },
};

const BG = {
  none: { n: 'Không', f: () => '' },
  angel_wings: { n: 'Cánh thiên thần', f: () => F('M44 104 Q10 70 4 100 Q14 104 8 116 Q22 116 18 128 Q34 124 44 116Z', '#fff', 'stroke="#ddd"') + F('M76 104 Q110 70 116 100 Q106 104 112 116 Q98 116 102 128 Q86 124 76 116Z', '#fff', 'stroke="#ddd"') },
  bat_wings: { n: 'Cánh dơi', f: () => F('M44 104 Q20 72 2 84 Q10 96 6 108 Q16 102 20 114 Q28 106 34 118 Q38 108 44 114Z', '#2a1d36') + F('M76 104 Q100 72 118 84 Q110 96 114 108 Q104 102 100 114 Q92 106 86 118 Q82 108 76 114Z', '#2a1d36') },
  moon: { n: 'Trăng tròn', f: () => `<circle cx="96" cy="18" r="16" fill="#f5ecc8"/><circle cx="90" cy="14" r="3" fill="#e2d6a6"/><circle cx="100" cy="24" r="2" fill="#e2d6a6"/>` },
  sparkles: { n: 'Lấp lánh', f: () => [[14, 40, 8], [104, 50, 10], [20, 110, 6], [100, 120, 7], [96, 14, 6]].map(([x, y, s]) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="#ffe36e"/>`).join('') },
  flames: { n: 'Hào quang lửa', f: () => F('M20 140 Q6 100 22 70 Q24 90 34 92 Q30 60 50 40 Q50 66 60 70 Q70 40 86 44 Q76 70 88 86 Q100 74 98 60 Q118 96 100 140Z', '#ff6a1c', 'opacity=".75"') + F('M30 140 Q22 112 34 92 Q38 108 46 108 Q46 84 60 74 Q62 96 72 100 Q80 88 86 90 Q96 110 90 140Z', '#ffc23a', 'opacity=".8"') },
  cape: { n: 'Áo choàng đỏ', f: () => F('M42 98 Q28 120 26 148 L94 148 Q92 120 78 98Z', '#b3263a') },
  hearts: { n: 'Trái tim bay', f: () => [[16, 50, 7], [102, 40, 9], [24, 96, 5], [104, 104, 6]].map(([x, y, s]) => `<path d="M${x} ${y + s} l-${s} -${s} a${s / 2} ${s / 2} 0 0 1 ${s} -${s * .7} a${s / 2} ${s / 2} 0 0 1 ${s} ${s * .7}Z" fill="#ff6b8b"/>`).join('') },
  flag: { n: 'Cờ chiến', f: () => S('M14 148 L14 20', '#6b4423', 3) + F('M15 22 L46 30 L15 40Z', '#d0312d') },
};

const GRAVE = {
  stone: { n: 'Bia đá', f: () => F('M30 150 L30 92 Q30 66 60 66 Q90 66 90 92 L90 150Z', '#8e93a3', 'stroke="#5d6271" stroke-width="2"') + `<text x="60" y="104" text-anchor="middle" font-size="13" font-weight="800" fill="#4a4e5c">RIP</text>` },
  cross: { n: 'Thánh giá', f: () => F('M54 150 L54 98 L38 98 L38 86 L54 86 L54 66 L66 66 L66 86 L82 86 L82 98 L66 98 L66 150Z', '#b9bdc8', 'stroke="#6f7380" stroke-width="2"') },
  wolf: { n: 'Bia sói', f: () => F('M30 150 L30 92 Q30 66 60 66 Q90 66 90 92 L90 150Z', '#6d6577', 'stroke="#463f50" stroke-width="2"') + F('M44 100 L44 82 L52 92 L60 88 L68 92 L76 82 L76 100 Q70 114 60 116 Q50 114 44 100Z', '#3b3445') + `<circle cx="54" cy="98" r="2" fill="#ffcf3a"/><circle cx="66" cy="98" r="2" fill="#ffcf3a"/>` },
  pumpkin: { n: 'Bí ngô ma', f: () => `<ellipse cx="60" cy="124" rx="32" ry="26" fill="#f08a24"/><ellipse cx="60" cy="124" rx="12" ry="26" fill="#e07a14"/>` + F('M44 118 L50 108 L56 118Z M64 118 L70 108 L76 118Z M44 132 Q60 144 76 132 L70 134 L64 130 L58 134 L52 130Z', '#3a2210') + F('M58 98 Q60 88 68 88 L64 100Z', '#4e8a3a') },
  crystal: { n: 'Pha lê', f: () => F('M60 64 L84 96 L74 150 L46 150 L36 96Z', '#8fd3ff', 'stroke="#4aa3d8" stroke-width="2" opacity=".9"') + F('M60 64 L66 96 L60 150 L54 96Z', '#d6f1ff', 'opacity=".7"') },
  coffin: { n: 'Quan tài', f: () => F('M48 64 L72 64 L84 84 L76 150 L44 150 L36 84Z', '#5a3a26', 'stroke="#2f1d12" stroke-width="2"') + F('M57 90 L63 90 L63 120 L57 120Z M50 98 L70 98 L70 104 L50 104Z', '#d4a43a') },
  angel: { n: 'Tượng thiên thần', f: () => F('M30 150 L36 110 L84 110 L90 150Z', '#d8dbe3') + `<circle cx="60" cy="86" r="12" fill="#e9ebf0"/><ellipse cx="60" cy="70" rx="10" ry="3" fill="none" stroke="#ffd84a" stroke-width="2.5"/>` + F('M48 110 Q30 90 26 104 Q34 108 48 116Z M72 110 Q90 90 94 104 Q86 108 72 116Z', '#f4f5f8') },
};

const ITEMS = { skin: SKIN, hairColor: HAIRC, hair: HAIR, eyes: EYES, mouth: MOUTH, shirt: SHIRT, hat: HAT, glasses: GLASSES, mask: MASK, fg: FG, bg: BG, grave: GRAVE };
const SLOTS = [
  ['skin', 'Màu da'], ['hair', 'Kiểu tóc'], ['hairColor', 'Màu tóc'], ['eyes', 'Mắt'], ['mouth', 'Miệng'], ['shirt', 'Áo'],
  ['hat', 'Mũ'], ['glasses', 'Kính'], ['mask', 'Mặt nạ'], ['fg', 'Vật cầm tay'], ['bg', 'Hậu cảnh'], ['grave', 'Bia mộ'],
];

// Outfit sets: one click equips the whole look
const SETS = {
  knight:   { n: 'Hiệp sĩ Bóng đêm', a: { hat: 'helmet', shirt: 'armor', fg: 'sword', bg: 'cape', grave: 'cross', eyes: 'angry', mouth: 'flat' } },
  pirate:   { n: 'Hải tặc Biển sâu', a: { hat: 'tricorn', shirt: 'pirate', glasses: 'eyepatch', fg: 'sword', bg: 'flag', mask: 'mustache', grave: 'coffin' } },
  vampire:  { n: 'Bá tước Ma cà rồng', a: { hair: 'short', hairColor: 'black', skin: 'ghost', eyes: 'wolf', mouth: 'fangs', shirt: 'vampire', bg: 'bat_wings', hat: 'none', grave: 'coffin' } },
  wizard:   { n: 'Pháp sư Ánh sao', a: { hat: 'wizard', shirt: 'wizard_robe', mask: 'beard_white', fg: 'wand', bg: 'sparkles', grave: 'crystal' } },
  witch:    { n: 'Phù thủy Rừng đêm', a: { hat: 'witch', hair: 'long', hairColor: 'purple', shirt: 'witch_dress', fg: 'potion', bg: 'moon', mouth: 'smirk' } },
  santa:    { n: 'Ông già Noel', a: { hat: 'santa', shirt: 'santa', mask: 'beard_white', fg: 'candy_cane', bg: 'sparkles', eyes: 'happy' } },
  halloween:{ n: 'Lễ hội Bí ngô', a: { hat: 'pumpkin', shirt: 'pumpkin_suit', fg: 'pumpkin_bucket', bg: 'bat_wings', grave: 'pumpkin', mouth: 'grin' } },
  ninja:    { n: 'Ninja Lá', a: { hat: 'headband', shirt: 'ninja', mask: 'ninja', fg: 'sword', eyes: 'angry', bg: 'none' } },
  royal:    { n: 'Hoàng gia', a: { hat: 'crown', shirt: 'royal', glasses: 'monocle', bg: 'cape', fg: 'none', mouth: 'smirk', grave: 'angel' } },
  detective:{ n: 'Thám tử Sương mù', a: { hat: 'deerstalker', shirt: 'detective', glasses: 'monocle', fg: 'lantern', mask: 'none' } },
  angel:    { n: 'Thiên thần', a: { hat: 'halo', shirt: 'angel_robe', bg: 'angel_wings', fg: 'bouquet', hair: 'long', hairColor: 'blonde', eyes: 'sparkle', grave: 'angel' } },
  wolffan:  { n: 'Fan Ma sói', a: { hat: 'wolf_ears', shirt: 'hoodie', eyes: 'wolf', mouth: 'fangs', bg: 'moon', grave: 'wolf', hairColor: 'silver' } },
  farmer:   { n: 'Nông dân', a: { hat: 'strawhat', shirt: 'overalls', fg: 'pitchfork', mask: 'none', eyes: 'happy' } },
  chef:     { n: 'Đầu bếp', a: { hat: 'chef', shirt: 'chef', mask: 'mustache', fg: 'none', mouth: 'smile' } },
};

const DEFAULT_AVATAR = { skin: 's2', hair: 'short', hairColor: 'brown', eyes: 'dot', mouth: 'smile', shirt: 'tee_blue', hat: 'none', glasses: 'none', mask: 'none', fg: 'none', bg: 'none', grave: 'stone' };

function cleanAvatar(a) {
  const out = { ...DEFAULT_AVATAR };
  for (const k of Object.keys(ITEMS)) if (a && Object.prototype.hasOwnProperty.call(ITEMS[k], a[k])) out[k] = a[k];
  return out;
}
function randomAvatar() {
  const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  // one coherent outfit set over a friendly face, so random looks never stack face covers
  const any = a => a[Math.floor(Math.random() * a.length)];
  const face = { skin: any(['s1', 's2', 's3', 's4', 's5', 's6']), hair: any(['short', 'bob', 'long', 'ponytail', 'bun', 'curly', 'twintails', 'spiky']),
    hairColor: pick(HAIRC), eyes: any(['dot', 'dot', 'happy', 'sparkle', 'wink']), mouth: any(['smile', 'grin', 'smirk', 'open', 'cat']), grave: pick(GRAVE) };
  return { ...DEFAULT_AVATAR, ...face, ...SETS[pick(SETS)].a };
}

const VB = 'viewBox="0 -12 120 172"';
// bust: head and chest only, the framing used inside player tiles
const VB_BUST = 'viewBox="-6 -14 132 132" preserveAspectRatio="xMidYMax meet"';
const BROWS = { angry: 1, wolf: 1, closed: 1, sleepy: 1 };
const NO_SHINE = { none: 1, curly: 1, mohawk: 1 };
// multiply a #rrggbb colour: f < 1 darkens (shadows), f > 1 lightens (highlights)
const shade = (hex, f) => '#' + hex.slice(1).match(/../g).map(h => Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * f))).toString(16).padStart(2, '0')).join('');
function avatarSvg(a, cls = '', bust = false) {
  a = cleanAvatar(a);
  const skin = SKIN[a.skin], hc = HAIRC[a.hairColor], hair = HAIR[a.hair], dark = shade(skin, .8);
  return `<svg class="avatar ${cls}" ${bust ? VB_BUST : VB} xmlns="http://www.w3.org/2000/svg">` +
    BG[a.bg].f() + (hair.b ? hair.b(hc) : '') +
    `<rect x="47" y="128" width="10" height="20" rx="4" fill="#3b3550"/><rect x="63" y="128" width="10" height="20" rx="4" fill="#3b3550"/>` +
    `<ellipse cx="51" cy="150" rx="8" ry="4.5" fill="#2a2430"/><ellipse cx="69" cy="150" rx="8" ry="4.5" fill="#2a2430"/>` +
    F('M51 78 L51 99 Q60 103 69 99 L69 78Z', shade(skin, .86)) +
    SHIRT[a.shirt].f() + F('M60 96 Q83 100 82 136 L60 136Z', '#000', 'opacity=".08"') +
    `<circle cx="31" cy="128" r="5.5" fill="${skin}"/><circle cx="89" cy="128" r="5.5" fill="${skin}"/>` +
    `<circle cx="28" cy="62" r="6.5" fill="${skin}"/><circle cx="92" cy="62" r="6.5" fill="${skin}"/>` + S('M26 59 Q30 60 29 65', dark, 1.8) + S('M94 59 Q90 60 91 65', dark, 1.8) +
    F('M28 56 Q28 24 60 24 Q92 24 92 56 Q92 80 76 87 Q60 93 44 87 Q28 80 28 56Z', skin, `stroke="${dark}" stroke-width="1.2"`) +
    F('M33 70 Q38 84 52 89 Q41 86 35 78Z', shade(skin, .9)) +
    `<ellipse cx="40" cy="73" rx="5" ry="3.4" fill="#f08a8a" opacity=".4"/><ellipse cx="80" cy="73" rx="5" ry="3.4" fill="#f08a8a" opacity=".4"/>` +
    S('M58.5 66 Q60.5 70.5 63 67.5', shade(skin, .68), 2) +
    EYES[a.eyes].f() + (BROWS[a.eyes] ? '' : S('M42 52 Q48 49 54 52', shade(hc, .8), 2.6) + S('M66 52 Q72 49 78 52', shade(hc, .8), 2.6)) +
    MOUTH[a.mouth].f() + hair.f(hc) +
    (NO_SHINE[a.hair] ? '' : `<path d="M40 37 Q50 29 63 30" stroke="${shade(hc, 1.45)}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".6"/>`) +
    MASK[a.mask].f() + GLASSES[a.glasses].f() + HAT[a.hat].f() + FG[a.fg].f() +
    `</svg>`;
}
const graveSvg = (key, cls = '', bust = false) => `<svg class="avatar ${cls}" ${bust ? 'viewBox="-6 30 132 132" preserveAspectRatio="xMidYMax meet"' : VB}>${(GRAVE[key] || GRAVE.stone).f()}</svg>`;
// a single slot item rendered alone, for wardrobe thumbnails
function itemSvg(slot, key) {
  if (slot === 'grave') return graveSvg(key);
  const a = { ...DEFAULT_AVATAR, [slot]: key };
  if (slot === 'hairColor') a.hair = 'long';
  return avatarSvg(a);
}

const AV = { TEAM, ROLES, ABIL, ITEMS, SLOTS, SETS, DEFAULT_AVATAR, cleanAvatar, randomAvatar, avatarSvg, graveSvg, itemSvg };
if (typeof module !== 'undefined' && module.exports) module.exports = AV; else root.AV = AV;
})(this);
