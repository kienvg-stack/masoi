// Ma Sói Online — zero-dependency Node server: accounts, game API + SSE, admin site on its own host
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const game = require('./game');
const AV = require('./public/shared');

const PORT = +process.env.PORT || 3000;
const ADMIN_HOST = (process.env.ADMIN_HOST || 'admin.localhost').toLowerCase();
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data'), DB_FILE = path.join(DATA, 'db.json');
const DAY = 864e5;

// ---------- storage (single JSON file, atomic rename on save) ----------
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = {}; }
db = { users: {}, sessions: {}, settings: {}, games: [], ...db };
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db));
    fs.renameSync(DB_FILE + '.tmp', DB_FILE);
  }, 200);
}
Object.assign(game.settings.times, db.settings.times || {});
game.settings.disabled = db.settings.disabled || [];

// ---------- accounts ----------
const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const findUser = name => Object.values(db.users).find(u => u.name.toLowerCase() === String(name || '').trim().toLowerCase());
const publicUser = u => ({ id: u.id, name: u.name, avatar: u.avatar, admin: !!u.admin, stats: u.stats, room: game.userRoom[u.id] || null });

function createUser(name, password, extra = {}) {
  name = String(name || '').trim();
  if (!/^[\p{L}\p{N}_ ]{3,16}$/u.test(name)) throw 'Tên 3–16 ký tự, chỉ gồm chữ, số, dấu cách hoặc _';
  if (String(password || '').length < 6 || String(password).length > 64) throw 'Mật khẩu 6–64 ký tự';
  if (findUser(name)) throw 'Tên này đã có người dùng';
  const salt = crypto.randomBytes(16).toString('hex'), id = crypto.randomBytes(8).toString('hex');
  return db.users[id] = { id, name, salt, hash: hash(password, salt), avatar: AV.cleanAvatar(extra.avatar), stats: { games: 0, wins: 0 }, created: Date.now(), admin: !!extra.admin, banned: false };
}

if (!Object.values(db.users).some(u => u.admin)) {
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  createUser(findUser('admin') ? 'admin_' + crypto.randomBytes(2).toString('hex') : 'admin', pw, { admin: true });
  fs.mkdirSync(DATA, { recursive: true });
  const name = Object.values(db.users).find(u => u.admin).name;
  fs.writeFileSync(path.join(DATA, 'admin-credentials.txt'), `Admin site: http://${ADMIN_HOST}:${PORT}\nusername: ${name}\npassword: ${pw}\n`);
  console.log(`Đã tạo tài khoản admin — xem data/admin-credentials.txt`);
  save();
}

