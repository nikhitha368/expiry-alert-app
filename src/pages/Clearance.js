import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import { getDaysLeft, getDiscount, getDiscountedPrice, formatCurrency, getCategoryEmoji, isClearanceItem } from "../utils";

const DARK_GREEN = "#014421";
const GREEN      = "#1a7a45";
const CREAM      = "#f5f0e8";

export default function Clearance({ user }) {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const hasLoaded = React.useRef(false);
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const getTimeLeft = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const diff = end - now;
    if (diff <= 0) return "00:00:00";
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const todayItems = useMemo(() => products.filter(p => getDaysLeft(p.expiry) === 0), [products]);

  useEffect(() => {
    const q = query(collection(db,"products"), where("userId","==",user.uid));
    const unsub = onSnapshot(q, { includeMetadataChanges: false }, snap => {
      const all = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const clearance = all.filter(p => isClearanceItem(getDaysLeft(p.expiry)));
      setProducts(clearance.sort((a,b) => getDaysLeft(a.expiry) - getDaysLeft(b.expiry)));
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    });
    return unsub;
  }, [user.uid]);

  const cats     = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const filtered = useMemo(() => filterCat === "all" ? products : products.filter(p => p.category === filterCat), [products, filterCat]);

  const totalSavings = useMemo(() => products.reduce((sum,p) => {
    const days = getDaysLeft(p.expiry);
    const pct  = getDiscount(days, p.category);
    return sum + (Number(p.price) * (pct/100) * (Number(p.quantity)||0));
  }, 0), [products]);

  const INP = {
    background:"white", border:"2px solid #b8ceb8", borderRadius:10,
    padding:"10px 14px", fontSize:14, fontFamily:"sans-serif",
    color:"#111", outline:"none"
  };

  const discountTiers = [
    { range:"1 day left",  pct:"50% OFF", color:"#dc2626", bg:"#fef2f2", border:"#fecaca", reason:"Still safe today"   },
    { range:"2–3 days",    pct:"40% OFF", color:"#ea580c", bg:"#fff7ed", border:"#fed7aa", reason:"Very fresh, urgent"  },
    { range:"4–7 days",    pct:"25% OFF", color:"#d97706", bg:"#fffbeb", border:"#fde68a", reason:"Good deal"           },
    { range:"8–15 days",   pct:"10% OFF", color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0", reason:"Early bird"          },
  ];

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Georgia,serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes cl-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

        .cl-table { width:100%; border-collapse:collapse; }
        .cl-table th { font-size:10.5px; font-weight:800; color:${DARK_GREEN}; letter-spacing:1.8px;
          text-transform:uppercase; padding:12px 20px; border-bottom:2.5px solid #b8d4b8;
          text-align:left; background:#f0f5f0; font-family:sans-serif; white-space:nowrap; }
        .cl-table td { padding:14px 20px; border-bottom:1.5px solid #d8e8d8; font-size:13.5px;
          color:#1a2e1e; vertical-align:middle; font-family:sans-serif; }
        .cl-table tr:last-child td { border-bottom:none; }
        .cl-table tbody tr { transition:background .12s; }
        .cl-table tbody tr:hover { background:#f7fbf7; }

        .disc-tag { display:inline-block; background:${DARK_GREEN}; color:white;
          border-radius:100px; padding:4px 13px; font-size:12px; font-weight:800;
          font-family:sans-serif; letter-spacing:0.5px; }

        .urg-urgent { background:#fee2e2; color:#991b1b; padding:4px 12px; border-radius:100px; font-size:11.5px; font-weight:800; font-family:sans-serif; }
        .urg-high   { background:#fff7ed; color:#c2410c; padding:4px 12px; border-radius:100px; font-size:11.5px; font-weight:800; font-family:sans-serif; }
        .urg-med    { background:#fffbeb; color:#92400e; padding:4px 12px; border-radius:100px; font-size:11.5px; font-weight:800; font-family:sans-serif; }
        .urg-low    { background:#f0fdf4; color:#166534; padding:4px 12px; border-radius:100px; font-size:11.5px; font-weight:800; font-family:sans-serif; }

        .sec { display:flex; align-items:center; gap:14px; margin:32px 0 18px; }
        .sec-lbl { font-size:11px; font-weight:900; color:${DARK_GREEN}; letter-spacing:2.5px; text-transform:uppercase; white-space:nowrap; font-family:sans-serif; }
        .sec::after { content:''; flex:1; height:1px; background:#ccdccc; }

        .sk { background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; will-change:background-position; contain:strict; isolation:isolate; transform:translateZ(0); }

        .tier-card { border-radius:14px; padding:16px 20px; border:2px solid; transition:transform .18s, box-shadow .18s; isolation:isolate; }
        .tier-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.10); }

        .cl-sel:focus { border-color:${GREEN} !important; box-shadow:0 0 0 3px ${GREEN}22 !important; outline:none; }

        .pt    { width:56px; height:56px; border-radius:12px; object-fit:cover; border:1.5px solid #e8e0d0; flex-shrink:0; }
        .pt-ph { width:56px; height:56px; border-radius:12px; background:#e8f5ee; display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0; border:2px solid #a8d4bc; filter:saturate(1.5) brightness(1.1); }
      `}</style>

      <Sidebar user={user} />

      <div style={{ padding:"36px 48px 64px" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:800, color:GREEN, letterSpacing:2.5, fontFamily:"sans-serif", marginBottom:8 }}>CLEARANCE</div>
          <h1 style={{ fontSize:"clamp(32px,3.5vw,50px)", fontWeight:900, color:DARK_GREEN, letterSpacing:-2, margin:"0 0 8px", lineHeight:1 }}>🏷️ Clearance Stock</h1>
          <p style={{ fontSize:14, color:"#4b6358", fontFamily:"sans-serif", margin:0 }}>Products expiring within 15 days — auto-discounts applied to prevent waste</p>
        </div>

        {/* ── COUNTDOWN BANNER — always visible ── */}
        {!loading && (() => {
          const hasToday = todayItems.length > 0;
          const bg = hasToday
            ? "linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)"
            : "linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%)";
          const shadow = hasToday
            ? "0 8px 32px rgba(127,29,29,0.35)"
            : "0 8px 32px rgba(20,83,45,0.30)";
          return (
            <div style={{
              background:bg, borderRadius:16, padding:"18px 28px", marginBottom:24,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              boxShadow:shadow, position:"relative", overflow:"hidden"
            }}>
              <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
              <div style={{ position:"absolute", right:20, top:20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>

              {/* Left: message */}
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:36, lineHeight:1 }}>{hasToday ? "🚨" : "✅"}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.75)", fontFamily:"sans-serif", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
                    {hasToday ? "Expiring Today" : "All Clear Today"}
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:"white", fontFamily:"Georgia,serif", letterSpacing:-0.5 }}>
                    {hasToday
                      ? `${todayItems.length} product${todayItems.length > 1 ? "s" : ""} must be sold or actioned NOW`
                      : "No products expiring today — great job managing stock!"}
                  </div>
                  {hasToday && (
                    <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                      {todayItems.map(p => (
                        <span key={p.id} style={{ background:"rgba(255,255,255,0.15)", color:"white", borderRadius:100, padding:"3px 12px", fontSize:12, fontWeight:700, fontFamily:"sans-serif", border:"1px solid rgba(255,255,255,0.25)" }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: countdown clock — always visible */}
              <div style={{ textAlign:"center", flexShrink:0, marginLeft:32 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.65)", fontFamily:"sans-serif", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
                  Time Left Today
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {getTimeLeft().split(":").map((unit, i) => (
                    <React.Fragment key={i}>
                      <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:10, padding:"10px 14px", minWidth:56, textAlign:"center", border:"1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ fontSize:28, fontWeight:900, color:"white", fontFamily:"Georgia,serif", lineHeight:1, letterSpacing:-1 }}>{unit}</div>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1.5, marginTop:3 }}>
                          {i===0?"HRS":i===1?"MIN":"SEC"}
                        </div>
                      </div>
                      {i < 2 && <div style={{ fontSize:24, fontWeight:900, color:"rgba(255,255,255,0.6)", lineHeight:1, marginBottom:12 }}>:</div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── KPI CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginBottom:28 }}>
          {loading ? (
            [0,1,2].map(i => <div key={i} className="sk" style={{ height:112, borderRadius:16 }}/>)
          ) : (
            [
              { label:"On Clearance",     val:products.length,                                       icon:"🏷️", topC:"#f59e0b", bg:"#fffbeb", vColor:DARK_GREEN },
              { label:"Urgent (≤2 days)", val:products.filter(p=>getDaysLeft(p.expiry)<=2).length,   icon:"⚡", topC:"#ef4444", bg:"#fef2f2", vColor:"#dc2626"  },
              { label:"Potential Savings",val:formatCurrency(totalSavings),                          icon:"💸", topC:GREEN,     bg:"#ecfdf5", vColor:GREEN, big:true },
            ].map(k => (
              <div key={k.label} style={{
                background:"white", borderRadius:16, border:"2px solid #c8dcc8",
                padding:"24px 22px", display:"flex", alignItems:"center", justifyContent:"space-between",
                boxShadow:"0 2px 12px rgba(1,68,33,0.07)", position:"relative", overflow:"hidden"
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:k.topC, borderRadius:"16px 16px 0 0" }}/>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:DARK_GREEN, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:9, opacity:.75 }}>{k.label}</div>
                  <div style={{ fontSize:k.big?32:46, fontWeight:900, letterSpacing:-2, lineHeight:1, color:k.vColor, fontFamily:"Georgia,serif", marginBottom:4, transform:"translateZ(0)" }}>{k.val}</div>
                </div>
                <div style={{ width:56, height:56, borderRadius:16, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, filter:"saturate(1.5) brightness(1.05)" }}>{k.icon}</div>
              </div>
            ))
          )}
        </div>

        {/* ── DISCOUNT TIERS ── */}
        <div className="sec"><span className="sec-lbl">🎯 Dynamic Discount Engine</span></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          {discountTiers.map(d => (
            <div key={d.range} className="tier-card" style={{ background:d.bg, borderColor:d.border }}>
              <div style={{ fontSize:24, fontWeight:900, color:d.color, fontFamily:"Georgia,serif", letterSpacing:-1, marginBottom:4 }}>{d.pct}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a2e1e", fontFamily:"sans-serif", marginBottom:4 }}>{d.range}</div>
              <div style={{ fontSize:11, color:"#6b7280", fontFamily:"sans-serif", fontStyle:"italic" }}>{d.reason}</div>
            </div>
          ))}
        </div>

        {/* ── FILTER ── */}
        {cats.length > 0 && (
          <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
            <select className="cl-sel" style={{ ...INP, width:180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All Categories</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
            {filterCat !== "all" && (
              <button onClick={() => setFilterCat("all")} style={{ fontSize:12, color:GREEN, fontFamily:"sans-serif", fontWeight:700, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* ── TABLE ── */}
        <div style={{ background:"white", borderRadius:16, border:"2px solid #c8dcc8", boxShadow:"0 2px 16px rgba(1,68,33,0.08)", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1.5px solid #d8e8d8", background:"#fafcfa" }}>
            <span style={{ fontSize:15, fontWeight:900, color:DARK_GREEN, fontFamily:"Georgia,serif" }}>
              Clearance Items <span style={{ fontSize:13, color:"#4b6358", fontWeight:600 }}>({filtered.length})</span>
            </span>
            <span style={{ fontSize:12, color:"#4b6358", fontFamily:"sans-serif", fontStyle:"italic" }}>
              💡 Discounted prices auto-shown to customers in Offers
            </span>
          </div>

          {loading ? (
            <div style={{ padding:32 }}>{[0,1,2,3].map(i => <div key={i} className="sk" style={{ height:56, marginBottom:10 }}/>)}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 32px" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🎉</div>
              <h3 style={{ color:DARK_GREEN, margin:"0 0 8px", fontSize:18 }}>No clearance items!</h3>
              <p style={{ color:"#9ca3af", fontSize:14, margin:0, fontFamily:"sans-serif" }}>All your products are safe — nothing expiring within 15 days.</p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="cl-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Original Price</th>
                    <th>Days Left</th>
                    <th>Discount</th>
                    <th>Sale Price</th>
                    <th>Stock</th>
                    <th>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const days     = getDaysLeft(p.expiry);
                    const pct      = getDiscount(days, p.category);
                    const salePrice = getDiscountedPrice(Number(p.price), days, p.category);
                    const urgency  = days<=2
                      ? { cls:"urg-urgent", label:"URGENT" }
                      : days<=5
                        ? { cls:"urg-high", label:"High" }
                        : days<=10
                          ? { cls:"urg-med", label:"Medium" }
                          : { cls:"urg-low", label:"Low" };

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="pt" onError={e=>e.target.style.display="none"}/>
                              : <div className="pt-ph">{getCategoryEmoji(p.category)}</div>
                            }
                            <div>
                              <div style={{ fontWeight:800, color:DARK_GREEN, fontSize:14 }}>{p.name}</div>
                              <div style={{ fontSize:11, color:"#6b7280", fontFamily:"sans-serif", marginTop:2 }}>Exp: {p.expiry}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:"#d4f0e2", color:DARK_GREEN, borderRadius:100, padding:"3px 11px", fontSize:12, fontWeight:700, fontFamily:"sans-serif", border:"1.5px solid #8cc8a8", filter:"saturate(1.4)" }}>
                            {getCategoryEmoji(p.category)} {p.category}
                          </span>
                        </td>
                        <td>
                          <span style={{ textDecoration:"line-through", color:"#9ca3af", fontSize:14, fontFamily:"sans-serif" }}>{formatCurrency(p.price)}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight:800, color:days<=2?"#dc2626":days<=7?"#d97706":"#166534", fontFamily:"sans-serif", fontSize:14 }}>
                            {days<0?`${Math.abs(days)}d overdue`:days===0?(
                              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                                <span style={{ width:8, height:8, borderRadius:"50%", background:"#dc2626", display:"inline-block", animation:"cl-pulse 1s infinite" }}/>
                                Today!
                              </span>
                            ):`${days} days`}
                          </span>
                        </td>
                        <td><span className="disc-tag">{pct}% OFF</span></td>
                        <td>
                          <span style={{ fontWeight:900, color:GREEN, fontSize:16, fontFamily:"Georgia,serif" }}>{formatCurrency(salePrice)}</span>
                          <span style={{ fontSize:11, color:"#9ca3af", fontFamily:"sans-serif", marginLeft:4 }}>/{p.unit}</span>
                        </td>
                        <td style={{ fontFamily:"sans-serif", color:"#4b6358", fontWeight:600 }}>
                          {isNaN(p.quantity)?"—":`${p.quantity} ${p.unit}`}
                        </td>
                        <td><span className={urgency.cls}>{urgency.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}