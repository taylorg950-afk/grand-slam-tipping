// Standings page — full leaderboard with per-round breakdown.
// Mirrors the current /tournaments/[slug]/leaderboard page but extends it
// with round-by-round columns and a "movers since R32" panel.

function TPPageStandings() {
  const D = TP_DATA;

  // Extended standings — per-round points + total. Realistic for the data
  // shown in the dashboard chart (Tay's spark, tg's late surge etc.)
  const fullStandings = [
    { id: 'tay',  name: 'Tay',  label: 'you', initials: 'T',  avatar: 'olive', color: '#3D4F2B',
      r: { R64: 44,  R32: 68,  R16: 56, QF: 0,  SF: 0, F: 0 },
      tipped: 95, correct: 46, total: 168, move: 2 },
    { id: 'tg',   name: 'tg',  initials: 'TG', avatar: 'brick', color: '#3D6A8F',
      r: { R64: 0,   R32: 4,   R16: 32, QF: 110, SF: 0, F: 0 },
      tipped: 25, correct: 13, total: 146, move: 0 },
    { id: 'tgm',  name: 'taylor.geissmann', initials: 'TG', avatar: 'plum', color: '#7A4A8F',
      r: { R64: 0,   R32: 0,   R16: 0,  QF: 64,  SF: 0, F: 0 },
      tipped: 8,  correct: 4,  total: 64,  move: 1 },
    { id: 'ck',   name: 'conor.keohane',    initials: 'CK', avatar: 'ochre', color: '#C58A2E',
      r: { R64: 0,   R32: 0,   R16: 0,  QF: 32,  SF: 0, F: 0 },
      tipped: 8,  correct: 2,  total: 32,  move: -2 },
    { id: 'st',   name: 'Stasi',            initials: 'S',  avatar: 'sage',  color: '#4A8C6A',
      r: { R64: 0,   R32: 0,   R16: 0,  QF: 32,  SF: 0, F: 0 },
      tipped: 8,  correct: 2,  total: 32,  move: -1 },
    { id: 'mh',   name: 'mhennings',        initials: 'MH', avatar: 'plum',  color: '#9A6B4E',
      r: { R64: 22,  R32: 0,   R16: 0,  QF: 0,   SF: 0, F: 0 },
      tipped: 16, correct: 8,  total: 22,  move: -3 },
  ];

  const roundDefs = [
    { name: 'R64', pts: 2 },
    { name: 'R32', pts: 4 },
    { name: 'R16', pts: 8 },
    { name: 'QF',  pts: 16 },
    { name: 'SF',  pts: 32 },
    { name: 'F',   pts: 64 },
  ];

  // Find the largest per-round score for heat shading
  const maxByRound = {};
  roundDefs.forEach(rd => {
    maxByRound[rd.name] = Math.max(...fullStandings.map(s => s.r[rd.name]), 1);
  });

  // Heat colour — pale brick fill scaling 0→1 by relative score
  const heatBg = (v, max) => {
    if (v === 0) return 'transparent';
    const a = 0.08 + (v / max) * 0.22; // 0.08 → 0.30
    return `rgba(184,84,51,${a.toFixed(2)})`;
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
        }}>ROMA</div>
        <div style={{
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Standings · {D.tournament.name}</div>
        <h1 style={{
          font: `400 48px/1.04 ${TP.serif}`,
          letterSpacing: '-0.015em', margin: '8px 0 0',
        }}>
          Full table, <span style={{ fontStyle: 'italic' }}>after Round of 32.</span>
        </h1>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14,
          font: `400 13px/1 ${TP.sans}`, color: 'rgba(255,255,255,0.92)',
        }}>
          <span><b style={{ fontWeight: 600 }}>78</b> matches resulted</span>
          <span style={{ width: 3, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
          <span>{fullStandings.length} tippers in</span>
          <span style={{ width: 3, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
          <span>You're <b style={{ fontWeight: 600 }}>1st</b> of {fullStandings.length}</span>
        </div>
      </section>

      {/* Table */}
      <section style={{ padding: '24px 32px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`,
        }}>
          <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0 }}>The leaderboard</h2>
          <div style={{
            font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.ink2,
          }}>Live · since R32</div>
        </div>

        {/* Column header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 28px 1.6fr 50px repeat(6, 60px) 80px 60px 60px 70px',
          gap: 8, alignItems: 'baseline',
          padding: '12px 8px 8px',
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>
          <span>#</span>
          <span></span>
          <span>Tipper</span>
          <span style={{ textAlign: 'center' }}>Move</span>
          {roundDefs.map(r => (
            <span key={r.name} style={{ textAlign: 'center' }}>
              {r.name}
              <div style={{
                font: `400 italic 9px/1 ${TP.serif}`, color: TP.ink3,
                letterSpacing: 0, marginTop: 3, textTransform: 'none',
              }}>{r.pts}pt</div>
            </span>
          ))}
          <span style={{ textAlign: 'right' }}>Hits</span>
          <span style={{ textAlign: 'right' }}>%</span>
          <span style={{ textAlign: 'right' }}>Run</span>
          <span style={{ textAlign: 'right' }}>Points</span>
        </div>

        {fullStandings.map((s, i) => {
          const isMe = s.label === 'you';
          const accuracy = s.tipped > 0 ? Math.round((s.correct / s.tipped) * 100) : 0;
          // Generate spark from cumulative round points
          const sparkData = roundDefs.reduce((acc, r) => {
            const last = acc[acc.length - 1] || 0;
            acc.push(last + s.r[r.name]);
            return acc;
          }, [0]);

          return (
            <div key={s.id} style={{
              display: 'grid',
              gridTemplateColumns: '32px 28px 1.6fr 50px repeat(6, 60px) 80px 60px 60px 70px',
              gap: 8, alignItems: 'center',
              padding: '14px 8px',
              borderBottom: i === fullStandings.length - 1 ? 'none' : `1px dotted ${TP.rule}`,
              background: isMe ? 'rgba(184,84,51,0.04)' : 'transparent',
            }}>
              <div style={{
                font: `400 italic 22px/1 ${TP.serif}`,
                color: isMe ? TP.brick : (i === 0 ? TP.brick : TP.ink2),
              }}>{i + 1}</div>
              <TPAvatar s={s} size={26} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  font: `${isMe ? 500 : 400} 16px/1.2 ${TP.sans}`,
                  color: isMe ? TP.brick : TP.ink,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.name}
                  {isMe && <span style={{
                    fontStyle: 'italic', fontWeight: 400, color: TP.ink2, marginLeft: 6,
                  }}>· you</span>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <TPMove move={s.move} />
              </div>
              {roundDefs.map(rd => {
                const v = s.r[rd.name];
                return (
                  <div key={rd.name} style={{
                    textAlign: 'center',
                    padding: '8px 0',
                    background: heatBg(v, maxByRound[rd.name]),
                    font: `400 17px/1 ${TP.serif}`,
                    color: v === 0 ? TP.ink4 : TP.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {v === 0 ? '—' : v}
                  </div>
                );
              })}
              <div style={{
                textAlign: 'right',
                font: `400 13px/1 ${TP.sans}`, color: TP.ink2,
                fontVariantNumeric: 'tabular-nums',
              }}>{s.correct}/{s.tipped}</div>
              <div style={{
                textAlign: 'right',
                font: `400 13px/1 ${TP.sans}`, color: TP.ink3,
                fontVariantNumeric: 'tabular-nums',
              }}>{accuracy}%</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <TPSparkline data={sparkData} color={s.color} width={56} height={22} />
              </div>
              <div style={{
                textAlign: 'right',
                font: `400 28px/1 ${TP.serif}`,
                color: isMe ? TP.brick : TP.ink,
                fontVariantNumeric: 'tabular-nums',
              }}>{s.total}</div>
            </div>
          );
        })}
      </section>

      {/* Movers + Browse by round */}
      <section style={{
        padding: '20px 32px 28px',
        display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 36,
      }}>
        {/* Movers */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 14,
          }}>
            <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0 }}>Movers since R32</h2>
            <div style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: TP.ink2,
            }}>biggest swings</div>
          </div>
          {[
            { name: 'taylor.geissmann', move: '+1 spot · +28 points', note: 'Three R32 calls landed back-to-back.' },
            { name: 'mhennings',        move: '−3 spots · same points', note: 'Last to file picks; squeezed out by the field.' },
            { name: 'conor.keohane',    move: '−2 spots · +0 points',  note: 'Punted Alcaraz; cost him momentum.' },
          ].map((m, i, arr) => (
            <div key={m.name} style={{
              padding: '14px 0',
              borderBottom: i === arr.length - 1 ? 'none' : `1px dotted ${TP.rule}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ font: `400 19px/1.2 ${TP.serif}` }}>{m.name}</div>
                <div style={{
                  font: `500 11px/1 ${TP.sans}`, letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: m.move.startsWith('+') ? TP.olive : TP.brick,
                }}>{m.move}</div>
              </div>
              <div style={{
                font: `400 italic 13px/1.3 ${TP.serif}`,
                color: TP.ink2, marginTop: 6,
              }}>{m.note}</div>
            </div>
          ))}
        </div>

        {/* Browse by round */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 14,
          }}>
            <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0 }}>Round detail</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {roundDefs.map(r => (
              <div key={r.name} style={{
                padding: '12px 18px',
                border: `1px solid ${TP.rule}`,
                minWidth: 110,
              }}>
                <div style={{
                  font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: TP.ink2,
                }}>{r.name}</div>
                <div style={{
                  font: `400 italic 11px/1 ${TP.serif}`, color: TP.ink3, marginTop: 4,
                }}>{r.pts}pt each</div>
                <div style={{
                  font: `400 11px/1 ${TP.sans}`, color: TP.brick,
                  marginTop: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
                }}>Open →</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 18,
            borderLeft: `3px solid ${TP.brick}`, paddingLeft: 14,
            font: `400 italic 14px/1.45 ${TP.serif}`, color: TP.ink2,
          }}>
            Round views show every tipper's pick on every match — visible only after
            each match locks. <span style={{ fontStyle: 'normal', color: TP.ink, fontWeight: 500 }}>No peeking before then.</span>
          </div>
        </div>
      </section>

      <TPTabBar active="Standings" />
    </div>
  );
}

window.TPPageStandings = TPPageStandings;
