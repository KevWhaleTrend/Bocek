import type { Battle } from './types';

export const PROFILE_KEY = 'arenaProfile-v1';
export function getXProfileStorageKey(xUserId: string) {
  return `${PROFILE_KEY}-x-${xUserId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
const LEGACY_CAREER_KEY = 'agent-arena-career-v1';
const SEASON_LENGTH_DAYS = 30;

export interface DailyQuest {
  id: string;
  title: string;
  kind: 'matches' | 'wins' | 'specials' | 'character';
  goal: number;
  progress: number;
  rewardXp: number;
  claimed: boolean;
  characterId?: string;
}

export interface ProfileMatch {
  id: string;
  player: string;
  opponent: string;
  playerId?: string;
  opponentId?: string;
  outcome: 'W' | 'L' | 'D';
  round: number;
  date: string;
  damageDealt?: number;
  specialUses?: number;
  xpEarned?: number;
}

export interface CharacterMastery {
  matches: number;
  wins: number;
  xp: number;
}

export interface ArenaSeason {
  number: number;
  startDate: string;
  matches: number;
  wins: number;
  bestStreak: number;
  xp: number;
}

export interface ArenaProfile {
  version: 1;
  totalXp: number;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  currentWinStreak: number;
  bestWinStreak: number;
  lifetimeSpecialUses: number;
  lastMatches: ProfileMatch[];
  dailyDate: string;
  dailyQuests: DailyQuest[];
  achievements: string[];
  characterMastery: Record<string, CharacterMastery>;
  season: ArenaSeason;
  seasonBadges: string[];
}

export interface MatchProgressResult {
  profile: ArenaProfile;
  earnedXp: number;
  levelBefore: number;
  levelAfter: number;
  completedQuests: string[];
  unlockedAchievements: string[];
}

export const achievements = [
  { id: 'first-victory', title: 'First Blood', description: 'İlk maçını kazan.', goal: '1 galibiyet' },
  { id: 'xerion-10', title: 'Venomous', description: 'Xerion ile 10 maç kazan.', goal: '10 Xerion galibiyeti' },
  { id: 'xylith-10', title: 'Ghost Step', description: 'Xylith ile 10 maç kazan.', goal: '10 Xylith galibiyeti' },
  { id: 'xarok-20', title: 'The Wall', description: 'Xarok ile 20 maç kazan.', goal: '20 Xarok galibiyeti' },
  { id: 'xenith-10', title: 'Blood Pact', description: 'Xenith ile 10 maç kazan.', goal: '10 Xenith galibiyeti' },
  { id: 'xull-10', title: 'Swarm Commander', description: 'Xull ile 10 maç kazan.', goal: '10 Xull galibiyeti' },
  { id: 'xelthar-10', title: 'Prism Master', description: 'Xel’thar ile 10 maç kazan.', goal: '10 Xel’thar galibiyeti' },
  { id: 'xyvora-10', title: 'Chaos Agent', description: 'Xyvora ile 10 maç kazan.', goal: '10 Xyvora galibiyeti' },
  { id: 'untouchable-win', title: 'Flawless Victory', description: 'Hiç hasar almadan bir maç kazan.', goal: 'Tam HP ile galibiyet' },
  { id: 'veteran-100', title: 'Veteran', description: '100 maç tamamla.', goal: '100 maç' },
  { id: 'streak-5', title: 'Win Streak', description: 'Üst üste 5 maç kazan.', goal: '5 maçlık seri' },
  { id: 'specialist-25', title: 'Ability Specialist', description: '25 özel yetenek kullan.', goal: '25 yetenek kullanımı' },
] as const;

const characterDailyMissions = [
  { id: 'xerion', name: 'Xerion' },
  { id: 'xylith', name: 'Xylith' },
  { id: 'xarok', name: 'Xarok' },
  { id: 'xyra', name: 'Xyra' },
  { id: 'xenith', name: 'Xenith' },
  { id: 'xull', name: 'Xull' },
  { id: 'xelthar', name: 'Xel’thar' },
  { id: 'xyvora', name: 'Xyvora' },
];

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAtLocalMidnight(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function wholeDaysBetween(start: string, end: string): number {
  const toUtcDay = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  return Math.floor((toUtcDay(end) - toUtcDay(start)) / 86_400_000);
}

function dailyQuestSet(date: string): DailyQuest[] {
  const seed = Number(date.replaceAll('-', '')) || 1;
  const mission = characterDailyMissions[seed % characterDailyMissions.length]!;
  const rotateCharacter = Math.floor(seed / 10) % 2 === 0;
  const thirdQuest: DailyQuest = rotateCharacter
    ? { id: `character-${mission.id}`, title: `${mission.name} ile 2 maç oyna`, kind: 'character', characterId: mission.id, goal: 2, progress: 0, rewardXp: 35, claimed: false }
    : { id: 'special-uses', title: '3 özel yetenek kullan', kind: 'specials', goal: 3, progress: 0, rewardXp: 35, claimed: false };

  return [
    { id: 'matches-3', title: '3 maç tamamla', kind: 'matches', goal: 3, progress: 0, rewardXp: 30, claimed: false },
    { id: 'win-1', title: '1 maç kazan', kind: 'wins', goal: 1, progress: 0, rewardXp: 40, claimed: false },
    thirdQuest,
  ];
}

function emptyProfile(date = localDateKey()): ArenaProfile {
  return {
    version: 1,
    totalXp: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    lifetimeSpecialUses: 0,
    lastMatches: [],
    dailyDate: date,
    dailyQuests: dailyQuestSet(date),
    achievements: [],
    characterMastery: {},
    season: { number: 1, startDate: date, matches: 0, wins: 0, bestStreak: 0, xp: 0 },
    seasonBadges: [],
  };
}

function validMatch(value: unknown): value is ProfileMatch {
  if (!value || typeof value !== 'object') return false;
  const match = value as Partial<ProfileMatch>;
  return typeof match.id === 'string' && typeof match.player === 'string' && typeof match.opponent === 'string'
    && (match.outcome === 'W' || match.outcome === 'L' || match.outcome === 'D')
    && typeof match.round === 'number' && typeof match.date === 'string';
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizeSeason(profile: ArenaProfile, today: string): ArenaProfile {
  let season = { ...profile.season };
  const badges = [...profile.seasonBadges];
  while (wholeDaysBetween(season.startDate, today) >= SEASON_LENGTH_DAYS) {
    if (season.matches >= 20) {
      const badge = `Season ${season.number} Contender`;
      if (!badges.includes(badge)) badges.push(badge);
    }
    const nextSeasonStart = dateAtLocalMidnight(season.startDate);
    nextSeasonStart.setDate(nextSeasonStart.getDate() + SEASON_LENGTH_DAYS);
    season = {
      number: season.number + 1,
      startDate: localDateKey(nextSeasonStart),
      matches: 0,
      wins: 0,
      bestStreak: 0,
      xp: 0,
    };
  }
  return { ...profile, season, seasonBadges: badges };
}

function normalizeProfile(profile: ArenaProfile, today = localDateKey()): ArenaProfile {
  const dayProfile = profile.dailyDate === today
    ? profile
    : { ...profile, dailyDate: today, dailyQuests: dailyQuestSet(today) };
  return normalizeSeason(dayProfile, today);
}

export function refreshArenaProfile(profile: ArenaProfile): ArenaProfile {
  return normalizeProfile(profile);
}

function readLegacyProfile(today: string): ArenaProfile {
  const fallback = emptyProfile(today);
  try {
    const raw = localStorage.getItem(LEGACY_CAREER_KEY);
    if (!raw) return fallback;
    const old = JSON.parse(raw) as Record<string, unknown>;
    const wins = safeCount(old.wins);
    const losses = safeCount(old.losses);
    const draws = safeCount(old.draws);
    const matches = wins + losses + draws;
    const oldMatches = Array.isArray(old.lastMatches) ? old.lastMatches.filter(validMatch).slice(0, 20) : [];
    return {
      ...fallback,
      totalXp: matches * 25 + wins * 35,
      totalMatches: matches,
      wins,
      losses,
      draws,
      currentWinStreak: safeCount(old.streak),
      bestWinStreak: safeCount(old.streak),
      lastMatches: oldMatches,
    };
  } catch {
    return fallback;
  }
}

export function readArenaProfile(storageKey = PROFILE_KEY): ArenaProfile {
  const today = localDateKey();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return storageKey === PROFILE_KEY ? readLegacyProfile(today) : emptyProfile(today);
    const saved = JSON.parse(raw) as Partial<ArenaProfile>;
    const base = emptyProfile(today);
    const profile: ArenaProfile = {
      ...base,
      ...saved,
      version: 1,
      totalXp: safeCount(saved.totalXp),
      totalMatches: safeCount(saved.totalMatches),
      wins: safeCount(saved.wins),
      losses: safeCount(saved.losses),
      draws: safeCount(saved.draws),
      currentWinStreak: safeCount(saved.currentWinStreak),
      bestWinStreak: safeCount(saved.bestWinStreak),
      lifetimeSpecialUses: safeCount(saved.lifetimeSpecialUses),
      lastMatches: Array.isArray(saved.lastMatches) ? saved.lastMatches.filter(validMatch).slice(0, 20) : [],
      dailyDate: typeof saved.dailyDate === 'string' ? saved.dailyDate : today,
      dailyQuests: Array.isArray(saved.dailyQuests) ? saved.dailyQuests as DailyQuest[] : base.dailyQuests,
      achievements: Array.isArray(saved.achievements) ? saved.achievements.filter((id): id is string => typeof id === 'string') : [],
      characterMastery: saved.characterMastery && typeof saved.characterMastery === 'object' ? saved.characterMastery : {},
      season: saved.season && typeof saved.season === 'object' ? { ...base.season, ...saved.season } : base.season,
      seasonBadges: Array.isArray(saved.seasonBadges) ? saved.seasonBadges.filter((badge): badge is string => typeof badge === 'string') : [],
    };
    return normalizeProfile(profile, today);
  } catch {
    return storageKey === PROFILE_KEY ? readLegacyProfile(today) : emptyProfile(today);
  }
}

export function getLevelProgress(totalXp: number) {
  let remainingXp = Math.max(0, totalXp);
  let level = 1;
  let nextLevelXp = 100;
  while (remainingXp >= nextLevelXp) {
    remainingXp -= nextLevelXp;
    level += 1;
    nextLevelXp = 100 + (level - 1) * 50;
  }
  return { level, currentXp: remainingXp, nextLevelXp, percentage: Math.min(100, (remainingXp / nextLevelXp) * 100) };
}

export function getMasteryLevel(xp: number): { level: number; roman: string; nextXp: number | null; currentBase: number } {
  const thresholds = [0, 50, 130, 240, 400];
  const numerals = ['I', 'II', 'III', 'IV', 'V'];
  let levelIndex = thresholds.reduce((found, threshold, index) => (xp >= threshold ? index : found), 0);
  levelIndex = Math.min(levelIndex, thresholds.length - 1);
  const nextXp = thresholds[levelIndex + 1] ?? null;
  return { level: levelIndex + 1, roman: numerals[levelIndex]!, nextXp, currentBase: thresholds[levelIndex]! };
}

function updateDailyQuests(profile: ArenaProfile, battle: Battle, specialUses: number, didWin: boolean) {
  const completedQuests: string[] = [];
  let rewardXp = 0;
  const dailyQuests = profile.dailyQuests.map((quest) => {
    if (quest.claimed) return quest;
    let addition = 0;
    if (quest.kind === 'matches') addition = 1;
    if (quest.kind === 'wins' && didWin) addition = 1;
    if (quest.kind === 'specials') addition = specialUses;
    if (quest.kind === 'character' && quest.characterId === battle.player.id) addition = 1;
    const progress = Math.min(quest.goal, quest.progress + addition);
    if (progress >= quest.goal) {
      completedQuests.push(quest.title);
      rewardXp += quest.rewardXp;
      return { ...quest, progress, claimed: true };
    }
    return { ...quest, progress };
  });
  return { dailyQuests, completedQuests, rewardXp };
}

function newlyUnlockedAchievements(profile: ArenaProfile, battle: Battle, didWin: boolean): string[] {
  const fighterWins = (id: string) => profile.characterMastery[id]?.wins ?? 0;
  const rules: Record<string, boolean> = {
    'first-victory': profile.wins > 0,
    'xerion-10': fighterWins('xerion') >= 10,
    'xylith-10': fighterWins('xylith') >= 10,
    'xarok-20': fighterWins('xarok') >= 20,
    'xenith-10': fighterWins('xenith') >= 10,
    'xull-10': fighterWins('xull') >= 10,
    'xelthar-10': fighterWins('xelthar') >= 10,
    'xyvora-10': fighterWins('xyvora') >= 10,
    'untouchable-win': didWin && battle.player.currentHp >= battle.player.hp,
    'veteran-100': profile.totalMatches >= 100,
    'streak-5': profile.bestWinStreak >= 5,
    'specialist-25': profile.lifetimeSpecialUses >= 25,
  };
  return achievements.filter((achievement) => rules[achievement.id] && !profile.achievements.includes(achievement.id)).map((achievement) => achievement.id);
}

export function recordFinishedMatch(profileBefore: ArenaProfile, battle: Battle): MatchProgressResult {
  const today = localDateKey();
  let profile = normalizeProfile(profileBefore, today);
  const didWin = battle.winnerSide === 'player';
  const didDraw = battle.winnerSide === 'draw';
  const specialUses = battle.logs.filter((entry) => entry.tone === 'special' && entry.text.startsWith(battle.player.name) && entry.text.includes(battle.player.ability)).length;
  const damageDealt = Math.max(0, Math.round((battle.enemy.hp - battle.enemy.currentHp) * 10) / 10);
  const levelBefore = getLevelProgress(profile.totalXp).level;
  const outcome: ProfileMatch['outcome'] = didWin ? 'W' : didDraw ? 'D' : 'L';
  const currentWinStreak = didWin ? profile.currentWinStreak + 1 : 0;
  const matchXp = 25 + (didWin ? 35 : 0) + (didWin && battle.round <= 6 ? 15 : 0) + (didWin ? Math.min(profile.currentWinStreak * 5, 20) : 0);
  const mastery = profile.characterMastery[battle.player.id] ?? { matches: 0, wins: 0, xp: 0 };
  const nextMastery = {
    matches: mastery.matches + 1,
    wins: mastery.wins + (didWin ? 1 : 0),
    xp: mastery.xp + 10 + (didWin ? 10 : 0),
  };
  const nextSeason: ArenaSeason = {
    ...profile.season,
    matches: profile.season.matches + 1,
    wins: profile.season.wins + (didWin ? 1 : 0),
    bestStreak: Math.max(profile.season.bestStreak, currentWinStreak),
  };
  const match: ProfileMatch = {
    id: `${Date.now()}-${battle.player.id}-${battle.enemy.id}`,
    player: battle.player.name,
    opponent: battle.enemy.name,
    playerId: battle.player.id,
    opponentId: battle.enemy.id,
    outcome,
    round: battle.round,
    date: new Date().toISOString(),
    damageDealt,
    specialUses,
  };
  profile = {
    ...profile,
    totalMatches: profile.totalMatches + 1,
    wins: profile.wins + (didWin ? 1 : 0),
    losses: profile.losses + (outcome === 'L' ? 1 : 0),
    draws: profile.draws + (didDraw ? 1 : 0),
    currentWinStreak,
    bestWinStreak: Math.max(profile.bestWinStreak, currentWinStreak),
    lifetimeSpecialUses: profile.lifetimeSpecialUses + specialUses,
    characterMastery: { ...profile.characterMastery, [battle.player.id]: nextMastery },
    season: nextSeason,
    lastMatches: [match, ...profile.lastMatches].slice(0, 20),
  };

  const daily = updateDailyQuests(profile, battle, specialUses, didWin);
  profile = { ...profile, dailyQuests: daily.dailyQuests };
  const unlockedAchievements = newlyUnlockedAchievements(profile, battle, didWin);
  const achievementXp = unlockedAchievements.length * 40;
  profile = { ...profile, achievements: [...profile.achievements, ...unlockedAchievements] };
  const earnedXp = matchXp + daily.rewardXp + achievementXp;
  profile = {
    ...profile,
    totalXp: profile.totalXp + earnedXp,
    season: { ...profile.season, xp: profile.season.xp + earnedXp },
    lastMatches: profile.lastMatches.map((entry, index) => index === 0 ? { ...entry, xpEarned: earnedXp } : entry),
  };

  return {
    profile,
    earnedXp,
    levelBefore,
    levelAfter: getLevelProgress(profile.totalXp).level,
    completedQuests: daily.completedQuests,
    unlockedAchievements,
  };
}

export function getSeasonDay(season: ArenaSeason): number {
  return Math.min(SEASON_LENGTH_DAYS, Math.max(1, wholeDaysBetween(season.startDate, localDateKey()) + 1));
}

export function getAchievementProgress(profile: ArenaProfile, achievementId: string): number {
  if (achievementId === 'first-victory') return Math.min(1, profile.wins);
  if (achievementId === 'xerion-10') return Math.min(10, profile.characterMastery.xerion?.wins ?? 0);
  if (achievementId === 'xylith-10') return Math.min(10, profile.characterMastery.xylith?.wins ?? 0);
  if (achievementId === 'xarok-20') return Math.min(20, profile.characterMastery.xarok?.wins ?? 0);
  if (achievementId === 'xenith-10') return Math.min(10, profile.characterMastery.xenith?.wins ?? 0);
  if (achievementId === 'xull-10') return Math.min(10, profile.characterMastery.xull?.wins ?? 0);
  if (achievementId === 'xelthar-10') return Math.min(10, profile.characterMastery.xelthar?.wins ?? 0);
  if (achievementId === 'xyvora-10') return Math.min(10, profile.characterMastery.xyvora?.wins ?? 0);
  if (achievementId === 'veteran-100') return Math.min(100, profile.totalMatches);
  if (achievementId === 'streak-5') return Math.min(5, profile.bestWinStreak);
  if (achievementId === 'specialist-25') return Math.min(25, profile.lifetimeSpecialUses);
  return profile.achievements.includes(achievementId) ? 1 : 0;
}
