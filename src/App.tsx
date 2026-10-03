import { useEffect, useRef, useState } from 'react';
import { enemyTurn, playerAction, startBattle } from './game';
import { achievements, getAchievementProgress, getLevelProgress, getMasteryLevel, getSeasonDay, getXProfileStorageKey, readArenaProfile, recordFinishedMatch, refreshArenaProfile } from './progression';
import { roster } from './roster';
import type { ArenaProfile, MatchProgressResult } from './progression';
import type { Battle, BotDifficulty, Character, Combatant } from './types';
import { beginXConnection, completeXConnection, disconnectX, readXProfile } from './xAuth';
import type { XProfile } from './xAuth';

function Stats({ character }: { character: Character }) {
  return <div className="stats">{[
    ['HP', character.hp], ['Attack', character.attack], ['Defense', character.defense], ['Speed', character.speed], ['Special', character.special],
  ].map(([label, value]) => <div className="stat" key={label}><b>{value}</b><span>{label}</span></div>)}</div>;
}

function CharacterPortrait({ character }: { character: Character }) {
  return <div className="avatar" aria-hidden="true"><span>{character.emoji}</span>{character.portrait && <img src={character.portrait} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}</div>;
}

function CharacterPicker({
  title, side, value, onChange,
}: { title: string; side: 'you' | 'rival'; value: Character; onChange: (character: Character) => void }) {
  return <article className="pick">
    <div className="pick-head"><span className={`side-label ${side}`}>● {title}</span><span className="side-label">{side === 'you' ? 'PLAYER 01' : 'ARENA BOT'}</span></div>
    <label className="sr-only" htmlFor={`${side}-fighter`}>Select {title}</label>
    <select id={`${side}-fighter`} value={value.id} onChange={(event) => onChange(roster.find((character) => character.id === event.target.value)!)}>
      {roster.map((character) => <option key={character.id} value={character.id}>{character.emoji}  {character.name} — {character.role}</option>)}
    </select>
    <div className="char-preview"><CharacterPortrait character={value} /><div><div className="char-name">{value.name}</div><div className="char-role">{value.species} · {value.role}</div></div></div>
    <p className="personality">“{value.quote}”</p>
    <Stats character={value} />
    <p className="ability-hint"><span>✦ {value.ability}</span>{value.description}</p>
    <div className="matchup-notes"><div><span>STRENGTH</span><p>{value.strength}</p></div><div><span>WEAKNESS</span><p>{value.weakness}</p></div></div>
    <p className="personality-copy">{value.personality}</p>
  </article>;
}

function StatusEffects({ fighter }: { fighter: Combatant }) {
  return <div className="effects" aria-label="Status effects">
    {fighter.poison > 0 && <span className="effect bad">☠ POISON {fighter.poison}</span>}
    {fighter.slow > 0 && <span className="effect">↓ SLOWED</span>}
    {fighter.armor > 0 && <span className="effect">⬡ ARMORED</span>}
    {fighter.dodge && <span className="effect">↗ EVASION</span>}
    {fighter.stunned && <span className="effect bad">◎ WEBBED</span>}
    {fighter.chaos && <span className="effect">✦ CHAOS</span>}
  </div>;
}

function FighterPanel({ fighter, right = false }: { fighter: Combatant; right?: boolean }) {
  const percentage = Math.max(0, (fighter.currentHp / fighter.hp) * 100);
  return <div className={`fighter${right ? ' right' : ''}`}>
    <div className="fighter-top"><CharacterPortrait character={fighter} /><div><h2>{fighter.name}</h2><div className="species">{fighter.species} · {fighter.ability}</div></div></div>
    <div className="hp-meta"><span>HP {Math.ceil(fighter.currentHp)} / {fighter.hp}</span><span>{Math.ceil(percentage)}%</span></div>
    <div className="hp-track" role="progressbar" aria-label={`${fighter.name} health`} aria-valuemin={0} aria-valuemax={fighter.hp} aria-valuenow={Math.ceil(fighter.currentHp)}><div className="hp-fill" style={{ width: `${percentage}%` }} /></div>
    <StatusEffects fighter={fighter} />
  </div>;
}

