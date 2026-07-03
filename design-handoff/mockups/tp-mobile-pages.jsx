// Mobile pages for Picks, Bracket, Standings, Final.
// Width: 380px. All use Option B's editorial language so they read as one
// product with the dashboard mobile.

// ─── PICKS ─────────────────────────────────────────────────────────────────
function TPMobilePicks() {
  const matches = [
    { id: 1, time: '14:00', p1: 'Sinner',     p1seed: 1,  p2: 'de Minaur', p2seed: 8,  myPick: 'p1', winner: 'p1', state: 'correct' },
    { id: 2, time: '15:30', p1: 'Alcaraz',    p1seed: 2,  p2: 'Draper',    p2seed: 11, myPick: 'p2', winner: 'p1', state: 'wrong' },
    { id: 3, time: '17:00', p1: 'Sabalenka',  p1seed: 1,  p2: 'Pegula',    p2seed: 6,  myPick: 'p1', winner: null, state: 'locked' },
    { id: 4, time: '18:30', p1: 'Świątek',    p1seed: 2,  p2: 'Gauff',     p2seed: 4,  myPick: 'p1', winner: null, state: 'picked' },
    { id: 5, time: '20:00', p1: 'Zverev',     p1seed: 4,  p2: 'Rune',      p2seed: 9,  myPick: 'p2', winner: null, state: 'picked' },
    { id: 6, time: '21:30', p1: 'Rybakina',   p1seed: 5,  p2: 'Paolini',   p2seed: 7,  myPick: 'p2', winner: null, state: 'picked' },
    { id: 7, time: 'Wed 14:00', p1: 'Medvedev', p1seed: 6, p2: 'Tsitsipas', p2seed: 12, myPick: null, winner: null, state: 'open' },
    { id: 8, time: 'Wed 15:30', p1: 'Sakkari',  p1seed: 8, p2: 'Kasatkina', p2seed: 13, myPick: null, winner: null, state: 'open' },
  ];

  const rounds = [
    { name: 'R64', pts: 2,  points: 44, state: 'done' },
    { name: 'R32', pts: 4,  points: 68, state: 'done' },
    { name: 'R16', pts: 8,  points: 8,  state: 'live' },
    { name: 'QF',  pts: 16, state: 'pending' },
    { name: 'SF',  pts: 32, state: 'pending' },
    { name: 'F',   pts: 64, state: 'pending' },
  ];

  const PlayerLine = ({ name, seed, picked, won, lost }) => (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      font: `${picked ? 500 : 400} 15px/1.2 ${TP.serif}`,
      color: won ? TP.olive : (lost ? TP.ink3 : TP.ink),
      textDecoration: picked && won === false && lost === false ? `underline ${TP.brick} 1.5px` : 'none',
      textUnderlineOffset: 3,
      opacity: lost ? 0.55 : 1,
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {seed && (
        <span style={{ font: `400 italic 10px/1 ${TP.serif}`, color: TP.ink3 }}>[{seed}]</span>
      )}
      {won && (
        <span style={{
          font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.olive, marginLeft: 4,
        }}>won</span>
      )}
    </div>
  );

  const StatePill = ({ state, pts }) => {
    const map = {
      correct: { label: `+${pts}`, color: TP.olive, fill: 'rgba(61,79,43,0.1)' },
      wrong:   { label: '0',       color: TP.brick, fill: 'rgba(184,84,51,0.1)' },
      locked:  { label: 'pending', color: TP.ink3,  fill: 'transparent' },
      picked:  { label: 'picked',  color: TP.ink2,  fill: 'transparent' },
      open:    { label: 'tap', color: TP.brick, fill: 'transparent' },
    };
    const c = map[state];
    return (
      <span style={{
        font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: c.color,
        padding: c.fill !== 'transparent' ? '3px 6px' : 0,
        background: c.fill, whiteSpace: 'nowrap',
      }}>{c.label}</span>
    );
  };

  return (
    <div className="tp" style={{
      width: 380, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      {/* Compact masthead */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px 12px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <span style={{ font: `400 italic 20px/1 ${TP.serif}` }}>The Tipping Post</span>
        <span style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>Profile</span>
      </div>

      {/* Banner */}
      <section style={{
        position: 'relative', padding: '16px 16px 16px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -8, top: -8,
          font: `400 italic 110px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }}>R16</div>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>Your picks · {TP_DATA.tournament.name}</div>
        <h1 style={{
          font: `400 30px/1.04 ${TP.serif}`, margin: '6px 0 0',
        }}>
          Round of 16 <span style={{ fontStyle: 'italic' }}>underway.</span>
        </h1>
        <div style={{
          marginTop: 10, font: `400 11px/1 ${TP.sans}`, color: 'rgba(255,255,255,0.92)',
        }}>
          <b style={{ fontWeight: 600 }}>6</b> of 8 picked · locks Wed 14:00
        </div>
      </section>

      {/* Round nav — horizontal scroll */}
      <div style={{
        display: 'flex', gap: 8, padding: '14px 16px 12px',
        overflowX: 'auto', borderBottom: `1px solid ${TP.rule}`,
      }}>
        {rounds.map(r => {
          const isActive = r.state === 'live';
          return (
            <div key={r.name} style={{
              flex: '0 0 auto',
              padding: '8px 12px',
              border: `1px solid ${isActive ? TP.ink : TP.rule}`,
              background: isActive ? TP.ink : 'transparent',
              color: isActive ? TP.paper : (r.state === 'pending' ? TP.ink3 : TP.ink),
              minWidth: 64, textAlign: 'center',
              opacity: r.state === 'pending' ? 0.55 : 1,
            }}>
              <div style={{
                font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}>{r.name}</div>
              {r.state === 'done' && (
                <div style={{
                  font: `400 16px/1 ${TP.serif}`, marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}>+{r.points}</div>
              )}
              {r.state === 'live' && (
                <div style={{
                  font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.16em',
                  textTransform: 'uppercase', marginTop: 4,
                  color: isActive ? '#F2EBDC' : TP.brick,
                }}>Live</div>
              )}
              {r.state === 'pending' && (
                <div style={{
                  font: `400 italic 10px/1 ${TP.serif}`, color: TP.ink3, marginTop: 4,
                }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Round summary */}
      <section style={{ padding: '14px 16px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`,
        }}>
          <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0 }}>The card · R16</h2>
          <div style={{
            font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.ink2,
          }}>6/8 · +8</div>
        </div>
      </section>

      {/* Match list */}
      <section style={{ padding: '4px 16px 16px' }}>
        {matches.map(m => {
          const myP1 = m.myPick === 'p1';
          const myP2 = m.myPick === 'p2';
          const wonP1 = m.winner === 'p1';
          const wonP2 = m.winner === 'p2';
          const isResulted = !!m.winner;

          let bg = 'transparent', border = TP.rule;
          if (m.state === 'correct') { bg = 'rgba(61,79,43,0.05)'; border = 'rgba(61,79,43,0.4)'; }
          if (m.state === 'wrong')   { bg = 'rgba(184,84,51,0.05)'; border = 'rgba(184,84,51,0.4)'; }

          return (
            <div key={m.id} style={{
              padding: '12px 14px',
              marginBottom: 6,
              border: `1px solid ${border}`,
              background: bg,
            }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{
                  font: `400 italic 12px/1 ${TP.serif}`, color: TP.ink2,
                  fontVariantNumeric: 'tabular-nums',
                }}>{m.time}</span>
                <StatePill state={m.state} pts={8} />
              </div>
              <PlayerLine name={m.p1} seed={m.p1seed} picked={myP1} won={wonP1} lost={isResulted && !wonP1} />
              <div style={{
                font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: TP.ink3,
                margin: '4px 0',
              }}>v</div>
              <PlayerLine name={m.p2} seed={m.p2seed} picked={myP2} won={wonP2} lost={isResulted && !wonP2} />
            </div>
          );
        })}
      </section>

      <TPTabBar active="Picks" />
    </div>
  );
}

// ─── BRACKET (round navigator on mobile) ───────────────────────────────────
function TPMobileBracket() {
  // On mobile we don't render a bracket visual — we render a round-by-round
  // navigator showing the active round's matches with downstream propagation
  // implied by progression indicators.
  const myAlive = ['Sinner','Khachanov','Rublev','Zverev','Alcaraz','Fritz','Shelton','Djokovic'];
  const myOut   = ['Draper','Coric','Korda','Hurkacz','Bautista A.','Goffin','Cazaux','Cerundolo F.'];

  const r16Matches = [
    { p1: 'Sinner', s1: 1, p2: 'Rune', s2: 9, winner: 'p1', myPick: 'p1', state: 'correct' },
    { p1: 'Wawrinka', s1: null, p2: 'Khachanov', s2: 15, winner: null, myPick: 'p2', state: 'picked' },
    { p1: 'Rublev', s1: 5, p2: 'Cerundolo', s2: 13, winner: null, myPick: 'p1', state: 'picked' },
    { p1: 'Hurkacz', s1: 12, p2: 'Zverev', s2: 4, winner: null, myPick: 'p2', state: 'live' },
    { p1: 'Alcaraz', s1: 2, p2: 'Dimitrov', s2: 14, winner: null, myPick: 'p1', state: 'picked' },
    { p1: 'Fritz', s1: 11, p2: 'Ruud', s2: 6, winner: null, myPick: 'p1', state: 'picked' },
    { p1: 'Shelton', s1: 10, p2: 'Tsitsipas', s2: 19, winner: null, myPick: 'p1', state: 'picked' },
    { p1: 'de Minaur', s1: 8, p2: 'Djokovic', s2: 3, winner: null, myPick: 'p2', state: 'picked' },
  ];

  return (
    <div className="tp" style={{
      width: 380, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px 12px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <span style={{ font: `400 italic 20px/1 ${TP.serif}` }}>The Tipping Post</span>
        <span style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>Profile</span>
      </div>

      {/* Banner */}
      <section style={{
        position: 'relative', padding: '16px 16px 16px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -8, top: -8,
          font: `400 italic 110px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }}>DRAW</div>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Draw · {TP_DATA.tournament.name}</div>
        <h1 style={{ font: `400 28px/1.04 ${TP.serif}`, margin: '6px 0 0' }}>
          Men's singles, <span style={{ fontStyle: 'italic' }}>back half.</span>
        </h1>
      </section>

      {/* Men's / Women's */}
      <div style={{
        display: 'flex', padding: '12px 16px',
        borderBottom: `1px solid ${TP.rule}`,
      }}>
        <button style={{
          flex: 1, padding: '8px 0',
          border: `1px solid ${TP.ink}`, background: TP.ink, color: TP.paper,
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>Men's</button>
        <button style={{
          flex: 1, padding: '8px 0',
          border: `1px solid ${TP.rule}`, borderLeft: 'none',
          background: 'transparent', color: TP.ink2,
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>Women's</button>
      </div>

      {/* Round nav — horizontal */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        overflowX: 'auto', borderBottom: `1px solid ${TP.rule}`,
      }}>
        {[
          { name: 'R64', state: 'done' }, { name: 'R32', state: 'done' },
          { name: 'R16', state: 'live' }, { name: 'QF', state: 'pending' },
          { name: 'SF', state: 'pending' }, { name: 'F', state: 'pending' },
        ].map(r => {
          const isActive = r.state === 'live';
          return (
            <div key={r.name} style={{
              flex: '0 0 auto', padding: '6px 12px',
              border: `1px solid ${isActive ? TP.ink : TP.rule}`,
              background: isActive ? TP.ink : 'transparent',
              color: isActive ? TP.paper : (r.state === 'pending' ? TP.ink3 : TP.ink),
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: r.state === 'pending' ? 0.55 : 1,
            }}>{r.name}</div>
          );
        })}
      </div>

      {/* Your picks summary */}
      <section style={{
        padding: '14px 16px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <TPEyebrow color={TP.brick}>Your picks · 8 alive</TPEyebrow>
        <div style={{
          font: `400 italic 14px/1.4 ${TP.serif}`, color: TP.ink, marginTop: 6,
        }}>
          Sinner, Khachanov, Rublev, Zverev, Alcaraz, Fritz, Shelton, Djokovic.
        </div>
        <TPEyebrow style={{ marginTop: 12 }}>8 out</TPEyebrow>
        <div style={{
          font: `400 italic 13px/1.4 ${TP.serif}`,
          color: TP.ink3, marginTop: 6,
          textDecoration: `line-through ${TP.ink3} 1px`,
          textUnderlineOffset: 3,
        }}>
          Draper, Coric, Korda, Hurkacz, Bautista A., Goffin, Cazaux, Cerundolo F.
        </div>
      </section>

      {/* R16 matches */}
      <section style={{ padding: '14px 16px 14px' }}>
        <div style={{
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`, marginBottom: 4,
        }}>
          <h2 style={{ font: `400 20px/1 ${TP.serif}`, margin: 0 }}>R16 · 8 matches</h2>
        </div>
        {r16Matches.map((m, i) => {
          const myP1 = m.myPick === 'p1';
          const myP2 = m.myPick === 'p2';
          const wonP1 = m.winner === 'p1';
          const wonP2 = m.winner === 'p2';
          const isResulted = !!m.winner;
          const isLive = m.state === 'live';

          return (
            <div key={i} style={{
              padding: '11px 0',
              borderBottom: i === r16Matches.length - 1 ? 'none' : `1px dotted ${TP.rule}`,
              opacity: 1,
            }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              }}>
                <div style={{
                  font: `400 15px/1.2 ${TP.serif}`,
                }}>
                  <span style={{
                    fontWeight: myP1 ? 500 : 400,
                    color: wonP1 ? TP.olive : (isResulted ? TP.ink3 : TP.ink),
                    textDecoration: myP1 && !isResulted ? `underline ${TP.brick} 1.5px` : 'none',
                    textUnderlineOffset: 3,
                    opacity: isResulted && !wonP1 ? 0.55 : 1,
                  }}>{m.p1}</span>
                  {m.s1 && <span style={{ font: `400 italic 10px/1 ${TP.serif}`, color: TP.ink3, marginLeft: 4 }}>[{m.s1}]</span>}
                  <span style={{ fontStyle: 'italic', color: TP.ink3, margin: '0 8px' }}>v</span>
                  <span style={{
                    fontWeight: myP2 ? 500 : 400,
                    color: wonP2 ? TP.olive : (isResulted ? TP.ink3 : TP.ink),
                    textDecoration: myP2 && !isResulted ? `underline ${TP.brick} 1.5px` : 'none',
                    textUnderlineOffset: 3,
                    opacity: isResulted && !wonP2 ? 0.55 : 1,
                  }}>{m.p2}</span>
                  {m.s2 && <span style={{ font: `400 italic 10px/1 ${TP.serif}`, color: TP.ink3, marginLeft: 4 }}>[{m.s2}]</span>}
                </div>
              </div>
              <div style={{
                font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase', marginTop: 4,
                color: isLive ? TP.brick : (isResulted ? TP.olive : TP.ink3),
              }}>
                {isLive ? '· Live' : isResulted ? `${m.p1 === (wonP1 ? m.p1 : m.p2) ? wonP1 ? m.p1 : m.p2 : ''} into QF` : 'awaiting'}
              </div>
            </div>
          );
        })}
      </section>

      <TPTabBar active="Bracket" />
    </div>
  );
}

// ─── STANDINGS (compact) ───────────────────────────────────────────────────
function TPMobileStandings() {
  const D = TP_DATA;
  const fullStandings = [
    { id: 'tay',  name: 'Tay',  label: 'you', initials: 'T',  avatar: 'olive', color: '#3D4F2B', total: 168, tipped: 95, correct: 46, accuracy: 48, move: 2, r: [44, 68, 56, 0, 0, 0] },
    { id: 'tg',   name: 'tg',  initials: 'TG', avatar: 'brick', color: '#3D6A8F', total: 146, tipped: 25, correct: 13, accuracy: 52, move: 0, r: [0, 4, 32, 110, 0, 0] },
    { id: 'tgm',  name: 'taylor.geissmann', initials: 'TG', avatar: 'plum', color: '#7A4A8F', total: 64, tipped: 8, correct: 4, accuracy: 50, move: 1, r: [0, 0, 0, 64, 0, 0] },
    { id: 'ck',   name: 'conor.keohane',    initials: 'CK', avatar: 'ochre', color: '#C58A2E', total: 32, tipped: 8, correct: 2, accuracy: 25, move: -2, r: [0, 0, 0, 32, 0, 0] },
    { id: 'st',   name: 'Stasi',            initials: 'S',  avatar: 'sage',  color: '#4A8C6A', total: 32, tipped: 8, correct: 2, accuracy: 25, move: -1, r: [0, 0, 0, 32, 0, 0] },
    { id: 'mh',   name: 'mhennings',        initials: 'MH', avatar: 'plum',  color: '#9A6B4E', total: 22, tipped: 16, correct: 8, accuracy: 50, move: -3, r: [22, 0, 0, 0, 0, 0] },
  ];

  const roundNames = ['R64','R32','R16','QF','SF','F'];

  return (
    <div className="tp" style={{
      width: 380, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px 12px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <span style={{ font: `400 italic 20px/1 ${TP.serif}` }}>The Tipping Post</span>
        <span style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>Profile</span>
      </div>

      <section style={{
        position: 'relative', padding: '16px 16px 16px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -8, top: -8,
          font: `400 italic 110px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }}>ROMA</div>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Standings</div>
        <h1 style={{ font: `400 30px/1.04 ${TP.serif}`, margin: '6px 0 0' }}>
          Full table, <span style={{ fontStyle: 'italic' }}>after R32.</span>
        </h1>
        <div style={{
          marginTop: 10, font: `400 11px/1 ${TP.sans}`, color: 'rgba(255,255,255,0.92)',
        }}>
          You're <b style={{ fontWeight: 600 }}>1st</b> of {fullStandings.length} · 78 results in
        </div>
      </section>

      <section style={{ padding: '14px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`,
        }}>
          <h2 style={{ font: `400 20px/1 ${TP.serif}`, margin: 0 }}>The leaderboard</h2>
          <span style={{
            font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.ink2,
          }}>Live</span>
        </div>
      </section>

      {/* Card-per-row mobile leaderboard */}
      <section style={{ padding: '4px 16px 18px' }}>
        {fullStandings.map((s, i) => {
          const isMe = s.label === 'you';
          return (
            <div key={s.id} style={{
              padding: '12px 12px 14px',
              marginTop: 8,
              border: `1px solid ${isMe ? TP.brick : TP.rule}`,
              background: isMe ? 'rgba(184,84,51,0.04)' : 'transparent',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 8,
              }}>
                <div style={{
                  font: `400 italic 22px/1 ${TP.serif}`,
                  color: isMe ? TP.brick : (i === 0 ? TP.brick : TP.ink2),
                  width: 24,
                }}>{i + 1}</div>
                <TPAvatar s={s} size={24} />
                <div style={{
                  flex: 1, minWidth: 0,
                  font: `${isMe ? 500 : 400} 15px/1.2 ${TP.sans}`,
                  color: isMe ? TP.brick : TP.ink,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.name}
                  {isMe && <span style={{ fontStyle: 'italic', fontWeight: 400, color: TP.ink2, marginLeft: 4 }}>· you</span>}
                </div>
                <TPMove move={s.move} />
                <div style={{
                  font: `400 26px/1 ${TP.serif}`,
                  color: isMe ? TP.brick : TP.ink,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 50, textAlign: 'right',
                }}>{s.total}</div>
              </div>
              {/* Mini per-round strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2,
                marginTop: 6,
              }}>
                {s.r.map((v, ri) => (
                  <div key={ri} style={{
                    textAlign: 'center',
                    padding: '4px 0',
                    background: v === 0 ? 'transparent' : `rgba(184,84,51,${(0.08 + (v / 168) * 0.22).toFixed(2)})`,
                    border: `1px solid ${v === 0 ? TP.ruleSoft : 'transparent'}`,
                  }}>
                    <div style={{
                      font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: TP.ink3,
                    }}>{roundNames[ri]}</div>
                    <div style={{
                      font: `400 14px/1 ${TP.serif}`, marginTop: 3,
                      color: v === 0 ? TP.ink4 : TP.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 8,
                font: `400 11px/1 ${TP.sans}`, color: TP.ink3,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <span>{s.correct}/{s.tipped} hits</span>
                <span>{s.accuracy}% accuracy</span>
              </div>
            </div>
          );
        })}
      </section>

      <TPTabBar active="Standings" />
    </div>
  );
}

// ─── FINAL / tiebreaker ────────────────────────────────────────────────────
function TPMobileFinal() {
  const Scrubber = ({ label, sublabel, value, hint }) => (
    <div style={{
      padding: '18px 16px 22px',
      background: TP.paper2, border: `1px solid ${TP.rule}`,
      marginBottom: 14,
    }}>
      <div style={{
        font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: TP.brick, marginBottom: 4,
      }}>{label}</div>
      <div style={{
        font: `400 italic 14px/1.4 ${TP.serif}`, color: TP.ink2, marginBottom: 16,
      }}>{sublabel}</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 0 10px', borderBottom: `2px solid ${TP.ink}`,
      }}>
        <button style={{
          width: 44, height: 44,
          border: `1px solid ${TP.rule}`, background: TP.paper,
          font: `400 28px/1 ${TP.serif}`, color: TP.ink2,
        }}>−</button>
        <div style={{
          font: `400 72px/1 ${TP.serif}`,
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</div>
        <button style={{
          width: 44, height: 44,
          border: `1px solid ${TP.rule}`, background: TP.paper,
          font: `400 28px/1 ${TP.serif}`, color: TP.ink2,
        }}>+</button>
      </div>
      <div style={{
        font: `400 italic 11px/1.4 ${TP.serif}`, color: TP.ink2, marginTop: 10,
      }}>{hint}</div>
    </div>
  );

  return (
    <div className="tp" style={{
      width: 380, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px 12px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <span style={{ font: `400 italic 20px/1 ${TP.serif}` }}>The Tipping Post</span>
        <span style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>Profile</span>
      </div>

      <section style={{
        position: 'relative', padding: '18px 16px 18px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -8, top: -8,
          font: `400 italic 120px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
        }}>FINAL</div>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Final Word · Tiebreaker</div>
        <h1 style={{
          font: `400 32px/1.04 ${TP.serif}`, margin: '6px 0 0',
        }}>
          How many games <span style={{ fontStyle: 'italic' }}>in the final?</span>
        </h1>
      </section>

      <section style={{
        padding: '16px 16px 16px', borderBottom: `1px solid ${TP.rule}`,
      }}>
        <div style={{
          font: `400 14px/1.55 ${TP.sans}`, color: TP.ink2,
        }}>
          Predict the total games played in each singles final. A 6–4 6–3 6–2
          men's final = <b style={{ color: TP.ink, fontWeight: 500 }}>27 games</b>. The men's number breaks
          ties first; women's is the backup; earliest filed wins if you're still level.
        </div>
      </section>

      <section style={{ padding: '14px 16px 4px' }}>
        <Scrubber
          label="Men's final · total games"
          sublabel="Primary tiebreaker."
          value={38}
          hint="Last 10 Rome men's finals: avg 34 games. Range 27–41."
        />
        <Scrubber
          label="Women's final · total games"
          sublabel="Secondary tiebreaker."
          value={22}
          hint="Last 10 Rome women's finals: avg 21 games. Range 18–26."
        />
      </section>

      <section style={{ padding: '4px 16px 18px' }}>
        <div style={{
          padding: 14, background: TP.paper2, border: `1px solid ${TP.rule}`,
        }}>
          <TPEyebrow color={TP.brick} style={{ marginBottom: 8 }}>Your call</TPEyebrow>
          <div style={{
            font: `400 18px/1.35 ${TP.serif}`,
          }}>
            <span style={{ color: TP.brick }}>38</span> men · <span style={{ color: TP.brick }}>22</span> women.{' '}
            <span style={{ fontStyle: 'italic', color: TP.ink2 }}>Filed at 10:42.</span>
          </div>
        </div>

        <button style={{
          marginTop: 14, width: '100%',
          background: TP.brick, color: TP.paper, border: 'none',
          padding: '16px 0',
          font: `600 11px/1 ${TP.sans}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>Save tiebreaker →</button>
        <div style={{
          font: `400 italic 11px/1.4 ${TP.serif}`,
          color: TP.ink3, marginTop: 8, textAlign: 'center',
        }}>Edit any time before the men's final starts.</div>
      </section>

      <TPTabBar active="Final" />
    </div>
  );
}

window.TPMobilePicks = TPMobilePicks;
window.TPMobileBracket = TPMobileBracket;
window.TPMobileStandings = TPMobileStandings;
window.TPMobileFinal = TPMobileFinal;
