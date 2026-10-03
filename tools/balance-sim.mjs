import { roster } from '../src/roster.ts';
import { computerChoosesSpecial, enemyTurn, playerAction, startBattle } from '../src/game.ts';

const samples = Math.max(1, Number.parseInt(process.argv[2] ?? '250', 10) || 250);
const totals = new Map(roster.map((character) => [character.id, { name: character.name, wins: 0, losses: 0, draws: 0 }]));
const matchups = new Map();

function play(player, enemy) {
  let battle = startBattle(player, enemy, 'standard');
  if (!battle.playerFirst) battle = enemyTurn(battle, false);
  while (!battle.finished) {
    battle = playerAction(battle, computerChoosesSpecial(battle.player, battle.enemy, battle.difficulty));
    if (!battle.finished) battle = enemyTurn(battle);
  }
  return battle.winnerSide;
}

function record(player, enemy, outcome) {
  const p = totals.get(player.id);
  const e = totals.get(enemy.id);
  if (outcome === 'draw') {
    p.draws += 1;
    e.draws += 1;
  } else if (outcome === 'player') {
    p.wins += 1;
    e.losses += 1;
  } else {
    p.losses += 1;
    e.wins += 1;
  }
}

for (let i = 0; i < roster.length; i += 1) {
  for (let j = i + 1; j < roster.length; j += 1) {
    const left = roster[i];
    const right = roster[j];
    let leftWins = 0;
    let rightWins = 0;
    let draws = 0;
    for (let sample = 0; sample < samples; sample += 1) {
      const first = play(left, right);
      record(left, right, first);
      if (first === 'player') leftWins += 1;
      else if (first === 'enemy') rightWins += 1;
      else draws += 1;

      const reverse = play(right, left);
      record(right, left, reverse);
      if (reverse === 'player') rightWins += 1;
      else if (reverse === 'enemy') leftWins += 1;
      else draws += 1;
    }
    matchups.set(`${left.name} / ${right.name}`, { leftWins, rightWins, draws });
  }
}

console.log(`Balanced bot matchup simulation · ${samples * 2} games per pairing · standard difficulty`);
console.log('Character win rates (all pairings, both player positions):');
for (const { name, wins, losses, draws } of totals.values()) {
  const games = wins + losses + draws;
  const rate = games ? ((wins + draws / 2) / games) * 100 : 0;
  console.log(`${name.padEnd(10)} ${rate.toFixed(1).padStart(5)}%   W ${wins} / L ${losses} / D ${draws}`);
}

const ranked = [...matchups.entries()].map(([pair, result]) => {
  const games = result.leftWins + result.rightWins + result.draws;
  const rate = games ? Math.max(result.leftWins, result.rightWins) / games : 0;
  return { pair, ...result, rate };
}).sort((a, b) => b.rate - a.rate).slice(0, 8);
console.log('\nMost lopsided pairings (winner-side rate):');
for (const item of ranked) console.log(`${item.pair.padEnd(24)} ${(item.rate * 100).toFixed(1)}%  (${item.leftWins} / ${item.rightWins} / ${item.draws})`);

if (process.argv.includes('--matrix')) {
  console.log('\nHead-to-head matrix (row character win rate; 50% is even):');
  console.log(`Character  ${roster.map((character) => character.name.padStart(9)).join(' ')}`);
  for (const row of roster) {
    const values = roster.map((column) => {
      if (row.id === column.id) return '   —';
      const key = roster.indexOf(row) < roster.indexOf(column) ? `${row.name} / ${column.name}` : `${column.name} / ${row.name}`;
      const result = matchups.get(key);
      const rowWins = roster.indexOf(row) < roster.indexOf(column) ? result.leftWins : result.rightWins;
      const games = result.leftWins + result.rightWins + result.draws;
      return `${((rowWins + result.draws / 2) / games * 100).toFixed(0).padStart(3)}%`;
    });
    console.log(`${row.name.padEnd(10)} ${values.map((value) => value.padStart(9)).join(' ')}`);
  }
}
