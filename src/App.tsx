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
    <label className="sr-only" htmlFor={`${side}-fighter`}>{title} seç</label>
    <select id={`${side}-fighter`} value={value.id} onChange={(event) => onChange(roster.find((character) => character.id === event.target.value)!)}>
      {roster.map((character) => <option key={character.id} value={character.id}>{character.emoji}  {character.name} — {character.role}</option>)}
    </select>
    <div className="char-preview"><CharacterPortrait character={value} /><div><div className="char-name">{value.name}</div><div className="char-role">{value.species} · {value.role}</div></div></div>
    <p className="personality">“{value.quote}”</p>
    <Stats character={value} />
    <p className="ability-hint"><span>✦ {value.ability}</span>{value.description}</p>
    <div className="matchup-notes"><div><span>GÜÇLÜ YANI</span><p>{value.strength}</p></div><div><span>ZAYIF YANI</span><p>{value.weakness}</p></div></div>
    <p className="personality-copy">{value.personality}</p>
  </article>;
}

function StatusEffects({ fighter }: { fighter: Combatant }) {
  return <div className="effects" aria-label="Durum etkileri">
    {fighter.poison > 0 && <span className="effect bad">☠ ZEHİR {fighter.poison}</span>}
    {fighter.slow > 0 && <span className="effect">↓ YAVAŞ</span>}
    {fighter.armor > 0 && <span className="effect">⬡ KABUK</span>}
    {fighter.dodge && <span className="effect">↗ KAÇIŞ</span>}
    {fighter.stunned && <span className="effect bad">◎ AĞ</span>}
    {fighter.chaos && <span className="effect">✦ KAOS</span>}
  </div>;
}

function FighterPanel({ fighter, right = false }: { fighter: Combatant; right?: boolean }) {
  const percentage = Math.max(0, (fighter.currentHp / fighter.hp) * 100);
  return <div className={`fighter${right ? ' right' : ''}`}>
    <div className="fighter-top"><CharacterPortrait character={fighter} /><div><h2>{fighter.name}</h2><div className="species">{fighter.species} · {fighter.ability}</div></div></div>
    <div className="hp-meta"><span>HP {Math.ceil(fighter.currentHp)} / {fighter.hp}</span><span>{Math.ceil(percentage)}%</span></div>
    <div className="hp-track" role="progressbar" aria-label={`${fighter.name} canı`} aria-valuemin={0} aria-valuemax={fighter.hp} aria-valuenow={Math.ceil(fighter.currentHp)}><div className="hp-fill" style={{ width: `${percentage}%` }} /></div>
    <StatusEffects fighter={fighter} />
  </div>;
}

