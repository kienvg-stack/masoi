// Self-check of rules, accounts and admin gate: node test.js
const assert = require('assert'), os = require('os'), path = require('path'), fs = require('fs');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'masoi-'));
const game = require('./game');
const { ROLES } = require('./public/shared');
const { gameApi, adminApi, db } = require('./server');
const sleep = ms => new Promise(r => setTimeout(r, ms));
Object.assign(game.settings.times, { night: 30, day: 0.05, vote: 30 });
game.settings.early = true;

let n = 0;
function setup(roles) {
  const users = roles.map(() => ({ id: 'u' + ++n, name: 'P' + n, avatar: {} }));
  const { code } = game.handle({ action: 'create' }, users[0]);
  users.slice(1).forEach(u => game.handle({ action: 'join', code }, u));
  game.handle({ action: 'start', code }, users[0]);
  const r = game.rooms[code];
  r.players.forEach((p, i) => { p.role = roles[i]; p.uses = Object.fromEntries((ROLES[roles[i]].ab || []).filter(a => a.uses).map(a => [a.k, a.uses])); });
  const act = (i, k, ...t) => game.handle({ action: 'act', code, k, targets: t.map(x => users[x].id) }, users[i]);
  const vote = (i, t) => game.handle({ action: 'vote', code, target: users[t].id }, users[i]);
  const pass = i => game.handle({ action: 'pass', code }, users[i]);
  return { r, act, vote, pass, dead: i => !r.players[i].alive };
}

