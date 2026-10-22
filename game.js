// Game engine: rooms, phases, role abilities, bots. Pure logic — server.js owns HTTP, accounts and push transport.
const { ROLES, randomAvatar, checkSetup, SOLO_KILLERS } = require('./public/shared');

const settings = { times: { night: 30, day: 60, vote: 30 }, disabled: [], early: false }; // early: end night/vote once everyone acted (tests only) // server.js overwrites from db
const hooks = { push: () => {}, onEnd: () => {} };
const rooms = {};
const userRoom = {}; // uid -> room code

const N = role => ROLES[role].n;
const team = p => ROLES[p.role].t;
const P = (r, id) => r.players.find(p => p.id === id);
const alive = r => r.players.filter(p => p.alive);
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const say = (r, text, ch = 'sys', extra = {}) => r.msgs.push({ n: r.seq = (r.seq || 0) + 1, ch, text, ...extra });
const priv = (r, p, text, extra = {}) => say(r, text, 'priv', { to: p.id, ...extra });
// what a player privately knows about another, drawn on that player's tile
const note = (p, t, k, v = true) => { ((p.notes = p.notes || {})[t.id] = p.notes[t.id] || {})[k] = v; };
const tally = (votes, weight = () => 1) => { const c = {}; for (const [v, t] of Object.entries(votes)) c[t] = (c[t] || 0) + weight(v); return c; };

// counts {target: n} -> top target; ties -> null, or a random top pick when tieRandom
function plurality(c, tieRandom) {
  const max = Math.max(0, ...Object.values(c)), top = Object.keys(c).filter(k => c[k] === max);
  return top.length === 1 ? top[0] : tieRandom && top.length ? rnd(top) : null;
}

function dealRoles(n) {
  const pool = t => Object.keys(ROLES).filter(k => ROLES[k].t === t && !settings.disabled.includes(k));
  const wolves = pool('wolf'), village = pool('village').filter(k => k !== 'villager'), solos = pool('solo');
  const wc = Math.max(1, Math.floor(n / 4)), sc = n >= 7 && solos.length ? 1 : 0;
  const out = [wolves.includes('werewolf') ? 'werewolf' : rnd(wolves.length ? wolves : ['werewolf'])];
  const extraWolves = shuffle(wolves.filter(k => k !== 'werewolf'));
  while (out.length < wc) out.push(extraWolves.shift() || 'werewolf');
  if (sc) out.push(rnd(solos));
  const plain = Math.floor(n / 5); // keep some plain villagers like real lineups
  const specials = shuffle(village.filter(k => k !== 'seer'));
  if (village.includes('seer')) specials.unshift('seer');
  while (out.length < n - plain && specials.length) out.push(specials.shift());
  while (out.length < n) out.push('villager');
  return shuffle(out);
}

function setPhase(r, phase, sec, onEnd) {
  clearTimeout(r.timer);
  r.phase = phase;
  r.ends = sec ? Date.now() + sec * 1000 : 0;
  r.timer = sec ? setTimeout(() => { onEnd(r); hooks.push(r); }, sec * 1000) : null;
  scheduleBots(r);
}

function usable(r, p, ab) {
  if (!p.alive || (ab.uses != null && !(p.uses[ab.k] > 0)) || (ab.n1 && r.day !== 1)) return false;
  const ph = r.phase;
  if (ab.ph === 'night' ? ph !== 'night' : ab.ph === 'day' ? !['day', 'vote'].includes(ph) : !['night', 'day', 'vote'].includes(ph)) return false;
  if (ph === 'night' && r.blocked.has(p.id)) return false;
  return ['kill', 'mark'].includes(ab.k) || !r.used[`${p.id}:${ab.k}`];
}
const required = (r, p) => (ROLES[p.role].ab || []).some(ab => ab.req && usable(r, p, ab));
const nightDone = r => alive(r).every(p => r.act.done[p.id] || !required(r, p));

function startNight(r) {
  r.day++;
  r.act = { list: [], wolf: {}, done: {}, heal: false };
  r.used = {};
  say(r, `🌙 Đêm ${r.day} buông xuống. Ai có kỹ năng hãy hành động...`, 'sys', { fx: 'night' });
  r.blocked.forEach(id => priv(r, P(r, id), '😱 Bạn gặp ác mộng và ngủ li bì, đêm nay không thể dùng kỹ năng.'));
  setPhase(r, 'night', settings.times.night, endNight);
}

