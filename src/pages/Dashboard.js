import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import SMSAlertButton from "../components/SMSAlertButton";
import DonationButton from "../components/DonationButton";
import DonationHistory from "../components/DonationHistory";
import { getDaysLeft, getExpiryStatus, formatCurrency, getCategoryEmoji } from "../utils";


const GREEN      = "#1a9e5f";
const DARK_GREEN = "#0e6e40";
const CREAM      = "#f5f0e8";
const BG_IMAGE   = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1400&q=80";

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading,  setLoading]  = useState(true);
  

  useEffect(() => {
    getDoc(doc(db,"users",user.uid)).then(s => {
      if (s.exists()) setUserName(s.data().name||"Admin");
    });
  },[user.uid]);



  useEffect(() => {
    const q = query(collection(db,"products"), where("userId","==",user.uid));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({id:d.id,...d.data()})));
      setLoading(false);
    });
    return unsub;
  },[user.uid]);

  const stats = products.reduce((a,p) => {
    const d=getDaysLeft(p.expiry), s=getExpiryStatus(d);
    a.total++;
    if (s==="expired") a.expired++;
    else if (s==="expiring") a.expiring++;
    else a.safe++;
    const q=Number(p.quantity)||0;
    if (q===0) a.outOfStock++;
    else if (q<=5) a.lowStock++;
    a.value += (Number(p.price)||0)*q;
    return a;
  },{total:0,expired:0,expiring:0,safe:0,lowStock:0,outOfStock:0,value:0});

  const catMap={};
  products.forEach(p=>{const c=p.category||"Others";catMap[c]=(catMap[c]||0)+1;});
  const cats   = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const recent = [...products].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,5);
  const urgent = products.filter(p=>{const d=getDaysLeft(p.expiry);return d!==null&&d<=5&&d>=0;})
                         .sort((a,b)=>getDaysLeft(a.expiry)-getDaysLeft(b.expiry)).slice(0,5);

  const hour  = new Date().getHours();
  const greet = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const gicon = hour<12?"🌤️":hour<17?"☀️":"🌙";
  const barC  = [GREEN,"#3b82f6","#f59e0b","#ef4444","#8b5cf6"];

  const kpis = [
    { label:"Total Products", val:stats.total,      icon:"📦", sub:"Items in inventory",    topC:GREEN,     bg:"#edfaf3" },
    { label:"Expiring Soon",  val:stats.expiring,   icon:"⏰", sub:"Within 15 days",        topC:"#f59e0b", bg:"#fffbeb", go:"/clearance" },
    { label:"Expired",        val:stats.expired,    icon:"⚠️", sub:"Need immediate removal",topC:"#ef4444", bg:"#fef2f2", go:"/expired"   },
    { label:"Safe Products",  val:stats.safe,       icon:"✅", sub:"Good condition",         topC:"#10b981", bg:"#ecfdf5" },
    { label:"Out of Stock",   val:stats.outOfStock, icon:"🚫", sub:"Restock needed",         topC:"#ef4444", bg:"#fef2f2" },
    { label:"Low Stock",      val:stats.lowStock,   icon:"📉", sub:"5 or fewer units",       topC:"#8b5cf6", bg:"#f5f3ff" },
  ];

  return (
    <div style={{minHeight:"100vh", background:"#f5f0e8", fontFamily:"Georgia,serif"}}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }

        /* ═══ HERO — light overlay so image is bright ═══ */
        .db-hero {
          position:relative; overflow:hidden;
          background:
            linear-gradient(160deg,rgba(30,15,5,0.55) 0%,rgba(20,10,0,0.45) 100%), url('${BG_IMAGE}') center/cover no-repeat;
          padding:36px 48px 40px;
          border-bottom:3px solid #c8dfc8;
        }
        .hero-in { position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:32px; }

        /* ═══ LIVE PILL ═══ */
        .live-pill {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(255,255,255,0.75); border:1.5px solid rgba(1,68,33,0.25);
          border-radius:100px; padding:6px 16px; margin-bottom:16px;
          font-size:11px; color:#012910; font-weight:700;
          letter-spacing:1.5px; font-family:sans-serif; width:fit-content;
        }
        .live-dot { width:6px; height:6px; border-radius:50%; background:#16a34a; animation:pulse 1.8s infinite; }

        /* ═══ HERO STAT PILLS ═══ */
        .hstat {
          background:rgba(255,255,255,0.82);
          border:1px solid rgba(1,68,33,0.15);
          border-radius:14px; padding:12px 20px; text-align:center;
          min-width:80px; backdrop-filter:blur(8px);
        }

        /* ═══ GLASS CARDS ═══ */
        .glass-card {
          display:flex; align-items:center; gap:14px;
          background:rgba(255,255,255,0.82);
          backdrop-filter:blur(10px);
          border:1px solid rgba(1,68,33,0.18);
          border-radius:14px; padding:12px 18px;
          transition:all .2s;
        }
        .glass-card:hover { background:rgba(255,255,255,0.96); transform:translateX(4px); }

        /* ═══ PAGE BODY ═══ */
        .db-body { padding:36px 48px 64px; animation:fadeUp .42s ease both; }

        /* ═══ SECTION HEADER ═══ */
        .sec { display:flex; align-items:center; gap:14px; margin:32px 0 18px; }
        .sec-lbl { font-size:11px; font-weight:900; color:#014421; letter-spacing:2.5px; text-transform:uppercase; white-space:nowrap; font-family:sans-serif; }
        .sec::after { content:''; flex:1; height:1px; background:#ccdccc; }

        /* ═══ KPI GRID ═══ */
        .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-bottom:12px; }
        .kpi {
          background:#ffffff; border-radius:16px;
          border:1.5px solid #dde8dd;
          padding:24px 22px;
          display:flex; align-items:center; justify-content:space-between;
          box-shadow:0 2px 12px rgba(14,110,64,0.07), 0 1px 3px rgba(0,0,0,0.04);
          transition:all .2s; position:relative; overflow:hidden; cursor:default;
        }
        .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; border-radius:16px 16px 0 0; }
        .kpi:hover { transform:translateY(-4px); box-shadow:0 12px 36px rgba(14,110,64,0.14); }
        .kpi.go { cursor:pointer; }
        .kpi-lbl { font-size:11px; font-weight:800; color:#014421; letter-spacing:1.5px; text-transform:uppercase; font-family:sans-serif; margin-bottom:9px; opacity:0.75; }
        .kpi-num { font-size:46px; font-weight:900; letter-spacing:-2.5px; line-height:1; color:#014421; font-family:Georgia,serif; margin-bottom:5px; }
        .kpi-sub { font-size:13px; color:#4b6358; font-family:sans-serif; font-weight:500; }
        .kpi-ico { width:56px; height:56px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0; }

        /* ═══ ALERT BANNERS ═══ */
        .abar {
          display:flex; align-items:center; gap:14px;
          padding:14px 20px; border-radius:12px; margin-bottom:10px;
          font-family:sans-serif; font-size:14px; border:1.5px solid;
          cursor:pointer; transition:transform .14s, box-shadow .14s;
        }
        .abar:hover { transform:translateX(4px); box-shadow:0 4px 18px rgba(0,0,0,0.09); }

        /* ═══ PANEL ═══ */
        .panel { background:white; border-radius:16px; border:1.5px solid #dde8dd; box-shadow:0 2px 16px rgba(1,68,33,0.10); overflow:hidden; }
        .phd { display:flex; align-items:center; justify-content:space-between; padding:17px 24px; border-bottom:1px solid #f0ebe0; background:#fdfaf6; }
        .ptitle { font-size:16px; font-weight:900; color:#014421; display:flex; align-items:center; gap:9px; font-family:Georgia,serif; }

        /* ═══ TABLE ═══ */
        .dbt { width:100%; border-collapse:collapse; }
        .dbt th { font-size:10.5px; font-weight:800; color:#014421; letter-spacing:1.8px; text-transform:uppercase; padding:11px 24px; border-bottom:1px solid #e0ddd8; text-align:left; background:#f0f5f0; font-family:sans-serif; }
        .dbt td { padding:14px 24px; border-bottom:1px solid #f0ebe0; font-size:14px; color:#1a2e1e; vertical-align:middle; font-family:sans-serif; }
        .dbt tr:last-child td { border-bottom:none; }
        .dbt tbody tr { transition:background .12s; }
        .dbt tbody tr:hover { background:#f0f7f0; }

        /* ═══ BADGES ═══ */
        .b-safe    { background:#d1fae5; color:#065f46; padding:4px 12px; border-radius:100px; font-size:12px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .b-exp     { background:#fef3c7; color:#78350f; padding:4px 12px; border-radius:100px; font-size:12px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .b-expired { background:#fee2e2; color:#7f1d1d; padding:4px 12px; border-radius:100px; font-size:12px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .d-red  { background:#fee2e2; color:#dc2626; padding:4px 13px; border-radius:100px; font-size:13px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .d-yel  { background:#fef3c7; color:#d97706; padding:4px 13px; border-radius:100px; font-size:13px; font-weight:700; font-family:sans-serif; white-space:nowrap; }

        /* ═══ MISC ═══ */
        .bt  { flex:1; height:7px; background:#e0ece0; border-radius:100px; overflow:hidden; }
        .bf  { height:100%; border-radius:100px; transition:width .8s ease; }
        .pt    { width:38px; height:38px; border-radius:10px; object-fit:cover; border:1.5px solid #e8e0d0; flex-shrink:0; }
        .pt-ph { width:38px; height:38px; border-radius:10px; background:#e0ece0; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; border:1.5px solid #e8e0d0; }
        .sk  { background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:16px; }
        .gbtn { background:transparent; border:2px solid #014421; color:#014421; border-radius:8px; padding:7px 18px; font-size:13px; font-weight:800; cursor:pointer; transition:all .16s; font-family:sans-serif; }
        .gbtn:hover { background:#014421; color:white; }
        .cpill { display:inline-flex; align-items:center; gap:5px; background:#e8f5ee; padding:4px 11px; border-radius:100px; font-size:13px; color:#014421; font-weight:700; font-family:sans-serif; border:1px solid #b8d4c2; }
      `}</style>

      <Sidebar user={user} userName={userName} />

      {/* ═══ HERO ═══ */}
      <div className="db-hero">
        <div className="hero-in">

          {/* LEFT */}
          <div>
            <div className="live-pill">
              <span className="live-dot"/>
              LIVE INVENTORY
            </div>
            <h1 style={{fontSize:"clamp(26px,2.6vw,40px)", fontWeight:900, color:"#ffffff", letterSpacing:-1.5, margin:"0 0 6px", textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>
              {greet}, {userName} {gicon}
            </h1>
            <p style={{fontSize:14, color:"rgba(255,255,255,0.85)", margin:"0 0 28px", fontFamily:"sans-serif", fontWeight:500}}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>

            <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
              {[
                {l:"Total",    v:stats.total,    c:"#166534"},
                {l:"Safe",     v:stats.safe,     c:"#166534"},
                {l:"Expiring", v:stats.expiring, c:"#92400e"},
                {l:"Expired",  v:stats.expired,  c:"#991b1b"},
              ].map(s => (
                <div key={s.l} className="hstat">
                  <div style={{fontSize:28, fontWeight:900, color:s.c, fontFamily:"Georgia,serif", letterSpacing:-1.5, lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:10, color:"#4b6358", fontFamily:"sans-serif", marginTop:4, letterSpacing:.5, textTransform:"uppercase", fontWeight:700}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{display:"flex", flexDirection:"column", gap:12, alignItems:"flex-end", flexShrink:0}}>
            <div style={{display:"flex", gap:10}}>
              <SMSAlertButton user={user} userName={userName} products={products} />
              <DonationButton user={user} userName={userName} products={products} />
              <button onClick={() => navigate("/products")} style={{
                background:DARK_GREEN, color:"white", border:"none",
                borderRadius:12, padding:"11px 24px", fontSize:14, fontWeight:800,
                cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                fontFamily:"Georgia,serif",
                boxShadow:"0 4px 20px rgba(1,68,33,0.30)", transition:"all .2s"
              }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(1,68,33,0.40)"}}
              onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 20px rgba(1,68,33,0.30)"}}>
                <span style={{fontSize:18}}>+</span> Add Products
              </button>
            </div>

            {/* Inventory value card */}
            <div className="glass-card" style={{minWidth:220}}>
              <div style={{fontSize:24}}>💰</div>
              <div>
                <div style={{fontSize:10, color:"#4b6358", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", marginBottom:3}}>Total Inventory Value</div>
                <div style={{fontSize:24, fontWeight:900, color:"#011a09", fontFamily:"Georgia,serif", letterSpacing:-0.5}}>{formatCurrency(stats.value)}</div>
              </div>
            </div>

            {/* Stock alerts card */}
            <div className="glass-card" style={{minWidth:220}}>
              <div style={{fontSize:22}}>🚫</div>
              <div style={{flex:1}}>
                <div style={{fontSize:10, color:"#4b6358", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", marginBottom:4}}>Stock Alerts</div>
                <div style={{display:"flex", gap:16}}>
                  <div>
                    <span style={{fontSize:18, fontWeight:900, color:"#dc2626", fontFamily:"Georgia,serif"}}>{stats.outOfStock}</span>
                    <span style={{fontSize:11, color:"#4b6358", fontFamily:"sans-serif", marginLeft:4}}>Out of stock</span>
                  </div>
                  <div>
                    <span style={{fontSize:18, fontWeight:900, color:"#7c3aed", fontFamily:"Georgia,serif"}}>{stats.lowStock}</span>
                    <span style={{fontSize:11, color:"#4b6358", fontFamily:"sans-serif", marginLeft:4}}>Low stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="db-body">
        {stats.expired > 0 && (
          <div className="abar" style={{background:"#fef2f2", borderColor:"#fecaca", color:"#991b1b"}} onClick={() => navigate("/expired")}>
            <span style={{fontSize:20}}>⚠️</span>
            <span style={{flex:1}}><strong style={{color:'#991b1b',fontSize:15}}>{stats.expired} expired product{stats.expired>1?"s":""}</strong><span style={{color:'#6b7280', fontSize:14}}> — Click to view and remove them</span></span>
            <span style={{fontSize:12, color:"#9ca3af", fontWeight:700}}>VIEW →</span>
          </div>
        )}
        {stats.expiring > 0 && (
          <div className="abar" style={{background:"#fffbeb", borderColor:"#fde68a", color:"#92400e"}} onClick={() => navigate("/clearance")}>
            <span style={{fontSize:20}}>🏷️</span>
            <span style={{flex:1}}><strong style={{color:'#92400e',fontSize:15}}>{stats.expiring} product{stats.expiring>1?"s":""} expiring within 15 days</strong><span style={{color:'#6b7280', fontSize:14}}> — Auto-discounts applied</span></span>
            <span style={{fontSize:12, color:"#9ca3af", fontWeight:700}}>VIEW →</span>
          </div>
        )}

        <div className="sec"><span className="sec-lbl">Stock Overview</span></div>
        {loading ? (
          <div className="kpi-grid">{[0,1,2,3,4,5].map(i=><div key={i} className="sk" style={{height:112}}/>)}</div>
        ) : (
          <div className="kpi-grid">
            {kpis.map(k => (
              <div key={k.label} className={`kpi${k.go?" go":""}`} onClick={() => k.go && navigate(k.go)}>
                <div style={{position:"absolute", top:0, left:0, right:0, height:4, background:k.topC, borderRadius:"16px 16px 0 0"}}/>
                <div>
                  <div className="kpi-lbl">{k.label}</div>
                  <div className="kpi-num">{k.val}</div>
                  <div className="kpi-sub">{k.sub}</div>
                </div>
                <div className="kpi-ico" style={{background:k.bg}}>{k.icon}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && (<>
          <div className="sec"><span className="sec-lbl">Insights</span></div>
          <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:20, marginBottom:4}}>
            <div className="panel" style={{borderTop:"3px solid #ef4444"}}>
              <div className="phd">
                <span className="ptitle">🚨 Needs Attention</span>
                <button className="gbtn" onClick={() => navigate("/clearance")}>View All</button>
              </div>
              {urgent.length===0 ? (
                <div style={{padding:"38px", textAlign:"center", color:"#9ca3af", fontSize:14, fontFamily:"sans-serif"}}>✅ No urgent products — all good!</div>
              ) : (
                <table className="dbt">
                  <thead><tr><th>Product</th><th>Expiry</th><th>Status</th></tr></thead>
                  <tbody>
                    {urgent.map(p => {
                      const days = getDaysLeft(p.expiry);
                      return (
                        <tr key={p.id}>
                          <td><div style={{display:"flex",alignItems:"center",gap:11}}>
                            {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="pt"/>:<div className="pt-ph">{getCategoryEmoji(p.category)}</div>}
                            <span style={{fontWeight:800, color:'#012d15'}}>{p.name}</span>
                          </div></td>
                          <td style={{color:"#5a7a65",fontSize:13,fontWeight:600}}>{p.expiry}</td>
                          <td><span className={days<=2?"d-red":"d-yel"}>{days===0?"Today!":`${days}d left`}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel" style={{borderTop:`3px solid ${GREEN}`}}>
              <div className="phd">
                <span className="ptitle">📊 Category Breakdown</span>
              </div>
              <div style={{padding:"22px 24px"}}>
                {cats.length===0 ? (
                  <div style={{color:"#9ca3af",fontSize:14,textAlign:"center",padding:"20px 0",fontFamily:"sans-serif"}}>No products yet</div>
                ) : cats.map(([cat,count],i) => {
                  const pct = Math.round((count/stats.total)*100);
                  return (
                    <div key={cat} style={{marginBottom:18}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                        <span style={{fontSize:14,fontWeight:700,color:"#014421",fontFamily:"sans-serif"}}>{getCategoryEmoji(cat)} {cat}</span>
                        <span style={{fontSize:12,color:"#4b6358",fontFamily:"sans-serif",fontWeight:600}}>{count} · {pct}%</span>
                      </div>
                      <div className="bt"><div className="bf" style={{width:`${pct}%`,background:barC[i%barC.length]}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Add this RIGHT HERE */}
        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:20, marginBottom:20}}>
          <DonationHistory user={user} />
        </div>

          <div className="sec"><span className="sec-lbl">Recent Activity</span></div>
          <div className="panel" style={{borderTop:"3px solid #3b82f6"}}>
            <div className="phd">
              <span className="ptitle">🕐 Recently Added</span>
              <button className="gbtn" onClick={() => navigate("/products")}>Manage All</button>
            </div>
            {recent.length===0 ? (
              <div style={{padding:"52px",textAlign:"center"}}>
                <div style={{fontSize:44,marginBottom:14}}>📦</div>
                <p style={{color:"#9ca3af",fontSize:15,margin:"0 0 18px",fontFamily:"sans-serif"}}>No products yet. Start adding to your inventory.</p>
                <button onClick={() => navigate("/products")} style={{background:DARK_GREEN,color:"white",border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>
                  Add First Product
                </button>
              </div>
            ) : (
              <table className="dbt">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Qty</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map(p => {
                    const days=getDaysLeft(p.expiry), status=getExpiryStatus(days);
                    const bm={expired:{cls:"b-expired",lbl:"Expired"},expiring:{cls:"b-exp",lbl:"Expiring"},safe:{cls:"b-safe",lbl:"Safe"}};
                    const b=bm[status]||bm.safe;
                    return (
                      <tr key={p.id}>
                        <td><div style={{display:"flex",alignItems:"center",gap:11}}>
                          {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="pt"/>:<div className="pt-ph">{getCategoryEmoji(p.category)}</div>}
                          <span style={{fontWeight:700}}>{p.name}</span>
                        </div></td>
                        <td><span className="cpill">{getCategoryEmoji(p.category)} {p.category}</span></td>
                        <td style={{fontWeight:800, color:'#014421', fontSize:14}}>{formatCurrency(p.price)}</td>
                        <td style={{color:"#6b7280"}}>{isNaN(p.quantity)?"—":`${p.quantity} ${p.unit||""}`}</td>
                        <td style={{color:"#5a7a65",fontSize:13,fontWeight:600}}>{p.expiry}</td>
                        <td><span className={b.cls}>{b.lbl}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>)}
      </div>
    </div>
  );
}