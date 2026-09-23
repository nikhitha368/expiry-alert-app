import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { formatCurrency, getCategoryEmoji } from "../utils";

const DG = "#014421", G = "#1a7a45", CREAM = "#f5f0e8";

export default function PurchaseHistory({ user }) {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        // 1. Fetch all sales for this buyer
        const salesSnap = await getDocs(
          query(collection(db,"sales"), where("buyerId","==",user.uid))
        );
        const data = salesSnap.docs.map(d=>({id:d.id,...d.data()}));
        data.sort((a,b)=>{
          const aT=a.purchasedAt?.toDate?.()??new Date(0);
          const bT=b.purchasedAt?.toDate?.()??new Date(0);
          return bT-aT;
        });

        // 2. Find unique productIds missing an image
        const missingIds = [...new Set(
          data.filter(p => !p.imageUrl && p.productId).map(p => p.productId)
        )];

        // 3. Fetch those products in chunks of 10 (Firestore "in" limit)
        const imageMap = {};
        for (let i = 0; i < missingIds.length; i += 10) {
          const chunk = missingIds.slice(i, i + 10);
          const pSnap = await getDocs(
            query(collection(db,"products"), where("__name__","in", chunk))
          );
          pSnap.docs.forEach(d => { imageMap[d.id] = d.data().imageUrl || ""; });
        }

        // 4. Merge imageUrl into each sale record
        setPurchases(data.map(p => ({
          ...p,
          imageUrl: p.imageUrl || imageMap[p.productId] || "",
        })));
      } catch(err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadPurchases();
  }, [user.uid]);

  const cats       = useMemo(()=>[...new Set(purchases.map(p=>p.category).filter(Boolean))],[purchases]);
  const totalSpent = useMemo(()=>purchases.reduce((s,p)=>s+(+p.totalAmount||0),0),[purchases]);
  const totalSaved = useMemo(()=>purchases.reduce((s,p)=>s+((+p.originalPrice-+p.salePrice)*+p.quantityPurchased),0),[purchases]);
  const filtered   = useMemo(()=>filterCat==="all"?purchases:purchases.filter(p=>p.category===filterCat),[purchases,filterCat]);

  const formatTs = ts => {
    if (!ts) return "—";
    const d = ts.toDate?ts.toDate():new Date(ts);
    return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  };
  const discBg = p => p>=45?"#dc2626":p>=35?"#ea580c":p>=20?"#d97706":"#16a34a";

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Georgia,serif" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

        .sk{background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%);
          background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:12px;}

        .pn{background:${DG};height:62px;padding:0 48px;display:flex;
          align-items:center;justify-content:space-between;
          position:sticky;top:0;z-index:200;box-shadow:0 2px 20px rgba(1,68,33,.35);}
        .pn-logo{font-size:21px;font-weight:900;color:white;letter-spacing:-1px;}
        .pn-logo em{color:#86efac;font-style:normal;}
        .pn-btn{background:transparent;border:1.5px solid rgba(255,255,255,.3);
          color:rgba(255,255,255,.85);border-radius:8px;padding:6px 16px;
          font-size:12px;font-weight:700;cursor:pointer;font-family:sans-serif;transition:all .15s;}
        .pn-btn:hover{background:rgba(255,255,255,.12);color:white;}
        .pn-btn.green{border-color:rgba(134,239,172,.4);color:#86efac;}
        .pn-btn.red{border-color:rgba(252,165,165,.5);color:#fca5a5;}
        .pn-btn.red:hover{background:rgba(220,38,38,.2);}

        .pkpi{background:white;border-radius:16px;border:2px solid #c8dcc8;padding:22px 20px;
          position:relative;overflow:hidden;box-shadow:0 2px 10px rgba(1,68,33,.07);
          transition:transform .15s;}
        .pkpi:hover{transform:translateY(-3px);}
        .pkpi-top{height:3px;position:absolute;top:0;left:0;right:0;border-radius:16px 16px 0 0;}

        .pt{width:100%;border-collapse:collapse;}
        .pt th{font-size:11px;font-weight:800;color:${DG};letter-spacing:1.8px;
          text-transform:uppercase;padding:12px 18px;border-bottom:2.5px solid #b8d4b8;
          text-align:left;background:#f0f5f0;font-family:sans-serif;white-space:nowrap;}
        .pt td{padding:13px 18px;border-bottom:1.5px solid #d8e8d8;font-size:13px;
          color:#1a2e1e;vertical-align:middle;font-family:sans-serif;}
        .pt tbody tr:last-child td{border-bottom:none;}
        .pt tbody tr:hover{background:#f7fbf7;}

        .ps{background:#f7fbf7;border:1.5px solid #c0d8c0;border-radius:10px;
          padding:9px 14px;font-size:13px;color:${DG};font-family:sans-serif;
          font-weight:600;cursor:pointer;outline:none;}
        .ps:focus{border-color:${G};}
      `}</style>

      {/* ── NAV ── */}
      <nav className="pn">
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span className="pn-logo">Stock<em>Sense</em></span>
          <button className="pn-btn green" onClick={()=>navigate("/offers")}>← Back to Offers</button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"rgba(255,255,255,.55)", fontSize:12, fontFamily:"sans-serif" }}>👤 {user.email}</span>
          <button className="pn-btn red" onClick={async()=>{await signOut(auth);navigate("/");}}>Logout</button>
        </div>
      </nav>

      <div style={{ padding:"36px 48px 64px" }}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:26, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:G, letterSpacing:2.5, fontFamily:"sans-serif", marginBottom:8 }}>MY ACCOUNT</div>
            <h1 style={{ fontSize:"clamp(26px,3vw,42px)", fontWeight:900, color:DG, letterSpacing:-2, margin:"0 0 6px", lineHeight:1 }}>🛒 Purchase History</h1>
            <p style={{ fontSize:14, color:"#4b6358", fontFamily:"sans-serif", margin:0 }}>All your orders from StockSense clearance deals</p>
          </div>
          <button onClick={()=>navigate("/offers")} style={{ background:DG, color:"white", border:"none", borderRadius:12, padding:"12px 22px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(1,68,33,.22)", transition:"all .18s" }}
            onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseOut={e=>e.currentTarget.style.transform="none"}>
            🏷️ Browse More Offers
          </button>
        </div>

        {/* ── KPI CARDS ── */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[0,1,2,3].map(i=><div key={i} className="sk" style={{height:96}}/>)}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Total Orders",      val:purchases.length,                    icon:"🛒", top:G,        vC:DG },
              { label:"Total Spent",       val:formatCurrency(totalSpent),          icon:"💰", top:"#d97706", vC:"#92400e" },
              { label:"Total Saved",       val:formatCurrency(Math.max(0,totalSaved)), icon:"💸", top:"#16a34a", vC:"#14532d" },
              { label:"Categories Bought", val:cats.length,                         icon:"📦", top:"#8b5cf6", vC:"#6d28d9" },
            ].map(k=>(
              <div key={k.label} className="pkpi">
                <div className="pkpi-top" style={{ background:k.top }}/>
                <div style={{ fontSize:10, fontWeight:800, color:"#8a9e8a", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:7 }}>{k.label}</div>
                <div style={{ fontSize:"clamp(18px,1.8vw,28px)", fontWeight:900, color:k.vC, fontFamily:"Georgia,serif", letterSpacing:-1, lineHeight:1.1, marginBottom:8 }}>{k.val}</div>
                <div style={{ fontSize:24, filter:"saturate(1.4)" }}>{k.icon}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SAVINGS BANNER ── */}
        {!loading && totalSaved > 0 && (
          <div style={{ background:`linear-gradient(135deg,#14532d,#166534,#15803d)`, borderRadius:16, padding:"18px 26px", marginBottom:22, display:"flex", alignItems:"center", gap:18, boxShadow:"0 6px 22px rgba(20,83,45,.24)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", right:-20, top:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
            <div style={{ fontSize:32 }}>🎉</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.65)", fontFamily:"sans-serif", letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>Your Total Savings</div>
              <div style={{ fontSize:28, fontWeight:900, color:"white", fontFamily:"Georgia,serif", letterSpacing:-1 }}>{formatCurrency(Math.max(0,totalSaved))} saved so far!</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", fontFamily:"sans-serif", marginTop:3 }}>across {purchases.length} order{purchases.length!==1?"s":""} from clearance deals</div>
            </div>
          </div>
        )}

        {/* ── TABLE ── */}
        <div style={{ background:"white", borderRadius:16, border:"2px solid #c8dcc8", overflow:"hidden", boxShadow:"0 2px 14px rgba(1,68,33,.07)" }}>
          {/* Table header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 22px", borderBottom:"1.5px solid #e8f0e8", background:"#fdfaf6" }}>
            <span style={{ fontSize:15, fontWeight:900, color:DG, fontFamily:"Georgia,serif" }}>
              My Orders <span style={{ fontSize:13, color:G, fontWeight:700 }}>({filtered.length})</span>
            </span>
            {cats.length > 0 && (
              <select className="ps" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                <option value="all">🗂️ All Categories</option>
                {cats.map(c=><option key={c}>{getCategoryEmoji(c)} {c}</option>)}
              </select>
            )}
          </div>

          {loading ? (
            <div style={{ padding:28 }}>{[0,1,2,3].map(i=><div key={i} className="sk" style={{height:52,marginBottom:10}}/>)}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 32px" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
              <h3 style={{ color:DG, margin:"0 0 8px", fontSize:19 }}>No purchases yet</h3>
              <p style={{ color:"#9ca3af", fontSize:14, fontFamily:"sans-serif", margin:"0 0 18px" }}>Go browse the clearance offers and grab a deal!</p>
              <button onClick={()=>navigate("/offers")} style={{ background:DG, color:"white", border:"none", borderRadius:12, padding:"11px 24px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Georgia,serif" }}>Browse Offers →</button>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="pt">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Original</th>
                    <th>Sale Price</th>
                    <th>Discount</th>
                    <th>Total Paid</th>
                    <th>You Saved</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p=>{
                    const saved=(+p.originalPrice-+p.salePrice)*+p.quantityPurchased;
                    return (
                      <tr key={p.id} style={{ animation:"fadeUp .25s ease" }}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:56, height:56, borderRadius:11, overflow:"hidden", border:"2px solid #c8dcc8", flexShrink:0, background:"#e8f5ee", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.productName}
                                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                                    onError={e=>{ e.target.style.display="none"; e.target.parentNode.style.fontSize="22px"; e.target.parentNode.innerHTML=getCategoryEmoji(p.category); }}/>
                                : <span style={{ fontSize:24, filter:"saturate(1.4)" }}>{getCategoryEmoji(p.category)}</span>}
                            </div>
                            <div>
                              <div style={{ fontWeight:800, color:DG, fontSize:13 }}>{p.productName}</div>
                              <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>Expiry: {p.expiryDate}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:"#d4f0e2", border:"1.5px solid #8cc8a8", borderRadius:100, padding:"3px 10px", fontSize:12, fontWeight:700, color:DG }}>
                            {getCategoryEmoji(p.category)} {p.category}
                          </span>
                        </td>
                        <td style={{ fontWeight:700, color:DG }}>{p.quantityPurchased} {p.unit}</td>
                        <td style={{ textDecoration:"line-through", color:"#9ca3af", fontSize:12 }}>{formatCurrency(p.originalPrice)}/{p.unit}</td>
                        <td style={{ fontWeight:800, color:G }}>{formatCurrency(p.salePrice)}/{p.unit}</td>
                        <td>
                          <span style={{ background:discBg(p.discountPercent), color:"white", borderRadius:100, padding:"3px 11px", fontSize:12, fontWeight:800, fontFamily:"sans-serif" }}>{p.discountPercent}% OFF</span>
                        </td>
                        <td style={{ fontWeight:900, color:DG, fontSize:14, fontFamily:"Georgia,serif" }}>{formatCurrency(p.totalAmount)}</td>
                        <td>
                          <span style={{ background:"#d4f0e2", color:"#14532d", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:800, fontFamily:"sans-serif", whiteSpace:"nowrap" }}>
                            💸 {formatCurrency(Math.max(0,saved))}
                          </span>
                        </td>
                        <td style={{ color:"#6b7280", fontSize:11, fontFamily:"sans-serif", fontWeight:600, whiteSpace:"nowrap" }}>{formatTs(p.purchasedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer totals row */}
                {filtered.length > 1 && (
                  <tfoot>
                    <tr style={{ background:"#f0f5f0" }}>
                      <td colSpan={6} style={{ padding:"12px 18px", fontWeight:800, color:DG, fontSize:13, fontFamily:"sans-serif", borderTop:"2px solid #b8d4b8" }}>
                        Total ({filtered.length} orders)
                      </td>
                      <td style={{ padding:"12px 18px", fontWeight:900, color:DG, fontSize:15, fontFamily:"Georgia,serif", borderTop:"2px solid #b8d4b8" }}>
                        {formatCurrency(filtered.reduce((s,p)=>s+(+p.totalAmount||0),0))}
                      </td>
                      <td style={{ padding:"12px 18px", borderTop:"2px solid #b8d4b8" }}>
                        <span style={{ background:"#d4f0e2", color:"#14532d", borderRadius:8, padding:"5px 12px", fontSize:13, fontWeight:900, fontFamily:"sans-serif", whiteSpace:"nowrap" }}>
                          💸 {formatCurrency(Math.max(0, filtered.reduce((s,p)=>s+((+p.originalPrice-+p.salePrice)*+p.quantityPurchased),0)))}
                        </span>
                      </td>
                      <td style={{ borderTop:"2px solid #b8d4b8" }}/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}