const HOW = { wolf: 'bị Ma sói cắn chết', sk: 'bị Sát nhân đâm chết', poison: 'bị đầu độc chết', fire: 'bị thiêu cháy', redlady: 'chết khi đi thăm nhầm nhà', bomb: 'bị bom nổ chết', trap: 'dính bẫy của Thợ săn quái thú' };
const DFX = { wolf: 'bite', sk: 'stab', poison: 'poisoned', fire: 'fire', redlady: 'bite', bomb: 'fire', trap: 'stab' };

function endNight(r) {
  const a = r.act, by = k => a.list.filter(x => x.k === k);
  const enchanted = new Set(by('enchant').map(x => x.t[0]));
  const looks = p => enchanted.has(p.id) ? 'werewolf' : p.role;
  const looksTeam = p => ROLES[looks(p)].t;

  for (const x of by('see')) {
    const t = P(r, x.t[0]), role = P(r, x.by).role === 'wolf_seer' ? t.role : looks(t);
    priv(r, P(r, x.by), `🔮 ${t.name} là ${N(role)}`, { fx: 'see', role, av: t.avatar });
    note(P(r, x.by), t, 'role', role);
  }
  for (const x of by('aura')) {
    const t = P(r, x.t[0]), tm = looksTeam(t);
    priv(r, P(r, x.by), `🌈 Hào quang của ${t.name}: ${tm === 'wolf' ? 'ÁC 😈' : tm === 'solo' ? 'KHÔNG RÕ ❔' : 'TỐT 😇'}`, { fx: 'aura', av: t.avatar });
    note(P(r, x.by), t, 'aura', tm === 'wolf' ? 'evil' : tm === 'solo' ? 'unknown' : 'good');
  }
  for (const x of by('compare')) {
    const [t1, t2] = x.t.map(id => P(r, id)), same = looksTeam(t1) === looksTeam(t2) && looksTeam(t1) !== 'solo';
    priv(r, P(r, x.by), `🕵️ ${t1.name} và ${t2.name} ${same ? 'CÙNG PHE' : 'KHÁC PHE'}`, { fx: 'compare' });
    note(P(r, x.by), t1, 'cmp', { same, with: t2.id }); note(P(r, x.by), t2, 'cmp', { same, with: t1.id });
  }
  for (const x of by('link')) {
    const [t1, t2] = x.t.map(id => P(r, id));
    t1.lover = t2.id; t2.lover = t1.id;
    note(P(r, x.by), t1, 'lover'); note(P(r, x.by), t2, 'lover');
    priv(r, t1, `💘 Bạn và ${t2.name} đã trở thành tình nhân!`, { fx: 'link', av: t2.avatar });
    priv(r, t2, `💘 Bạn và ${t1.name} đã trở thành tình nhân!`, { fx: 'link', av: t1.avatar });
  }
  for (const x of by('douse')) x.t.forEach(id => { P(r, id).doused = true; note(P(r, x.by), P(r, id), 'douse'); });
  for (const x of by('trap')) P(r, x.by).trap = x.t[0];

  // attacks carry who made them, so the Spirit Seer can tell killers apart
  const attacks = [];
  const wt = plurality(tally(a.wolf, v => P(r, v).role === 'alpha_werewolf' ? 2 : 1), true);
  if (wt && !a.heal) attacks.push({ t: wt, by: 'wolf', who: Object.keys(a.wolf) });
  by('stab').forEach(x => attacks.push({ t: x.t[0], by: 'sk', who: [x.by] }));
  by('poison').forEach(x => attacks.push({ t: x.t[0], by: 'poison', who: [x.by] }));
  by('ignite').forEach(x => Object.values(P(r, x.by).notes || {}).forEach(n => delete n.douse));
  if (by('ignite').length) r.players.filter(p => p.doused && p.alive).forEach(p => { p.doused = false; attacks.push({ t: p.id, by: 'fire', who: by('ignite').map(x => x.by) }); });
  // bombs placed last night go off now, taking the seats on either side too
  for (const b of (r.bombs || []).filter(b => b.night < r.day)) {
    delete ((P(r, b.owner).notes || {})[b.t] || {}).bomb;
    const i = r.players.findIndex(p => p.id === b.t);
    [i - 1, i, i + 1].map(j => r.players[(j + r.players.length) % r.players.length]).filter(p => p.alive && p.id !== b.owner)
      .forEach(p => attacks.push({ t: p.id, by: 'bomb', who: [b.owner] }));
  }
  r.bombs = (r.bombs || []).filter(b => b.night >= r.day).concat(by('bomb').map(x => ({ t: x.t[0], owner: x.by, night: r.day })));
  by('bomb').forEach(x => note(P(r, x.by), P(r, x.t[0]), 'bomb'));

  const protect = by('protect'), guards = Object.fromEntries(by('guard').map(x => [x.t[0], x.by]));
  const visiting = Object.fromEntries(by('visit').map(x => [x.by, x.t[0]]));
  const deaths = [], killers = new Set();
  for (const atk of attacks) {
    let v = P(r, atk.t);
    if (!v.alive) continue;
    if (atk.by === 'wolf') {
      const hunter = alive(r).find(h => h.role === 'beast_hunter' && h.trap === v.id);
      if (hunter) {
        hunter.trap = null;
        const prey = alive(r).filter(w => team(w) === 'wolf'), victim = prey.find(w => w.role === 'werewolf') || rnd(prey);
        if (victim) deaths.push([victim, 'trap']);
        priv(r, hunter, '🪤 Bẫy của bạn đã sập! Bầy sói không cắn được ai.', { fx: 'protect' });
        continue;
      }
    }
    if (['wolf', 'sk', 'bomb'].includes(atk.by)) {
      if (visiting[v.id] && atk.by !== 'bomb') continue; // red lady is not home
      if (atk.by === 'wolf' && v.role === 'serial_killer') continue;
      const doc = protect.filter(x => x.t[0] === v.id);
      if (doc.length) { doc.forEach(x => priv(r, P(r, x.by), `💉 Người bạn bảo vệ đã bị tấn công và được bạn cứu sống!`, { fx: 'protect' })); continue; }
      if (guards[v.id]) v = P(r, guards[v.id]);
      if (v.role === 'bodyguard' && !v.shieldUsed) { v.shieldUsed = true; priv(r, v, '🛡️ Bạn bị tấn công nhưng đã chống đỡ được! Lần sau sẽ không may mắn vậy.', { fx: 'guard' }); continue; }
      if (atk.by === 'wolf' && v.role === 'tough_guy' && !v.wounded) { v.wounded = r.day; priv(r, v, '💪 Bạn bị sói cắn nhưng vẫn gắng gượng... Bạn sẽ chết vào cuối ngày.'); continue; }
      if (atk.by === 'wolf' && (v.role === 'cursed' || (a.convert && team(v) === 'village'))) { turnWolf(r, v); atk.who.forEach(id => killers.add(id)); continue; }
    }
    deaths.push([v, atk.by]);
    atk.who.forEach(id => killers.add(id));
  }
  const attacked = attacks.filter(x => ['wolf', 'sk'].includes(x.by)).map(x => x.t);
  for (const [rl, t] of Object.entries(visiting)) {
    const host = P(r, t);
    if (team(host) === 'wolf' || host.role === 'serial_killer' || attacked.includes(t)) deaths.push([P(r, rl), 'redlady']);
  }
  const revived = by('revive').map(x => P(r, x.t[0])).filter(p => !p.alive);
  for (const x of by('spirit')) {
    const [t1, t2] = x.t.map(id => P(r, id)), yes = killers.has(t1.id) || killers.has(t2.id);
    priv(r, P(r, x.by), `👁️ Trong ${t1.name} và ${t2.name}: ${yes ? 'CÓ người đã giết người đêm qua' : 'không ai giết người đêm qua'}`, { fx: 'see' });
    note(P(r, x.by), t1, 'spirit', { yes, with: t2.id }); note(P(r, x.by), t2, 'spirit', { yes, with: t1.id });
  }
  r.muted = new Set(by('mute').map(x => x.t[0]).concat(by('glitch').map(x => x.t[0])));
  r.glitched = new Set(by('glitch').map(x => x.t[0]));

  say(r, `☀️ Trời sáng${deaths.length ? '...' : '. Đêm qua không ai chết!'}`, 'sys', { fx: 'day' });
  deaths.forEach(([p, why]) => kill(r, p, HOW[why], DFX[why]));
  revived.forEach(p => { p.alive = true; p.death = null; say(r, `✨ ${p.name} đã được Đồng cốt hồi sinh!`, 'sys', { fx: 'revive', av: p.avatar }); });
  r.blocked = new Set(by('nightmare').map(x => x.t[0]));
  next(r, startDay);
}

