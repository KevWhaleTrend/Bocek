import type { Battle, BotDifficulty, Character, Combatant, StatName } from './types';

let logId = 0;

const createFighter = (character: Character): Combatant => ({
  ...character,
  currentHp: character.hp,
  cooldownLeft: 0,
  poison: 0,
  slow: 0,
  armor: 0,
  dodge: false,
  stunned: false,
  chaos: null,
});

const addLog = (battle: Battle, text: string, tone?: 'damage' | 'special'): Battle => ({
  ...battle,
  logs: [...battle.logs, { id: ++logId, text, tone }],
});

const effectiveStat = (fighter: Combatant, stat: StatName): number => {
  const base = fighter[stat] - (stat === 'speed' && fighter.slow > 0 ? 2 : 0);
  if (!fighter.chaos) return base;
  if (fighter.chaos.up === stat) return base + 5;
  if (fighter.chaos.down === stat) return base - 1;
  return base;
};

const damage = (target: Combatant, amount: number, bypassEvasion = false, pierceMitigation = false): [Combatant, number] => {
  const evasion = Math.min(0.25, Math.max(0, effectiveStat(target, 'speed') - 4) * 0.03);
  if (!bypassEvasion && Math.random() < evasion) return [target, 0];
  const defenseFactor = pierceMitigation
    ? Math.max(0.8, 1 - effectiveStat(target, 'defense') * 0.02)
    : Math.max(0.6, 1 - effectiveStat(target, 'defense') * 0.04);
  const armorFactor = target.armor > 0 ? (pierceMitigation ? 0.86 : 0.72) : 1;
  const adjusted = Math.max(1, Math.round(amount * defenseFactor * armorFactor * 10) / 10);
  return [{ ...target, currentHp: Math.max(0, target.currentHp - adjusted) }, adjusted];
};

const withWinner = (battle: Battle): Battle => {
  const { player, enemy } = battle;
  if (player.currentHp <= 0 && enemy.currentHp <= 0) return { ...battle, finished: true, winner: 'Dövüş beraberlikle bitti.', winnerSide: 'draw' };
  if (player.currentHp <= 0) return { ...battle, finished: true, winner: `${enemy.name} kazandı!`, winnerSide: 'enemy' };
  if (enemy.currentHp <= 0) return { ...battle, finished: true, winner: `${player.name} kazandı!`, winnerSide: 'player' };
  if (battle.round > 20) {
    const playerRatio = player.currentHp / player.hp;
    const enemyRatio = enemy.currentHp / enemy.hp;
    const draw = playerRatio === enemyRatio;
    const winner = draw ? '20 tur sonunda beraberlik!' : `${playerRatio > enemyRatio ? player.name : enemy.name} HP oranıyla kazandı!`;
    return { ...battle, finished: true, winner, winnerSide: draw ? 'draw' : playerRatio > enemyRatio ? 'player' : 'enemy' };
  }
  return battle;
};

export function startBattle(player: Character, enemy: Character, difficulty: BotDifficulty = 'standard'): Battle {
  const playerFighter = createFighter(player);
  const enemyFighter = createFighter(enemy);
  const playerFirst = player.speed >= enemy.speed;
  let battle: Battle = {
    player: playerFighter,
    enemy: enemyFighter,
    round: 1,
    finished: false,
    playerFirst,
    difficulty,
    logs: [],
    winner: null,
    winnerSide: null,
  };
  battle = addLog(battle, `${player.name} ve ${enemy.name} arenaya çıktı. ${playerFirst ? `${player.name} ilk hamleyi alıyor.` : `${enemy.name} daha hızlı; ilk hamle onda.`}`);
  return battle;
}

