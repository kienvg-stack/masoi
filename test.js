// Self-check of rules, accounts and admin gate: node test.js
const assert = require('assert'), os = require('os'), path = require('path'), fs = require('fs');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'masoi-'));
const game = require('./game');
const { ROLES } = require('./public/shared');
const { gameApi, adminApi, db } = require('./server');
const sleep = ms => new Promise(r => setTimeout(r, ms));
Object.assign(game.settings.times, { night: 30, day: 0.05, vote: 30 });

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
    assert.equal(roles.filter(x => ['werewolf', 'alpha_werewolf', 'wolf_seer', 'junior_werewolf', 'wolf_shaman', 'nightmare_werewolf'].includes(x)).length, Math.floor(k / 4));
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
  console.log('all checks passed');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