// cursed villagers and the Kitten Wolf's victim join the pack instead of dying
function turnWolf(r, v) {
  v.role = 'werewolf'; v.uses = {};
  priv(r, v, '🐺 Bạn bị sói cắn nhưng không chết... Giờ bạn đã là Ma sói! Hãy đi cùng bầy sói.', { fx: 'kill', role: 'werewolf' });
  alive(r).filter(w => team(w) === 'wolf' && w !== v).forEach(w => priv(r, w, `🐺 ${v.name} đã gia nhập bầy sói!`, { fx: 'kill', av: v.avatar }));
}

function startDay(r) {
  r.flowers = new Set(); r.wolfSafe = new Set(); r.noLynch = false;
  r.used = {};
  say(r, `Ngày ${r.day}: thảo luận xem ai là sói.`);
  (r.muted || new Set()).forEach(id => { const p = P(r, id); if (p && p.alive) say(r, `🤐 ${p.name} bị cấm nói và không được bỏ phiếu hôm nay.`); });
  setPhase(r, 'day', settings.times.day, startVote);
}

function startVote(r) {
  r.votes = {};
  say(r, '⚖️ Bắt đầu bỏ phiếu treo cổ!', 'sys', { fx: 'vote' });
  setPhase(r, 'vote', settings.times.vote, endVote);
}

