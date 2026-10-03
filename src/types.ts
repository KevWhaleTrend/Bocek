export type StatName = 'attack' | 'defense' | 'speed';
export type BotDifficulty = 'rookie' | 'standard' | 'elite';

export interface Character {
  id: string;
  emoji: string;
  portrait?: string;
  name: string;
  species: string;
  role: string;
  personality: string;
  strength: string;
  weakness: string;
  quote: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  ability: string;
  description: string;
  cooldown: number;
}

export interface Combatant extends Character {
  currentHp: number;
  cooldownLeft: number;
  poison: number;
  slow: number;
  armor: number;
  dodge: boolean;
  stunned: boolean;
  chaos: { up: StatName; down: StatName; turns: number } | null;
}

export interface Battle {
  player: Combatant;
  enemy: Combatant;
  round: number;
  finished: boolean;
  playerFirst: boolean;
  difficulty: BotDifficulty;
  logs: { id: number; text: string; tone?: 'damage' | 'special' }[];
  winner: string | null;
  winnerSide: 'player' | 'enemy' | 'draw' | null;
}