function ProgressDashboard({ profile, enabled, onConnect }: { profile: ArenaProfile; enabled: boolean; onConnect: () => void }) {
  if (!enabled) return <section className="progress-lock" aria-label="Progress locked">
    <div className="lock-mark" aria-hidden="true">X</div><div><span className="progress-card-label">PLAYER PROGRESSION LOCKED</span><h2>Unlock quests and achievements</h2><p>XP, daily quests, seasons, and achievements advance only after you connect your X profile. Matches played before connecting do not count retroactively.</p></div><button className="btn" onClick={onConnect}>Connect X profile</button>
  </section>;
  const level = getLevelProgress(profile.totalXp);
  const seasonDay = getSeasonDay(profile.season);
  const unlockedCount = profile.achievements.length;
  return <>
    <section className="progress-dashboard" aria-label="Player progression">
      <article className="progress-card level-card">
        <div className="progress-card-label">ARENA LEVEL</div>
        <div className="level-line"><strong>{String(level.level).padStart(2, '0')}</strong><span>HIGHER LEVEL, MORE TO SHOW OFF</span></div>
        <div className="xp-meta"><span>{level.currentXp} / {level.nextLevelXp} XP</span><span>{Math.floor(level.percentage)}%</span></div>
        <div className="xp-track" role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={level.nextLevelXp} aria-valuenow={level.currentXp}><div className="xp-fill" style={{ width: `${level.percentage}%` }} /></div>
        <p>Every match earns XP, with small bonuses for wins, quick matches, and streaks.</p>
      </article>
      <article className="progress-card quest-card">
        <div className="progress-card-label">TODAY’S QUESTS <span>RESET AT MIDNIGHT</span></div>
        <div className="quest-list">{profile.dailyQuests.map((quest) => <div className={`quest-row${quest.claimed ? ' complete' : ''}`} key={quest.id}>
          <div className="quest-copy"><span>{quest.claimed ? '✓' : '○'} {quest.title}</span><small>{quest.progress}/{quest.goal} · +{quest.rewardXp} XP</small></div>
          <div className="quest-track"><div style={{ width: `${Math.min(100, (quest.progress / quest.goal) * 100)}%` }} /></div>
        </div>)}</div>
      </article>
      <article className="progress-card season-card">
        <div className="progress-card-label">SEASON {String(profile.season.number).padStart(2, '0')} <span>LOCAL SEASON · DAY {seasonDay}/30</span></div>
        <div className="season-stats">
          <div><strong>{profile.season.wins}</strong><span>WINS</span></div>
          <div><strong>{profile.season.matches}</strong><span>MATCHES</span></div>
          <div><strong>{profile.season.bestStreak}</strong><span>BEST STREAK</span></div>
        </div>
        <div className="season-foot"><span>{profile.season.xp} SEASON XP</span><span>{profile.seasonBadges.length} BADGES</span></div>
      </article>
    </section>
    <details className="profile-details">
      <summary>PROFILE, MASTERY, ACHIEVEMENTS & MATCH HISTORY <span>{unlockedCount}/{achievements.length} UNLOCKED</span></summary>
      <div className="profile-inner">
        <div className="profile-statline"><span>{profile.totalMatches} total matches</span><span>{profile.wins} wins</span><span>{profile.losses} losses</span><span>{profile.draws} draws</span><span>{profile.bestWinStreak} best streak</span></div>
        <h3>Character mastery <small>Rewards are cosmetic and profile-only; combat power never changes.</small></h3>
        <div className="mastery-grid">{roster.map((character) => {
          const mastery = profile.characterMastery[character.id] ?? { matches: 0, wins: 0, xp: 0 };
          const rank = getMasteryLevel(mastery.xp);
          const progress = rank.nextXp === null ? 100 : Math.min(100, ((mastery.xp - rank.currentBase) / (rank.nextXp - rank.currentBase)) * 100);
          return <div className="mastery-item" key={character.id}><div><b>{character.name}</b><span>MASTERY {rank.roman}</span></div><small>{mastery.matches} matches · {mastery.wins} wins</small><div className="mastery-track"><div style={{ width: `${progress}%` }} /></div>{rank.level >= 3 && <em>Profile title unlocked</em>}</div>;
        })}</div>
        <h3>Achievements <small>{unlockedCount} / {achievements.length} unlocked</small></h3>
        <div className="achievement-grid">{achievements.map((achievement) => {
          const unlocked = profile.achievements.includes(achievement.id);
          const progress = getAchievementProgress(profile, achievement.id);
          const numericGoal = achievement.goal.match(/^\d+/)?.[0];
          return <div className={`achievement-item${unlocked ? ' unlocked' : ''}`} key={achievement.id}><div><b>{achievement.title}</b><span>{unlocked ? 'UNLOCKED' : achievement.goal}</span></div><p>{achievement.description}</p>{!unlocked && <div className="achievement-progress">{numericGoal ? `${progress}/${numericGoal}` : 'Locked'}</div>}</div>;
        })}</div>
        {profile.seasonBadges.length > 0 && <><h3>Season badges</h3><div className="badge-list">{profile.seasonBadges.map((badge) => <span key={badge}>✦ {badge}</span>)}</div></>}
        <h3>Recent matches <small>Saved on this device</small></h3>
        <div className="recent-matches">{profile.lastMatches.length === 0
          ? <span className="empty-history">No matches yet. Start your first battle.</span>
          : profile.lastMatches.slice(0, 5).map((match) => <div className="recent-match" key={match.id}><b className={`match-outcome ${match.outcome.toLowerCase()}`}>{match.outcome}</b><span>{match.player} <i>vs</i> {match.opponent}</span><small>+{match.xpEarned ?? 0} XP</small><time dateTime={match.date}>{new Date(match.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</time></div>)}</div>
      </div>
    </details>
  </>;
}

export default function App() {
  const [player, setPlayer] = useState(roster[0]!);
  const [enemy, setEnemy] = useState(roster[6]!);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [resolving, setResolving] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('standard');
  const [xProfile, setXProfile] = useState<XProfile | null>(readXProfile);
  const [profile, setProfile] = useState<ArenaProfile>(() => {
    const linkedProfile = readXProfile();
    return linkedProfile ? readArenaProfile(getXProfileStorageKey(linkedProfile.id)) : readArenaProfile();
  });
  const [matchProgress, setMatchProgress] = useState<MatchProgressResult | null>(null);
  const [xNotice, setXNotice] = useState('');
  const timer = useRef<number | null>(null);
  const recordedBattle = useRef(false);
  const progressEligible = useRef(false);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  useEffect(() => {
    void completeXConnection().then((result) => {
      setXProfile(result.profile);
      if (result.profile) setProfile(readArenaProfile(getXProfileStorageKey(result.profile.id)));
      if (result.handled && result.error) setXNotice(result.error);
      else if (result.handled && result.profile) setXNotice(`X profile @${result.profile.username} connected.`);
    });
  }, []);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const dailyResetTimer = window.setTimeout(() => setProfile((current) => refreshArenaProfile(current)), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(dailyResetTimer);
  }, [profile.dailyDate]);

  useEffect(() => {
    if (!xProfile) return;
    try { localStorage.setItem(getXProfileStorageKey(xProfile.id), JSON.stringify(profile)); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [profile, xProfile]);

  useEffect(() => {
    if (!battle?.finished || recordedBattle.current || !xProfile || !progressEligible.current) return;
    recordedBattle.current = true;
    const result = recordFinishedMatch(profile, battle);
    setProfile(result.profile);
    setMatchProgress(result);
  }, [battle, profile, xProfile]);

  const queueEnemyTurn = (advanceRound = true) => {
    setResolving(true);
    timer.current = window.setTimeout(() => {
      setBattle((latest) => latest ? enemyTurn(latest, advanceRound) : latest);
      setResolving(false);
    }, 650);
  };

  const beginBattle = () => {
    if (player.id === enemy.id) {
      setSelectionError('A character cannot fight itself.');
      return;
    }
    setSelectionError('');
    recordedBattle.current = false;
    progressEligible.current = Boolean(xProfile);
    const initial = startBattle(player, enemy, difficulty);
    setBattle(initial);
    if (!initial.playerFirst) queueEnemyTurn(false);
  };

  const takeAction = (special: boolean) => {
    if (!battle || battle.finished || resolving) return;
    const next = playerAction(battle, special);
    setBattle(next);
    if (!next.finished) queueEnemyTurn();
  };

  const reset = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setResolving(false);
    setBattle(null);
    setMatchProgress(null);
    progressEligible.current = false;
    setSelectionError('');
  };

  const specialReady = battle?.player.cooldownLeft === 0 && !battle?.finished && !resolving;
  const handleXButton = async () => {
    if (xProfile) {
      disconnectX();
      setXProfile(null);
      progressEligible.current = false;
      setXNotice('X profile disconnected for this session.');
      return;
    }
    try {
      const result = await beginXConnection();
      if (!result.ok) setXNotice('An X Developer OAuth 2.0 Client ID is required to connect your profile. Redirecting to a regular X page does not link your account.');
    } catch {
      setXNotice('Could not start X sign-in. Your browser must support secure connections.');
    }
  };
  const buildXShareUrl = (text: string) => {
    const localPage = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const pageUrl = localPage ? '' : `&url=${encodeURIComponent(window.location.href)}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${pageUrl}`;
  };
  const victoryShareUrl = battle?.winnerSide === 'player' ? buildXShareUrl([
    'VICTORY · AGENT ARENA',
    `${battle.player.name} defeated ${battle.enemy.name}`,
    `Damage dealt: ${Math.round((battle.enemy.hp - battle.enemy.currentHp) * 10) / 10}`,
    `Turns: ${battle.round}`,
    `Win streak: ${profile.currentWinStreak}`,
  ].join('\n')) : null;

  return <main className="shell">
    <header className="top"><div className="brand"><img className="brand-logo" src="/images/agent-arena-logo.jpg" alt="" /><span>Agent Arena</span></div><div className="top-actions"><button className={`x-button x-connect${xProfile ? ' connected' : ''}`} onClick={() => void handleXButton()} aria-label={xProfile ? `Connected as @${xProfile.username}. Click to disconnect.` : 'Connect your X profile'}>{xProfile?.profile_image_url ? <img className="x-avatar" src={xProfile.profile_image_url} alt="" /> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" /></svg>}<span>{xProfile ? `@${xProfile.username} · Connected` : 'Connect X'}</span></button><div className="pill">GAME PROTOTYPE · LOCAL PROFILE</div></div></header>
    {xNotice && <div className="x-notice" role="status"><span>{xNotice}</span><button aria-label="Dismiss notification" onClick={() => setXNotice('')}>×</button></div>}
    <section className="hero"><div><div className="eyebrow">Insects vs. aliens</div><h1>WELCOME TO<br />THE ARENA.</h1><p>Choose your fighter. Pick your rival. Start the battle.</p></div><div className="arena-tag">SEASON {String(profile.season.number).padStart(2, '0')}<br />8 FIGHTERS · 1 ARENA</div></section>

    <ProgressDashboard profile={profile} enabled={Boolean(xProfile)} onConnect={() => void handleXButton()} />

    {!battle ? <>
      <section className="setup" aria-label="Fighter selection">
        <CharacterPicker title="YOUR FIGHTER" side="you" value={player} onChange={setPlayer} />
        <div className="vs" aria-hidden="true">VS</div>
        <CharacterPicker title="RIVAL" side="rival" value={enemy} onChange={setEnemy} />
      </section>
      <section className="difficulty-panel" aria-label="Bot difficulty">
        <div><span className="side-label">BOT DIFFICULTY</span><p id="difficulty-description">{difficulty === 'rookie' ? 'The bot uses special abilities less often and with less precise timing.' : difficulty === 'elite' ? 'The bot watches for key moments, low health, and finishing opportunities.' : 'The bot uses special abilities that fit its chosen fighter’s role.'}</p></div>
        <label className="sr-only" htmlFor="difficulty-select">Choose bot difficulty</label>
        <select id="difficulty-select" aria-describedby="difficulty-description" value={difficulty} onChange={(event) => setDifficulty(event.target.value as BotDifficulty)}>
          <option value="rookie">Rookie</option><option value="standard">Standard</option><option value="elite">Elite</option>
        </select>
      </section>
      {selectionError && <p className="selection-error" role="alert">{selectionError}</p>}
      <div className="launch"><button className="btn" onClick={beginBattle}>Start battle ↗</button></div>
    </> : <section className="battle show" aria-label="Battle arena">
      <div className="board">
        <FighterPanel fighter={battle.player} />
        <div className="center"><div className="round">TURN {String(battle.round).padStart(2, '0')}</div><div className="versus">VS</div><div className="turn">{battle.finished ? 'MATCH OVER' : resolving ? 'RIVAL THINKING…' : 'YOUR TURN'}</div><div className="difficulty-tag">BOT · {battle.difficulty === 'rookie' ? 'ROOKIE' : battle.difficulty === 'elite' ? 'ELITE' : 'STANDARD'}</div></div>
        <FighterPanel fighter={battle.enemy} right />
      </div>
      <div className="controls">
        <button className="btn" disabled={battle.finished || resolving} onClick={() => takeAction(false)}>⚔ Basic attack</button>
        <button className="btn secondary" disabled={!specialReady} onClick={() => takeAction(true)}>✦ {battle.player.ability}{battle.player.cooldownLeft > 0 ? ` · ${battle.player.cooldownLeft} turns` : ''}</button>
        <button className="btn secondary" onClick={reset}>New battle</button>
      </div>
      {battle.winner && <div className="result show" role="status">
        <strong>{battle.winner}</strong>
        {matchProgress && <div className="match-reward"><span>+{matchProgress.earnedXp} XP</span>{matchProgress.levelAfter > matchProgress.levelBefore && <b>LEVEL UP → {matchProgress.levelAfter}</b>}{matchProgress.completedQuests.map((quest) => <small key={quest}>QUEST COMPLETE · {quest}</small>)}{matchProgress.unlockedAchievements.map((id) => <small key={id}>ACHIEVEMENT UNLOCKED · {achievements.find((achievement) => achievement.id === id)?.title}</small>)}</div>}
        {battle.winnerSide === 'player' && victoryShareUrl && <a className="x-button victory-share" href={victoryShareUrl} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" /></svg>Share victory on X</a>}
      </div>}
      <div className="log" aria-live="polite" aria-label="Battle log"><div className="log-title">Battle log</div>
        {battle.logs.map((entry) => <div className={`log-entry${entry.tone === 'damage' ? ' damage' : ''}`} key={entry.id}>{entry.text}</div>)}
      </div>
    </section>}
    <section className="utility" aria-labelledby="utility-title">
      <div className="utility-heading"><div><div className="eyebrow">PLAYER LOOP · ALL IN-GAME</div><h2 id="utility-title">Play → Progress →<br />Master → Collect → Compete</h2></div><p>Every match advances your account and fighter mastery. Daily goals give you a reason to return today, while each local season sets a fresh 30-day challenge.</p></div>
      <div className="utility-grid">
        <article className="utility-card"><span className="utility-index">01 / PLAY</span><h3>Enter the arena</h3><p>Choose one of eight available fighters, set the bot difficulty, and play turn-based battles.</p><span className="utility-status">PLAY NOW</span></article>
        <article className="utility-card"><span className="utility-index">02 / PROGRESS</span><h3>Earn XP and levels</h3><p>Finish matches and level up your Arena profile with win, quick-victory, and streak bonuses.</p><span className="utility-status">EVERY MATCH</span></article>
        <article className="utility-card"><span className="utility-index">03 / MASTER</span><h3>Master your fighter</h3><p>Earn separate mastery with every fighter. No character locks or stat upgrades.</p><span className="utility-status">ALL 8 AVAILABLE</span></article>
        <article className="utility-card"><span className="utility-index">04 / COLLECT</span><h3>Collect achievements</h3><p>Complete long-term goals to unlock profile titles and seasonal badges.</p><span className="utility-status">PROFILE REWARDS</span></article>
        <article className="utility-card"><span className="utility-index">05 / COMPETE</span><h3>Complete the season</h3><p>Build your wins and streak during a 30-day local season, then share victories on X.</p><span className="utility-status">BOT MATCHES</span></article>
      </div>
      <p className="utility-note">XP, mastery, and badges are in-game progression only and never affect combat stats. Your profile is stored in this browser. This prototype has no token, wallet, betting, staking, or PvP against real players.</p>
    </section>
    <section className="thesis" aria-labelledby="thesis-title">
      <div className="thesis-heading"><div><div className="eyebrow">THE PROJECT THESIS</div><h2 id="thesis-title">Why Agent Arena?</h2></div><p>A quick-to-play arena for players, with room to grow into a broader game and community for its supporters.</p></div>
      <div className="thesis-grid">
        <article className="thesis-card"><span>01 / PLAYABLE PRODUCT</span><h3>Game first, economy later</h3><p>Eight distinct fighters, tactical abilities, and short turn-based matches. The core loop works without a token connection.</p></article>
        <article className="thesis-card"><span>02 / GROWTH THESIS</span><h3>Room to grow and replay</h3><p>Seasons, new fighters, tournaments, and cosmetic collections offer paths to expand. Demand and revenue have not been proven.</p></article>
        <article className="thesis-card"><span>03 / FAIR COMPETITION</span><h3>No selling power</h3><p>Planned utility focuses on cosmetics and events. Paid stat advantages are not part of the design; combat balance will be measured and refined.</p></article>
      </div>
      <div className="thesis-disclosure"><b>Current stage: prototype.</b><span>There is no token launch, funding round, or promise of returns. Economy and integration concepts are plans; there is no finished product or verified token information on which to base an investment decision.</span></div>
    </section>
    <footer className="foot"><span>AGENT ARENA · GAMEPLAY PROTOTYPE</span><span>EVERY MATCH TELLS A NEW STORY</span></footer>
  </main>;
}