function endVote(r) {
  let t = plurality(tally(r.votes, v => { const p = P(r, v); return p.role === 'mayor' && p.revealed ? 2 : 1; }));
  if (r.noLynch) { say(r, '🕊️ Người hòa bình đã kêu gọi: hôm nay không treo cổ ai.'); t = null; }
  else if (t && r.wolfSafe.has(t)) { say(r, `🛡️ ${P(r, t).name} được che chở nên không bị treo cổ!`, 'sys', { fx: 'guard' }); t = null; }
  else if (t && r.flowers.has(t)) { say(r, `🌸 ${P(r, t).name} được Bé hoa bảo vệ nên không bị treo cổ!`, 'sys', { fx: 'flower' }); t = null; }
  else if (!t) say(r, '⚖️ Phiếu hòa hoặc không ai bị bầu. Không ai bị treo cổ.');
  if (t) {
    const p = P(r, t);
    kill(r, p, 'bị dân làng treo cổ', 'lynch');
    if (p.role === 'fool') return end(r, 'fool', [p.id]);
    const hh = alive(r).find(h => h.role === 'headhunter' && h.hhTarget === p.id);
    if (hh) return end(r, 'headhunter', [hh.id]);
  }
  alive(r).filter(p => p.wounded === r.day).forEach(p => kill(r, p, 'gục ngã vì vết thương', 'bite'));
  alive(r).filter(p => r.glitched && r.glitched.has(p.id)).forEach(p => kill(r, p, 'bị Kẻ làm loạn xử lý', 'stab'));
  r.muted = new Set(); r.glitched = new Set();
  next(r, startNight);
}

function kill(r, p, how, fx) {
  if (!p.alive) return;
  p.alive = false;
  p.death = { day: r.day, night: r.phase === 'night', how };
  say(r, `💀 ${p.name} ${how}. Vai trò: ${N(p.role)}`, 'sys', { fx, role: p.role, av: p.avatar });
  if (fx !== 'lynch') r.players.filter(h => h.alive && h.role === 'headhunter' && h.hhTarget === p.id)
    .forEach(h => { h.role = 'villager'; priv(r, h, '🎯 Mục tiêu của bạn đã chết. Bạn trở thành Dân làng.'); });
  if (p.role === 'seer') {
    const ap = alive(r).find(x => x.role === 'seer_apprentice');
    if (ap) { ap.role = 'seer'; ap.uses = {}; priv(r, ap, '🔮 Tiên tri đã chết. Từ đêm nay bạn là Tiên tri mới!', { fx: 'see', role: 'seer' }); }
  }
  if (p.lover) kill(r, P(r, p.lover), 'chết vì đau khổ khi người yêu ra đi', 'heartbreak');
  if (['avenger', 'junior_werewolf'].includes(p.role) && p.mark) kill(r, P(r, p.mark), `bị ${N(p.role)} kéo theo`, 'avenge');
  if (p.role === 'loudmouth' && p.mark) {
    const t = P(r, p.mark);
    t.revealed = true;
    say(r, `📢 Kẻ lắm mồm tiết lộ: ${t.name} là ${N(t.role)}!`, 'sys', { fx: 'reveal', role: t.role, av: t.avatar });
  }
}

// -> [kind, winnerIds?] or null
function winner(r) {
  const a = alive(r), w = a.filter(p => team(p) === 'wolf').length, k = a.filter(p => SOLO_KILLERS.includes(p.role));
  if (!a.length) return ['none', []];
  if (!w && !k.length) return ['village'];
  if (!k.length && w >= a.length - w) return ['wolf'];
  if (!w && k.length === 1 && a.length <= 2) return [k[0].role, [k[0].id]];
  return null;
}