function applySpecial(battle: Battle, actor: 'player' | 'enemy'): Battle {
  const targetKey = actor === 'player' ? 'enemy' : 'player';
  let source = battle[actor];
  let target = battle[targetKey];
  let message = '';
  switch (source.id) {
    case 'xerion': {
      let dealt: number;
      [target, dealt] = damage(target, 7);
      if (dealt > 0) target = { ...target, poison: 3, slow: 2 };
      message = dealt > 0
        ? `${source.name} Venom Strike kullandı: ${dealt} hasar, zehir ve yavaşlatma.`
        : `${target.name} hızla Venom Strike'tan sıyrıldı.`;
      break;
    }
    case 'xylith':
      source = { ...source, dodge: true };
      message = `${source.name} Phantom Leap ile kaçışa hazırlandı.`;
      break;
    case 'xarok':
      source = { ...source, armor: 2 };
      message = `${source.name} Iron Carapace ile kabuğunu güçlendirdi.`;
      break;
    case 'xyra': {
      let dealt: number;
      [target, dealt] = damage(target, 6);
      const controlled = dealt > 0 && !target.stunned;
      if (controlled) target = { ...target, stunned: true };
      message = dealt === 0
        ? `${target.name} hızla Web Snare'den sıyrıldı.`
        : `${source.name} Web Snare ile ${dealt} hasar verdi${controlled ? ' ve rakibin eylemini kesti.' : '.'}`;
      break;
    }
    case 'xenith': {
      let dealt: number;
      [target, dealt] = damage(target, 8);
      const healed = Math.min(source.hp - source.currentHp, Math.floor(dealt * 0.65));
      source = { ...source, currentHp: source.currentHp + healed };
      message = `${source.name} Blood Drain ile ${dealt} hasar verdi ve ${healed} HP kazandı.`;
      break;
    }
    case 'xull': {
      const hits: number[] = [];
      for (let i = 0; i < 3 && target.currentHp > 0; i += 1) {
        let dealt: number;
        [target, dealt] = damage(target, 4);
        hits.push(dealt);
      }
      message = `${source.name} Swarm Overload: ${hits.length} vuruş (${hits.join(' + ')}).`;
      break;
    }
    case 'xelthar': {
      const critical = Math.random() < 0.2;
      let dealt: number;
      [target, dealt] = damage(target, critical ? 16 : 11, false, true);
      message = dealt === 0
        ? `${target.name} hızla Prism Beam'den kaçtı.`
        : `${source.name} Prism Beam ile ${dealt} hasar verdi${critical ? ' — kritik vuruş!' : '.'}`;
      break;
    }
    case 'xyvora': {
      const stats: StatName[] = ['attack', 'defense', 'speed'];
      const up = stats[Math.floor(Math.random() * stats.length)];
      const downOptions = stats.filter((stat) => stat !== up);
      const down = downOptions[Math.floor(Math.random() * downOptions.length)];
      source = { ...source, chaos: { up, down, turns: 3 } };
      message = `${source.name} Chaos Shift: ${up} +5, ${down} −1 (3 tur).`;
      break;
    }
  }
  source = { ...source, cooldownLeft: source.cooldown };
  return addLog({ ...battle, [actor]: source, [targetKey]: target }, message, 'special');
}

export function playerAction(battle: Battle, special: boolean): Battle {
  if (battle.finished) return battle;
  let next = battle;
  const actor = next.player;
  let target = next.enemy;
  if (actor.stunned) {
    next = { ...next, player: { ...actor, stunned: false } };
    return addLog(next, `${actor.name} ağlara takıldı; bu tur hamle yapamıyor.`);
  }
  if (special && actor.cooldownLeft > 0) return battle;
  if (special) next = applySpecial(next, 'player');
  else {
    let dealt: number;
    [target, dealt] = damage(target, effectiveStat(actor, 'attack') + 2);
    next = { ...next, enemy: target };
    next = addLog(next, dealt === 0 ? `${target.name} hızla saldırıdan sıyrıldı.` : `${actor.name} temel saldırı yaptı: ${target.name} ${dealt} hasar aldı.`);
  }
  return withWinner(next);
}

