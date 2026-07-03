// Final / tiebreaker page — predict total games in the men's & women's
// finals. From PROJECT.md: this is the tiebreaker that breaks ties on the
// final leaderboard. Primary = men's total games, secondary = women's,
// tertiary = earliest submission timestamp.

function TPPageFinal() {
  const D = TP_DATA;

  // The number scrubber — big serif display with +/- controls.
  const Scrubber = ({ label, sublabel, value, hint }) => (
    <div style={{
      padding: '28px 32px 32px',
      background: TP.paper2, border: `1px solid ${TP.rule}`,
    }}>
      <div style={{
        font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: TP.brick, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        font: `400 italic 17px/1.4 ${TP.serif}`,
        color: TP.ink2, marginBottom: 26, maxWidth: 380,
      }}>{sublabel}</div>

      {/* Big number scrubber */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0 16px',
        borderBottom: `2px solid ${TP.ink}`,
      }}>
        <button style={{
          width: 56, height: 56,
          border: `1px solid ${TP.rule}`, background: TP.paper,
          font: `400 32px/1 ${TP.serif}`, color: TP.ink2,
          cursor: 'pointer',
        }}>−</button>

        <div style={{
          font: `400 110px/1 ${TP.serif}`,
          letterSpacing: '-0.025em',
          fontVariantNumeric: 'tabular-nums',
          color: TP.ink,
        }}>{value}</div>

        <button style={{
          width: 56, height: 56,
          border: `1px solid ${TP.rule}`, background: TP.paper,
          font: `400 32px/1 ${TP.serif}`, color: TP.ink2,
          cursor: 'pointer',
        }}>+</button>
      </div>

      <div style={{
        font: `400 italic 13px/1.5 ${TP.serif}`, color: TP.ink2,
        marginTop: 14,
      }}>{hint}</div>
    </div>
  );

  return (
    <div className="tp" style={{
      width: 1440, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans, overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      <TPMasthead />

      {/* Banner */}
      <section style={{
        position: 'relative', padding: '26px 32px 26px',
        background: TP.brick, color: TP.paper, overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -32, top: -32,
          font: `400 italic 240px/1 ${TP.serif}`,
          color: 'rgba(255,255,255,0.07)',
          letterSpacing: '-0.04em', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>FINAL</div>
        <div style={{
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.22em',
          textTransform: 'uppercase', opacity: 0.85,
        }}>The Final Word · Tiebreaker</div>
        <h1 style={{
          font: `400 52px/1.04 ${TP.serif}`,
          letterSpacing: '-0.015em', margin: '8px 0 0',
        }}>
          How many games <span style={{ fontStyle: 'italic' }}>in the final?</span>
        </h1>
        <div style={{
          marginTop: 14,
          font: `400 13px/1 ${TP.sans}`, color: 'rgba(255,255,255,0.92)',
        }}>
          Locks at the start of the men's final · {D.tournament.name}
        </div>
      </section>

      {/* Lead — what the tiebreaker is */}
      <section style={{
        padding: '26px 32px 22px',
        borderBottom: `1px solid ${TP.rule}`,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 36,
          alignItems: 'baseline',
        }}>
          <div>
            <TPEyebrow style={{ marginBottom: 10 }}>From the rules</TPEyebrow>
            <h2 style={{
              font: `400 30px/1.15 ${TP.serif}`,
              letterSpacing: '-0.01em', margin: '0 0 12px',
            }}>
              Two numbers to break a tie at the line.
            </h2>
            <div style={{
              font: `400 14px/1.55 ${TP.sans}`, color: TP.ink2, maxWidth: 600,
            }}>
              Predict the total number of games played in each singles final.
              A 6–4, 6–3, 6–2 final is 27 games. The men's number is the
              primary tiebreaker; the women's number is the backup; if you're
              still level, earliest filed wins.
            </div>
          </div>

          <div style={{
            padding: 18, background: TP.paper2, border: `1px solid ${TP.rule}`,
          }}>
            <TPEyebrow color={TP.brick} style={{ marginBottom: 10 }}>How it counts</TPEyebrow>
            <ol style={{
              margin: 0, paddingLeft: 18,
              font: `400 13px/1.6 ${TP.sans}`, color: TP.ink2,
            }}>
              <li><b style={{ fontWeight: 500, color: TP.ink }}>Closest to actual</b> men's final total games.</li>
              <li>If still tied, closest to actual women's final.</li>
              <li>If still tied, earliest submission wins.</li>
            </ol>
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: `1px dotted ${TP.rule}`,
              font: `400 italic 12px/1.4 ${TP.serif}`, color: TP.ink3,
            }}>
              You can edit until the men's final starts. After that, it's locked.
            </div>
          </div>
        </div>
      </section>

      {/* The two scrubbers */}
      <section style={{
        padding: '26px 32px 12px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
      }}>
        <Scrubber
          label="Men's final · total games"
          sublabel="Primary tiebreaker. A 6–4, 6–3, 6–2 final = 27 games."
          value={38}
          hint="Range typically 24 to 60. Five-setter avg over the last 10 Rome finals: 34 games."
        />
        <Scrubber
          label="Women's final · total games"
          sublabel="Secondary tiebreaker. A 6–4, 6–3 final = 19 games."
          value={22}
          hint="Range typically 16 to 30. Three-setter avg over the last 10 Rome finals: 21 games."
        />
      </section>

      {/* History strip */}
      <section style={{ padding: '12px 32px 18px' }}>
        <div style={{
          paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 14,
        }}>
          <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0 }}>Last ten Rome finals</h2>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 0,
        }}>
          {[
            { y: '2016', m: 32, w: 21 },
            { y: '2017', m: 38, w: 18 },
            { y: '2018', m: 36, w: 23 },
            { y: '2019', m: 27, w: 20 },
            { y: '2020', m: 41, w: 22 },
            { y: '2021', m: 33, w: 19 },
            { y: '2022', m: 30, w: 26 },
            { y: '2023', m: 35, w: 21 },
            { y: '2024', m: 39, w: 18 },
            { y: '2025', m: 29, w: 24 },
          ].map((y, i, arr) => (
            <div key={y.y} style={{
              padding: '14px 10px',
              borderRight: i === arr.length - 1 ? 'none' : `1px solid ${TP.rule}`,
              textAlign: 'center',
            }}>
              <div style={{
                font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: TP.ink2,
              }}>{y.y}</div>
              <div style={{
                font: `400 28px/1 ${TP.serif}`, marginTop: 8,
                fontVariantNumeric: 'tabular-nums',
              }}>{y.m}</div>
              <div style={{
                font: `400 italic 11px/1 ${TP.serif}`, color: TP.ink3, marginTop: 4,
              }}>men · {y.w} W</div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit + standings preview */}
      <section style={{
        padding: '12px 32px 22px',
        borderTop: `1px solid ${TP.rule}`,
        display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 36,
        alignItems: 'center',
      }}>
        <div>
          <TPEyebrow style={{ marginBottom: 6 }}>Your call</TPEyebrow>
          <div style={{
            font: `400 26px/1.3 ${TP.serif}`,
          }}>
            <span style={{ color: TP.brick }}>38</span> games for the men.{' '}
            <span style={{ color: TP.brick }}>22</span> for the women.{' '}
            <span style={{ fontStyle: 'italic', color: TP.ink2 }}>Filed at 10:42 today.</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button style={{
            background: TP.brick, color: TP.paper, border: 'none',
            padding: '16px 28px',
            font: `600 11px/1 ${TP.sans}`,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Save tiebreaker →</button>
          <div style={{
            font: `400 italic 12px/1 ${TP.serif}`, color: TP.ink3, marginTop: 8,
          }}>Edit any time before the men's final starts.</div>
        </div>
      </section>

      <TPTabBar active="Final" />
    </div>
  );
}

window.TPPageFinal = TPPageFinal;