function next(r, then) {
  const w = winner(r);
  w ? end(r, ...w) : then(r);
}

const WIN = { village: '🏡 Dân làng chiến thắng!', wolf: '🐺 Ma sói chiến thắng!', fool: '🃏 Thằng ngốc chiến thắng!', headhunter: '🎯 Thợ săn đầu người chiến thắng!', serial_killer: '🔪 Sát nhân hàng loạt chiến thắng!', arsonist: '🔥 Kẻ phóng hỏa chiến thắng!', bomber: '💣 Kẻ đánh bom chiến thắng!', corruptor: '📡 Kẻ làm loạn chiến thắng!', none: '⚰️ Không ai sống sót...' };
function end(r, kind, ids) {
  r.winner = kind;
  r.players.forEach(p => { p.won = ids ? ids.includes(p.id) : team(p) === kind; });
  say(r, WIN[kind], 'sys', { fx: 'end' });
  setPhase(r, 'end', 0);
  hooks.onEnd(r);
}

function leave(uid) {
  const r = rooms[userRoom[uid]];
  delete userRoom[uid];
  if (!r || !['lobby', 'end'].includes(r.phase)) return;
  const p = P(r, uid);
  if (!p) return;
  r.players = r.players.filter(x => x !== p);
  say(r, `👋 ${p.name} đã rời làng`);
  if (r.host === uid) r.host = (r.players.find(x => !x.bot) || {}).id;
  if (!r.host) { clearTimeout(r.timer); delete rooms[r.code]; } else hooks.push(r);
}

const cap = r => r.setup ? r.setup.length : 16;
function addPlayer(r, u) {
  if (r.phase !== 'lobby') throw 'Ván chơi đã bắt đầu';
  if (r.players.length >= cap(r) && !P(r, u.id)) throw `Phòng đã đầy (${cap(r)} người)`;
  if (!P(r, u.id)) {
    if (userRoom[u.id] && userRoom[u.id] !== r.code) leave(u.id);
    r.players.push({ id: u.id, name: u.name, avatar: u.avatar, bot: !!u.bot, alive: true });
    if (!u.bot) userRoom[u.id] = r.code;
    r.host = r.host || u.id;
    say(r, `👋 ${u.name} đã vào làng`);
  }
  return { code: r.code };
}

const BOT_NAMES = ['Lan', 'Minh', 'Hùng', 'Mai', 'Tuấn', 'Hoa', 'Nam', 'Linh', 'Phúc', 'Trang', 'Đức', 'Vy', 'Khoa', 'Ngọc', 'Bảo', 'Thảo'];