export function computerChoosesSpecial(actor: Combatant, target: Combatant, difficulty: BotDifficulty): boolean {
  if (actor.cooldownLeft > 0) return false;
  let tacticalChoice: boolean;
  switch (actor.id) {
    case 'xerion': tacticalChoice = target.poison <= 1; break;
    case 'xylith': tacticalChoice = !actor.dodge && (actor.currentHp / actor.hp < 0.75 || Math.random() < 0.7); break;
    case 'xarok': tacticalChoice = actor.currentHp / actor.hp < 0.6 || (target.attack >= 9 && actor.armor === 0); break;
    case 'xyra': tacticalChoice = !target.stunned; break;
    case 'xenith': tacticalChoice = actor.hp - actor.currentHp >= 8; break;
    case 'xull': tacticalChoice = target.currentHp > 20; break;
    case 'xelthar': tacticalChoice = target.currentHp > 30 || actor.currentHp / actor.hp < 0.5; break;
    case 'xyvora': tacticalChoice = Math.random() < 0.6; break;
    default: tacticalChoice = false;
  }
  if (difficulty === 'rookie') return tacticalChoice && Math.random() < 0.45;
  if (difficulty === 'elite') {
    if (actor.currentHp / actor.hp < 0.25) return true;
    if (actor.id === 'xelthar' && target.currentHp <= 16) return true;
    if (actor.id === 'xenith' && actor.currentHp / actor.hp < 0.45) return true;
    return tacticalChoice;
  }
  return tacticalChoice;
}

function tick(fighter: Combatant): [Combatant, number] {
  let current = { ...fighter };
  let poisonDamage = 0;
  if (current.poison > 0) {
    poisonDamage = 2;
    current.currentHp = Math.max(0, current.currentHp - poisonDamage);
    current.poison -= 1;
  }
  if (current.slow > 0) current.slow -= 1;
  if (current.armor > 0) current.armor -= 1;
  if (current.cooldownLeft > 0) current.cooldownLeft -= 1;
  if (current.chaos) {
    current.chaos = { ...current.chaos, turns: current.chaos.turns - 1 };
    if (current.chaos.turns <= 0) current.chaos = null;
  }
  return [current, poisonDamage];
}

export function enemyTurn(battle: Battle, advanceRound = true): Battle {
  if (battle.finished) return battle;
  let next = battle;
  let actor = next.enemy;
  let target = next.player;
  if (actor.stunned) {
    actor = { ...actor, stunned: false };
    next = { ...next, enemy: actor };
    next = addLog(next, `${actor.name} ağa takıldı; hamlesi iptal oldu.`);
  } else {
    const useSpecial = computerChoosesSpecial(actor, target, battle.difficulty);
    if (useSpecial) next = applySpecial(next, 'enemy');
    else if (target.dodge) {
      target = { ...target, dodge: false };
      const leapChance = Math.min(0.8, 0.57 + Math.max(0, effectiveStat(target, 'speed') - 4) * 0.02);
      if (Math.random() < leapChance) {
        let counter: number;
        [actor, counter] = damage(actor, 7);
        next = { ...next, enemy: actor, player: target };
        next = addLog(next, `${target.name} saldırıdan sıyrıldı ve ${counter} hasarlı karşı saldırı yaptı!`, 'special');
      } else {
        let dealt: number;
        [target, dealt] = damage(target, Math.ceil((effectiveStat(actor, 'attack') + 2) * 0.5), true);
        next = { ...next, player: target };
        next = addLog(next, `${target.name} kaçamadı; Phantom Leap darbeyi hafifletti ve ${dealt} hasar aldı.`);
      }
    } else {
      const attack = effectiveStat(actor, 'attack');
      let dealt: number;
      [target, dealt] = damage(target, attack + 2);
      next = { ...next, player: target };
      next = addLog(next, dealt === 0 ? `${target.name} hızla ${actor.name}'in saldırısından sıyrıldı.` : `${actor.name} temel saldırı yaptı: ${dealt} hasar.`);
    }
  }

  let playerPoison: number;
  let enemyPoison: number;
  [next.player, playerPoison] = tick(next.player);
  [next.enemy, enemyPoison] = tick(next.enemy);
  if (playerPoison) next = addLog(next, `${next.player.name} zehirden ${playerPoison} hasar aldı.`, 'damage');
  if (enemyPoison) next = addLog(next, `${next.enemy.name} zehirden ${enemyPoison} hasar aldı.`, 'damage');
  if (advanceRound) next = { ...next, round: next.round + 1 };
  return withWinner(next);
}