const fails = {}; // ip -> {n, t}: throttle password guessing
function checkPassword(ip, name, password) {
  const f = fails[ip] && Date.now() - fails[ip].t < 6e5 ? fails[ip] : (fails[ip] = { n: 0, t: Date.now() });
  if (f.n >= 10) throw 'Sai quá nhiều lần, thử lại sau 10 phút';
  const u = findUser(name);
  const ok = u && crypto.timingSafeEqual(Buffer.from(hash(password, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) { f.n++; throw 'Sai tên hoặc mật khẩu'; }
  if (u.banned) throw 'Tài khoản đã bị khóa';
  return u;
}
function newSession(u, scope) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { uid: u.id, scope, exp: Date.now() + (scope === 'admin' ? DAY : 30 * DAY) };
  save();
  return token;
}
function auth(token, scope) {
  const s = db.sessions[token];
  const u = s && s.scope === scope && s.exp > Date.now() && db.users[s.uid];
  if (!u || u.banned || (scope === 'admin' && !u.admin)) throw { auth: true };
  return u;
}

// ---------- realtime push ----------
function push(r) {
  for (const [uid, set] of r.clients) {
    if (!r.players.some(p => p.id === uid)) { set.forEach(res => res.end()); r.clients.delete(uid); continue; }
    const data = `data: ${JSON.stringify(game.view(r, uid))}\n\n`;
    set.forEach(res => res.write(data));
  }
}
game.hooks.push = push;
game.hooks.onEnd = r => {
  for (const p of r.players) {
    const u = db.users[p.id];
    if (u) { u.stats.games++; if (p.won) u.stats.wins++; }
  }
  db.games.unshift({ code: r.code, at: Date.now(), winner: r.winner, days: r.day, players: r.players.map(p => ({ name: p.name, role: p.role, won: p.won, bot: p.bot })) });
  db.games.length = Math.min(db.games.length, 200);
  save();
};

// ---------- game API ----------
function gameApi(b, token, ip) {
  if (b.action === 'register') {
    const u = createUser(b.name, b.password, { avatar: b.avatar });
    return { token: newSession(u, 'game'), user: publicUser(u) };
  }
  if (b.action === 'login') {
    const u = checkPassword(ip, b.name, b.password);
    return { token: newSession(u, 'game'), user: publicUser(u) };
  }
  const u = auth(token, 'game');
  switch (b.action) {
    case 'me': return { user: publicUser(u) };
    case 'logout': game.leave(u.id); delete db.sessions[token]; save(); return {};
    case 'avatar': u.avatar = AV.cleanAvatar(b.avatar); save(); return { user: publicUser(u) };
    case 'lobbies': return { lobbies: game.lobbies() };
    case 'leaderboard':
      return { top: Object.values(db.users).filter(x => !x.admin && x.stats.games).sort((a, c) => c.stats.wins - a.stats.wins).slice(0, 10)
        .map(x => ({ name: x.name, avatar: x.avatar, ...x.stats })) };
  }
  const out = game.handle(b, { id: u.id, name: u.name, avatar: u.avatar }) || {};
  const r = game.rooms[out.code || String(b.code || '').toUpperCase()];
  if (r) push(r);
  return out;
}

// ---------- admin API (only reachable on ADMIN_HOST) ----------
function adminApi(b, token, ip) {
  if (b.action === 'login') {
    const u = checkPassword(ip, b.name, b.password);
    if (!u.admin) throw 'Tài khoản không có quyền admin';
    return { token: newSession(u, 'admin'), name: u.name };
  }
  const me = auth(token, 'admin');
  const target = db.users[b.id];
  switch (b.action) {
    case 'overview': {
      const rooms = Object.values(game.rooms);
      return {
        users: Object.keys(db.users).length, rooms: rooms.length, playing: rooms.filter(r => !['lobby', 'end'].includes(r.phase)).length,
        online: rooms.reduce((n, r) => n + r.clients.size, 0), games: db.games.length,
        wins: db.games.reduce((m, g) => (m[g.winner] = (m[g.winner] || 0) + 1, m), {}),
      };
    }
    case 'users':
      return { users: Object.values(db.users).map(u => ({ id: u.id, name: u.name, admin: u.admin, banned: u.banned, stats: u.stats, created: u.created, avatar: u.avatar, room: game.userRoom[u.id] || null })) };
    case 'ban':
      if (!target || target === me) throw 'Không thể khóa tài khoản này';
      target.banned = !!b.banned;
      if (target.banned) { for (const [t, s] of Object.entries(db.sessions)) if (s.uid === target.id) delete db.sessions[t]; game.leave(target.id); }
      break;
    case 'setAdmin':
      if (!target || target === me) throw 'Không thể đổi quyền tài khoản này';
      target.admin = !!b.admin;
      break;
    case 'resetPassword': {
      if (!target) throw 'Không tìm thấy';
      const pw = crypto.randomBytes(6).toString('base64url');
      target.salt = crypto.randomBytes(16).toString('hex'); target.hash = hash(pw, target.salt);
      for (const [t, s] of Object.entries(db.sessions)) if (s.uid === target.id) delete db.sessions[t];
      save();
      return { password: pw };
    }
    case 'deleteUser':
      if (!target || target === me) throw 'Không thể xóa tài khoản này';
      game.leave(target.id);
      delete db.users[target.id];
      for (const [t, s] of Object.entries(db.sessions)) if (s.uid === target.id) delete db.sessions[t];
      break;
    case 'rooms':
      return { rooms: Object.values(game.rooms).map(r => ({ code: r.code, phase: r.phase, day: r.day, host: (r.players.find(p => p.id === r.host) || {}).name,
        players: r.players.map(p => ({ name: p.name, role: p.role, alive: p.alive, bot: p.bot })), online: r.clients.size })) };
    case 'closeRoom': {
      const r = game.rooms[b.code];
      if (!r) throw 'Không tìm thấy phòng';
      clearTimeout(r.timer);
      r.msgs.push({ n: ++r.seq, ch: 'sys', text: '⛔ Phòng đã bị quản trị viên đóng.' });
      r.phase = 'lobby'; push(r);
      r.players.forEach(p => delete game.userRoom[p.id]);
      r.clients.forEach(set => set.forEach(res => res.end()));
      delete game.rooms[r.code];
      break;
    }
    case 'settings':
      if (b.times) for (const k of ['night', 'day', 'vote']) game.settings.times[k] = Math.min(600, Math.max(10, +b.times[k] || game.settings.times[k]));
      if (Array.isArray(b.disabled)) game.settings.disabled = b.disabled.filter(k => AV.ROLES[k] && k !== 'werewolf' && k !== 'villager');
      db.settings = { times: game.settings.times, disabled: game.settings.disabled };
      save();
      return { settings: db.settings };
    case 'getSettings': return { settings: { times: game.settings.times, disabled: game.settings.disabled } };
    case 'games': return { games: db.games.slice(0, 50) };
    default: throw 'Hành động không hợp lệ';
  }
  save();
  return {};
}

// ---------- HTTP ----------
const STATIC = { '/': 'index.html', '/shared.js': 'shared.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function sendFile(res, file) {
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
  fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res);
}
function readJson(req, res, fn) {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 2e4) req.destroy(); });
  req.on('end', () => {
    let out, code = 200;
    try { out = fn(JSON.parse(s || '{}'), req.headers['x-token'] || '', req.socket.remoteAddress); }
    catch (e) {
      if (e && e.auth) { code = 401; out = { error: 'Phiên đăng nhập hết hạn, hãy đăng nhập lại' }; }
      else { if (typeof e !== 'string') console.error(e); out = { error: typeof e === 'string' ? e : 'Lỗi máy chủ' }; }
    }
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out || {}));
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const isAdmin = String(req.headers.host || '').split(':')[0].toLowerCase() === ADMIN_HOST;
  if (isAdmin) {
    if (u.pathname === '/admin-api' && req.method === 'POST') return readJson(req, res, adminApi);
    if (u.pathname === '/') return sendFile(res, 'admin.html');
    if (u.pathname === '/shared.js') return sendFile(res, 'shared.js');
  } else {
    if (u.pathname === '/api' && req.method === 'POST') return readJson(req, res, gameApi);
    if (u.pathname === '/events') {
      let user;
      try { user = auth(u.searchParams.get('t'), 'game'); } catch { res.writeHead(401); return res.end(); }
      const r = game.rooms[game.userRoom[user.id]];
      if (!r) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      if (!r.clients.has(user.id)) r.clients.set(user.id, new Set());
      r.clients.get(user.id).add(res);
      res.write(`data: ${JSON.stringify(game.view(r, user.id))}\n\n`);
      req.on('close', () => { const set = r.clients.get(user.id); if (set) { set.delete(res); if (!set.size) r.clients.delete(user.id); } });
      return;
    }
    if (STATIC[u.pathname]) return sendFile(res, STATIC[u.pathname]);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Ma Sói: http://localhost:${PORT}  |  Admin: http://${ADMIN_HOST}:${PORT}`));
  setInterval(() => {
    for (const r of Object.values(game.rooms)) {
      r.clients.forEach(set => set.forEach(res => res.write(':\n\n'))); // keep SSE alive through proxies
      if (['lobby', 'end'].includes(r.phase) && !r.clients.size && Date.now() - r.touched > 30 * 6e4) {
        r.players.forEach(p => delete game.userRoom[p.id]);
        delete game.rooms[r.code];
      }
    }
    for (const [t, s] of Object.entries(db.sessions)) if (s.exp < Date.now()) delete db.sessions[t];
  }, 25000);
}

module.exports = { server, db, gameApi, adminApi };