// u = { id, name, avatar } of the logged-in user (or a bot player)
function handle(b, u) {
  const open = r => r.phase === 'lobby' && r.players.length < cap(r);
  if (b.action === 'create' || (b.action === 'quick' && !Object.values(rooms).some(open))) {
    let setup = null;
    if (b.action === 'create' && Array.isArray(b.setup) && b.setup.length) {
      setup = b.setup.map(String);
      const { errors } = checkSetup(setup);
      if (errors.length) throw errors[0];
    }
    let code;
    do code = Math.random().toString(36).slice(2, 6).toUpperCase(); while (rooms[code]);
    rooms[code] = { code, setup, players: [], host: null, phase: 'lobby', day: 0, msgs: [], clients: new Map(), blocked: new Set(), used: {}, touched: Date.now() };
    return addPlayer(rooms[code], u);
  }
  if (b.action === 'quick') return addPlayer(Object.values(rooms).find(open), u);
  if (b.action === 'leave') return leave(u.id);
  const r = rooms[String(b.code || '').toUpperCase()];
  if (!r) throw 'Không tìm thấy phòng';
  r.touched = Date.now();
  if (b.action === 'join') return addPlayer(r, u);
  const me = P(r, u.id);
  if (!me) throw 'Bạn không ở trong phòng này';
  const isHost = me.id === r.host;

  if (b.action === 'addbot') {
    if (!isHost || r.phase !== 'lobby') throw 'Chỉ chủ phòng được thêm bot trong sảnh chờ';
    const name = 'Bot ' + (BOT_NAMES.find(n => !r.players.some(p => p.name === 'Bot ' + n)) || r.players.length);
    return addPlayer(r, { id: 'bot_' + Math.random().toString(36).slice(2, 8), name, avatar: randomAvatar(), bot: true });
  }
  if (b.action === 'kick') {
    const t = P(r, b.target);
    if (!isHost || r.phase !== 'lobby' || !t || t === me) throw 'Không thể mời ra';
    r.players = r.players.filter(p => p !== t);
    delete userRoom[t.id];
    return say(r, `🚪 ${t.name} đã bị mời ra khỏi phòng`);
  }
  if (b.action === 'start') {
    if (!isHost) throw 'Chỉ chủ phòng được bắt đầu';
    if (!['lobby', 'end'].includes(r.phase)) throw 'Ván đang diễn ra';
    if (r.players.length < 4) throw 'Cần ít nhất 4 người (có thể thêm bot)';
    if (r.setup && r.players.length !== r.setup.length) throw `Phòng cần đủ ${r.setup.length} người để bắt đầu (đang có ${r.players.length})`;
    const roles = r.setup ? shuffle([...r.setup]) : dealRoles(r.players.length);
    r.players.forEach((p, i) => {
      for (const k of ['death', 'lover', 'mark', 'shieldUsed', 'wounded', 'revealed', 'hhTarget', 'doused', 'won', 'trap', 'notes']) delete p[k];
      Object.assign(p, { role: roles[i], alive: true, uses: Object.fromEntries((ROLES[roles[i]].ab || []).filter(a => a.uses).map(a => [a.k, a.uses])) });
    });
    Object.assign(r, { day: 0, msgs: [], winner: null, blocked: new Set(), bombs: [], muted: new Set(), glitched: new Set(), started: Date.now() });
    say(r, `🎭 Đã chia vai cho ${r.players.length} người. Trong làng có ${roles.filter(x => ROLES[x].t === 'wolf').length} Ma sói!`, 'sys', { fx: 'start' });
    for (const h of r.players.filter(p => p.role === 'headhunter')) {
      const t = rnd(r.players.filter(p => team(p) === 'village'));
      if (t) { h.hhTarget = t.id; priv(r, h, `🎯 Mục tiêu của bạn: ${t.name}. Hãy khiến dân làng treo cổ người này!`, { av: t.avatar }); }
    }
    return startNight(r);
  }
  if (b.action === 'chat') {
    const text = String(b.text || '').trim().slice(0, 200);
    if (!text) return;
    const inGame = !['lobby', 'end'].includes(r.phase);
    const ch = inGame && !me.alive ? 'dead'
      : r.phase === 'night' ? (team(me) === 'wolf' ? 'wolf' : me.role === 'medium' ? 'dead' : null) : 'day';
    if (!ch) throw 'Ban đêm làng im lặng, chỉ Ma sói được thì thầm';
    if (ch === 'day' && inGame && r.muted && r.muted.has(me.id)) throw 'Hôm nay bạn bị cấm nói';
    return say(r, text, ch, { name: me.name, from: me.id });
  }
  if (b.action === 'vote') {
    const t = P(r, b.target);
    if (r.phase !== 'vote' || !me.alive) throw 'Chưa đến lúc bỏ phiếu';
    if (r.muted && r.muted.has(me.id)) throw 'Hôm nay bạn không được bỏ phiếu';
    if (!t || !t.alive || t === me) throw 'Chọn người khác';
    r.votes[me.id] = t.id;
    if (settings.early && alive(r).every(p => r.votes[p.id] || (r.muted && r.muted.has(p.id)))) { clearTimeout(r.timer); endVote(r); }
    return;
  }
  if (b.action === 'pass') {
    if (r.phase !== 'night' || !required(r, me)) throw 'Không cần bỏ qua';
    r.act.done[me.id] = 1;
    if (settings.early && nightDone(r)) { clearTimeout(r.timer); endNight(r); }
    return;
  }
  if (b.action === 'act') return act(r, me, b);
  throw 'Hành động không hợp lệ';
}

