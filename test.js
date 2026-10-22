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
  const act = (i, k, ...t) => { try { return game.handle({ action: 'act', code, k, targets: t.map(x => users[x].id) }, users[i]); } catch (e) { throw typeof e === 'string' ? new Error(`${roles[i]} ${k} (${r.phase} ${r.day}): ${e}`) : e; } };
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
    assert(r.msgs.some(m => m.to === r.players[3].id && /Hạ gục: số 5 .*số 6 .*số 7/.test(m.text)));
  }
  // a protected neighbour survives the blast and the bomber is told so
  {
    const { r, act, pass, dead } = setup(['werewolf', 'villager', 'doctor', 'bomber', 'villager', 'villager', 'villager', 'villager']);
    act(3, 'bomb', 5); act(0, 'kill', 1); act(2, 'protect', 4);
    await sleep(100);
    const live = r.players.filter(p => p.alive);
    live.forEach((p, i) => game.handle({ action: 'vote', code: r.code, target: live[(i + 1) % live.length].id }, p));
    if (r.phase === 'vote') clearTimeout(r.timer);
    act(0, 'kill', 7); act(2, 'protect', 4); pass(3);
    assert(!dead(4) && dead(5) && dead(6));
    assert(r.msgs.some(m => m.to === r.players[3].id && /số 5 .* được bảo vệ/.test(m.text)));
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
  // ---- one check per role description ----
  const V6 = Array(6).fill('villager');
  const tie = r => { const live = r.players.filter(p => p.alive && !(r.muted && r.muted.has(p.id))); live.forEach((p, i) => game.handle({ action: 'vote', code: r.code, target: live[(i + 1) % live.length].id }, p)); };
  const notes = (r, i) => game.view(r, r.players[i].id).me.notes;
  const id = (r, i) => r.players[i].id;
  // aura seer + detective, and the wolf shaman's spell fools the aura seer
  {
    const { r, act, dead } = setup(['werewolf', 'aura_seer', 'detective', 'wolf_shaman', 'villager', 'villager', 'villager', 'villager']);
    act(3, 'enchant', 4); act(1, 'aura', 4); act(2, 'compare', 0, 5); act(0, 'kill', 7); act(3, 'kill', 7);
    assert(dead(7));
    assert.equal(notes(r, 1)[id(r, 4)].aura, 'evil');
    assert.equal(notes(r, 2)[id(r, 0)].cmp.same, false);
  }
  // alpha werewolf's vote counts double
  {
    const { act, dead } = setup(['alpha_werewolf', 'werewolf', ...V6]);
    act(0, 'kill', 4); act(1, 'kill', 5);
    assert(dead(4) && !dead(5));
  }
  // wolf seer sees the real role
  {
    const { r, act } = setup(['wolf_seer', 'villager', 'doctor', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(0, 'see', 2); act(2, 'protect', 2); act(0, 'kill', 7);
    assert.equal(notes(r, 0)[id(r, 2)].role, 'doctor');
  }
  // junior werewolf drags its mark; priest's holy water kills a wolf
  {
    const { act, dead } = setup(['junior_werewolf', 'priest', ...V6]);
    act(0, 'mark', 3); act(0, 'kill', 4);
    await sleep(100);
    act(1, 'water', 0);
    assert(dead(0) && dead(3) && !dead(1));
  }
  // nightmare blocks the seer on the next night
  {
    const { r, act } = setup(['nightmare_werewolf', 'seer', ...V6]);
    act(0, 'nightmare', 1); act(1, 'see', 0); act(0, 'kill', 7);
    await sleep(100); tie(r);
    assert.equal(r.phase, 'night');
    assert.throws(() => act(1, 'see', 0));
    assert(game.view(r, id(r, 1)).blocked);
  }
  // headhunter wins when the target is lynched, becomes a villager if the target dies otherwise
  {
    const { r, act, vote } = setup(['werewolf', 'headhunter', ...V6]);
    r.players[1].hhTarget = id(r, 2);
    act(0, 'kill', 7); await sleep(100);
    [0, 1, 3, 4, 5, 6].forEach(i => vote(i, 2)); vote(2, 3);
    assert.equal(r.winner, 'headhunter');
  }
  {
    const { r, act } = setup(['werewolf', 'headhunter', ...V6]);
    r.players[1].hhTarget = id(r, 2);
    act(0, 'kill', 2);
    assert.equal(r.players[1].role, 'villager');
  }
  // tough guy survives the bite and dies at the end of that day
  {
    const { r, act, dead } = setup(['werewolf', 'tough_guy', ...V6]);
    act(0, 'kill', 1);
    assert(!dead(1));
    await sleep(100); tie(r);
    assert(dead(1));
  }
  // gunner shoots a wolf by day and is revealed
  {
    const { r, act } = setup(['werewolf', 'gunner', ...V6]);
    act(0, 'kill', 7); await sleep(20);
    act(1, 'shoot', 0);
    assert(r.winner === 'village' && r.players[1].revealed);
  }
  // revealed mayor's vote counts double
  {
    const { r, act, vote, dead } = setup(['werewolf', 'mayor', ...V6]);
    act(0, 'kill', 7); await sleep(20);
    act(1, 'reveal'); await sleep(100);
    vote(1, 2); vote(0, 2); vote(3, 6); vote(4, 6); vote(2, 5); vote(5, 4); vote(6, 5);
    assert(dead(2) && !dead(6));
  }
  // medium talks with the dead at night and revives a villager
  {
    const { r, act, dead } = setup(['werewolf', 'medium', ...V6]);
    act(0, 'kill', 2); await sleep(100); tie(r);
    game.handle({ action: 'chat', code: r.code, text: 'hi' }, r.players[1]);
    assert.equal(r.msgs[r.msgs.length - 1].ch, 'dead');
    act(1, 'revive', 2); act(0, 'kill', 7);
    assert(!dead(2) && dead(7));
  }
  // loudmouth reveals its mark on death
  {
    const { r, act } = setup(['werewolf', 'loudmouth', ...V6]);
    act(1, 'mark', 0); act(0, 'kill', 1);
    assert(r.players[0].revealed && game.view(r, id(r, 3)).players[0].role === 'werewolf');
  }
  // flower child and guardian wolf stop a lynch
  {
    const { act, vote, dead } = setup(['werewolf', 'flower_child', ...V6]);
    act(0, 'kill', 7); await sleep(20);
    act(1, 'flower', 3); await sleep(100);
    [0, 1, 2, 4, 5, 6].forEach(i => vote(i, 3)); vote(3, 2);
    assert(!dead(3));
  }
  {
    const { act, vote, dead } = setup(['guardian_wolf', 'werewolf', ...V6]);
    act(0, 'kill', 7); act(1, 'kill', 7); await sleep(20);
    act(0, 'save', 1); await sleep(100);
    [0, 2, 3, 4, 5, 6].forEach(i => vote(i, 1)); vote(1, 2);
    assert(!dead(1));
  }
  // kitten wolf converts the prey
  {
    const { r, act, dead } = setup(['kitten_wolf', 'werewolf', ...V6]);
    act(0, 'convert'); act(0, 'kill', 3); act(1, 'kill', 3);
    assert(!dead(3) && r.players[3].role === 'werewolf');
  }
  // spirit seer learns a killer is in the pair
  {
    const { r, act } = setup(['werewolf', 'spirit_seer', ...V6]);
    act(1, 'spirit', 0, 2); act(0, 'kill', 7);
    assert.equal(notes(r, 1)[id(r, 0)].spirit.yes, true);
  }
  // corruptor: target cannot talk or vote and dies at the end of the day
  {
    const { r, act, dead } = setup(['werewolf', 'corruptor', ...V6]);
    act(1, 'glitch', 3); act(0, 'kill', 7);
    await sleep(100);
    assert.throws(() => game.handle({ action: 'chat', code: r.code, text: 'x' }, r.players[3]));
    assert.throws(() => game.handle({ action: 'vote', code: r.code, target: id(r, 0) }, r.players[3]));
    tie(r);
    assert(dead(3));
  }
  // witch heals the bite and poisons in the same night
  {
    const { act, dead } = setup(['werewolf', 'witch', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager']);
    act(0, 'kill', 3); act(1, 'heal'); act(1, 'poison', 4); act(2, 'see', 0);
    assert(!dead(3) && dead(4));
  }
  // arsonist ignites everyone doused
  {
    const { r, act, dead } = setup(['werewolf', 'arsonist', ...V6]);
    act(1, 'douse', 3, 4); act(0, 'kill', 7);
    assert(!dead(3) && !dead(4));
    await sleep(100); tie(r);
    act(1, 'ignite'); act(0, 'kill', 6);
    assert(dead(3) && dead(4) && dead(6));
  }
  // wolves whisper at night; villagers cannot talk at night
  {
    const { r } = setup(['werewolf', 'villager', ...V6]);
    game.handle({ action: 'chat', code: r.code, text: 'an ai' }, r.players[0]);
    assert(game.view(r, id(r, 0)).msgs.some(m => m.text === 'an ai') && !game.view(r, id(r, 1)).msgs.some(m => m.text === 'an ai'));
    assert.throws(() => game.handle({ action: 'chat', code: r.code, text: 'x' }, r.players[1]));
  }
  console.log('all checks passed');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
