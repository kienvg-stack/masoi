// Shared by server (require) and browser (<script>): roles, abilities, avatar items + SVG renderer
(function (root) {
const TEAM = { village: { n: 'Phe dân', c: '#3fa65a' }, wolf: { n: 'Phe sói', c: '#d0453f' }, solo: { n: 'Độc lập', c: '#d9a521' } };

// ab: k=kind, ph=night|day|any, n=targets, uses=limit, req=must act (or pass) before night can end early,
// self=can target self, dead=targets dead players, n1=first night only, nw=cannot target wolves
const ROLES = {
  villager:      { t: 'village', n: 'Dân làng', i: '🧑‍🌾', d: 'Không có kỹ năng đặc biệt. Dùng lý lẽ để tìm và treo cổ Ma sói.' },
  seer:          { t: 'village', n: 'Tiên tri', i: '🔮', d: 'Mỗi đêm soi 1 người để biết vai trò chính xác của họ.', ab: [{ k: 'see', ph: 'night', n: 1, req: 1 }] },
  aura_seer:     { t: 'village', n: 'Thầy bói hào quang', i: '🌈', d: 'Mỗi đêm xem hào quang 1 người: Tốt (phe dân), Ác (sói) hoặc Không rõ (độc lập).', ab: [{ k: 'aura', ph: 'night', n: 1, req: 1 }] },
  doctor:        { t: 'village', n: 'Bác sĩ', i: '💉', d: 'Mỗi đêm bảo vệ 1 người (kể cả bản thân) khỏi bị sói và sát nhân tấn công. Không chặn được lửa, bom và thuốc độc.', ab: [{ k: 'protect', ph: 'night', n: 1, req: 1, self: 1 }] },
  bodyguard:     { t: 'village', n: 'Vệ sĩ', i: '🛡️', d: 'Mỗi đêm canh gác 1 người, nếu họ bị tấn công bạn sẽ đỡ thay. Bạn chịu được 1 đòn đầu tiên.', ab: [{ k: 'guard', ph: 'night', n: 1, req: 1 }] },
  witch:         { t: 'village', n: 'Phù thủy', i: '🧪', d: 'Có 1 bình cứu người bị sói cắn và 1 bình độc giết 1 người. Không được dùng bình độc trong đêm đầu tiên.', ab: [{ k: 'heal', ph: 'night', n: 0, uses: 1, req: 1 }, { k: 'poison', ph: 'night', n: 1, uses: 1, req: 1, not1: 1 }] },
  avenger:       { t: 'village', n: 'Kẻ báo thù', i: '⚔️', d: 'Chọn 1 người (đổi được bất cứ lúc nào). Khi bạn chết, người đó chết theo.', ab: [{ k: 'mark', ph: 'any', n: 1 }] },
  gunner:        { t: 'village', n: 'Xạ thủ', i: '🔫', d: 'Ban ngày có thể bắn chết 1 người. Có 2 viên đạn, phát súng đầu tiên sẽ làm lộ thân phận.', ab: [{ k: 'shoot', ph: 'day', n: 1, uses: 2 }] },
  mayor:         { t: 'village', n: 'Thị trưởng', i: '🎩', d: 'Ban ngày có thể công khai thân phận, từ đó phiếu treo cổ của bạn tính x2.', ab: [{ k: 'reveal', ph: 'day', n: 0, uses: 1 }] },
  detective:     { t: 'village', n: 'Thám tử', i: '🕵️', d: 'Mỗi đêm chọn 2 người để biết họ cùng phe hay khác phe.', ab: [{ k: 'compare', ph: 'night', n: 2, req: 1 }] },
  priest:        { t: 'village', n: 'Linh mục', i: '✝️', d: 'Ban ngày ném nước thánh vào 1 người (1 lần). Trúng sói thì sói chết, không thì bạn chết.', ab: [{ k: 'water', ph: 'day', n: 1, uses: 1 }] },
  medium:        { t: 'village', n: 'Đồng cốt', i: '🕯️', d: 'Ban đêm trò chuyện với người chết. Có thể hồi sinh 1 người phe dân đã chết (1 lần).', ab: [{ k: 'revive', ph: 'night', n: 1, uses: 1, dead: 1 }] },
  cupid:         { t: 'village', n: 'Thần tình yêu', i: '💘', d: 'Đêm đầu ghép đôi 2 người. Nếu 1 người chết, người kia chết theo. Cặp đôi và Thần tình yêu thắng nếu chỉ còn lại họ, hoặc khi Thần tình yêu và cặp đôi còn sống mà chỉ còn 1 người khác.', ab: [{ k: 'link', ph: 'night', n: 2, uses: 1, req: 1, self: 1, n1: 1 }] },
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
  arsonist:      { t: 'solo', n: 'Kẻ phóng hỏa', i: '🔥', d: 'Mỗi đêm tẩm xăng 2 người hoặc châm lửa thiêu chết tất cả người đã bị tẩm, xuyên mọi sự bảo vệ. Miễn nhiễm với sói. Thắng khi là người cuối cùng.', ab: [{ k: 'douse', ph: 'night', n: 2, req: 1 }, { k: 'ignite', ph: 'night', n: 0, req: 1 }] },
};

Object.assign(ROLES, {
  beast_hunter:  { t: 'village', n: 'Thợ săn quái thú', i: '🪤', d: 'Mỗi đêm đặt bẫy lên 1 người (kể cả mình). Nếu sói tấn công người đó, đòn cắn thất bại và 1 con sói dính bẫy chết.', ab: [{ k: 'trap', ph: 'night', n: 1, req: 1, self: 1 }] },
  seer_apprentice: { t: 'village', n: 'Học việc tiên tri', i: '📖', d: 'Khi Tiên tri chết, bạn trở thành Tiên tri mới.' },
  cursed:        { t: 'village', n: 'Kẻ bị nguyền', i: '🌑', d: 'Bạn là dân làng, nhưng nếu bị sói cắn bạn sẽ không chết mà biến thành Ma sói.' },
  pacifist:      { t: 'village', n: 'Người hòa bình', i: '🕊️', d: 'Ban ngày công khai vai trò thật của 1 người, và hôm đó làng không treo cổ ai (1 lần).', ab: [{ k: 'peace', ph: 'day', n: 1, uses: 1 }] },
  grumpy_grandma:{ t: 'village', n: 'Bà già khó tính', i: '👵', d: 'Mỗi đêm chọn 1 người: ngày hôm sau họ không được nói chuyện và không được bỏ phiếu.', ab: [{ k: 'mute', ph: 'night', n: 1, req: 1 }] },
  spirit_seer:   { t: 'village', n: 'Thầy đồng linh hồn', i: '👁️‍🗨️', d: 'Mỗi đêm chọn 2 người. Sáng hôm sau biết được trong 2 người đó có ai đã giết người đêm qua không.', ab: [{ k: 'spirit', ph: 'night', n: 2, req: 1 }] },
  guardian_wolf: { t: 'wolf', n: 'Sói hộ vệ', i: '🛡️', d: 'Ban ngày bảo vệ 1 con sói khỏi bị treo cổ hôm đó (1 lần).', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'save', ph: 'day', n: 1, uses: 1, wo: 1, self: 1 }] },
  kitten_wolf:   { t: 'wolf', n: 'Mèo sói', i: '🐱', d: 'Một lần duy nhất: đêm đó con mồi của bầy sói không chết mà bị biến thành Ma sói (nếu là phe dân).', ab: [{ k: 'kill', ph: 'night', n: 1, req: 1, nw: 1 }, { k: 'convert', ph: 'night', n: 0, uses: 1 }] },
  bomber:        { t: 'solo', n: 'Kẻ đánh bom', i: '💣', d: 'Gài bom vào 1 ghế (cả người đã chết). Đêm sau bom nổ, giết người đó và 2 người ngồi cạnh, xuyên mọi sự bảo vệ. Cứ cách 1 đêm gài được 1 quả. Bị treo cổ thì bom không nổ. Miễn nhiễm với sói. Thắng khi là người cuối cùng.', ab: [{ k: 'bomb', ph: 'night', n: 1, req: 1, any: 1 }] },
  corruptor:     { t: 'solo', n: 'Kẻ làm loạn', i: '📡', d: 'Mỗi đêm làm nhiễu 1 người: ngày hôm sau họ không nói, không bỏ phiếu, không dùng kỹ năng và chết sau buổi bỏ phiếu, vai trò bị giấu. Không làm nhiễu được người đang được bảo vệ. Bạn chết trước đó thì họ thoát. Miễn nhiễm với sói. Thắng khi là người cuối cùng.', ab: [{ k: 'glitch', ph: 'night', n: 1, req: 1 }] },
});