function act(r, me, b) {
  const ab = (ROLES[me.role].ab || []).find(x => x.k === b.k);
  if (!ab || !usable(r, me, ab)) throw 'Không thể dùng kỹ năng này lúc này';
  const ts = [...new Set(b.targets || [])].map(id => P(r, id));
  if (ts.length !== ab.n || ts.some(t => !t)) throw `Hãy chọn ${ab.n} người`;
  for (const t of ts) {
    if (ab.dead ? t.alive || team(t) !== 'village' : !t.alive) throw ab.dead ? 'Chỉ hồi sinh được người phe dân đã chết' : `${t.name} đã chết`;
    if (t === me && !ab.self) throw 'Không thể chọn chính mình';
    if (ab.nw && team(t) === 'wolf') throw 'Không thể chọn đồng bọn sói';
    if (ab.wo && team(t) !== 'wolf') throw 'Chỉ chọn được đồng bọn sói';
  }
  if (ab.k === 'heal' && !plurality(tally(r.act.wolf))) throw 'Sói chưa chọn ai để cứu';
  const t = ts[0];
  if (ab.uses) me.uses[ab.k]--;
  r.used[`${me.id}:${ab.k}`] = 1;

  switch (ab.k) {
    case 'kill':
      r.act.wolf[me.id] = t.id;
      say(r, `🐺 ${me.name} muốn cắn ${t.name}`, 'wolf', { fx: 'kill', av: t.avatar });
      break;
    case 'mark':
      me.mark = t.id;
      priv(r, me, `🎯 Bạn đã chọn ${t.name}`, { fx: 'mark', av: t.avatar });
      break;
    case 'shoot':
      if (!me.revealed) { me.revealed = true; say(r, `🔫 ${me.name} rút súng — họ là Xạ thủ!`, 'sys', { fx: 'reveal', role: 'gunner', av: me.avatar }); }
      kill(r, t, 'bị Xạ thủ bắn chết', 'shot');
      return checkWin(r);
    case 'reveal':
      me.revealed = true;
      return say(r, `🎩 ${me.name} công khai là Thị trưởng! Phiếu của họ tính x2.`, 'sys', { fx: 'reveal', role: 'mayor', av: me.avatar });
    case 'water':
      if (team(t) === 'wolf') kill(r, t, 'bị Linh mục ném nước thánh thiêu rụi', 'water');
      else kill(r, me, 'ném nhầm nước thánh vào người vô tội và bị trừng phạt', 'water');
      return checkWin(r);
    case 'flower':
      r.flowers.add(t.id);
      return say(r, `🌸 Ai đó đã tặng hoa cho ${t.name}. Hôm nay họ không thể bị treo cổ.`, 'sys', { fx: 'flower', av: t.avatar });
    case 'peace':
      t.revealed = true; r.noLynch = true;
      return say(r, `🕊️ Người hòa bình tiết lộ: ${t.name} là ${N(t.role)}. Hôm nay làng không treo cổ ai.`, 'sys', { fx: 'reveal', role: t.role, av: t.avatar });
    case 'save':
      r.wolfSafe.add(t.id);
      priv(r, me, `🛡️ Bạn che chở ${t.name}, hôm nay không ai treo cổ được họ.`, { fx: 'guard', av: t.avatar });
      return;
    case 'convert':
      r.act.convert = true;
      alive(r).filter(w => team(w) === 'wolf').forEach(w => priv(r, w, '🐱 Mèo sói ra tay: đêm nay con mồi sẽ bị biến thành sói thay vì chết.', { fx: 'enchant' }));
      return;
    case 'heal':
      r.act.heal = true;
      priv(r, me, '💚 Bạn đã dùng bình cứu cho nạn nhân của sói', { fx: 'heal' });
      break;
    default: {
      const label = { see: '🔮 Bạn đang soi', aura: '🌈 Bạn xem hào quang của', protect: '💉 Bạn bảo vệ', guard: '🛡️ Bạn canh gác cho', poison: '☠️ Bạn đầu độc',
        compare: '🕵️ Bạn điều tra', revive: '✨ Bạn làm phép hồi sinh', link: '💘 Bạn ghép đôi', visit: '💃 Bạn ghé thăm', enchant: '🪄 Bạn yểm bùa',
        nightmare: '😱 Bạn gieo ác mộng cho', stab: '🔪 Bạn nhắm đâm', douse: '⛽ Bạn tẩm xăng', ignite: '🔥 Bạn châm lửa thiêu tất cả người đã tẩm xăng',
        trap: '🪤 Bạn đặt bẫy cho', mute: '🤐 Ngày mai cấm nói:', spirit: '👁️ Bạn gọi hồn xem', bomb: '💣 Bạn gài bom vào', glitch: '📡 Bạn làm nhiễu' }[ab.k];
      r.act.list.push({ by: me.id, k: ab.k, t: ts.map(x => x.id) });
      if (['douse', 'bomb', 'link'].includes(ab.k)) ts.forEach(x => note(me, x, ab.k === 'link' ? 'lover' : ab.k));
      priv(r, me, `${label}${ts.length ? ' ' + ts.map(x => x.name).join(' và ') : ''}`, { fx: ab.k, av: t && t.avatar });
    }
  }
  if (r.phase === 'night' && ab.req) {
    r.act.done[me.id] = 1;
    if (settings.early && nightDone(r)) { clearTimeout(r.timer); endNight(r); }
  }
}

