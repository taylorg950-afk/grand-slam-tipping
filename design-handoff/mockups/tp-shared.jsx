// Shared tokens, mock data, and small primitives for The Tipping Post mockups.
// Everything attaches to window at the bottom so each option file can `use` it.

const TP = {
  // Palette — pulled from src/app/dashboard/page.tsx and globals.css
  paper:        '#FAF6EC',
  paper2:       '#F2EBDC', // warm card / pull-out block
  paper3:       '#EDE4D0', // slightly stronger
  ink:          '#1B1814',
  ink2:         '#3C342C',
  ink3:         'rgba(27,24,20,0.55)',
  ink4:         'rgba(27,24,20,0.28)',
  rule:         'rgba(27,24,20,0.18)', // hairline rules
  ruleSoft:     'rgba(27,24,20,0.10)',
  brick:        '#B85433', // primary accent — terracotta clay
  brickDark:    '#8E3A1F',
  brickSurface: '#FEF2EC',
  olive:        '#3D4F2B', // success / leader
  // Chart palette (matches current Recharts setup roughly)
  c1: '#3D4F2B',   // olive — you
  c2: '#3D6A8F',   // dusty blue
  c3: '#7A4A8F',   // plum
  c4: '#C58A2E',   // ochre
  c5: '#4A8C6A',   // sage
  // Type stacks
  serif: "'Instrument Serif', 'Times New Roman', serif",
  sans:  "'DM Sans', system-ui, sans-serif",
  mono:  "'JetBrains Mono', ui-monospace, monospace",
};

// Subtle paper grain (dotted) as a background-image. Same trick as the shipped app.
const TP_GRAIN = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(27,24,20,0.45) 0.5px, transparent 0)',
  backgroundSize: '3px 3px',
  opacity: 0.06,
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

// Mock data — Italian Open 2026, Round of 16, "Tay" leading.
// Matches the live screenshot the user is iterating against.
const TP_DATA = {
  tournament: {
    name: 'Italian Open 2026',
    city: 'ROMA',
    day: 14,
    weekday: 'Tue',
    issueNo: 14,
    volume: 'I',
    masthead: 'The Tipping Post',
  },
  round: {
    name: 'Round of 16',
    short: 'R16',
    status: 'in progress',
    statusVerb: 'underway',
    pointsPerTip: 8,
    picksIn: 16,
    totalPicks: 16,
    locked: true,
    locksIn: 'locks Wed 6:00 PM AEST',
  },
  you: {
    name: 'Tay',
    handle: 'taylor.g.950',
    initials: 'T',
    rank: 1,
    points: 168,
    correct: 46,
    tipped: 95,
    accuracy: 48,
    momentum: '▲ from 3rd at R32',
    streak: 4, // correct picks in a row
  },
  // Final standings table (5 rows). Spark = running points per round.
  standings: [
    { id: 'tay', name: 'Tay', label: 'you', points: 168, correct: 46, tipped: 95, accuracy: 48, color: '#3D4F2B', spark: [0, 44, 92, 168, 168], move: 2, initials: 'T', avatar: 'olive' },
    { id: 'tg',  name: 'tg',  points: 146, correct: 13, tipped: 25, accuracy: 52, color: '#3D6A8F', spark: [0, 0, 4, 36, 146], move: 0, initials: 'TG', avatar: 'brick' },
    { id: 'taylor.geissmann', name: 'taylor.geissmann', points: 64, correct: 4, tipped: 8, accuracy: 50, color: '#7A4A8F', spark: [0, 0, 0, 0, 64], move: 1, initials: 'TG', avatar: 'plum' },
    { id: 'conor.keohane',    name: 'conor.keohane',    points: 32, correct: 2, tipped: 8, accuracy: 25, color: '#C58A2E', spark: [0, 0, 0, 0, 32], move: -2, initials: 'CK', avatar: 'ochre' },
    { id: 'stasi',            name: 'Stasi',            points: 32, correct: 2, tipped: 8, accuracy: 25, color: '#4A8C6A', spark: [0, 0, 0, 0, 32], move: -1, initials: 'S', avatar: 'sage' },
  ],
  rounds: [
    { name: 'R64', pts: 2, correct: 22, resulted: 48, points: 44, state: 'done' },
    { name: 'R32', pts: 4, correct: 17, resulted: 30, points: 68, state: 'done' },
    { name: 'R16', pts: 8, correct: 7,  resulted: 16, points: 56, state: 'live' },
    { name: 'QF',  pts: 16, correct: 0, resulted: 0,  points: 0,  state: 'pending' },
    { name: 'SF',  pts: 32, correct: 0, resulted: 0,  points: 0,  state: 'pending' },
    { name: 'F',   pts: 64, correct: 0, resulted: 0,  points: 0,  state: 'pending' },
  ],
  // Today's order of play (R16, manually entered by admin in v1)
  matches: [
    { id: 1, time: '14:00', court: 'Centrale', p1: 'Sinner',     p1seed: 1,  p2: 'de Minaur', p2seed: 8,  myPick: 'Sinner',    consensus: 'Sinner',    consensusPct: 90, locked: true,  resulted: false },
    { id: 2, time: '15:30', court: 'Centrale', p1: 'Alcaraz',    p1seed: 2,  p2: 'Draper',    p2seed: 11, myPick: 'Draper',    consensus: 'Alcaraz',   consensusPct: 80, locked: true,  resulted: false },
    { id: 3, time: '17:00', court: 'Centrale', p1: 'Sabalenka',  p1seed: 1,  p2: 'Pegula',    p2seed: 6,  myPick: 'Sabalenka', consensus: 'Sabalenka', consensusPct: 70, locked: false, resulted: false },
    { id: 4, time: '18:30', court: 'Pietrangeli', p1: 'Świątek', p1seed: 2,  p2: 'Gauff',     p2seed: 4,  myPick: 'Świątek',   consensus: 'Świątek',   consensusPct: 60, locked: false, resulted: false },
    { id: 5, time: '20:00', court: 'Centrale', p1: 'Zverev',     p1seed: 4,  p2: 'Rune',      p2seed: 9,  myPick: 'Rune',      consensus: 'Zverev',    consensusPct: 75, locked: false, resulted: false },
    { id: 6, time: '21:30', court: 'Centrale', p1: 'Rybakina',   p1seed: 5,  p2: 'Paolini',   p2seed: 7,  myPick: 'Paolini',   consensus: 'Rybakina',  consensusPct: 55, locked: false, resulted: false },
  ],
  // Cumulative points by round, used for the chart
  chart: [
    { round: 'Start', tay: 0,   tg: 0,   tgm: 0,  ck: 0,  st: 0 },
    { round: 'R64',   tay: 44,  tg: 0,   tgm: 0,  ck: 0,  st: 0 },
    { round: 'R32',   tay: 112, tg: 4,   tgm: 0,  ck: 0,  st: 0 },
    { round: 'R16',   tay: 168, tg: 36,  tgm: 0,  ck: 0,  st: 0 },
    { round: 'QF',    tay: 168, tg: 146, tgm: 64, ck: 32, st: 32 },
  ],
};

