// Option B — "The Front Page"
// Push the newspaper metaphor all the way. Broadsheet masthead with rules,
// a lead story written from the live data, columns separated by hairlines,
// a sidebar with the leaderboard, and "below the fold" smaller stories.

function TPOptionB() {
  const D = TP_DATA;
  const me = D.standings[0];
  const second = D.standings[1];
  const gap = me.points - second.points;

  // Column rule helper — a thin vertical divider in the gap between columns
  const colRule = {
    borderRight: `1px solid ${TP.rule}`,
  };

  return (
    <div className="tp" style={{
      width: 1440, position: 'relative',
      background: TP.paper, color: TP.ink, fontFamily: TP.sans,
      overflow: 'hidden',
    }}>
      <div aria-hidden style={TP_GRAIN} />

      {/* Broadsheet masthead */}
      <div style={{
        padding: '24px 32px 0',
        borderBottom: `3px double ${TP.ink}`,
      }}>
        {/* Top edition strip */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: TP.ink2,
          paddingBottom: 14, borderBottom: `1px solid ${TP.rule}`,
        }}>
          <span>Vol. {D.tournament.volume} · No. {String(D.tournament.issueNo).padStart(2,'0')}</span>
          <span>{D.tournament.weekday} · Day {D.tournament.day}</span>
          <span>Subscribers only · 10 readers</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <span style={{ color: TP.brick }}>Admin</span>
            <span>Profile</span>
          </span>
        </div>
        {/* Wordmark */}
        <h1 style={{
          font: `400 italic 84px/1 ${TP.serif}`,
          letterSpacing: '-0.025em',
          textAlign: 'center', margin: '18px 0 6px',
        }}>{D.tournament.masthead}</h1>
        <div style={{
          textAlign: 'center', paddingBottom: 14,
          font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.35em',
          textTransform: 'uppercase', color: TP.ink2,
        }}>
          A private dispatch from the {D.tournament.name}
        </div>
      </div>

      {/* Section heading bar */}
      <div style={{
        padding: '12px 32px',
        borderBottom: `1px solid ${TP.rule}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        font: `500 11px/1 ${TP.sans}`, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: TP.ink2,
      }}>
        <span>The Front Page</span>
        <span style={{ color: TP.brick, fontWeight: 600 }}>{D.round.name} · {D.round.status}</span>
        <span>16 of 16 picks in · locks Wed</span>
      </div>

      {/* Above the fold — 5-col grid: lead story (3) + sidebar (2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr' }}>
        {/* Lead story */}
        <article style={{
          padding: '26px 28px 24px 32px',
          ...colRule,
        }}>
          <div style={{
            font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.brick, marginBottom: 10,
          }}>LEAD</div>
          <h2 style={{
            font: `400 52px/1.04 ${TP.serif}`, letterSpacing: '-0.02em',
            margin: '0 0 14px',
          }}>
            {me.name} holds {gap}-point lead<br />
            as Rome hits the <span style={{ fontStyle: 'italic' }}>Round of 16.</span>
          </h2>
          <div style={{
            font: `400 italic 16px/1.4 ${TP.serif}`, color: TP.ink2,
            marginBottom: 16, paddingBottom: 14,
            borderBottom: `1px dotted ${TP.rule}`,
          }}>
            All sixteen picks filed before tea. A four-correct run through R16's
            opening matches has stretched the gap to {gap}, with {second.name} the
            nearest threat at {second.points}.
          </div>

          {/* Body — 2 inner columns */}
          <div style={{
            columnCount: 2, columnGap: 24, columnRule: `1px solid ${TP.ruleSoft}`,
            font: `400 14px/1.55 ${TP.sans}`, color: TP.ink2,
          }}>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{
                font: `400 italic 56px/0.85 ${TP.serif}`, color: TP.ink,
                float: 'left', padding: '6px 8px 0 0',
              }}>R</span>
              ome's clay has been kind to the leader. With 22 of 48
              first-round picks landing, then 17 of 30 in the second, {me.name} now
              sits on {me.points} points heading into the final stretch — a
              {' '}{me.accuracy}% hit rate across {me.tipped} tips.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              The challenger, {second.name}, has been quieter on volume —
              {' '}{second.tipped} tips in — but sharper, converting
              {' '}{second.accuracy}% of them. With QF worth 16 points each, the
              gap could close in an afternoon if Sinner and Alcaraz both fall.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              The room is in agreement on the day's lead match. Sabalenka v Pegula
              draws 70% support; only one tipper has called the upset. Locks at
              5pm Roma time.
            </p>
            <p style={{ margin: 0 }}>
              <i>Continued in <b style={{ color: TP.ink }}>Order of play</b> →</i>
            </p>
          </div>
        </article>

        {/* Sidebar — Standings */}
        <aside style={{ padding: '26px 32px 24px 28px' }}>
          <div style={{
            font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: TP.ink2,
            paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 4,
          }}>The Standings · Live</div>

          {D.standings.map((s, i) => {
            const isMe = s.label === 'you';
            return (
              <div key={s.id} style={{
                display: 'grid',
                gridTemplateColumns: '24px 22px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '12px 0',
                borderBottom: `1px dotted ${TP.rule}`,
                color: isMe ? TP.brick : TP.ink,
              }}>
                <div style={{
                  font: `400 italic 22px/1 ${TP.serif}`,
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
                  font: `400 22px/1 ${TP.serif}`,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 36,
                }}>{s.points}</div>
              </div>
            );
          })}

          {/* By the numbers */}
          <div style={{
            marginTop: 22, padding: 16,
            background: TP.paper2, border: `1px solid ${TP.rule}`,
          }}>
            <div style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: TP.brick, marginBottom: 12,
            }}>By the numbers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { l: 'Your points', v: me.points },
                { l: 'Lead over 2nd', v: `+${gap}` },
                { l: 'Hit rate', v: `${me.accuracy}%` },
                { l: 'Streak', v: `${D.you.streak} in a row` },
              ].map(x => (
                <div key={x.l}>
                  <div style={{
                    font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: TP.ink2, marginBottom: 4,
                  }}>{x.l}</div>
                  <div style={{
                    font: `400 28px/1 ${TP.serif}`,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Section divider — "Below the fold" */}
      <div style={{
        padding: '10px 32px',
        borderTop: `3px double ${TP.ink}`,
        borderBottom: `1px solid ${TP.rule}`,
        font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.3em',
        textTransform: 'uppercase', color: TP.ink2, textAlign: 'center',
      }}>· Below the fold ·</div>

      {/* Below the fold — 3-col grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '4fr 5fr',
      }}>
        {/* Order of play */}
        <section style={{
          padding: '24px 28px 24px 32px',
          ...colRule,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 4,
          }}>
            <div style={{ font: `400 22px/1 ${TP.serif}`, letterSpacing: '-0.01em' }}>
              Today's order of play
            </div>
            <div style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: TP.ink2,
            }}>Centrale · Pietrangeli</div>
          </div>
          {D.matches.map((m, i) => {
            const myPickIsP1 = m.myPick === m.p1;
            return (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr 70px',
                gap: 14, alignItems: 'center',
                padding: '12px 0',
                borderBottom: i === D.matches.length - 1 ? 'none' : `1px dotted ${TP.rule}`,
                opacity: m.locked ? 0.7 : 1,
              }}>
                <div style={{
                  font: `400 italic 16px/1 ${TP.serif}`, color: TP.ink2,
                  fontVariantNumeric: 'tabular-nums',
                }}>{m.time}</div>
                <div>
                  <div style={{ font: `400 17px/1.15 ${TP.serif}` }}>
                    <span style={{
                      fontWeight: myPickIsP1 ? 500 : 400,
                      textDecoration: myPickIsP1 ? `underline ${TP.brick} 1.5px` : 'none',
                      textUnderlineOffset: 4,
                    }}>{m.p1}</span>
                    <span style={{ fontStyle: 'italic', color: TP.ink3, margin: '0 8px' }}>v</span>
                    <span style={{
                      fontWeight: !myPickIsP1 ? 500 : 400,
                      textDecoration: !myPickIsP1 ? `underline ${TP.brick} 1.5px` : 'none',
                      textUnderlineOffset: 4,
                    }}>{m.p2}</span>
                  </div>
                  <div style={{
                    font: `400 11px/1 ${TP.sans}`, color: TP.ink3, marginTop: 4,
                  }}>
                    {m.consensus === m.myPick
                      ? `${m.consensusPct}% of the room agrees`
                      : <span style={{ color: TP.brick }}>contrarian — room favours {m.consensus}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {m.locked ? (
                    <span style={{
                      font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: TP.ink3,
                    }}>locked</span>
                  ) : (
                    <span style={{
                      font: `500 9px/1 ${TP.sans}`, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: TP.brick,
                    }}>open</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Chart + your rounds */}
        <section style={{ padding: '24px 32px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            paddingBottom: 8, borderBottom: `2px solid ${TP.ink}`, marginBottom: 14,
          }}>
            <div style={{ font: `400 22px/1 ${TP.serif}`, letterSpacing: '-0.01em' }}>
              Points by round
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              {D.standings.slice(0, 3).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 2, background: s.color }} />
                  <span style={{ font: `${s.label === 'you' ? 500 : 400} 11px/1 ${TP.sans}` }}>{s.name}</span>
                </div>
              ))}
              <span style={{ font: `400 11px/1 ${TP.sans}`, color: TP.ink3 }}>+2 others</span>
            </div>
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
            width={520}
            height={210}
          />

          {/* Your rounds compact */}
          <div style={{ marginTop: 22 }}>
            <div style={{
              font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: TP.ink2, marginBottom: 10,
            }}>Your rounds</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              {D.rounds.map((r) => {
                const pct = r.resulted > 0 ? (r.correct / r.resulted) * 100 : 0;
                const active = r.state !== 'pending';
                return (
                  <div key={r.name} style={{ opacity: active ? 1 : 0.4 }}>
                    <div style={{ font: `500 12px/1 ${TP.sans}`, marginBottom: 4 }}>
                      {r.name}
                      <span style={{
                        font: `400 9px/1 ${TP.sans}`, color: TP.ink3, marginLeft: 4,
                      }}>{r.pts}pt</span>
                    </div>
                    <div style={{
                      font: `400 24px/1 ${TP.serif}`, fontVariantNumeric: 'tabular-nums',
                      marginBottom: 6,
                    }}>{active ? r.points : '—'}</div>
                    <div style={{
                      height: 2, background: TP.ruleSoft, borderRadius: 2,
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: r.state === 'live' ? TP.brick : TP.olive,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <TPTabBar />
    </div>
  );
}

window.TPOptionB = TPOptionB;
