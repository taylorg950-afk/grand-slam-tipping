// Picks page — round-by-round picks management.
// Layout: masthead → terracotta banner ("Your picks") → round nav tape →
// round summary heading → editorial match cards.

function TPPagePicks() {
  const D = TP_DATA;

  // Picks matches — extend the dashboard's R16 list with status info
  const matches = [
    { id: 1, time: '14:00', court: 'Centrale', p1: 'Sinner',     p1seed: 1,  p2: 'de Minaur', p2seed: 8,  myPick: 'p1', winner: 'p1', state: 'correct' },
    { id: 2, time: '15:30', court: 'Centrale', p1: 'Alcaraz',    p1seed: 2,  p2: 'Draper',    p2seed: 11, myPick: 'p2', winner: 'p1', state: 'wrong' },
    { id: 3, time: '17:00', court: 'Centrale', p1: 'Sabalenka',  p1seed: 1,  p2: 'Pegula',    p2seed: 6,  myPick: 'p1', winner: null, state: 'locked' },
    { id: 4, time: '18:30', court: 'Pietrangeli', p1: 'Świątek', p1seed: 2,  p2: 'Gauff',     p2seed: 4,  myPick: 'p1', winner: null, state: 'picked' },
    { id: 5, time: '20:00', court: 'Centrale', p1: 'Zverev',     p1seed: 4,  p2: 'Rune',      p2seed: 9,  myPick: 'p2', winner: null, state: 'picked' },
    { id: 6, time: '21:30', court: 'Centrale', p1: 'Rybakina',   p1seed: 5,  p2: 'Paolini',   p2seed: 7,  myPick: 'p2', winner: null, state: 'picked' },
    { id: 7, time: 'Wed 14:00', court: 'Centrale', p1: 'Medvedev', p1seed: 6, p2: 'Tsitsipas', p2seed: 12, myPick: null, winner: null, state: 'open' },
    { id: 8, time: 'Wed 15:30', court: 'Centrale', p1: 'Sakkari', p1seed: 8,  p2: 'Kasatkina', p2seed: 13, myPick: null, winner: null, state: 'open' },
  ];

  const rounds = [
    { name: 'R64', pts: 2,  correct: 22, total: 48, points: 44, active: false, state: 'done' },
    { name: 'R32', pts: 4,  correct: 17, total: 30, points: 68, active: false, state: 'done' },
    { name: 'R16', pts: 8,  correct: 7,  total: 16, points: 56, active: true,  state: 'live' },
    { name: 'QF',  pts: 16, correct: 0,  total: 0,  points: 0,  active: false, state: 'pending' },
    { name: 'SF',  pts: 32, correct: 0,  total: 0,  points: 0,  active: false, state: 'pending' },
    { name: 'F',   pts: 64, correct: 0,  total: 0,  points: 0,  active: false, state: 'pending' },
  ];

  const StatePill = ({ state, pts }) => {
    const map = {
      correct: { label: `+${pts}`, color: TP.olive, fill: 'rgba(61,79,43,0.08)' },
      wrong:   { label: '0',       color: TP.brick, fill: 'rgba(184,84,51,0.08)' },
      locked:  { label: 'pending', color: TP.ink3,  fill: 'transparent' },
      picked:  { label: 'picked',  color: TP.ink2,  fill: 'transparent' },
      open:    { label: 'tap to pick', color: TP.brick, fill: 'transparent' },
    };
    const c = map[state];
    return (
      <span style={{
        font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: c.color,
        padding: c.fill !== 'transparent' ? '4px 8px' : 0,
        background: c.fill,
        fontVariantNumeric: 'tabular-nums',
      }}>{c.label}</span>
    );
  };

  // Player line — shows seed, pick state, winner state.
  const PlayerLine = ({ name, seed, picked, won, lost, isOpen }) => {
    const color = won ? TP.olive : lost ? TP.ink3 : picked ? TP.ink : TP.ink2;
    return (
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        font: `${picked ? 500 : 400} 19px/1.15 ${TP.serif}`,
        color,
        textDecoration: picked && !won && !lost ? `underline ${TP.brick} 1.5px` : 'none',
        textUnderlineOffset: 4,
        opacity: lost ? 0.55 : 1,
      }}>
        <span>{name}</span>
        {seed && (
          <span style={{
            font: `400 italic 12px/1 ${TP.serif}`, color: TP.ink3,
          }}>[{seed}]</span>
        )}
        {won && (
          <span style={{
            font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.olive, marginLeft: 4,
          }}>won</span>
        )}
        {isOpen && picked && (
          <span style={{
            font: `400 italic 12px/1 ${TP.serif}`, color: TP.brick, marginLeft: 4,
          }}>← your pick</span>
        )}
      </div>
    );
  };

  return (
    <div className="tp" style={{
      width: 1440, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <TPMasthead />

      {/* Banner */}
      <section style={{
        position: 'relative', padding: '24px 32px 24px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -32, top: -18,
          font: `400 italic 220px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)',
          letterSpacing: '-0.04em', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>R16</div>
        <div style={{
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>Your picks · {D.tournament.name}</div>
        <h1 style={{
          font: `400 48px/1.04 ${TP.serif}`,
          letterSpacing: '-0.015em', margin: '8px 0 0',
        }}>
          Round of 16 <span style={{ fontStyle: 'italic', color: '#F2EBDC' }}>underway.</span>
        </h1>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14,
          font: `400 13px/1 ${TP.sans}`, color: 'rgba(255,255,255,0.92)',
        }}>
          <span><b style={{ fontWeight: 600 }}>6</b> of 8 picked</span>
          <span style={{ width: 3, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
          <span>1 result so far · <b style={{ fontWeight: 600 }}>+8 points</b></span>
          <span style={{ width: 3, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
          <span>locks Wed 14:00 AEST</span>
        </div>
      </section>

      {/* Round nav */}
      <section style={{
        display: 'flex', gap: 12,
        padding: '18px 32px 14px',
        borderBottom: `1px solid ${TP.rule}`,
      }}>
        {rounds.map(r => {
          const isActive = r.active;
          return (
            <div key={r.name} style={{
              padding: '10px 16px 10px',
              border: `1px solid ${isActive ? TP.ink : TP.rule}`,
              background: isActive ? TP.ink : 'transparent',
              color: isActive ? TP.paper : (r.state === 'pending' ? TP.ink3 : TP.ink),
              minWidth: 92,
              opacity: r.state === 'pending' ? 0.55 : 1,
            }}>
              <div style={{
                font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}>{r.name}</div>
              <div style={{
                font: `400 italic 11px/1 ${TP.serif}`,
                color: isActive ? 'rgba(250,246,236,0.6)' : TP.ink3,
                marginTop: 4,
              }}>{r.pts}pt each</div>
              {r.state === 'done' && (
                <div style={{
                  font: `400 24px/1 ${TP.serif}`,
                  marginTop: 6, fontVariantNumeric: 'tabular-nums',
                  color: isActive ? TP.paper : TP.ink,
                }}>+{r.points}</div>
              )}
              {r.state === 'live' && (
                <div style={{
                  font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isActive ? '#F2EBDC' : TP.brick,
                  marginTop: 6,
                }}>Live</div>
              )}
              {r.state === 'pending' && (
                <div style={{
                  font: `400 italic 12px/1 ${TP.serif}`,
                  color: TP.ink3, marginTop: 6,
                }}>to come</div>
              )}
            </div>
          );
        })}
      </section>

      {/* Round summary header */}
      <section style={{ padding: '24px 32px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h2 style={{
              font: `400 28px/1 ${TP.serif}`, letterSpacing: '-0.01em', margin: 0,
            }}>The card · Round of 16</h2>
            <div style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: TP.ink2,
            }}>8 points per correct call</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            <div>
              <div style={{
                font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: TP.ink2, marginBottom: 4,
              }}>Filed</div>
              <div style={{ font: `400 22px/1 ${TP.serif}` }}>6/8</div>
            </div>
            <div>
              <div style={{
                font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: TP.ink2, marginBottom: 4,
              }}>Resulted</div>
              <div style={{ font: `400 22px/1 ${TP.serif}` }}>2/8</div>
            </div>
            <div>
              <div style={{
                font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: TP.ink2, marginBottom: 4,
              }}>Earned</div>
              <div style={{ font: `400 22px/1 ${TP.serif}`, color: TP.brick }}>+8</div>
            </div>
          </div>
        </div>
      </section>

      {/* Match cards */}
      <section style={{ padding: '4px 32px 24px' }}>
        {matches.map((m, i) => {
          const myPickIsP1 = m.myPick === 'p1';
          const myPickIsP2 = m.myPick === 'p2';
          const wonP1 = m.winner === 'p1';
          const wonP2 = m.winner === 'p2';
          const isResulted = !!m.winner;

          // Result border tint
          let borderColor = TP.rule;
          let bg = 'transparent';
          if (m.state === 'correct') { borderColor = 'rgba(61,79,43,0.4)'; bg = 'rgba(61,79,43,0.04)'; }
          if (m.state === 'wrong')   { borderColor = 'rgba(184,84,51,0.4)'; bg = 'rgba(184,84,51,0.04)'; }

          return (
            <div key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '90px 36px 1fr 140px',
              gap: 18, alignItems: 'center',
              padding: '16px 18px',
              marginBottom: 6,
              border: `1px solid ${borderColor}`,
              background: bg,
            }}>
              {/* Time + court */}
              <div>
                <div style={{
                  font: `400 italic 15px/1 ${TP.serif}`,
                  fontVariantNumeric: 'tabular-nums', color: TP.ink,
                }}>{m.time}</div>
                <div style={{
                  font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: TP.ink3, marginTop: 5,
                }}>{m.court}</div>
              </div>

              {/* Status dot */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: m.state === 'correct' ? TP.olive
                           : m.state === 'wrong'   ? TP.brick
                           : m.state === 'locked'  ? 'rgba(27,24,20,0.12)'
                           : m.state === 'picked'  ? 'rgba(27,24,20,0.08)'
                           : 'transparent',
                  border: m.state === 'open' ? `1px dashed ${TP.brick}` : 'none',
                  color: TP.paper,
                  font: `500 13px/1 ${TP.sans}`,
                }}>
                  {m.state === 'correct' ? '✓' : m.state === 'wrong' ? '✗' : m.state === 'open' ? <span style={{ color: TP.brick, fontSize: 16 }}>+</span> : ''}
                </div>
              </div>

              {/* Players */}
              <div>
                <PlayerLine
                  name={m.p1} seed={m.p1seed}
                  picked={myPickIsP1} won={wonP1} lost={isResulted && !wonP1}
                  isOpen={m.state === 'open' || m.state === 'picked'}
                />
                <div style={{
                  font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: TP.ink3,
                  margin: '4px 0',
                }}>v</div>
                <PlayerLine
                  name={m.p2} seed={m.p2seed}
                  picked={myPickIsP2} won={wonP2} lost={isResulted && !wonP2}
                  isOpen={m.state === 'open' || m.state === 'picked'}
                />
              </div>

              {/* Result / state */}
              <div style={{ textAlign: 'right' }}>
                <StatePill state={m.state} pts={8} />
              </div>
            </div>
          );
        })}
      </section>

      <TPTabBar active="Picks" />
    </div>
  );
}

window.TPPagePicks = TPPagePicks;