// ─── Small primitives ─────────────────────────────────────────────────────

// Sectionhead with the 2px bottom rule used across the shipped app.
function TPSectionHead({ title, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      borderBottom: `2px solid ${TP.ink}`, paddingBottom: 8, marginBottom: 14,
      ...style,
    }}>
      <h2 style={{ font: `400 22px/1 ${TP.serif}`, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {right && <div style={{
        font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: TP.ink2,
      }}>{right}</div>}
    </div>
  );
}

// Small-caps eyebrow label (10px / 0.18em tracking — shipped pattern)
function TPEyebrow({ children, color, style }) {
  return (
    <div style={{
      font: `600 10px/1 ${TP.sans}`,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: color || TP.ink2,
      ...style,
    }}>{children}</div>
  );
}

// Round-coloured circular avatar with initials
function TPAvatar({ s, size = 22 }) {
  const colors = {
    olive: { bg: '#3D4F2B', fg: '#FAF6EC' },
    brick: { bg: '#8E3A1F', fg: '#FAF6EC' },
    plum:  { bg: '#7A4A6B', fg: '#FAF6EC' },
    ochre: { bg: '#C58A2E', fg: '#1B1814' },
    sage:  { bg: '#4A8C6A', fg: '#FAF6EC' },
  };
  const c = colors[s.avatar] || colors.brick;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: `500 ${Math.round(size*0.4)}px/1 ${TP.sans}`, flex: '0 0 auto',
    }}>{s.initials}</div>
  );
}

// Inline sparkline as SVG. data = number[], renders as a smooth path.
function TPSparkline({ data, color, width = 92, height = 22 }) {
  const max = Math.max(...data, 1);
  const min = 0;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / (max - min)) * (height - 2) - 1;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
}

// Movement indicator (▲2 / ▼1 / —)
function TPMove({ move, color }) {
  if (move === 0) {
    return <span style={{ color: TP.ink4, font: `400 11px/1 ${TP.sans}` }}>—</span>;
  }
  const up = move > 0;
  const c = color || (up ? TP.olive : TP.brick);
  return (
    <span style={{ color: c, font: `500 11px/1 ${TP.sans}`, fontVariantNumeric: 'tabular-nums' }}>
      {up ? '▲' : '▼'} {Math.abs(move)}
    </span>
  );
}

