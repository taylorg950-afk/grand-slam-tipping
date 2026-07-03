// Option B · Mobile — 380px broadsheet
// Same metaphor, single column. The wordmark, double-rules, drop cap,
// section dividers and italic byline are what carry the newspaper feel
// on mobile — we lose the multi-column body but keep the editorial bones.

function TPOptionBMobile() {
  const D = TP_DATA;
  const me = D.standings[0];
  const second = D.standings[1];
  const gap = me.points - second.points;

  return (
    <div className="tp" style={{
      width: 380, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans,
      overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      {/* Masthead — compact */}
      <div style={{
        padding: '12px 16px 0',
        borderBottom: `3px double ${TP.ink}`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
          paddingBottom: 8, borderBottom: `1px solid ${TP.rule}`,
        }}>
          <span>Vol. {D.tournament.volume} · No. {String(D.tournament.issueNo).padStart(2,'0')}</span>
          <span>{D.tournament.weekday} · Day {D.tournament.day}</span>
        </div>
        <h1 style={{
          font: `400 italic 42px/1 ${TP.serif}`,
          letterSpacing: '-0.02em',
          textAlign: 'center', margin: '14px 0 4px',
        }}>{D.tournament.masthead}</h1>
        <div style={{
          textAlign: 'center', paddingBottom: 10,
          font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.28em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>
          A dispatch from the {D.tournament.name}
        </div>
      </div>

      {/* Section bar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${TP.rule}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: TP.ink2,
      }}>
        <span style={{ color: TP.brick, fontWeight: 600 }}>{D.round.name} · {D.round.status}</span>
        <span>16/16 in</span>
      </div>

      {/* Lead story */}
      <article style={{ padding: '20px 16px 20px' }}>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.brick, marginBottom: 8,
        }}>Lead</div>
        <h2 style={{
          font: `400 32px/1.05 ${TP.serif}`, letterSpacing: '-0.015em',
          margin: '0 0 10px',
        }}>
          {me.name} holds {gap}-point lead<br />
          as Rome hits the <span style={{ fontStyle: 'italic' }}>Round of 16.</span>
        </h2>
        <div style={{
          font: `400 italic 14px/1.4 ${TP.serif}`, color: TP.ink2,
          marginBottom: 14, paddingBottom: 12,
          borderBottom: `1px dotted ${TP.rule}`,
        }}>
          All sixteen picks filed before tea. A four-correct run through R16's
          opening matches has stretched the gap to {gap}.
        </div>
        <p style={{
          font: `400 14px/1.55 ${TP.sans}`, color: TP.ink2,
          margin: '0 0 12px',
        }}>
          <span style={{
            font: `400 italic 48px/0.85 ${TP.serif}`, color: TP.ink,
            float: 'left', padding: '4px 8px 0 0',
          }}>R</span>
          ome's clay has been kind to the leader. With 22 of 48 first-round
          picks landing then 17 of 30 in the second, {me.name} now sits on
          {' '}{me.points} points — a {me.accuracy}% hit rate.
        </p>
        <p style={{
          font: `400 14px/1.55 ${TP.sans}`, color: TP.ink2, margin: '0 0 12px',
        }}>
          The challenger, {second.name}, has been quieter on volume but sharper,
          converting {second.accuracy}% of {second.tipped} tips. With QF worth
          16 points each, the gap could close in an afternoon.
        </p>
      </article>

      {/* Standings */}
      <section style={{
        padding: '14px 16px 20px',
        borderTop: `1px solid ${TP.rule}`,
      }}>
        <div style={{
          font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: TP.ink2,
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`, marginBottom: 2,
        }}>The Standings · Live</div>
        {D.standings.map((s, i) => {
          const isMe = s.label === 'you';
          return (
            <div key={s.id} style={{
              display: 'grid',
              gridTemplateColumns: '20px 22px 1fr 40px',
              gap: 10, alignItems: 'center',
              padding: '11px 0',
              borderBottom: `1px dotted ${TP.rule}`,
              color: isMe ? TP.brick : TP.ink,
            }}>
              <div style={{
                font: `400 italic 19px/1 ${TP.serif}`,
                color: isMe ? TP.brick : TP.ink2,
              }}>{i + 1}</div>
              <TPAvatar s={s} size={22} />
              <div style={{
                font: `${isMe ? 500 : 400} 14px/1.2 ${TP.sans}`,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.name}
                {isMe && <span style={{
                  fontStyle: 'italic', fontWeight: 400, color: TP.ink2, marginLeft: 4,
                }}>· you</span>}
              </div>
              <div style={{
                textAlign: 'right',
                font: `400 20px/1 ${TP.serif}`,
                fontVariantNumeric: 'tabular-nums',
              }}>{s.points}</div>
            </div>
          );
        })}
      </section>

      {/* By the numbers */}
      <section style={{ padding: '4px 16px 16px' }}>
        <div style={{
          padding: 14, background: TP.paper2, border: `1px solid ${TP.rule}`,
        }}>
          <div style={{
            font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.brick, marginBottom: 10,
          }}>By the numbers</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { l: 'Your points',  v: me.points },
              { l: 'Lead over 2nd',v: `+${gap}` },
              { l: 'Hit rate',     v: `${me.accuracy}%` },
              { l: 'Streak',       v: `${D.you.streak} in a row` },
            ].map(x => (
              <div key={x.l}>
                <div style={{
                  font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: TP.ink2, marginBottom: 4,
                }}>{x.l}</div>
                <div style={{
                  font: `400 24px/1 ${TP.serif}`,
                  fontVariantNumeric: 'tabular-nums',
                }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Below the fold */}
      <div style={{
        padding: '8px 16px',
        borderTop: `3px double ${TP.ink}`,
        borderBottom: `1px solid ${TP.rule}`,
        font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.3em',
        textTransform: 'uppercase', color: TP.ink2, textAlign: 'center',
      }}>· Below the fold ·</div>

      {/* Order of play */}
      <section style={{ padding: '18px 16px 12px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`, marginBottom: 2,
        }}>
          <div style={{ font: `400 19px/1 ${TP.serif}`, letterSpacing: '-0.01em' }}>
            Today's order
          </div>
          <div style={{
            font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.ink2,
          }}>{D.matches.length} matches</div>
        </div>
        {D.matches.slice(0, 4).map((m, i) => {
          const myPickIsP1 = m.myPick === m.p1;
          return (
            <div key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr 50px',
              gap: 10, alignItems: 'center',
              padding: '11px 0',
              borderBottom: i === 3 ? 'none' : `1px dotted ${TP.rule}`,
              opacity: m.locked ? 0.7 : 1,
            }}>
              <div style={{
                font: `400 italic 14px/1 ${TP.serif}`, color: TP.ink2,
                fontVariantNumeric: 'tabular-nums',
              }}>{m.time}</div>
              <div>
                <div style={{ font: `400 15px/1.2 ${TP.serif}` }}>
                  <span style={{
                    fontWeight: myPickIsP1 ? 500 : 400,
                    textDecoration: myPickIsP1 ? `underline ${TP.brick} 1.5px` : 'none',
                    textUnderlineOffset: 3,
                  }}>{m.p1}</span>
                  <span style={{ fontStyle: 'italic', color: TP.ink3, margin: '0 6px' }}>v</span>
                  <span style={{
                    fontWeight: !myPickIsP1 ? 500 : 400,
                    textDecoration: !myPickIsP1 ? `underline ${TP.brick} 1.5px` : 'none',
                    textUnderlineOffset: 3,
                  }}>{m.p2}</span>
                </div>
                {m.consensus !== m.myPick && (
                  <div style={{
                    font: `400 10px/1 ${TP.sans}`, color: TP.brick, marginTop: 3,
                  }}>contrarian · room favours {m.consensus}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  font: `500 8px/1 ${TP.sans}`, letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: m.locked ? TP.ink3 : TP.brick,
                }}>{m.locked ? 'locked' : 'open'}</span>
              </div>
            </div>
          );
        })}
        <div style={{
          textAlign: 'center', paddingTop: 12,
          font: `400 italic 12px/1 ${TP.serif}`, color: TP.ink2,
        }}>+ 2 more · see Picks →</div>
      </section>

      {/* Chart */}
      <section style={{ padding: '14px 16px 14px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingBottom: 6, borderBottom: `2px solid ${TP.ink}`, marginBottom: 10,
        }}>
          <div style={{ font: `400 19px/1 ${TP.serif}`, letterSpacing: '-0.01em' }}>
            Points by round
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {D.standings.slice(0, 3).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 2, background: s.color }} />
              <span style={{ font: `${s.label === 'you' ? 500 : 400} 10px/1 ${TP.sans}` }}>{s.name}</span>
            </div>
          ))}
          <span style={{ font: `400 10px/1 ${TP.sans}`, color: TP.ink3 }}>+2 others</span>
        </div>
        <TPLineChart
          data={D.chart}
          series={[
            { key: 'tay', color: D.standings[0].color, bold: true },
            { key: 'tg',  color: D.standings[1].color },
            { key: 'tgm', color: D.standings[2].color },
            { key: 'ck',  color: D.standings[3].color },
            { key: 'st',  color: D.standings[4].color },
          ]}
          width={348}
          height={160}
          padding={{ t: 18, r: 8, b: 26, l: 28 }}
        />
      </section>

      <TPTabBar />
    </div>
  );
}

window.TPOptionBMobile = TPOptionBMobile;
