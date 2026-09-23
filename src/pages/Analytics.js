import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import { getDaysLeft, getExpiryStatus, formatCurrency, getCategoryEmoji, getDiscount, getDiscountedPrice } from "../utils";

const DARK_GREEN = "#014421";
const GREEN      = "#1a7a45";
const CREAM      = "#f5f0e8";

// ── Donut ────────────────────────────────────────────────────────────
function Donut({ slices, size = 130 }) {
  const r = 44, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f0e8" strokeWidth="18" />
      {slices.map((sl, i) => {
        const dash = (sl.value / total) * circ, gap = circ - dash;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.color}
          strokeWidth="18" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
          style={{ transition: "stroke-dasharray .9s ease" }} />;
        offset += dash; return el;
      })}
    </svg>
  );
}

// ── Animated HBar ────────────────────────────────────────────────────
function HBar({ value, max, color, height = 9 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(max > 0 ? (value / max) * 100 : 0), 120); return () => clearTimeout(t); }, [value, max]);
  return (
    <div style={{ height, background: "#e8f0e8", borderRadius: 100, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 100, transition: "width 1s ease" }} />
    </div>
  );
}

// ── HERO CHART ───────────────────────────────────────────────────────
function ExpiryAreaChart({ data, products }) {
  const [hovered, setHovered]   = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, [data]);

  // Chart dimensions — tall and wide
  const W = 900, H = 280;
  const PAD = { t: 32, r: 20, b: 56, l: 44 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const maxV = Math.max(...data, 1);
  const bW   = iW / data.length;

  const getColor = i => i <= 2 ? "#dc2626" : i <= 5 ? "#ea580c" : i <= 10 ? "#d97706" : i <= 15 ? "#ca8a04" : "#16a34a";

  // Cumulative line
  let cum = 0;
  const cumLine = data.map(v => { cum += v; return cum; });
  const maxCum  = Math.max(...cumLine, 1);

  const cumPath = cumLine.map((v, i) => {
    const x = PAD.l + i * bW + bW / 2;
    const y = PAD.t + iH - (animated ? (v / maxCum) * iH : 0);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const hoveredProds = hovered !== null ? products.filter(p => getDaysLeft(p.expiry) === hovered) : [];

  // Y-axis ticks
  const yTicks = maxV <= 4
    ? Array.from({ length: maxV + 1 }, (_, i) => i)
    : [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), maxV];

  return (
    <div style={{ position: "relative" }}>
      {/* Zone banner */}
      <div style={{ display: "flex", gap: 3, marginBottom: 10, paddingLeft: PAD.l, paddingRight: PAD.r }}>
        {[
          { label: "🚨 CRITICAL (0–2d)", color: "#fee2e2", border: "#fca5a5", text: "#991b1b", flex: 3 },
          { label: "⚠️ URGENT (3–5d)",   color: "#fff7ed", border: "#fdba74", text: "#c2410c", flex: 3 },
          { label: "📅 WARNING (6–15d)", color: "#fffbeb", border: "#fde68a", text: "#92400e", flex: 10 },
          { label: "✅ SAFE (15–30d)",   color: "#f0fdf4", border: "#86efac", text: "#166534", flex: 15 },
        ].map(z => (
          <div key={z.label} style={{ flex: z.flex, background: z.color, border: `1.5px solid ${z.border}`, borderRadius: 7, padding: "5px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: z.text, fontFamily: "sans-serif", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{z.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="cum-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#dc2626" />
            <stop offset="17%"  stopColor="#ea580c" />
            <stop offset="40%"  stopColor="#d97706" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="bglow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="lglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Zone bg strips */}
        <rect x={PAD.l}              y={PAD.t} width={bW * 3}  height={iH} fill="#fee2e2" opacity="0.12" rx="3"/>
        <rect x={PAD.l + bW * 3}     y={PAD.t} width={bW * 3}  height={iH} fill="#fff7ed" opacity="0.25" rx="3"/>
        <rect x={PAD.l + bW * 6}     y={PAD.t} width={bW * 10} height={iH} fill="#fffbeb" opacity="0.18" rx="3"/>
        <rect x={PAD.l + bW * 16}    y={PAD.t} width={bW * 14} height={iH} fill="#f0fdf4" opacity="0.18" rx="3"/>

        {/* Week separators */}
        {[7, 14, 21].map(d => (
          <g key={d}>
            <line x1={PAD.l + d * bW} y1={PAD.t} x2={PAD.l + d * bW} y2={PAD.t + iH}
              stroke="#b8d4b8" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.7"/>
            <text x={PAD.l + d * bW + 4} y={PAD.t + 10}
              style={{ fontSize: 9, fill: "#a0b8a0", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1 }}>
              WK{d / 7 + 1}
            </text>
          </g>
        ))}

        {/* Y grid + labels */}
        {yTicks.map(tick => {
          const y = PAD.t + iH - (tick / maxV) * iH;
          return (
            <g key={tick}>
              <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y}
                stroke={tick === 0 ? "#c8dcc8" : "#e0e8e0"} strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? "" : "5 5"} />
              <text x={PAD.l - 7} y={y + 4} textAnchor="end"
                style={{ fontSize: 11, fill: "#6b8a6b", fontFamily: "sans-serif", fontWeight: 800 }}>
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const x   = PAD.l + i * bW + bW * 0.1;
          const bw  = bW * 0.82;
          const bh  = animated ? Math.max((v / maxV) * iH, v > 0 ? 5 : 0) : 0;
          const y   = PAD.t + iH - bh;
          const col = getColor(i);
          const isH = hovered === i;
          return (
            <g key={i}>
              {isH && v > 0 && <rect x={PAD.l + i * bW} y={PAD.t} width={bW} height={iH} fill={col} opacity="0.06" rx="3"/>}
              <rect
                x={x} y={v === 0 ? PAD.t + iH - 2 : y}
                width={bw} height={v === 0 ? 2 : bh} rx={v === 0 ? 1 : 5}
                fill={v === 0 ? "#d4e8d4" : col}
                opacity={isH ? 1 : v === 0 ? 0.4 : 0.88}
                filter={isH && v > 0 ? "url(#bglow)" : undefined}
                style={{ transition: "height .9s cubic-bezier(.4,0,.2,1), y .9s cubic-bezier(.4,0,.2,1)", cursor: v > 0 ? "pointer" : "default" }}
                onMouseEnter={() => v > 0 && setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Count label */}
              {v > 0 && bh > 20 && (
                <text x={x + bw / 2} y={y - 7} textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 900, fill: col, fontFamily: "sans-serif" }}>{v}</text>
              )}
              {/* Highlight ring on hover */}
              {isH && v > 0 && bh <= 20 && (
                <text x={x + bw / 2} y={y - 7} textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 900, fill: col, fontFamily: "sans-serif" }}>{v}</text>
              )}
            </g>
          );
        })}

        {/* Cumulative trend line */}
        {animated && (
          <>
            <path d={cumPath} fill="none" stroke="url(#cum-g)"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              filter="url(#lglow)" opacity="0.5"/>
            {/* Dots where products exist */}
            {data.map((v, i) => {
              if (v === 0) return null;
              const x = PAD.l + i * bW + bW / 2;
              const y = PAD.t + iH - (animated ? (cumLine[i] / maxCum) * iH : 0);
              return <circle key={i} cx={x} cy={y} r="4.5" fill={getColor(i)} stroke="white" strokeWidth="2"/>;
            })}
          </>
        )}

        {/* X axis day labels — every 5 days */}
        {data.map((_, i) => {
          if (i % 5 !== 0 && i !== 29) return null;
          return (
            <text key={i} x={PAD.l + i * bW + bW / 2} y={H - 18} textAnchor="middle"
              style={{ fontSize: i === 0 ? 13 : 11, fill: i === 0 ? DARK_GREEN : "#6b7280", fontFamily: "sans-serif", fontWeight: i === 0 ? 900 : 600 }}>
              {i === 0 ? "Today" : `Day ${i}`}
            </text>
          );
        })}

        {/* Axis titles */}
        <text x={14} y={PAD.t + iH / 2} textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD.t + iH / 2})`}
          style={{ fontSize: 9, fill: "#9ca3af", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1.5 }}>
          ITEMS
        </text>
        <text x={PAD.l + iW / 2} y={H - 2} textAnchor="middle"
          style={{ fontSize: 10, fill: "#9ca3af", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 2 }}>
          ← DAYS UNTIL EXPIRY →
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered !== null && data[hovered] > 0 && (
        <div style={{
          position: "absolute",
          left: `calc(${((hovered + 0.5) / data.length) * 100}%)`,
          top: 36,
          transform: "translateX(-50%)",
          background: DARK_GREEN, color: "white", borderRadius: 14,
          padding: "14px 18px", boxShadow: "0 16px 40px rgba(1,68,33,0.35)",
          pointerEvents: "none", zIndex: 30, minWidth: 160,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.65, fontFamily: "sans-serif", letterSpacing: 1, marginBottom: 4 }}>
            {hovered === 0 ? "EXPIRES TODAY" : `EXPIRES IN ${hovered} DAY${hovered !== 1 ? "S" : ""}`}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "Georgia,serif", lineHeight: 1, marginBottom: 8 }}>
            {data[hovered]} item{data[hovered] !== 1 ? "s" : ""}
          </div>
          {hoveredProds.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              {hoveredProds.slice(0, 4).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15 }}>{getCategoryEmoji(p.category)}</span>
                  <div>
                    <div style={{ fontSize: 12, fontFamily: "sans-serif", fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.65, fontFamily: "sans-serif" }}>{formatCurrency(p.price)} · {p.quantity} {p.unit || ""}</div>
                  </div>
                </div>
              ))}
              {hoveredProds.length > 4 && <div style={{ fontSize: 11, opacity: 0.55, fontFamily: "sans-serif" }}>+{hoveredProds.length - 4} more</div>}
            </div>
          )}
          <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)", width: 14, height: 14, background: DARK_GREEN, clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
        </div>
      )}

      {/* Legend row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[["#dc2626", "0–2 days 🚨"], ["#ea580c", "3–5 days"], ["#d97706", "6–10 days"], ["#ca8a04", "11–15 days"], ["#16a34a", "15+ days ✅"]].map(([col, lbl]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: col }} />
              <span style={{ fontSize: 12, color: "#4b6358", fontFamily: "sans-serif", fontWeight: 600 }}>{lbl}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={28} height={8} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="leg-g" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dc2626"/><stop offset="100%" stopColor="#16a34a"/>
              </linearGradient>
            </defs>
            <line x1={0} y1={4} x2={28} y2={4} stroke="url(#leg-g)" strokeWidth={2.5} opacity={0.6}/>
          </svg>
          <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "sans-serif", fontWeight: 600 }}>Cumulative trend</span>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────
export default function Analytics({ user }) {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const q = query(collection(db, "products"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, { includeMetadataChanges: false }, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    });
    return unsub;
  }, [user.uid]);

  const M = useMemo(() => {
    const statusCount = products.reduce((acc, p) => {
      const s = getExpiryStatus(getDaysLeft(p.expiry)); acc[s] = (acc[s] || 0) + 1; return acc;
    }, {});
    const totalValue     = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    const clearanceValue = products.filter(p => getDaysLeft(p.expiry) <= 15 && getDaysLeft(p.expiry) >= 0)
      .reduce((s, p) => { const d = getDaysLeft(p.expiry); return s + getDiscountedPrice(Number(p.price), d) * (Number(p.quantity) || 0); }, 0);
    const outOfStock = products.filter(p => Number(p.quantity) === 0).length;
    const lowStock   = products.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length;
    const riskBuckets = { "0–2d": 0, "3–5d": 0, "6–10d": 0, "11–15d": 0, "16–30d": 0, "30+d": 0 };
    products.forEach(p => {
      const d = getDaysLeft(p.expiry); if (d === null || d < 0) return;
      if (d <= 2) riskBuckets["0–2d"]++;
      else if (d <= 5)  riskBuckets["3–5d"]++;
      else if (d <= 10) riskBuckets["6–10d"]++;
      else if (d <= 15) riskBuckets["11–15d"]++;
      else if (d <= 30) riskBuckets["16–30d"]++;
      else riskBuckets["30+d"]++;
    });
    const expiryByDay = Array(30).fill(0);
    products.forEach(p => { const d = getDaysLeft(p.expiry); if (d !== null && d >= 0 && d < 30) expiryByDay[d]++; });
    const clearanceItems = products
      .filter(p => getDaysLeft(p.expiry) !== null && getDaysLeft(p.expiry) <= 15 && getDaysLeft(p.expiry) >= 0)
      .sort((a, b) => getDaysLeft(a.expiry) - getDaysLeft(b.expiry)).slice(0, 6);
    return { statusCount, totalValue, clearanceValue, outOfStock, lowStock,
             riskBuckets, expiryByDay, clearanceItems, maxRisk: Math.max(...Object.values(riskBuckets), 1), total: products.length };
  }, [products]);

  const RISK_C = { "0–2d":"#dc2626","3–5d":"#ea580c","6–10d":"#d97706","11–15d":"#ca8a04","16–30d":"#4ade80","30+d":"#16a34a" };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "Georgia,serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sk { background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%);
          background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:14px;
          will-change:background-position; contain:strict; isolation:isolate; transform:translateZ(0); }
        .ac { background:white; border-radius:18px; border:2px solid #c8dcc8; box-shadow:0 2px 16px rgba(1,68,33,0.07); overflow:hidden; }
        .ac-hd { padding:16px 24px 13px; border-bottom:1.5px solid #e8f0e8; display:flex; align-items:center; justify-content:space-between; }
        .ac-title { font-size:15px; font-weight:900; color:${DARK_GREEN}; font-family:Georgia,serif; display:flex; align-items:center; gap:8px; }
        .ac-sub { font-size:11px; font-weight:700; color:#8a9e8a; font-family:sans-serif; letter-spacing:1.5px; text-transform:uppercase; }
        .krow { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:24px; }
        .kc { background:white; border-radius:14px; border:2px solid #c8dcc8; padding:18px 16px;
          position:relative; overflow:hidden; box-shadow:0 2px 10px rgba(1,68,33,0.07); transition:transform .15s; }
        .kc:hover { transform:translateY(-3px); }
        .kct { height:3px; position:absolute; top:0; left:0; right:0; border-radius:14px 14px 0 0; }
        .sec { display:flex; align-items:center; gap:14px; margin:0 0 16px; }
        .sec-lbl { font-size:12px; font-weight:900; color:${DARK_GREEN}; letter-spacing:2.5px; text-transform:uppercase; font-family:sans-serif; white-space:nowrap; }
        .sec::after { content:''; flex:1; height:1px; background:#ccdccc; }
        .rrow { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .drow { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1.5px solid #e8f0e8; }
        .drow:last-child { border-bottom:none; }
        .dpill { background:${DARK_GREEN}; color:white; border-radius:100px; padding:4px 13px; font-size:12px; font-weight:800; font-family:sans-serif; }
      `}</style>

      <Sidebar user={user} />
      <div style={{ padding: "36px 48px 64px" }}>

        {/* Header */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: 2.5, fontFamily: "sans-serif", marginBottom: 6 }}>INVENTORY</div>
          <h1 style={{ fontSize: "clamp(30px,3.2vw,48px)", fontWeight: 900, color: DARK_GREEN, letterSpacing: -2, margin: "0 0 6px", lineHeight: 1 }}>📈 Analytics</h1>
          <p style={{ fontSize: 14, color: "#4b6358", fontFamily: "sans-serif", margin: 0 }}>Live inventory insights, expiry risk and stock health</p>
        </div>

        {/* KPI Row */}
        {loading ? (
          <div className="krow">{[0,1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 96 }} />)}</div>
        ) : (
          <div className="krow">
            {[
              { label: "Total Products",  val: M.total,                         icon: "📦", topC: GREEN,     vC: DARK_GREEN },
              { label: "Inventory Value", val: formatCurrency(M.totalValue),     icon: "💰", topC: "#d97706", vC: "#92400e", big: true },
              { label: "Clearance Value", val: formatCurrency(M.clearanceValue), icon: "🏷️", topC: "#ef4444", vC: "#991b1b", big: true },
              { label: "Out of Stock",    val: M.outOfStock,                     icon: "🚫", topC: "#dc2626", vC: "#dc2626" },
              { label: "Low Stock (≤5)", val: M.lowStock,                       icon: "📉", topC: "#8b5cf6", vC: "#6d28d9" },
            ].map(k => (
              <div key={k.label} className="kc">
                <div className="kct" style={{ background: k.topC }} />
                <div style={{ fontSize: 10, fontWeight: 800, color: "#8a9e8a", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 7 }}>{k.label}</div>
                <div style={{ fontSize: k.big ? 22 : 38, fontWeight: 900, color: k.vC, fontFamily: "Georgia,serif", letterSpacing: -1.5, lineHeight: 1, marginBottom: 7 }}>{k.val}</div>
                <div style={{ fontSize: 26, filter: "saturate(1.4)" }}>{k.icon}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && M.total === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
            <h3 style={{ color: DARK_GREEN, margin: "0 0 8px" }}>No data yet</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, fontFamily: "sans-serif" }}>Add products to see your analytics.</p>
          </div>
        ) : !loading && (<>

          {/* ══ HERO GRAPH — full width, tall ══ */}
          <div className="sec"><span className="sec-lbl">📅 Expiry Risk Timeline</span></div>
          <div className="ac" style={{ marginBottom: 24, borderTop: `3px solid ${DARK_GREEN}` }}>
            <div className="ac-hd" style={{ background: "#f7fbf7" }}>
              <span className="ac-title" style={{ fontSize: 17 }}>📅 30-Day Expiry Timeline — Live</span>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* Mini stats */}
                {[
                  { label: "Urgent", val: M.riskBuckets["0–2d"] + M.riskBuckets["3–5d"], color: "#dc2626" },
                  { label: "Warning", val: M.riskBuckets["6–10d"] + M.riskBuckets["11–15d"], color: "#d97706" },
                  { label: "Safe", val: M.riskBuckets["16–30d"] + M.riskBuckets["30+d"], color: "#16a34a" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: "Georgia,serif", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: "#8a9e8a", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
                  </div>
                ))}
                <span className="ac-sub">hover bar = product list</span>
              </div>
            </div>
            <div style={{ padding: "22px 28px 18px" }}>
              <ExpiryAreaChart data={M.expiryByDay} products={products} />
            </div>
          </div>

          {/* ══ BOTTOM ROW: Status Donut + Risk Buckets + Clearance ══ */}
          <div className="sec"><span className="sec-lbl">📊 Breakdown</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 18 }}>

            {/* Donut */}
            <div className="ac">
              <div className="ac-hd">
                <span className="ac-title">🥧 Stock Status</span>
                <span className="ac-sub">{M.total} items</span>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <Donut size={130} slices={[
                    { value: M.statusCount.safe    || 0, color: "#16a34a" },
                    { value: M.statusCount.expiring || 0, color: "#d97706" },
                    { value: M.statusCount.expired  || 0, color: "#dc2626" },
                  ]} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: DARK_GREEN, fontFamily: "Georgia,serif", lineHeight: 1 }}>{M.total}</div>
                    <div style={{ fontSize: 9, color: "#8a9e8a", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1 }}>TOTAL</div>
                  </div>
                </div>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { label: "Safe",          val: M.statusCount.safe    || 0, color: "#16a34a" },
                    { label: "Expiring Soon", val: M.statusCount.expiring || 0, color: "#d97706" },
                    { label: "Expired",       val: M.statusCount.expired  || 0, color: "#dc2626" },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: DARK_GREEN, fontFamily: "sans-serif", fontWeight: 600, flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: s.color, fontFamily: "Georgia,serif" }}>{s.val}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "sans-serif", minWidth: 32, textAlign: "right" }}>
                        {M.total > 0 ? Math.round((s.val / M.total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Buckets */}
            <div className="ac">
              <div className="ac-hd">
                <span className="ac-title">🚨 Risk Buckets</span>
                <span className="ac-sub">non-expired</span>
              </div>
              <div style={{ padding: "18px 20px" }}>
                {Object.entries(M.riskBuckets).map(([label, count]) => (
                  <div key={label} className="rrow">
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: RISK_C[label], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: RISK_C[label], fontFamily: "sans-serif", minWidth: 50 }}>{label}</span>
                    <HBar value={count} max={M.maxRisk} color={RISK_C[label]} />
                    <span style={{ fontSize: 15, fontWeight: 900, color: RISK_C[label], fontFamily: "Georgia,serif", minWidth: 22, textAlign: "right" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clearance */}
            <div className="ac">
              <div className="ac-hd">
                <span className="ac-title">🏷️ Clearance Deals</span>
                <span className="ac-sub">highest discounts</span>
              </div>
              <div style={{ padding: "6px 20px 14px" }}>
                {M.clearanceItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 14, fontFamily: "sans-serif" }}>🎉 No clearance items</div>
                ) : M.clearanceItems.map(p => {
                  const days = getDaysLeft(p.expiry);
                  const pct  = getDiscount(days, p.category);
                  const dc   = days <= 2 ? "#dc2626" : days <= 5 ? "#ea580c" : "#d97706";
                  return (
                    <div key={p.id} className="drow">
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f7f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: "1.5px solid #c8e0d0", flexShrink: 0, filter: "saturate(1.4)" }}>
                          {getCategoryEmoji(p.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: DARK_GREEN }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: dc, fontFamily: "sans-serif", fontWeight: 700 }}>
                            {days === 0 ? "Today!" : `${days}d left`} · {formatCurrency(p.price)}
                          </div>
                        </div>
                      </div>
                      <span className="dpill">{pct}% OFF</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>)}
      </div>
    </div>
  );
}