function ProgressDashboard({ profile, enabled, onConnect }: { profile: ArenaProfile; enabled: boolean; onConnect: () => void }) {
  if (!enabled) return <section className="progress-lock" aria-label="İlerleme kilitli">
    <div className="lock-mark" aria-hidden="true">X</div><div><span className="progress-card-label">OYUNCU İLERLEMESİ KİLİTLİ</span><h2>Görevleri ve başarımları aç</h2><p>XP, günlük görevler, sezon ve başarımlar yalnızca X profilini bağladıktan sonra ilerler. Bağlantıdan önce oynadığın maçlar geriye dönük sayılmaz.</p></div><button className="btn" onClick={onConnect}>X profili bağla</button>
  </section>;
  const level = getLevelProgress(profile.totalXp);
  const seasonDay = getSeasonDay(profile.season);
  const unlockedCount = profile.achievements.length;
  return <>
    <section className="progress-dashboard" aria-label="Oyuncu ilerlemesi">
      <article className="progress-card level-card">
        <div className="progress-card-label">ARENA LEVEL</div>
        <div className="level-line"><strong>{String(level.level).padStart(2, '0')}</strong><span>DAHA YÜKSEK SEVİYE, DAHA FAZLA GÖSTERİŞ</span></div>
        <div className="xp-meta"><span>{level.currentXp} / {level.nextLevelXp} XP</span><span>{Math.floor(level.percentage)}%</span></div>
        <div className="xp-track" role="progressbar" aria-label="Bir sonraki seviye için XP" aria-valuemin={0} aria-valuemax={level.nextLevelXp} aria-valuenow={level.currentXp}><div className="xp-fill" style={{ width: `${level.percentage}%` }} /></div>
        <p>Her maç XP kazandırır; galibiyet, kısa maç ve seri küçük bonus sağlar.</p>
      </article>
      <article className="progress-card quest-card">
        <div className="progress-card-label">BUGÜNÜN GÖREVLERİ <span>GECE YARISI YENİLENİR</span></div>
        <div className="quest-list">{profile.dailyQuests.map((quest) => <div className={`quest-row${quest.claimed ? ' complete' : ''}`} key={quest.id}>
          <div className="quest-copy"><span>{quest.claimed ? '✓' : '○'} {quest.title}</span><small>{quest.progress}/{quest.goal} · +{quest.rewardXp} XP</small></div>
          <div className="quest-track"><div style={{ width: `${Math.min(100, (quest.progress / quest.goal) * 100)}%` }} /></div>
        </div>)}</div>
      </article>
      <article className="progress-card season-card">
        <div className="progress-card-label">SEASON {String(profile.season.number).padStart(2, '0')} <span>YEREL SEZON · {seasonDay}/30. GÜN</span></div>
        <div className="season-stats">
          <div><strong>{profile.season.wins}</strong><span>GALİBİYET</span></div>
          <div><strong>{profile.season.matches}</strong><span>MAÇ</span></div>
          <div><strong>{profile.season.bestStreak}</strong><span>EN İYİ SERİ</span></div>
        </div>
        <div className="season-foot"><span>{profile.season.xp} SEZON XP</span><span>{profile.seasonBadges.length} ROZET</span></div>
      </article>
    </section>
    <details className="profile-details">
      <summary>PROFİL, USTALIKLAR, BAŞARIMLAR VE MAÇ GEÇMİŞİ <span>{unlockedCount}/{achievements.length} BAŞARIM</span></summary>
      <div className="profile-inner">
        <div className="profile-statline"><span>{profile.totalMatches} toplam maç</span><span>{profile.wins} galibiyet</span><span>{profile.losses} mağlubiyet</span><span>{profile.draws} beraberlik</span><span>{profile.bestWinStreak} en iyi seri</span></div>
        <h3>Karakter ustalıkları <small>Ödüller kozmetik ve profil gösterimidir; savaş gücü değişmez.</small></h3>
        <div className="mastery-grid">{roster.map((character) => {
          const mastery = profile.characterMastery[character.id] ?? { matches: 0, wins: 0, xp: 0 };
          const rank = getMasteryLevel(mastery.xp);
          const progress = rank.nextXp === null ? 100 : Math.min(100, ((mastery.xp - rank.currentBase) / (rank.nextXp - rank.currentBase)) * 100);
          return <div className="mastery-item" key={character.id}><div><b>{character.name}</b><span>MASTERY {rank.roman}</span></div><small>{mastery.matches} maç · {mastery.wins} galibiyet</small><div className="mastery-track"><div style={{ width: `${progress}%` }} /></div>{rank.level >= 3 && <em>Profil unvanı açıldı</em>}</div>;
        })}</div>
        <h3>Başarımlar <small>{unlockedCount} / {achievements.length} açıldı</small></h3>
        <div className="achievement-grid">{achievements.map((achievement) => {
          const unlocked = profile.achievements.includes(achievement.id);
          const progress = getAchievementProgress(profile, achievement.id);
          const numericGoal = achievement.goal.match(/^\d+/)?.[0];
          return <div className={`achievement-item${unlocked ? ' unlocked' : ''}`} key={achievement.id}><div><b>{achievement.title}</b><span>{unlocked ? 'AÇILDI' : achievement.goal}</span></div><p>{achievement.description}</p>{!unlocked && <div className="achievement-progress">{numericGoal ? `${progress}/${numericGoal}` : 'Kilitli'}</div>}</div>;
        })}</div>
        {profile.seasonBadges.length > 0 && <><h3>Sezon rozetleri</h3><div className="badge-list">{profile.seasonBadges.map((badge) => <span key={badge}>✦ {badge}</span>)}</div></>}
        <h3>Son maçlar <small>Bu cihazda saklanır</small></h3>
        <div className="recent-matches">{profile.lastMatches.length === 0
          ? <span className="empty-history">Henüz maç yok. İlk dövüşünü başlat.</span>
          : profile.lastMatches.slice(0, 5).map((match) => <div className="recent-match" key={match.id}><b className={`match-outcome ${match.outcome.toLowerCase()}`}>{match.outcome}</b><span>{match.player} <i>vs</i> {match.opponent}</span><small>+{match.xpEarned ?? 0} XP</small><time dateTime={match.date}>{new Date(match.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</time></div>)}</div>
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
      else if (result.handled && result.profile) setXNotice(`@${result.profile.username} X profili bağlandı.`);
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
      setSelectionError('Aynı karakter kendisiyle dövüşemez.');
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
      setXNotice('X profil bağlantısı bu oturum için kaldırıldı.');
      return;
    }
    try {
      const result = await beginXConnection();
      if (!result.ok) setXNotice('X profilini gerçekten bağlamak için X Developer uygulamasının OAuth 2.0 Client ID bilgisi gerekli. Normal X girişine yönlendirmek hesabı bağlamaz.');
    } catch {
      setXNotice('X bağlantısı başlatılamadı. Tarayıcı güvenli bağlantıyı desteklemeli.');
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
    <header className="top"><div className="brand"><img className="brand-logo" src="/images/agent-arena-logo.jpg" alt="" /><span>Agent Arena</span></div><div className="top-actions"><button className={`x-button x-connect${xProfile ? ' connected' : ''}`} onClick={() => void handleXButton()} aria-label={xProfile ? `@${xProfile.username} bağlı. Kaldırmak için tıkla.` : 'X profilini bağla'}>{xProfile?.profile_image_url ? <img className="x-avatar" src={xProfile.profile_image_url} alt="" /> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" /></svg>}<span>{xProfile ? `@${xProfile.username} · Bağlı` : 'X’i bağla'}</span></button><div className="pill">OYUN PROTOTİPİ · YEREL PROFİL</div></div></header>
    {xNotice && <div className="x-notice" role="status"><span>{xNotice}</span><button aria-label="Bildirimi kapat" onClick={() => setXNotice('')}>×</button></div>}
    <section className="hero"><div><div className="eyebrow">Böcekler vs. uzaylılar</div><h1>ARENA'YA<br />HOŞ GELDİN.</h1><p>Karakterini seç. Rakibini belirle. Mücadeleyi başlat.</p></div><div className="arena-tag">SEZON {String(profile.season.number).padStart(2, '0')}<br />8 SAVAŞÇI · 1 ARENA</div></section>

    <ProgressDashboard profile={profile} enabled={Boolean(xProfile)} onConnect={() => void handleXButton()} />

    {!battle ? <>
      <section className="setup" aria-label="Savaşçı seçimi">
        <CharacterPicker title="SENİN SAVAŞÇIN" side="you" value={player} onChange={setPlayer} />
        <div className="vs" aria-hidden="true">VS</div>
        <CharacterPicker title="RAKİP" side="rival" value={enemy} onChange={setEnemy} />
      </section>
      <section className="difficulty-panel" aria-label="Bot zorluğu">
        <div><span className="side-label">BOT ZORLUĞU</span><p id="difficulty-description">{difficulty === 'rookie' ? 'Bot özel yeteneklerini daha seyrek ve daha az isabetli zamanlamayla kullanır.' : difficulty === 'elite' ? 'Bot kritik anları kollar; düşük can ve bitirici hamle fırsatlarına uyum sağlar.' : 'Bot, seçtiği karakterin rolüne göre özel yeteneklerini kullanır.'}</p></div>
        <label className="sr-only" htmlFor="difficulty-select">Bot zorluğunu seç</label>
        <select id="difficulty-select" aria-describedby="difficulty-description" value={difficulty} onChange={(event) => setDifficulty(event.target.value as BotDifficulty)}>
          <option value="rookie">Çaylak</option><option value="standard">Dengeli</option><option value="elite">Usta</option>
        </select>
      </section>
      {selectionError && <p className="selection-error" role="alert">{selectionError}</p>}
      <div className="launch"><button className="btn" onClick={beginBattle}>Dövüşü başlat ↗</button></div>
    </> : <section className="battle show" aria-label="Dövüş alanı">
      <div className="board">
        <FighterPanel fighter={battle.player} />
        <div className="center"><div className="round">TUR {String(battle.round).padStart(2, '0')}</div><div className="versus">VS</div><div className="turn">{battle.finished ? 'MAÇ BİTTİ' : resolving ? 'RAKİP DÜŞÜNÜYOR…' : 'SENİN TURUN'}</div><div className="difficulty-tag">BOT · {battle.difficulty === 'rookie' ? 'ÇAYLAK' : battle.difficulty === 'elite' ? 'USTA' : 'DENGELİ'}</div></div>
        <FighterPanel fighter={battle.enemy} right />
      </div>
      <div className="controls">
        <button className="btn" disabled={battle.finished || resolving} onClick={() => takeAction(false)}>⚔ Temel saldırı</button>
        <button className="btn secondary" disabled={!specialReady} onClick={() => takeAction(true)}>✦ {battle.player.ability}{battle.player.cooldownLeft > 0 ? ` · ${battle.player.cooldownLeft} tur` : ''}</button>
        <button className="btn secondary" onClick={reset}>Yeni dövüş</button>
      </div>
      {battle.winner && <div className="result show" role="status">
        <strong>{battle.winner}</strong>
        {matchProgress && <div className="match-reward"><span>+{matchProgress.earnedXp} XP</span>{matchProgress.levelAfter > matchProgress.levelBefore && <b>LEVEL UP → {matchProgress.levelAfter}</b>}{matchProgress.completedQuests.map((quest) => <small key={quest}>GÖREV TAMAMLANDI · {quest}</small>)}{matchProgress.unlockedAchievements.map((id) => <small key={id}>BAŞARIM AÇILDI · {achievements.find((achievement) => achievement.id === id)?.title}</small>)}</div>}
        {battle.winnerSide === 'player' && victoryShareUrl && <a className="x-button victory-share" href={victoryShareUrl} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.4 3.9H5.6L17.8 20Z" /></svg>Zaferi X’te paylaş</a>}
      </div>}
      <div className="log" aria-live="polite" aria-label="Dövüş günlüğü"><div className="log-title">Dövüş günlüğü</div>
        {battle.logs.map((entry) => <div className={`log-entry${entry.tone === 'damage' ? ' damage' : ''}`} key={entry.id}>{entry.text}</div>)}
      </div>
    </section>}
    <section className="utility" aria-labelledby="utility-title">
      <div className="utility-heading"><div><div className="eyebrow">OYUNCU DÖNGÜSÜ · TAMAMI OYUN İÇİ</div><h2 id="utility-title">Play → Progress →<br />Master → Collect → Compete</h2></div><p>Her maç hesabını ve karakter ustalığını ilerletir. Günlük hedefler bugün için, yerel sezon da önümüzdeki 30 gün için yeni bir dönüş nedeni verir.</p></div>
      <div className="utility-grid">
        <article className="utility-card"><span className="utility-index">01 / PLAY</span><h3>Maça gir</h3><p>8 açık karakterden birini seç, bot zorluğunu belirle ve turlu arenada oyna.</p><span className="utility-status">ŞİMDİ OYNA</span></article>
        <article className="utility-card"><span className="utility-index">02 / PROGRESS</span><h3>XP ve level kazan</h3><p>Maç tamamla; galibiyet, hızlı zafer ve seri bonuslarıyla Arena Level’ını yükselt.</p><span className="utility-status">HER MAÇTA</span></article>
        <article className="utility-card"><span className="utility-index">03 / MASTER</span><h3>Savaşçını ustalaştır</h3><p>Her karakterle oynadıkça ayrı Mastery kazan. Karakter kilidi veya stat artışı yok.</p><span className="utility-status">8 KARAKTER AÇIK</span></article>
        <article className="utility-card"><span className="utility-index">04 / COLLECT</span><h3>Başarı ve rozet topla</h3><p>Uzun vadeli hedefleri tamamla; profil unvanı ve sezon rozetleri aç.</p><span className="utility-status">PROFİL ÖDÜLLERİ</span></article>
        <article className="utility-card"><span className="utility-index">05 / COMPETE</span><h3>Sezonunu tamamla</h3><p>30 günlük yerel sezonda galibiyetlerini ve serini geliştir; zaferini X’te paylaş.</p><span className="utility-status">BOT MAÇLARI</span></article>
      </div>
      <p className="utility-note">XP, Mastery ve rozetler yalnızca oyun içi ilerlemedir; savaş statlarını etkilemez. Profil bu tarayıcıda saklanır. Bu prototipte token, cüzdan, bahis, staking veya gerçek oyunculara karşı PvP yoktur.</p>
    </section>
    <section className="thesis" aria-labelledby="thesis-title">
      <div className="thesis-heading"><div><div className="eyebrow">PROJE TEZİ</div><h2 id="thesis-title">Neden Agent Arena?</h2></div><p>Oyuncular için hızlıca girilip oynanan bir arena; projeyi takip edenler için büyütülebilir bir oyun ve topluluk fikri.</p></div>
      <div className="thesis-grid">
        <article className="thesis-card"><span>01 / OYNANABİLİR ÜRÜN</span><h3>Önce oyun, sonra ekonomi</h3><p>Sekiz ayırt edilebilir karakter, taktiksel yetenekler ve kısa turlu maçlar. Temel döngü token bağlantısı olmadan da oynanabilir.</p></article>
        <article className="thesis-card"><span>02 / YATIRIMCI İÇİN TEZ</span><h3>Tekrar oynanabilir büyüme alanı</h3><p>Sezonlar, yeni savaşçılar, turnuvalar ve kozmetik koleksiyonlar için genişleme yolu var. Bu talep ve gelir henüz kanıtlanmış değil.</p></article>
        <article className="thesis-card"><span>03 / ADİL REKABET</span><h3>Güç satışı yok</h3><p>Planlanan kullanım alanları görünüm ve etkinlik odaklı. Ücretli stat avantajı tasarlanmıyor; savaş dengesi ölçülerek geliştiriliyor.</p></article>
      </div>
      <div className="thesis-disclosure"><b>Mevcut aşama: prototip.</b><span>Token lansmanı, yatırım turu veya getiri vaadi yok. Ekonomi ve entegrasyon fikirleri plan niteliğinde; yatırım kararı için tamamlanmış ürün ve doğrulanmış token bilgisi bulunmuyor.</span></div>
    </section>
    <footer className="foot"><span>AGENT ARENA · OYNANIŞ PROTOTİPİ</span><span>HER MAÇ YENİ BİR HİKÂYE</span></footer>
  </main>;
}