// Lightweight line chart (no recharts dependency). Replicates the shipped
// "Points by round" chart well enough for a mockup at full fidelity.
function TPLineChart({ data, series, width = 560, height = 280, padding = { t: 24, r: 16, b: 30, l: 36 } }) {
  const xs = data.map(d => d.round);
  const max = Math.max(...series.flatMap(s => data.map(d => d[s.key])), 10);
  const niceMax = Math.ceil(max / 45) * 45 || 180;
  const W = width - padding.l - padding.r;
  const H = height - padding.t - padding.b;
  const stepX = W / (xs.length - 1);
  const yFor = (v) => padding.t + H - (v / niceMax) * H;
  const xFor = (i) => padding.l + i * stepX;

  // Curve through points — Catmull-Rom-ish using quadratic bezier midpoints.
  const pathFor = (key) => {
    const pts = data.map((d, i) => [xFor(i), yFor(d[key])]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [x, y]   = pts[i];
      const mx = (px + x) / 2;
      d += ` Q ${mx} ${py} ${mx} ${(py + y) / 2} T ${x} ${y}`;
    }
    return d;
  };

  const yTicks = [0, niceMax / 4, niceMax / 2, (niceMax / 4) * 3, niceMax];

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {/* y gridlines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padding.l} x2={width - padding.r} y1={yFor(t)} y2={yFor(t)}
                stroke={TP.ruleSoft} strokeWidth="1" />
          <text x={padding.l - 8} y={yFor(t) + 3}
                textAnchor="end"
                style={{ font: `400 10px/1 ${TP.sans}`, fill: TP.ink3, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(t)}
          </text>
        </g>
      ))}
      {/* x labels */}
      {xs.map((x, i) => (
        <text key={x} x={xFor(i)} y={height - 8}
              textAnchor="middle"
              style={{ font: `400 11px/1 ${TP.sans}`, fill: TP.ink3 }}>
          {x}
        </text>
      ))}
      {/* series — leader drawn last so it sits on top */}
      {[...series].sort((a, b) => (a.bold ? 1 : -1) - (b.bold ? 1 : -1)).map((s) => {
        const pts = data.map((d, i) => [xFor(i), yFor(d[s.key])]);
        return (
          <g key={s.key}>
            <path d={pathFor(s.key)} fill="none" stroke={s.color}
                  strokeWidth={s.bold ? 2.25 : 1.5} strokeLinecap="round" strokeLinejoin="round"
                  opacity={s.bold ? 1 : 0.9} />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={s.bold ? 2.5 : 0} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Tab bar (matches shipped 5-tab pattern: Dashboard, Picks, Bracket, Standings, Final)
function TPTabBar({ active = 'Dashboard' }) {
  const tabs = ['Dashboard', 'Picks', 'Bracket', 'Standings', 'Final'];
  return (
    <div style={{
      borderTop: `1px solid ${TP.rule}`,
      padding: '14px 32px 16px',
      display: 'grid',
      gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      gap: 4,
      background: TP.paper,
    }}>
      {tabs.map(t => {
        const isActive = t === active;
        return (
          <div key={t} style={{
            textAlign: 'center',
            font: `${isActive ? 600 : 500} 11px/1 ${TP.sans}`,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: isActive ? TP.brick : TP.ink2,
            paddingBottom: 6,
            borderBottom: isActive ? `1px solid ${TP.brick}` : `1px solid transparent`,
          }}>{t}</div>
        );
      })}
    </div>
  );
}

// Standard top masthead — used as base across options
function TPMasthead({ size = 'lg', edition }) {
  const { tournament } = TP_DATA;
  const fontSize = size === 'xl' ? 38 : size === 'lg' ? 26 : 20;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '18px 32px 14px',
      borderBottom: `1px solid ${TP.rule}`,
    }}>
      <div style={{
        font: `400 italic ${fontSize}px/1 ${TP.serif}`,
        letterSpacing: '-0.015em',
      }}>{tournament.masthead}</div>
      <div style={{
        font: `500 10px/1 ${TP.sans}`, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: TP.ink2, display: 'flex', gap: 22, alignItems: 'center',
      }}>
        <span>{edition ?? `${tournament.name} · ${tournament.weekday}`}</span>
        <span style={{ color: TP.brick }}>Admin</span>
        <span>Profile</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  TP, TP_GRAIN, TP_DATA,
  TPSectionHead, TPEyebrow, TPAvatar, TPSparkline, TPMove, TPLineChart,
  TPTabBar, TPMasthead,
});