// ---- custom room setup rules (from the Wolvesville wiki's Custom Games and XP Balanced Game pages) ----
const SOLO_KILLERS = ['serial_killer', 'arsonist', 'bomber', 'corruptor'];
const CAT = {
  inv: ['seer', 'aura_seer', 'detective', 'spirit_seer', 'seer_apprentice'],
  vkill: ['gunner', 'priest', 'witch', 'beast_hunter', 'avenger'],
  prot: ['doctor', 'bodyguard', 'tough_guy', 'witch'],
  svote: ['fool', 'headhunter'],
};
const MAX = {
  doctor: 1, bodyguard: 1, gunner: 1, priest: 1, seer: 1, seer_apprentice: 1, medium: 1, mayor: 1, witch: 1, beast_hunter: 1, avenger: 1,
  loudmouth: 1, grumpy_grandma: 1, junior_werewolf: 1, cupid: 1, alpha_werewolf: 1, kitten_wolf: 1, red_lady: 1, cursed: 1, headhunter: 1, fool: 1,
  tough_guy: 2, aura_seer: 2, spirit_seer: 2, detective: 2, pacifist: 2, flower_child: 2, nightmare_werewolf: 2, guardian_wolf: 2, wolf_seer: 2, wolf_shaman: 2,
};
const BANNED_BALANCED = ['kitten_wolf', 'red_lady', 'cursed'];
// errors block the start; warnings only mean "unbalanced", like XP-unbalanced custom games
function checkSetup(roles) {
  const errors = [], warnings = [], n = roles.length, count = {};
  roles.forEach(r => count[r] = (count[r] || 0) + 1);
  const wolves = roles.filter(r => ROLES[r] && ROLES[r].t === 'wolf').length, of = list => roles.filter(r => list.includes(r)).length;
  if (roles.some(r => !ROLES[r])) errors.push('Có vai không hợp lệ');
  if (n < 4 || n > 16) errors.push(`Cần từ 4 đến 16 vai (đang có ${n})`);
  if (!wolves) errors.push('Cần ít nhất 1 Ma sói');
  if (wolves * 2 >= n && n) errors.push('Số sói phải ít hơn một nửa số người');
  if (wolves + of(SOLO_KILLERS) >= n - 1 && n) errors.push('Cần ít nhất 2 người phe dân');
  for (const [r, c] of Object.entries(count)) if (MAX[r] && c > MAX[r]) errors.push(`${ROLES[r].n}: tối đa ${MAX[r]}`);
  if (count.seer_apprentice && !count.seer) errors.push('Học việc tiên tri cần có Tiên tri');
  if (n >= 4 && n < 8) warnings.push('Nên có ít nhất 8 người');
  const want = Math.max(1, Math.round(n / 4));
  if (wolves !== want) warnings.push(`Nên có ${want} sói cho ${n} người`);
  if (of(SOLO_KILLERS) > 1) warnings.push('Tối đa 1 sát nhân độc lập');
  if (of(CAT.svote) > 1) warnings.push('Tối đa 1 vai độc lập kiểu bỏ phiếu');
  if (of(CAT.inv) > 2) warnings.push('Tối đa 2 vai điều tra');
  if (of(CAT.vkill) > 2) warnings.push('Tối đa 2 vai giết người phe dân');
  if (of(CAT.prot) > 2) warnings.push('Tối đa 2 vai bảo vệ');
  if ((count.villager || 0) > 3) warnings.push('Tối đa 3 Dân làng');
  for (const r of BANNED_BALANCED) if (count[r]) warnings.push(`${ROLES[r].n} làm ván mất cân bằng`);
  return { errors, warnings };
}