function checkWin(r) { const w = winner(r); if (w) end(r, ...w); }

// Bots act at a random moment in each phase; failures (e.g. phase already over) are ignored
function scheduleBots(r) {
  for (const p of r.players.filter(x => x.bot)) setTimeout(() => { if (rooms[r.code]) { botAct(r, p); hooks.push(r); } }, 1500 + Math.random() * 6000);
}
function botAct(r, p) {
  if (!p.alive || !['night', 'day', 'vote'].includes(r.phase)) return;
  const others = alive(r).filter(x => x !== p), wolf = team(p) === 'wolf';
  const pick = (ab) => {
    let pool = ab.dead ? r.players.filter(x => !x.alive && team(x) === 'village') : ab.self ? alive(r) : others;
    if (ab.wo) pool = alive(r).filter(x => team(x) === 'wolf');
    else if (ab.nw || (wolf && ab.k !== 'see')) pool = pool.filter(x => team(x) !== 'wolf');
    return shuffle(pool.slice()).slice(0, ab.n).map(x => x.id);
  };
  try {
    if (r.phase === 'vote') {
      const pool = wolf ? others.filter(x => team(x) !== 'wolf') : others;
      if (pool.length) handle({ action: 'vote', code: r.code, target: rnd(pool).id }, p);
      return;
    }
    for (const ab of ROLES[p.role].ab || []) {
      if (r.phase === 'day' && Math.random() > .15) continue; // day abilities are rare and reveal the bot
      if (!usable(r, p, ab) || (!ab.req && Math.random() > .4)) continue;
      if (ab.k === 'heal' && Math.random() > .5) continue;
      const targets = pick(ab);
      if (targets.length === ab.n) handle({ action: 'act', code: r.code, k: ab.k, targets }, p);
      if (r.phase !== 'night') return;
    }
    if (r.phase === 'night' && required(r, p)) handle({ action: 'pass', code: r.code }, p);
  } catch (e) { if (typeof e !== 'string') console.error(e); }
}

function view(r, uid) {
  const me = P(r, uid), over = r.phase === 'end', wolfTeam = me.role && team(me) === 'wolf', night = r.phase === 'night';
  const seeRole = p => over || p === me || !p.alive || p.revealed || (wolfTeam && team(p) === 'wolf') ? p.role : null;
  const vis = m => m.ch === 'sys' || m.ch === 'day' || (m.ch === 'wolf' && wolfTeam) || (m.ch === 'dead' && (!me.alive || me.role === 'medium')) || m.to === uid;
  const wt = night && plurality(tally(r.act.wolf));
  return {
    code: r.code, host: r.host, phase: r.phase, day: r.day, winner: r.winner, left: r.ends ? r.ends - Date.now() : 0, setup: r.setup, cap: cap(r),
    muted: !!(r.muted && r.muted.has(uid)),
    me: { id: me.id, role: me.role, alive: me.alive, lover: me.lover, mark: me.mark, hhTarget: me.hhTarget, notes: me.notes || {},
      tonight: night ? r.act.list.filter(x => x.by === uid).reduce((m, x) => (x.t.forEach(t => (m[t] = m[t] || []).push(x.k)), m), {}) : {} },
    abilities: (me.role && ROLES[me.role].ab || []).map(ab => ({ ...ab, left: ab.uses ? me.uses[ab.k] : null, ok: !over && usable(r, me, ab) })),
    canPass: night && required(r, me) && !r.act.done[uid],
    blocked: night && r.blocked.has(uid),
    witchTarget: night && me.role === 'witch' && wt ? P(r, wt).name : null,
    votes: r.phase === 'vote' ? r.votes : night && wolfTeam ? r.act.wolf : {},
    players: r.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, alive: p.alive, role: seeRole(p), death: p.death, won: over ? p.won : undefined })),
    msgs: r.msgs.filter(vis).slice(-150),
  };
}

const lobbies = () => Object.values(rooms).filter(r => r.phase === 'lobby')
  .map(r => ({ code: r.code, host: (P(r, r.host) || {}).name, count: r.players.length, cap: cap(r), custom: !!r.setup }));

module.exports = { rooms, userRoom, settings, hooks, handle, view, lobbies, leave, dealRoles, WIN, end };