(async () => {
  // dealing respects counts
  for (let k = 4; k <= 16; k++) {
    const roles = game.dealRoles(k);
    assert.equal(roles.length, k);
    assert.equal(roles.filter(x => ROLES[x].t === 'wolf').length, Math.floor(k / 4));
  }

  // wolf kills villager, seer learns wolf role, then lynch the wolf -> village wins
  {
    const { r, act, vote, dead } = setup(['werewolf', 'seer', 'doctor', 'villager']);
    act(0, 'kill', 3); act(1, 'see', 0); act(2, 'protect', 1);
    assert(dead(3) && r.phase === 'day');
    assert(r.msgs.some(m => m.fx === 'see' && m.role === 'werewolf'));
    await sleep(100);
    assert.equal(r.phase, 'vote');
    vote(0, 1); vote(1, 0); vote(2, 0);
    assert.equal(r.winner, 'village');
    assert(r.players[1].won && !r.players[0].won);
  }

  // bodyguard absorbs the bite once; doctor blocks it
  {
    const { r, act, dead } = setup(['werewolf', 'bodyguard', 'villager', 'villager', 'doctor']);
    act(0, 'kill', 2); act(1, 'guard', 2); act(4, 'protect', 3);
    assert(!dead(1) && !dead(2) && r.players[1].shieldUsed);
  }

  // cupid lovers die together; red lady dies visiting the wolf
  {
    const { act, dead } = setup(['werewolf', 'cupid', 'villager', 'villager', 'red_lady', 'villager']);
    act(1, 'link', 2, 3); act(4, 'visit', 0); act(0, 'kill', 3);
    assert(dead(3) && dead(2) && dead(4));
  }

  // serial killer is immune to wolves and kills
  {
    const { act, dead } = setup(['werewolf', 'serial_killer', 'villager', 'villager', 'villager']);
    act(0, 'kill', 1); act(1, 'stab', 2);
    assert(!dead(1) && dead(2));
  }

  // fool wins when lynched; priest kills a wolf with holy water
  {
    const { r, act, vote } = setup(['werewolf', 'fool', 'villager', 'villager', 'priest']);
    act(0, 'kill', 2); await sleep(100);
    vote(0, 1); vote(1, 0); vote(3, 1); vote(4, 1);
    assert.equal(r.winner, 'fool');
  }
  {
    const { r, act, dead } = setup(['werewolf', 'villager', 'villager', 'villager', 'priest']);
    act(0, 'kill', 1);
    act(4, 'water', 0);
    assert(dead(0) && r.winner === 'village');
  }

  // witch passes; avenger drags its mark along
  {
    const { act, pass, dead } = setup(['werewolf', 'witch', 'villager', 'villager', 'avenger', 'villager', 'werewolf', 'villager']);
    act(4, 'mark', 6); act(0, 'kill', 4); act(6, 'kill', 4); pass(1);
    assert(dead(4) && dead(6));
  }

  // accounts: register, wrong password rejected, non-admin cannot use admin API
  {
    const reg = gameApi({ action: 'register', name: 'Kien', password: 'secret123' }, '', 'ip1');
    assert(reg.token && reg.user.name === 'Kien');
    assert.throws(() => gameApi({ action: 'register', name: 'kien', password: 'secret123' }, '', 'ip1'));
    assert.throws(() => gameApi({ action: 'login', name: 'Kien', password: 'nope' }, '', 'ip1'));
    assert(gameApi({ action: 'login', name: 'Kien', password: 'secret123' }, '', 'ip1').token);
    assert.throws(() => adminApi({ action: 'login', name: 'Kien', password: 'secret123' }, '', 'ip1'), /admin/);
    assert.throws(() => adminApi({ action: 'overview' }, reg.token, 'ip1'), e => e.auth);
    assert(!Object.values(db.users).find(u => u.name === 'Kien').hash.includes('secret'));
  }
  // beast hunter's trap stops the bite and kills a wolf
  {
    const { r, act, dead } = setup(['werewolf', 'beast_hunter', 'villager', 'villager', 'villager', 'werewolf', 'villager', 'villager']);
    act(1, 'trap', 2); act(0, 'kill', 2); act(5, 'kill', 2);
    assert(!dead(2) && r.players.filter(p => !p.alive && ROLES[p.role].t === 'wolf').length === 1);
  }
  // cursed turns into a wolf instead of dying; seer apprentice inherits the seer
  {
    const { r, act, dead } = setup(['werewolf', 'cursed', 'seer', 'seer_apprentice', 'villager', 'villager', 'villager', 'villager']);
    act(0, 'kill', 1); act(2, 'see', 0);
    assert(!dead(1) && r.players[1].role === 'werewolf');
  }
  {
    const { r, act } = setup(['werewolf', 'seer', 'seer_apprentice', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(0, 'kill', 1); act(1, 'see', 0);
    assert(!r.players[1].alive && r.players[2].role === 'seer');
  }
  // pacifist cancels the lynch; grumpy grandma mutes a voter
  {
    const { r, act, vote } = setup(['werewolf', 'pacifist', 'grumpy_grandma', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(0, 'kill', 7); act(2, 'mute', 3);
    await sleep(100);
    assert.throws(() => vote(3, 0), /không được bỏ phiếu/);
    act(1, 'peace', 0);
    [1, 2, 4, 5, 6].forEach(i => vote(i, 0)); vote(0, 1);
    assert(r.players[0].alive && r.players[0].revealed);
  }
  // bomb goes off the night after, hitting the neighbours
  {
    const { r, act, dead } = setup(['werewolf', 'villager', 'villager', 'bomber', 'villager', 'villager', 'villager', 'villager']);
    act(3, 'bomb', 5); act(0, 'kill', 1);
    assert(!dead(5) && dead(1));
    await sleep(100);
    // everyone votes a different person: tie, nobody lynched, night 2 begins
    const live = r.players.filter(p => p.alive);
    live.forEach((p, i) => game.handle({ action: 'vote', code: r.code, target: live[(i + 1) % live.length].id }, p));
    if (r.phase === 'vote') { clearTimeout(r.timer); }
    assert.equal(r.phase, 'night');
    act(0, 'kill', 2); act(3, 'bomb', 7);
    assert(dead(4) && dead(5) && dead(6) && !dead(3));
  }
  // custom room: setup rules and capacity
  {
    const { checkSetup } = require('./public/shared');
    assert(checkSetup(['werewolf', 'werewolf', 'seer', 'villager']).errors.length);
    assert(checkSetup(['villager', 'seer', 'doctor', 'villager']).errors.some(e => /Ma sói/.test(e)));
    assert(checkSetup(['werewolf', 'seer', 'seer', 'villager', 'villager']).errors.some(e => /tối đa 1/.test(e)));
    assert.deepEqual(checkSetup(['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'fool', 'bodyguard']).errors, []);
    const host = { id: 'h1', name: 'H', avatar: {} };
    assert.throws(() => game.handle({ action: 'create', setup: ['werewolf', 'werewolf', 'villager', 'villager'] }, host));
    const { code } = game.handle({ action: 'create', setup: ['werewolf', 'seer', 'villager', 'villager'] }, host);
    const room = game.rooms[code];
    for (let i = 0; i < 3; i++) game.handle({ action: 'addbot', code }, host);
    assert.throws(() => game.handle({ action: 'addbot', code }, host), /đầy/);
    game.handle({ action: 'start', code }, host);
    assert.deepEqual(room.players.map(p => p.role).sort(), ['seer', 'villager', 'villager', 'werewolf']);
  }
  // private notes: seer remembers the role, arsonist sees who is doused
  {
    const { r, act } = setup(['werewolf', 'seer', 'arsonist', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(1, 'see', 0); act(2, 'douse', 3, 4); act(0, 'kill', 7);
    const v = id => game.view(r, r.players[id].id).me.notes;
    assert.equal(v(1)[r.players[0].id].role, 'werewolf');
    assert(v(2)[r.players[3].id].douse && v(2)[r.players[4].id].douse);
    assert.deepEqual(v(3), {});
  }
  // picks show at once: bomber sees the bomb before night ends, doctor sees tonight's patient
  {
    const { r, act } = setup(['werewolf', 'bomber', 'doctor', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(1, 'bomb', 4); act(2, 'protect', 5);
    const me = i => game.view(r, r.players[i].id).me;
    assert.equal(r.phase, 'night');
    assert(me(1).notes[r.players[4].id].bomb);
    assert.deepEqual(me(2).tonight[r.players[5].id], ['protect']);
  }
  console.log('all checks passed');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