const ABIL = {
  trap: ['Đặt bẫy', '🪤'], peace: ['Hòa bình', '🕊️'], mute: ['Cấm nói', '🤐'], spirit: ['Gọi hồn', '👁️'], save: ['Che chở sói', '🛡️'],
  convert: ['Biến thành sói', '🐱'], bomb: ['Gài bom', '💣'], glitch: ['Làm nhiễu', '📡'],
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

const SKIN = { s1: '#f8dcc4', s2: '#f1c6a0', s3: '#dca77c', s4: '#b77d52', s5: '#8a5634', s6: '#5e3a22', zombie: '#a9d39b', ghost: '#cfd3f7', wolf: '#9aa0ad' };
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

// ---- extra wardrobe: original drawings on themes common to dress-up games, plus Vietnamese ones ----
const dots = (pts, r, c) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
const FRONT_BOB = c => F('M28 54 Q30 24 60 22 Q90 24 92 54 Q76 34 58 42 Q44 36 28 54Z', c);
Object.assign(HAIR, {
  afro: { n: 'Xù afro', b: c => dots([[30, 46], [90, 46], [26, 66], [94, 66]], 14, c), f: c => dots([[36, 34], [50, 24], [66, 22], [82, 32], [60, 30], [44, 40], [76, 40]], 14, c) },
  sidepart: { n: 'Rẽ ngôi', f: c => F('M28 58 Q24 22 62 20 Q98 22 92 58 Q90 38 80 31 Q62 42 36 40 Q31 46 28 58Z', c) + S('M62 21 Q66 30 80 31', shade(c, .75), 1.6) },
  spacebuns: { n: 'Hai búi', b: c => `<circle cx="34" cy="24" r="12" fill="${c}"/><circle cx="86" cy="24" r="12" fill="${c}"/>`, f: FRONT_BOB },
  braid: { n: 'Tóc tết', b: c => [[90, 70], [93, 84], [95, 98], [96, 112]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${7 - i * .6}" ry="8" fill="${c}"/>`).join('') + F('M86 34 Q100 44 92 66Z', c), f: FRONT_BOB },
  wavy: { n: 'Gợn sóng', b: c => F('M22 58 Q18 22 60 20 Q102 22 98 58 Q104 72 98 86 Q104 100 96 112 L84 104 L36 104 L24 112 Q16 100 22 86 Q16 72 22 58Z', c), f: FRONT_BOB },
});
Object.assign(EYES, {
  big: { n: 'Mắt to', f: () => eyePair(x => `<ellipse cx="${x}" cy="62" rx="6.5" ry="7.5" fill="#fff" stroke="${INK}" stroke-width="1.2"/><circle cx="${x}" cy="63.5" r="5" fill="#3b6fb6"/><circle cx="${x}" cy="63.5" r="2.6" fill="#141014"/><circle cx="${x + 2}" cy="60.6" r="1.8" fill="#fff"/><circle cx="${x - 1.8}" cy="66" r=".9" fill="#fff"/>` + S(`M${x - 7} 58.5 Q${x} 53 ${x + 7} 58.5`, INK, 2.2)) },
  tired: { n: 'Mệt mỏi', f: () => eyePair(x => `<ellipse cx="${x}" cy="63" rx="5" ry="4" fill="#fff" stroke="${INK}" stroke-width="1"/><circle cx="${x}" cy="64" r="2.4" fill="#3a2a22"/>` + F(`M${x - 5.6} 63 Q${x} 56 ${x + 5.6} 63 L${x + 5.6} 61 Q${x} 55 ${x - 5.6} 61Z`, '#d9a07a') + S(`M${x - 4} 68.5 Q${x} 70 ${x + 4} 68.5`, '#b07a8a', 1.2)) },
});
Object.assign(MOUTH, {
  tooth: { n: 'Răng thỏ', f: () => S('M53 75 Q60 82 67 75', '#7a3b2e', 2.5) + F('M57.5 77 L62.5 77 L62.5 81.5 L57.5 81.5Z', '#fff', 'stroke="#ccc" stroke-width=".6"') },
  kiss: { n: 'Chu môi', f: () => F('M56 76 Q60 72 64 76 Q60 81 56 76Z', '#e0566e') },
});
Object.assign(SHIRT, {
  aodai: { n: 'Áo dài đỏ', f: () => F('M42 116 L78 116 L82 150 L38 150Z', '#c8102e') + shirt('#d7192f') + `<rect x="53" y="93" width="14" height="6" rx="2" fill="#f2c94c"/>` + dots([[50, 108], [70, 108], [60, 122], [48, 136], [72, 136]], 2.2, '#f2c94c') },
  aodai_blue: { n: 'Áo dài xanh', f: () => F('M42 116 L78 116 L82 150 L38 150Z', '#2f74c9') + shirt('#3b82d6') + `<rect x="53" y="93" width="14" height="6" rx="2" fill="#fff"/>` + S('M48 112 Q54 104 60 112 Q66 120 72 112', '#fff', 1.6) },
  astronaut: { n: 'Đồ phi hành gia', f: () => shirt('#eef1f5', '#e2e6ec') + `<rect x="50" y="106" width="20" height="14" rx="3" fill="#9aa5b4"/><circle cx="55" cy="113" r="2.2" fill="#e5394d"/><circle cx="62" cy="113" r="2.2" fill="#22b892"/>` + F('M44 100 L52 100 L52 106 L44 106Z', '#3b6fb6') },
  bee: { n: 'Áo ong', f: () => shirt('#f6c21b') + F('M39 108 L81 108 L81 115 L39 115Z M38 122 L82 122 L82 129 L38 129Z', '#2a2328') },
  army: { n: 'Quân phục', f: () => shirt('#5c7243') + dots([[46, 104], [70, 110], [54, 124], [74, 128], [42, 130]], 4, '#3f5230') + dots([[64, 100], [50, 116]], 3, '#8a9a5b') + F('M50 98 L60 110 L70 98 L66 96 L60 103 L54 96Z', '#4a5e36') },
  artist: { n: 'Áo họa sĩ', f: () => shirt('#a9cfe6', '#9ec4dc') + dots([[48, 110], [70, 118], [56, 128]], 3, '#e5394d') + dots([[66, 104], [46, 124]], 2.5, '#f2c94c') + dots([[74, 128]], 2.5, '#22b892') },
  baker: { n: 'Tạp dề thợ bánh', f: () => shirt('#f7f7f7', '#eee') + F('M46 104 L74 104 L76 136 L44 136Z', '#a8743f') + S('M48 104 L46 96 M72 104 L74 96', '#a8743f', 3) + `<rect x="54" y="114" width="12" height="8" rx="2" fill="#8a5a2e"/>` },
  robe: { n: 'Áo choàng võ sĩ', f: () => shirt('#d7192f') + F('M50 96 L60 120 L70 96 L66 96 L60 110 L54 96Z', '#fff') + F('M40 120 L80 120 L80 124 L40 124Z', '#fff') },
  cheer: { n: 'Áo cổ động', f: () => shirt('#d7192f') + F('M44 98 L60 112 L76 98 L72 96 L60 106 L48 96Z', '#fff') + `<text x="60" y="130" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="sans-serif">M</text>` },
  clown: { n: 'Áo chú hề', f: () => shirt('#7cc8f0', '#f08a24') + dots([[48, 108], [70, 114], [56, 126], [74, 130], [44, 128]], 3.2, '#f6c21b') + F('M40 98 Q46 92 52 98 Q58 92 64 98 Q70 92 76 98 Q80 104 70 104 L50 104 Q40 104 40 98Z', '#fff') },
  dalmatian: { n: 'Áo chó đốm', f: () => shirt('#fafafa', '#f2f2f2') + dots([[46, 106], [68, 104], [56, 118], [74, 124], [44, 128], [62, 132]], 3.4, '#1f1f24') },
  cyber: { n: 'Áo khoác cyber', f: () => shirt('#1a1d2b') + S('M44 104 L54 114 L54 136 M76 104 L66 114 L66 136', '#34e3ff', 2) + S('M31 112 L35 120 M89 112 L85 120', '#ff3fa4', 2) },
  labcoat: { n: 'Áo blouse', f: () => shirt('#fbfbfb', '#f1f1f1') + F('M52 96 L60 112 L68 96Z', '#8fb8e8') + `<rect x="66" y="112" width="9" height="11" rx="1.5" fill="#e6e6e6"/>` + S('M68 112 L68 106 M71 112 L71 107', '#3b6fb6', 1.6) },
  sweater: { n: 'Áo len kẻ', f: () => shirt('#c94f3d') + F('M39 108 L81 108 L81 113 L39 113Z M38 120 L82 120 L82 125 L38 125Z', '#f3e3c3') + `<rect x="50" y="94" width="20" height="6" rx="3" fill="#a83f30"/>` },
  jersey: { n: 'Áo đấu số 10', f: () => shirt('#d7192f') + `<text x="60" y="128" text-anchor="middle" font-size="18" font-weight="800" fill="#f6c21b" font-family="sans-serif">10</text>` + S('M44 100 L52 100 M68 100 L76 100', '#f6c21b', 2) },
  leather: { n: 'Áo da rock', f: () => shirt('#22222a') + F('M52 96 L60 116 L68 96Z', '#f0f0f0') + S('M64 110 L64 134', '#c9ced8', 1.4) + S('M44 104 L52 108 M76 104 L68 108', '#3a3a46', 3) },
  lion: { n: 'Đồ múa lân', f: () => shirt('#e5392f', '#f6c21b') + F('M38 116 L82 116 L82 122 L38 122Z', '#f6c21b') + [42, 50, 58, 66, 74].map(x => F(`M${x} 122 L${x + 4} 132 L${x + 8} 122Z`, '#f6c21b')).join('') },
});
Object.assign(HAT, {
  nonla: { n: 'Nón lá', f: () => F('M18 40 L60 0 L102 40 Q60 48 18 40Z', '#e9d39c', 'stroke="#c9ad6e" stroke-width="1.5"') + S('M33 28 L87 28 M24 36 L96 36 M43 18 L77 18', '#cdb27a', 1.2) + S('M34 44 Q60 92 86 44', '#9b7b48', 1.2) },
  lionhead: { n: 'Đầu lân', f: () => F('M20 46 Q16 4 60 0 Q104 4 100 46 Q90 32 60 30 Q30 32 20 46Z', '#e5392f') + dots([[30, 20], [44, 9], [60, 6], [76, 9], [90, 20]], 6, '#f6c21b') + `<circle cx="44" cy="22" r="7" fill="#fff"/><circle cx="76" cy="22" r="7" fill="#fff"/><circle cx="45" cy="23" r="3.5" fill="#1a1414"/><circle cx="75" cy="23" r="3.5" fill="#1a1414"/>` + F('M56 4 L60 -10 L64 4Z', '#f6c21b') + S('M48 34 Q60 40 72 34', '#f6c21b', 3) },
  spacehelmet: { n: 'Mũ phi hành gia', f: () => `<circle cx="60" cy="58" r="42" fill="rgba(200,230,255,.22)" stroke="#dfe6ee" stroke-width="5"/>` + S('M32 36 Q42 24 56 22', '#fff', 3) },
  antennae: { n: 'Râu ong', f: () => S('M48 28 Q40 10 32 6 M72 28 Q80 10 88 6', '#2a2328', 2.5) + `<circle cx="32" cy="6" r="5" fill="#2a2328"/><circle cx="88" cy="6" r="5" fill="#2a2328"/>` },
  beret: { n: 'Mũ nồi', f: () => `<ellipse cx="56" cy="30" rx="32" ry="12" fill="#d7192f" transform="rotate(-8 56 30)"/>` + F('M58 18 L60 10 L63 18Z', '#a50f22') },
  gradcap: { n: 'Mũ tốt nghiệp', f: () => F('M28 34 Q28 22 60 22 Q92 22 92 34Z', '#1f1f24') + F('M16 22 L60 6 L104 22 L60 38Z', '#2a2a32') + S('M60 22 L92 26 L94 44', '#f6c21b', 2) + `<circle cx="94" cy="46" r="3" fill="#f6c21b"/>` },
  headphones: { n: 'Tai nghe', f: () => S('M24 58 Q22 16 60 14 Q98 16 96 58', '#2a2a32', 5) + `<rect x="17" y="50" width="13" height="22" rx="6" fill="#ff3fa4"/><rect x="90" y="50" width="13" height="22" rx="6" fill="#ff3fa4"/>` },
  cap: { n: 'Mũ lưỡi trai', f: () => F('M28 40 Q28 14 60 14 Q92 14 92 40Z', '#2f74c9') + F('M58 36 Q86 30 110 40 Q90 44 58 42Z', '#255ea3') + `<circle cx="60" cy="16" r="3" fill="#255ea3"/>` },
  party: { n: 'Mũ sinh nhật', f: () => F('M44 30 L62 -12 L78 30Z', '#ff3fa4') + S('M50 16 L72 22 M55 4 L68 8', '#f6c21b', 2.5) + `<circle cx="62" cy="-13" r="5" fill="#f6c21b"/>` },
  viking: { n: 'Mũ Viking', f: () => F('M26 40 Q26 14 60 14 Q94 14 94 40Z', '#9aa5b4') + F('M28 34 Q12 22 14 4 Q22 22 34 26Z M92 34 Q108 22 106 4 Q98 22 86 26Z', '#f3ede0') + `<rect x="26" y="34" width="68" height="6" fill="#8a5a2e"/>` },
  armyhelmet: { n: 'Mũ cối', f: () => F('M22 42 Q22 10 60 10 Q98 10 98 42 Q60 34 22 42Z', '#5c7243') + `<circle cx="60" cy="24" r="5" fill="#d7192f"/>` },
  alien: { n: 'Râu người ngoài hành tinh', f: () => S('M50 26 L42 6 M70 26 L78 6', '#3fbf5a', 3) + `<circle cx="42" cy="6" r="6" fill="#7cf09a"/><circle cx="78" cy="6" r="6" fill="#7cf09a"/>` },
  bearears: { n: 'Tai gấu', f: () => `<circle cx="32" cy="28" r="11" fill="#7a4a24"/><circle cx="88" cy="28" r="11" fill="#7a4a24"/><circle cx="32" cy="28" r="5.5" fill="#c98a5a"/><circle cx="88" cy="28" r="5.5" fill="#c98a5a"/>` },
  frog: { n: 'Mũ ếch', f: () => F('M24 44 Q24 14 60 14 Q96 14 96 44Z', '#4fae6a') + `<circle cx="42" cy="14" r="10" fill="#4fae6a"/><circle cx="78" cy="14" r="10" fill="#4fae6a"/><circle cx="42" cy="14" r="6" fill="#fff"/><circle cx="78" cy="14" r="6" fill="#fff"/><circle cx="43" cy="15" r="3" fill="#1a1414"/><circle cx="77" cy="15" r="3" fill="#1a1414"/>` },
  clownwig: { n: 'Tóc giả chú hề', f: () => dots([[24, 46], [96, 46]], 13, '#ff3fa4') + dots([[30, 30], [90, 30]], 11, '#f6c21b') + dots([[44, 20], [76, 20]], 10, '#34b7f1') },
});
Object.assign(GLASSES, {
  three_d: { n: 'Kính 3D', f: () => `<rect x="38" y="55" width="19" height="13" rx="2" fill="rgba(229,57,77,.6)" stroke="#fff" stroke-width="2.5"/><rect x="63" y="55" width="19" height="13" rx="2" fill="rgba(52,183,241,.6)" stroke="#fff" stroke-width="2.5"/>` + S('M57 60 L63 60', '#fff', 2.5) },
  visor: { n: 'Kính cyber', f: () => `<rect x="32" y="55" width="56" height="13" rx="6.5" fill="rgba(52,227,255,.75)" stroke="#1a1d2b" stroke-width="2"/>` + S('M38 61 L82 61', '#fff', 1.2) },
  aviator: { n: 'Kính phi công', f: () => F('M38 56 L57 56 Q57 70 47 70 Q38 70 38 56Z M63 56 L82 56 Q82 70 73 70 Q63 70 63 56Z', 'rgba(60,40,20,.75)', 'stroke="#c9a227" stroke-width="1.6"') + S('M57 58 Q60 55 63 58', '#c9a227', 1.6) },
});
Object.assign(MASK, {
  snout: { n: 'Mõm sói', f: () => F('M44 66 Q60 58 76 66 Q78 82 60 88 Q42 82 44 66Z', '#dcdfe6') + `<ellipse cx="60" cy="68" rx="6" ry="4.2" fill="#1b1b22"/>` + S('M60 72 L60 77 M54 79 Q60 83 66 79', '#1b1b22', 1.8) + F('M55 79.5 L56.5 85 L58 80.5Z M65 79.5 L63.5 85 L62 80.5Z', '#fff') },
  clownnose: { n: 'Mũi chú hề', f: () => `<circle cx="60" cy="68" r="6" fill="#e5392f"/><circle cx="58" cy="66" r="1.8" fill="#ff9a9a"/>` },
  bandana: { n: 'Khăn bandana', f: () => F('M30 68 Q60 64 90 68 Q88 92 60 96 Q32 92 30 68Z', '#d7192f') + dots([[42, 76], [60, 84], [78, 76], [52, 90], [70, 90]], 1.8, '#fff') },
  freckles: { n: 'Tàn nhang', f: () => dots([[38, 70], [42, 73], [36, 74], [82, 70], [78, 73], [84, 74]], 1.2, '#b57a4e') },
});
Object.assign(FG, {
  palette: { n: 'Bảng màu', f: () => F('M76 110 Q96 100 104 116 Q108 130 92 132 Q86 128 82 132 Q72 128 76 110Z', '#e9d39c', 'stroke="#b8975a" stroke-width="1"') + dots([[84, 114]], 3, '#e5394d') + dots([[94, 110]], 3, '#3b6fb6') + dots([[100, 120]], 3, '#22b892') + dots([[92, 124]], 3, '#f6c21b') },
  baguette: { n: 'Bánh mì', f: () => `<rect x="84" y="88" width="12" height="46" rx="6" fill="#d9a441" transform="rotate(14 90 111)"/>` + S('M86 98 L94 96 M86 108 L95 106 M87 118 L96 116', '#a8743f', 1.4) },
  guitar: { n: 'Đàn guitar', f: () => S('M100 70 L86 116', '#6b4423', 4) + `<ellipse cx="84" cy="124" rx="11" ry="13" fill="#d7192f"/><circle cx="84" cy="124" r="3.5" fill="#2a2328"/>` + F('M98 64 L104 66 L102 74 L96 72Z', '#2a2328') },
  mic: { n: 'Micro', f: () => S('M89 128 L95 104', '#2a2a32', 4) + `<circle cx="96" cy="99" r="7" fill="#9aa5b4"/>` },
  pompom: { n: 'Quả bông cổ vũ', f: () => dots([[88, 118], [96, 114], [92, 124], [100, 122], [84, 124]], 6, '#ff3fa4') },
  starlantern: { n: 'Đèn ông sao', f: () => S('M89 126 L92 84', '#8a5a2e', 2.5) + F('M100 70 l4 10 11 1 -8 7 3 11 -10 -6 -10 6 3 -11 -8 -7 11 -1Z', '#e5392f', 'stroke="#f6c21b" stroke-width="1.5"') + `<circle cx="100" cy="84" r="6" fill="#ffd84d" opacity=".55"/>` },
  coffee: { n: 'Cà phê sữa đá', f: () => F('M80 108 L98 108 L95 132 L83 132Z', 'rgba(255,255,255,.75)', 'stroke="#c9ced8" stroke-width="1.2"') + F('M82 116 L96 116 L94.5 131 L83.5 131Z', '#a8743f') + `<rect x="85" y="110" width="4" height="4" fill="#dff4ff"/><rect x="90" y="112" width="4" height="4" fill="#dff4ff"/>` + S('M92 108 L96 96', '#e5394d', 1.6) },
  camera: { n: 'Máy ảnh', f: () => `<rect x="78" y="114" width="24" height="17" rx="3" fill="#2a2a32"/><circle cx="90" cy="122.5" r="5.5" fill="#9aa5b4"/><circle cx="90" cy="122.5" r="2.6" fill="#1a1d2b"/><rect x="82" y="111" width="7" height="4" fill="#2a2a32"/>` },
  umbrella: { n: 'Ô', f: () => S('M90 136 L90 84', '#2a2a32', 2.5) + F('M66 88 Q90 54 114 88 Q108 82 102 88 Q96 82 90 88 Q84 82 78 88 Q72 82 66 88Z', '#3b82d6') },
  cake: { n: 'Bánh kem', f: () => `<rect x="78" y="116" width="24" height="16" rx="3" fill="#f7c6d6"/><rect x="78" y="116" width="24" height="5" rx="2" fill="#fff"/><rect x="89" y="106" width="2.5" height="10" fill="#3b82d6"/>` + F('M90 100 Q93 104 90.2 106 Q87.5 104 90 100Z', '#f6c21b') },
  icecream: { n: 'Kem ốc quế', f: () => F('M84 112 L96 112 L90 134Z', '#d9a441') + `<circle cx="90" cy="108" r="7" fill="#f7c6d6"/><circle cx="90" cy="100" r="5.5" fill="#8a5a2e"/>` },
  gloves: { n: 'Găng đấm bốc', f: () => `<ellipse cx="89" cy="124" rx="10" ry="11" fill="#d7192f"/><ellipse cx="31" cy="124" rx="10" ry="11" fill="#d7192f"/><rect x="83" y="132" width="12" height="5" rx="2" fill="#fff"/><rect x="25" y="132" width="12" height="5" rx="2" fill="#fff"/>` },
});
Object.assign(BG, {
  rainbow: { n: 'Cầu vồng', f: () => ['#e5394d', '#f08a24', '#f6c21b', '#22b892', '#3b82d6'].map((c, i) => `<path d="M${-4 + i * 6} 96 Q60 ${-24 + i * 6} ${124 - i * 6} 96" stroke="${c}" stroke-width="6" fill="none"/>`).join('') },
  lotus: { n: 'Hoa sen', f: () => [[14, 120], [106, 116]].map(([x, y]) => F(`M${x} ${y} Q${x - 10} ${y - 16} ${x} ${y - 26} Q${x + 10} ${y - 16} ${x} ${y}Z`, '#f7a6c4') + F(`M${x} ${y} Q${x - 18} ${y - 8} ${x - 14} ${y - 20} Q${x - 4} ${y - 10} ${x} ${y}Z M${x} ${y} Q${x + 18} ${y - 8} ${x + 14} ${y - 20} Q${x + 4} ${y - 10} ${x} ${y}Z`, '#f392b6')).join('') },
  fireworks: { n: 'Pháo hoa', f: () => [[18, 26, '#f6c21b'], [100, 18, '#ff3fa4'], [104, 70, '#34b7f1']].map(([x, y, c]) => [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return S(`M${(x + Math.cos(r) * 4).toFixed(1)} ${(y + Math.sin(r) * 4).toFixed(1)} L${(x + Math.cos(r) * 11).toFixed(1)} ${(y + Math.sin(r) * 11).toFixed(1)}`, c, 2); }).join('')).join('') },
  snow: { n: 'Tuyết rơi', f: () => dots([[10, 20], [30, 6], [96, 10], [110, 40], [14, 70], [104, 88], [20, 112], [100, 130]], 3, '#fff') },
  clouds: { n: 'Mây', f: () => [[16, 30], [100, 20]].map(([x, y]) => dots([[x - 8, y], [x, y - 6], [x + 9, y]], 8, '#fff')).join('') },
  ufo: { n: 'Đĩa bay', f: () => `<ellipse cx="96" cy="20" rx="20" ry="6" fill="#9aa5b4"/><ellipse cx="96" cy="15" rx="9" ry="7" fill="rgba(124,240,154,.7)"/>` + F('M88 26 L80 60 L112 60 L104 26Z', 'rgba(255,240,150,.35)') },
});
Object.assign(GRAVE, {
  ufo: { n: 'Đĩa bay bắt cóc', f: () => F('M44 80 L30 150 L90 150 L76 80Z', 'rgba(255,240,150,.5)') + `<ellipse cx="60" cy="78" rx="34" ry="10" fill="#9aa5b4"/><ellipse cx="60" cy="70" rx="15" ry="12" fill="rgba(124,240,154,.75)"/>` },
  flowerpot: { n: 'Chậu hoa', f: () => F('M38 118 L82 118 L76 150 L44 150Z', '#c56a3c') + S('M60 118 L60 86', '#4fae6a', 3) + dots([[60, 80]], 9, '#f7a6c4') + dots([[60, 80]], 3.5, '#f6c21b') + F('M60 104 Q72 96 76 104 Q68 108 60 104Z', '#4fae6a') },
});

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
  aodai:    { n: 'Áo dài nón lá', a: { hat: 'nonla', shirt: 'aodai', hair: 'long', hairColor: 'black', bg: 'lotus', fg: 'bouquet', mouth: 'smile', grave: 'flowerpot' } },
  lion:     { n: 'Múa lân', a: { hat: 'lionhead', shirt: 'lion', bg: 'fireworks', mouth: 'grin', eyes: 'happy' } },
  trungthu: { n: 'Đêm Trung thu', a: { hat: 'none', shirt: 'aodai_blue', fg: 'starlantern', bg: 'moon', hair: 'spacebuns', eyes: 'big' } },
  dalat:    { n: 'Sáng Đà Lạt', a: { hat: 'beanie', shirt: 'sweater', fg: 'coffee', bg: 'clouds', eyes: 'happy' } },
  fan:      { n: 'Cổ động viên', a: { hat: 'cap', shirt: 'jersey', fg: 'pompom', mouth: 'open', bg: 'fireworks' } },
  astronaut:{ n: 'Phi hành gia', a: { hat: 'spacehelmet', shirt: 'astronaut', bg: 'ufo', eyes: 'big', grave: 'ufo' } },
  bee:      { n: 'Ong mật', a: { hat: 'antennae', shirt: 'bee', bg: 'none', fg: 'bouquet', eyes: 'big', mouth: 'smile' } },
  soldier:  { n: 'Chiến sĩ', a: { hat: 'armyhelmet', shirt: 'army', eyes: 'dot', mouth: 'flat', fg: 'none' } },
  artist:   { n: 'Họa sĩ', a: { hat: 'beret', shirt: 'artist', fg: 'palette', mask: 'freckles', bg: 'rainbow' } },
  baker:    { n: 'Thợ làm bánh', a: { hat: 'chef', shirt: 'baker', fg: 'baguette', mouth: 'grin' } },
  boxer:    { n: 'Võ sĩ', a: { hat: 'headband', shirt: 'robe', fg: 'gloves', eyes: 'angry', mouth: 'smirk' } },
  clown:    { n: 'Chú hề', a: { hat: 'clownwig', shirt: 'clown', mask: 'clownnose', fg: 'balloon', mouth: 'grin', bg: 'hearts' } },
  dalmatian:{ n: 'Chó đốm', a: { hat: 'bearears', shirt: 'dalmatian', mouth: 'tongue', fg: 'teddy' } },
  cyber:    { n: 'Cyber', a: { hat: 'headphones', shirt: 'cyber', glasses: 'visor', hair: 'spiky', hairColor: 'pink' } },
  scientist:{ n: 'Nhà khoa học', a: { hat: 'none', shirt: 'labcoat', glasses: 'nerd', hair: 'afro', hairColor: 'white', fg: 'potion' } },
  rockstar: { n: 'Ngôi sao nhạc rock', a: { hat: 'none', shirt: 'leather', glasses: 'aviator', fg: 'guitar', hair: 'wavy', bg: 'flames' } },
  alien:    { n: 'Người ngoài hành tinh', a: { hat: 'alien', skin: 'zombie', eyes: 'big', shirt: 'astronaut', bg: 'ufo', grave: 'ufo' } },
  birthday: { n: 'Sinh nhật', a: { hat: 'party', shirt: 'tee_green', fg: 'cake', bg: 'fireworks', mouth: 'grin' } },
  student:  { n: 'Tân cử nhân', a: { hat: 'gradcap', shirt: 'suit', fg: 'book', eyes: 'happy', mouth: 'smile' } },
  frog:     { n: 'Ếch con', a: { hat: 'frog', shirt: 'tee_green', fg: 'umbrella', bg: 'none', eyes: 'big', mouth: 'cat' } },
  viking:   { n: 'Chiến binh Viking', a: { hat: 'viking', shirt: 'armor', mask: 'beard', fg: 'shield', eyes: 'angry' } },
  photographer: { n: 'Nhiếp ảnh gia', a: { hat: 'cap', shirt: 'detective', fg: 'camera', glasses: 'round' } },
  icecream: { n: 'Ngày hè', a: { hat: 'strawhat', shirt: 'sailor', fg: 'icecream', glasses: 'heart', bg: 'none' } },
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
// every grave sits in a small scene: eerie glow behind, earth mound, grass, two lit candles and ground fog in front
const GRAVE_BACK = `<defs><radialGradient id="gglow"><stop offset="0" stop-color="#cfe9ff" stop-opacity=".75"/><stop offset=".6" stop-color="#9fc6ff" stop-opacity=".22"/><stop offset="1" stop-color="#9fc6ff" stop-opacity="0"/></radialGradient></defs>` +
  `<ellipse class="gglow" cx="60" cy="104" rx="58" ry="56" fill="url(#gglow)"/>`;
const candle = x => `<rect x="${x - 2.5}" y="136" width="5" height="12" rx="1.5" fill="#f3ede0"/><ellipse cx="${x}" cy="131" rx="5" ry="7" fill="#ffd84d" opacity=".35"/>` +
  `<g class="flame">` + F(`M${x} 126 Q${x + 3} 131 ${x} 134.5 Q${x - 3} 131 ${x} 126Z`, '#ffb020') + F(`M${x} 129 Q${x + 1.4} 132 ${x} 134 Q${x - 1.4} 132 ${x} 129Z`, '#fff3b0') + '</g>';
const GRAVE_FRONT = F('M14 154 Q22 140 60 140 Q98 140 106 154Z', '#5b4632') + F('M22 154 Q30 146 60 146 Q90 146 98 154Z', '#6e563d') +
  [20, 30, 44, 76, 90, 100].map((x, i) => S(`M${x} 154 L${x - 2} ${146 - i % 2 * 3} M${x} 154 L${x + 3} ${147 - i % 3 * 2}`, '#4fae6a', 1.6)).join('') +
  candle(22) + candle(98) +
  `<g class="fog"><ellipse cx="30" cy="156" rx="30" ry="5" fill="#fff" opacity=".3"/><ellipse cx="92" cy="157" rx="28" ry="4.5" fill="#fff" opacity=".26"/><ellipse cx="60" cy="159" rx="40" ry="4" fill="#fff" opacity=".2"/></g>`;
const graveSvg = (key, cls = '', bust = false) => `<svg class="avatar ${cls}" ${bust ? 'viewBox="-6 30 132 132" preserveAspectRatio="xMidYMax meet"' : VB}>${GRAVE_BACK}${(GRAVE[key] || GRAVE.stone).f()}${GRAVE_FRONT}</svg>`;
// a single slot item rendered alone, for wardrobe thumbnails
function itemSvg(slot, key) {
  if (slot === 'grave') return graveSvg(key);
  const a = { ...DEFAULT_AVATAR, [slot]: key };
  if (slot === 'hairColor') a.hair = 'long';
  return avatarSvg(a);
}

// ---- role portraits: a character in the role's costume, framed close on the face, die-cut sticker style ----
Object.assign(HAT, {
  hood: { n: 'Mũ trùm', b: () => '', f: () => F('M20 70 Q16 14 60 10 Q104 14 100 70 Q96 40 82 30 Q60 22 38 30 Q24 40 20 70Z', '#5b3fa0') + S('M30 52 Q40 26 60 22 Q80 26 90 52', '#7b5cc8', 2) },
});
Object.assign(FG, {
  crystalball: { n: 'Quả cầu pha lê', f: () => `<ellipse cx="88" cy="136" rx="13" ry="4" fill="#8a5a2e"/><circle cx="88" cy="120" r="13" fill="#8fd3ff" opacity=".9"/><circle cx="84" cy="115" r="4" fill="#fff" opacity=".8"/><circle cx="88" cy="120" r="18" fill="#b48cff" opacity=".25"/>` },
  syringe: { n: 'Ống tiêm', f: () => `<rect x="84" y="96" width="10" height="30" rx="2" fill="#e6f4ff" stroke="#9aa5b4" stroke-width="1.5" transform="rotate(20 89 111)"/><rect x="85" y="104" width="8" height="12" fill="#5ad1a0" transform="rotate(20 89 111)"/>` + S('M95 92 L100 80', '#9aa5b4', 2) },
  magnifier: { n: 'Kính lúp', f: () => S('M88 128 L98 110', '#6b4423', 4) + `<circle cx="102" cy="102" r="10" fill="rgba(200,230,255,.5)" stroke="#c9a227" stroke-width="3"/>` },
  megaphone: { n: 'Loa', f: () => F('M84 112 L106 100 L106 128 L84 120Z', '#e5394d') + `<rect x="78" y="112" width="8" height="10" rx="2" fill="#2a2a32"/>` + S('M110 106 Q116 114 110 122', '#f6c21b', 2) },
  holywater: { n: 'Nước thánh', f: () => F('M82 108 L96 108 L98 132 L80 132Z', '#bfe6ff', 'stroke="#7ab6dd" stroke-width="1.5"') + `<rect x="85" y="100" width="8" height="8" fill="#c9b7a0"/>` + F('M87 116 L91 116 L91 128 L87 128Z M84 120 L94 120 L94 124 L84 124Z', '#f6c21b') },
  beartrap: { n: 'Bẫy thú', f: () => `<ellipse cx="90" cy="130" rx="16" ry="6" fill="#6b6f7a"/>` + [76, 82, 88, 94, 100].map(x => F(`M${x} 128 L${x + 3} 118 L${x + 6} 128Z`, '#c9ced8')).join('') },
  knife: { n: 'Dao', f: () => F('M88 128 L92 128 L94 100 L90 92 L86 100Z', '#dfe6ee', 'stroke="#9aa5b4" stroke-width="1"') + `<rect x="85" y="126" width="10" height="12" rx="2" fill="#2a2a32"/>` },
  bomb: { n: 'Bom', f: () => `<circle cx="90" cy="120" r="12" fill="#2a2a32"/><circle cx="86" cy="116" r="3" fill="#5d6577"/>` + S('M96 110 Q100 100 106 102', '#8a5a2e', 2) + F('M106 96 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1Z', '#ffb020') },
  pistol: { n: 'Súng', f: () => F('M80 112 L108 112 L108 119 L92 119 L90 130 L82 130 L84 119 L80 119Z', '#2a2a32') + `<rect x="104" y="109" width="3" height="3" fill="#2a2a32"/>` },
});
const ROLE_LOOK = {
  villager: { hat: 'strawhat', shirt: 'overalls', fg: 'pitchfork', eyes: 'happy', hair: 'short' },
  seer: { hat: 'hood', shirt: 'wizard_robe', fg: 'crystalball', eyes: 'sparkle', hair: 'long', hairColor: 'purple' },
  aura_seer: { hat: 'halo', shirt: 'angel_robe', fg: 'crystalball', bg: 'rainbow', eyes: 'big', hair: 'wavy', hairColor: 'blonde' },
  doctor: { shirt: 'labcoat', fg: 'syringe', glasses: 'round', mask: 'medical', hair: 'sidepart' },
  bodyguard: { hat: 'helmet', shirt: 'armor', fg: 'shield', eyes: 'angry', mouth: 'flat' },
  witch: { hat: 'witch', shirt: 'witch_dress', fg: 'potion', hair: 'long', hairColor: 'purple', mouth: 'smirk', bg: 'moon' },
  avenger: { hat: 'headband', shirt: 'ninja', fg: 'sword', eyes: 'angry', mouth: 'flat' },
  gunner: { hat: 'cowboy', shirt: 'detective', fg: 'pistol', eyes: 'angry', mask: 'mustache' },
  mayor: { hat: 'tophat', shirt: 'suit', glasses: 'monocle', mask: 'mustache', mouth: 'smirk' },
  detective: { hat: 'deerstalker', shirt: 'detective', fg: 'magnifier', glasses: 'monocle' },
  priest: { shirt: 'priest', fg: 'holywater', hair: 'none', eyes: 'closed', mouth: 'smile' },
  medium: { hat: 'hood', shirt: 'witch_dress', fg: 'lantern', bg: 'sparkles', eyes: 'closed' },
  cupid: { shirt: 'angel_robe', bg: 'angel_wings', fg: 'bouquet', hair: 'curly', hairColor: 'blonde', mouth: 'kiss', eyes: 'heart' },
  tough_guy: { shirt: 'robe', fg: 'gloves', mask: 'beard', eyes: 'angry', hair: 'mohawk' },
  red_lady: { shirt: 'aodai', hair: 'long', hairColor: 'red', mouth: 'kiss', bg: 'hearts', eyes: 'wink' },
  loudmouth: { shirt: 'cheer', fg: 'megaphone', mouth: 'open', hair: 'spiky', hairColor: 'blue' },
  flower_child: { hat: 'flowers', shirt: 'sailor', fg: 'bouquet', eyes: 'big', hair: 'twintails', hairColor: 'pink' },
  beast_hunter: { hat: 'cowboy', shirt: 'army', fg: 'beartrap', mask: 'beard', eyes: 'angry' },
  seer_apprentice: { hat: 'hood', shirt: 'sailor', fg: 'book', eyes: 'big', hair: 'bob' },
  cursed: { shirt: 'hoodie', eyes: 'wolf', skin: 'ghost', mouth: 'flat', hair: 'spiky', hairColor: 'black' },
  pacifist: { hat: 'flowers', shirt: 'angel_robe', fg: 'bouquet', bg: 'rainbow', eyes: 'closed', mouth: 'smile' },
  grumpy_grandma: { hair: 'bun', hairColor: 'white', glasses: 'round', shirt: 'sweater', mouth: 'flat', eyes: 'angry' },
  spirit_seer: { hat: 'hood', shirt: 'angel_robe', fg: 'lantern', bg: 'sparkles', eyes: 'sparkle', skin: 'ghost' },
  werewolf: { skin: 'wolf', mask: 'snout', hat: 'wolf_ears', eyes: 'wolf', mouth: 'fangs', shirt: 'hoodie', hair: 'spiky', hairColor: 'silver', bg: 'moon' },
  alpha_werewolf: { skin: 'wolf', mask: 'snout', hat: 'crown', eyes: 'wolf', mouth: 'fangs', shirt: 'vampire', hair: 'spiky', hairColor: 'black', bg: 'moon' },
  wolf_seer: { skin: 'wolf', mask: 'snout', hat: 'wolf_ears', eyes: 'wolf', mouth: 'fangs', shirt: 'wizard_robe', fg: 'crystalball', hairColor: 'silver' },
  junior_werewolf: { skin: 'wolf', mask: 'snout', hat: 'wolf_ears', eyes: 'big', mouth: 'fangs', shirt: 'tee_red', fg: 'teddy', hair: 'short', hairColor: 'silver' },
  wolf_shaman: { skin: 'wolf', mask: 'snout', hat: 'wizard', eyes: 'wolf', mouth: 'fangs', shirt: 'wizard_robe', fg: 'wand' },
  nightmare_werewolf: { skin: 'wolf', mask: 'snout', hat: 'wolf_ears', eyes: 'wolf', mouth: 'fangs', shirt: 'ninja', bg: 'bat_wings', hairColor: 'black' },
  guardian_wolf: { skin: 'wolf', mask: 'snout', hat: 'helmet', eyes: 'wolf', mouth: 'fangs', shirt: 'armor', fg: 'shield' },
  kitten_wolf: { skin: 'wolf', mask: 'snout', hat: 'cat_ears', eyes: 'wolf', mouth: 'cat', shirt: 'hoodie', hair: 'bob', hairColor: 'black' },
  fool: { hat: 'clownwig', shirt: 'clown', mask: 'clownnose', mouth: 'grin', fg: 'balloon' },
  headhunter: { hat: 'tophat', shirt: 'suit', fg: 'pistol', glasses: 'sunglasses', mouth: 'smirk' },
  serial_killer: { shirt: 'leather', fg: 'knife', mask: 'ninja', eyes: 'angry', hair: 'short', hairColor: 'black' },
  arsonist: { glasses: 'goggles', shirt: 'leather', fg: 'torch', bg: 'flames', mouth: 'grin', hair: 'spiky', hairColor: 'red' },
  bomber: { glasses: 'goggles', shirt: 'army', fg: 'bomb', mouth: 'grin', hat: 'armyhelmet' },
  corruptor: { shirt: 'cyber', glasses: 'visor', hat: 'headphones', hair: 'spiky', hairColor: 'green', mouth: 'smirk', bg: 'sparkles' },
};
// close-up portrait: crop to the head and props, wrap in a white die-cut edge
function roleArt(role, cls = '') {
  const look = { ...DEFAULT_AVATAR, skin: 's2', hairColor: 'brown', mouth: 'smile', ...(ROLE_LOOK[role] || {}) };
  const inner = avatarSvg(look).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg class="role-art ${cls}" viewBox="-4 -16 128 128" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const AV = { TEAM, ROLES, ABIL, ITEMS, SLOTS, SETS, DEFAULT_AVATAR, cleanAvatar, randomAvatar, avatarSvg, graveSvg, itemSvg, roleArt, ROLE_LOOK, checkSetup, SOLO_KILLERS };
if (typeof module !== 'undefined' && module.exports) module.exports = AV; else root.AV = AV;
})(this);
