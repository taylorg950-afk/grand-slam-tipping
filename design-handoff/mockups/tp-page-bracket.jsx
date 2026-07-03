// Bracket page — full men's draw (R64 → F). Two halves stacked, with the
// Final between them. Connectors are dotted hairlines drawn in SVG over
// the absolutely-positioned match cards.

function TPPageBracket() {
  // ─── Dimensions ────────────────────────────────────────────────────────
  const MW = 188;   // match card width
  const MH = 38;    // match card height
  const GV = 3;     // vertical gap between R64 matches
  const GC = 26;    // gap between columns

  // R64: 16 matches per half, stacked.
  const r64H = MW;  // sanity
  const rowH = MH + GV;
  const halfH = 16 * MH + 15 * GV;  // 608 + 45 = 653

  // Column x positions (within the bracket layout — left padding handled by parent)
  const colX = (i) => i * (MW + GC);

  // Match top-Y, given half (0 = top half, 1 = bottom half) and column index
  // Within a half, R64 matches sit at i*rowH; next columns centre between pairs.
  function yForMatch(col, idx) {
    // col 0: 16 matches at idx * rowH
    // col 1: 8 matches, each centred between its parent pair
    // col 2: 4, col 3: 2, col 4: 1
    if (col === 0) return idx * rowH + MH / 2;
    const a = yForMatch(col - 1, idx * 2);
    const b = yForMatch(col - 1, idx * 2 + 1);
    return (a + b) / 2;
  }

  // ─── Data ──────────────────────────────────────────────────────────────
  // 32 R64 pairs, then derived rounds. We hand-write each round so visuals
  // are predictable; in production the propagation is computed from results.

  // Helper to build a match
  const M = (p1, s1, p2, s2, winner = null, myPick = null, live = false) =>
    ({ p1, s1, p2, s2, winner, myPick, live });
  const EMPTY = () => M('—', null, '—', null);

  // R64 — 32 matches. Top half = matches 0..15, bottom half = 16..31.
  // All R64 resulted. Mix of correct/wrong picks to show the visual states.
  const r64 = [
    // Sinner quarter (top half)
    M('Sinner', 1, 'Mannarino', null, 'p1', 'p1'),
    M('Bonzi', null, 'Coria', null, 'p2', 'p2'),
    M('Khachanov', 15, 'Carballés B.', null, 'p1', 'p1'),
    M('Bublik', 30, 'Q', null, 'p1', 'p2'),
    M('Cobolli', 29, 'Coric', null, 'p2', 'p1'),
    M('Wawrinka', null, 'Etcheverry', 31, 'p2', 'p2'),
    M('Mensik', null, 'Q', null, 'p1', 'p1'),
    M('Sonego', null, 'Rune', 9, 'p2', 'p2'),
    // Rublev quarter (top half)
    M('Rublev', 5, 'Davidovich F.', null, 'p1', 'p1'),
    M('Karatsev', null, 'Lehecka', 28, 'p2', 'p2'),
    M('Korda', 21, 'Popyrin', null, 'p2', 'p1'),
    M('Kecmanovic', null, 'Cerundolo', 13, 'p2', 'p2'),
    M('Auger-A.', 20, 'Q', null, 'p1', 'p1'),
    M('Gasquet', null, 'Hurkacz', 12, 'p2', 'p2'),
    M('Bautista A.', null, 'Berrettini', 16, 'p2', 'p2'),
    M('Q', null, 'Zverev', 4, 'p2', 'p2'),

    // Alcaraz quarter (bottom half)
    M('Alcaraz', 2, 'Q', null, 'p1', 'p1'),
    M('Arnaldi', null, 'Musetti', null, 'p2', 'p2'),
    M('Paul', 18, 'Lajović', null, 'p1', 'p1'),
    M('Q', null, 'Dimitrov', 14, 'p2', 'p2'),
    M('Fritz', 11, 'Q', null, 'p1', 'p1'),
    M('Tabilo', null, 'Humbert', 22, 'p2', 'p2'),
    M('Goffin', null, 'Cazaux', null, 'p1', 'p2'),
    M('Halys', null, 'Ruud', 6, 'p2', 'p2'),
    // Djokovic quarter (bottom half)
    M('Shelton', 10, 'Q', null, 'p1', 'p1'),
    M('Norrie', null, 'Wu', null, 'p1', 'p2'),
    M('Cazaux', null, 'Tsitsipas', 19, 'p2', 'p2'),
    M('Cerundolo F.', 26, 'Q', null, 'p1', 'p1'),
    M('de Minaur', 8, 'Mpetshi P.', null, 'p1', 'p1'),
    M('Sonego', null, 'Medvedev', 7, 'p2', 'p2'),
    M('Draper', 11, 'Q', null, 'p1', 'p1'),
    M('Q', null, 'Djokovic', 3, 'p2', 'p2'),
  ];

  // R32 — 16 matches. Drawn from R64 winners. All resulted.
  const r32 = [
    M('Sinner', 1, 'Bonzi', null, 'p1', 'p1'),
    M('Khachanov', 15, 'Bublik', 30, 'p1', 'p2'),
    M('Coric', null, 'Wawrinka', null, 'p2', 'p1'),
    M('Mensik', null, 'Rune', 9, 'p2', 'p2'),

    M('Rublev', 5, 'Lehecka', 28, 'p1', 'p1'),
    M('Popyrin', null, 'Cerundolo', 13, 'p2', 'p2'),
    M('Auger-A.', 20, 'Hurkacz', 12, 'p2', 'p1'),
    M('Berrettini', 16, 'Zverev', 4, 'p1', 'p2'),

    M('Alcaraz', 2, 'Musetti', null, 'p1', 'p1'),
    M('Paul', 18, 'Dimitrov', 14, 'p2', 'p2'),
    M('Fritz', 11, 'Humbert', 22, 'p1', 'p1'),
    M('Goffin', null, 'Ruud', 6, 'p2', 'p2'),

    M('Shelton', 10, 'Norrie', null, 'p1', 'p1'),
    M('Tsitsipas', 19, 'Cerundolo F.', 26, 'p1', 'p1'),
    M('de Minaur', 8, 'Medvedev', 7, 'p2', 'p2'),
    M('Draper', 11, 'Djokovic', 3, 'p2', 'p2'),
  ];

  // R16 — 8 matches. 1 resulted (Sinner won), 1 live, 6 pending picks.
  const r16 = [
    M('Sinner', 1, 'Rune', 9, 'p1', 'p1'),
    M('Wawrinka', null, 'Khachanov', 15, null, 'p2'),
    M('Rublev', 5, 'Cerundolo', 13, null, 'p1'),
    M('Hurkacz', 12, 'Zverev', 4, null, 'p2', true),  // live
    M('Alcaraz', 2, 'Dimitrov', 14, null, 'p1'),
    M('Fritz', 11, 'Ruud', 6, null, 'p1'),
    M('Shelton', 10, 'Tsitsipas', 19, null, 'p1'),
    M('de Minaur', 8, 'Djokovic', 3, null, 'p2'),
  ];

  // QF / SF / F — empty boxes
  const qf = [EMPTY(), EMPTY(), EMPTY(), EMPTY()];
  const sf = [EMPTY(), EMPTY()];
  const f  = [EMPTY()];

  const rounds = [
    { name: 'R64', pts: 2,  matches: r64, state: 'done' },
    { name: 'R32', pts: 4,  matches: r32, state: 'done' },
    { name: 'R16', pts: 8,  matches: r16, state: 'live' },
    { name: 'QF',  pts: 16, matches: qf,  state: 'pending' },
    { name: 'SF',  pts: 32, matches: sf,  state: 'pending' },
    { name: 'F',   pts: 64, matches: f,   state: 'pending' },
  ];

  // Map (round, half) → match indices for that half
  // Half 0 (top): matches 0..N/2 - 1 of each round.
  // Half 1 (bottom): matches N/2..N-1.
  function matchesForHalf(roundIdx, half) {
    const ms = rounds[roundIdx].matches;
    const half_n = Math.ceil(ms.length / 2);
    return half === 0 ? ms.slice(0, half_n) : ms.slice(half_n);
  }

  // ─── Match card component ──────────────────────────────────────────────
  const MatchCard = ({ m, isLive, big = false }) => {
    const isEmpty = m.p1 === '—' && m.p2 === '—';
    const isResulted = !!m.winner && !isEmpty;
    const p1Won = m.winner === 'p1';
    const p2Won = m.winner === 'p2';

    const Row = ({ name, seed, won, lost, picked, isFirst }) => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6, padding: `${big ? 5 : 3}px 8px`,
        borderBottom: isFirst ? `1px dotted ${TP.rule}` : 'none',
        opacity: lost ? 0.4 : 1,
        background: won ? 'rgba(61,79,43,0.07)' : 'transparent',
        minHeight: big ? 22 : 17,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
          <span style={{
            font: `${picked || won ? 500 : 400} ${big ? 14 : 12}px/1.1 ${TP.serif}`,
            color: won ? TP.olive : TP.ink,
            textDecoration: picked && !isResulted ? `underline ${TP.brick} 1.5px` : 'none',
            textUnderlineOffset: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</span>
          {seed && (
            <span style={{
              font: `400 italic 9px/1 ${TP.serif}`, color: TP.ink3,
            }}>[{seed}]</span>
          )}
        </div>
        {won && (
          <span style={{ font: `500 9px/1 ${TP.sans}`, color: TP.olive }}>✓</span>
        )}
        {picked && lost && (
          <span style={{
            font: `500 7px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.brick,
          }}>pick</span>
        )}
      </div>
    );

    return (
      <div style={{
        width: MW, height: big ? MH + 16 : MH,
        border: `1px solid ${isLive ? TP.brick : TP.rule}`,
        background: isEmpty ? TP.paper2 : TP.paper,
        opacity: isEmpty ? 0.55 : 1,
        position: 'relative',
      }}>
        {isLive && (
          <div style={{
            position: 'absolute', top: -7, left: 8, padding: '1px 5px',
            background: TP.brick, color: TP.paper,
            font: `500 7px/12px ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>Live</div>
        )}
        <Row name={m.p1} seed={m.s1} won={p1Won} lost={isResulted && !p1Won} picked={m.myPick === 'p1'} isFirst={true} />
        <Row name={m.p2} seed={m.s2} won={p2Won} lost={isResulted && !p2Won} picked={m.myPick === 'p2'} isFirst={false} />
      </div>
    );
  };

  // ─── Half bracket renderer ─────────────────────────────────────────────
  function HalfBracket({ half, label, mySfPlayer }) {
    // Width = 5 cols (R64..SF). F is rendered separately by parent.
    const cols = 5;
    const totalW = cols * MW + (cols - 1) * GC;
    const totalH = halfH;

    return (
      <div style={{ position: 'relative', width: totalW, height: totalH }}>
        {/* Connectors */}
        <svg style={{
          position: 'absolute', left: 0, top: 0, pointerEvents: 'none',
          width: totalW, height: totalH,
        }}>
          {[0, 1, 2, 3].map(srcCol => {
            const parentCount = matchesForHalf(srcCol, half).length;
            const childCount = matchesForHalf(srcCol + 1, half).length;
            return [...Array(childCount).keys()].map(ci => {
              const x1 = colX(srcCol) + MW;
              const x2 = colX(srcCol + 1);
              const midX = x1 + (x2 - x1) / 2;
              const yTop = yForMatch(srcCol, ci * 2);
              const yBot = yForMatch(srcCol, ci * 2 + 1);
              const yMid = yForMatch(srcCol + 1, ci);
              return (
                <path key={`${srcCol}-${ci}`}
                      d={`M ${x1} ${yTop} L ${midX} ${yTop} L ${midX} ${yBot} L ${x1} ${yBot}
                          M ${midX} ${yMid} L ${x2} ${yMid}`}
                      fill="none" stroke={TP.rule} strokeWidth="1" strokeDasharray="2 3" />
              );
            });
          })}
        </svg>

        {/* Match cards per column */}
        {[0, 1, 2, 3, 4].map(col => {
          const matches = matchesForHalf(col, half);
          return matches.map((m, idx) => (
            <div key={`${col}-${idx}`} style={{
              position: 'absolute',
              left: colX(col),
              top: yForMatch(col, idx) - MH / 2,
            }}>
              <MatchCard m={m} isLive={m.live} />
            </div>
          ));
        })}

        {/* Half label */}
        <div style={{
          position: 'absolute', left: 0, top: -22,
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: TP.ink3,
        }}>{label}</div>
      </div>
    );
  }

  // ─── Page ──────────────────────────────────────────────────────────────
  const bracketWidth = 5 * MW + 4 * GC;  // half width

  return (
    <div className="tp" style={{
      width: 1440, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <TPMasthead />

      {/* Banner */}
      <section style={{
        position: 'relative', padding: '22px 32px 22px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -32, top: -18,
          font: `400 italic 200px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)',
          letterSpacing: '-0.04em', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>DRAW</div>
        <div style={{
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Draw · {TP_DATA.tournament.name}</div>
        <h1 style={{
          font: `400 44px/1.04 ${TP.serif}`,
          letterSpacing: '-0.015em', margin: '8px 0 0',
        }}>
          Men's singles, <span style={{ fontStyle: 'italic' }}>R64 to the Final.</span>
        </h1>
      </section>

      {/* Controls strip */}
      <section style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: `1px solid ${TP.rule}`,
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <button style={{
            padding: '8px 16px', border: `1px solid ${TP.ink}`,
            background: TP.ink, color: TP.paper,
            font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>Men's</button>
          <button style={{
            padding: '8px 16px', border: `1px solid ${TP.rule}`, borderLeft: 'none',
            background: 'transparent', color: TP.ink2,
            font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>Women's</button>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'baseline' }}>
          {rounds.map(r => (
            <div key={r.name} style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: r.state === 'live' ? TP.brick : (r.state === 'pending' ? TP.ink3 : TP.ink2),
            }}>
              {r.name}
              <span style={{
                font: `400 italic 10px/1 ${TP.serif}`,
                color: TP.ink3, marginLeft: 4, letterSpacing: 0, textTransform: 'none',
              }}>· {r.pts}pt</span>
            </div>
          ))}
        </div>
      </section>

      {/* Your picks summary strip */}
      <section style={{
        padding: '14px 32px',
        borderBottom: `1px solid ${TP.rule}`,
        display: 'flex', alignItems: 'baseline', gap: 24,
        font: `400 13px/1.4 ${TP.sans}`,
      }}>
        <div>
          <TPEyebrow color={TP.brick}>Your picks · alive</TPEyebrow>
          <div style={{
            font: `400 italic 16px/1.4 ${TP.serif}`, color: TP.ink, marginTop: 4,
          }}>
            Sinner, Khachanov, Rublev, Zverev, Alcaraz, Fritz, Shelton, Djokovic.
            <span style={{ color: TP.ink2, fontStyle: 'normal', fontSize: 13 }}>
              {' '}· 8 of 16 still in.
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <TPEyebrow>Out so far</TPEyebrow>
          <div style={{
            font: `400 italic 14px/1.4 ${TP.serif}`, color: TP.ink3, marginTop: 4,
            textDecoration: `line-through ${TP.ink3} 1px`,
            textUnderlineOffset: 3,
          }}>
            Draper, Coric, Korda, Hurkacz, Bautista A., Goffin, Cazaux, Cerundolo F.
          </div>
        </div>
      </section>

      {/* Bracket — top half / Final / bottom half */}
      <section style={{ padding: '34px 32px 18px' }}>
        {/* Top half */}
        <div style={{ display: 'flex' }}>
          <HalfBracket half={0} label="Top half · into SF" />
        </div>

        {/* Final, centred */}
        <div style={{
          padding: '40px 0 36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10,
          position: 'relative',
        }}>
          {/* Hairline rules left + right */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            display: 'flex', justifyContent: 'space-between', pointerEvents: 'none',
          }}>
            <div style={{
              width: 'calc(50% - 140px)', height: 0,
              borderTop: `1px dotted ${TP.rule}`,
            }} />
            <div style={{
              width: 'calc(50% - 140px)', height: 0,
              borderTop: `1px dotted ${TP.rule}`,
            }} />
          </div>
          <div style={{
            font: `500 11px/1 ${TP.sans}`, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: TP.brick,
            background: TP.paper, padding: '0 14px', position: 'relative',
          }}>· The Final ·</div>
          <div style={{ position: 'relative', zIndex: 1, background: TP.paper, padding: '0 14px' }}>
            <MatchCard m={f[0]} big />
          </div>
          <div style={{
            font: `400 italic 12px/1.3 ${TP.serif}`, color: TP.ink3,
            background: TP.paper, padding: '0 14px',
          }}>Worth 64 points · earliest predicted total games wins ties.</div>
        </div>

        {/* Bottom half */}
        <div style={{ display: 'flex', marginTop: 6 }}>
          <HalfBracket half={1} label="Bottom half · into SF" />
        </div>
      </section>

      <TPTabBar active="Bracket" />
    </div>
  );
}

window.TPPageBracket = TPPageBracket;
