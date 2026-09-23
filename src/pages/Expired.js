import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import { Toast, useToast } from "../components/Toast";
import { getDaysLeft, formatCurrency, getCategoryEmoji } from "../utils";

const DARK_GREEN = "#014421";
const GREEN      = "#1a7a45";
const CREAM      = "#f5f0e8";

export default function Expired({ user }) {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const hasLoaded = useRef(false);
  const [reorderItem, setReorderItem] = useState(null);  // product to reorder
  const [reorderForm, setReorderForm] = useState({});
  const [reordering,  setReordering]  = useState(false);

  const UNITS = ["kg","g","L","ml","pcs","pack","box","dozen","pair","bottle"];
  const CATEGORIES = ["Vegetables","Fruits","Dairy","Meat","Bakery","Beverages","Snacks","Frozen","Cosmetics","Groceries","Others"];

  const openReorder = (p) => {
    setReorderItem(p);
    setReorderForm({
      name: p.name || "",
      category: p.category || "Vegetables",
      price: p.price || "",
      quantity: "",
      unit: p.unit || "kg",
      imageUrl: p.imageUrl || "",
      expiry: "",
      mfgDate: "",
    });
  };

  const handleReorder = async (e) => {
    e.preventDefault();
    if (!reorderForm.expiry || !reorderForm.quantity) return addToast("Please fill expiry date and quantity.", "error");
    setReordering(true);
    try {
      await addDoc(collection(db,"products"), {
        name:      reorderForm.name.trim(),
        category:  reorderForm.category,
        price:     parseFloat(reorderForm.price),
        quantity:  parseFloat(reorderForm.quantity),
        unit:      reorderForm.unit,
        imageUrl:  reorderForm.imageUrl.trim(),
        expiry:    reorderForm.expiry,
        mfgDate:   reorderForm.mfgDate || null,
        userId:    user.uid,
        createdAt: serverTimestamp(),
      });
      addToast(`✅ "${reorderForm.name}" reordered and added to inventory!`, "success");
      setReorderItem(null);
    } catch { addToast("Failed to reorder. Try again.", "error"); }
    finally { setReordering(false); }
  };

  useEffect(() => {
    const q = query(collection(db,"products"), where("userId","==",user.uid));
    const unsub = onSnapshot(q, { includeMetadataChanges:false }, snap => {
      const expired = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .filter(p => getDaysLeft(p.expiry) < 0)
        .sort((a,b) => getDaysLeft(a.expiry) - getDaysLeft(b.expiry));
      setProducts(expired);
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    });
    return unsub;
  }, [user.uid]);

  const toggleSelect  = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  const selectAll     = () => setSelected(selected.length===products.length ? [] : products.map(p=>p.id));

  const deleteSelected = async () => {
    try {
      const batch = writeBatch(db);
      selected.forEach(id => batch.delete(doc(db,"products",id)));
      await batch.commit();
      addToast(`${selected.length} product(s) deleted.`, "success");
      setSelected([]);
    } catch { addToast("Failed to delete. Try again.", "error"); }
    setConfirmClear(false);
  };

  const deleteSingle = async (id, name) => {
    try {
      await deleteDoc(doc(db,"products",id));
      addToast(`"${name}" removed.`, "success");
      setSelected(prev => prev.filter(x=>x!==id));
    } catch { addToast("Failed to delete.", "error"); }
  };

  const stats = useMemo(() => ({
    total:     products.length,
    critical:  products.filter(p => Math.abs(getDaysLeft(p.expiry)) >= 30).length,
    recent:    products.filter(p => Math.abs(getDaysLeft(p.expiry)) < 7).length,
    wasteCost: products.reduce((sum,p) => sum + (Number(p.price)||0) * (Number(p.quantity)||0), 0),
    worstCat:  (() => {
      const map = {};
      products.forEach(p => { if(p.category) map[p.category] = (map[p.category]||0)+1; });
      const top = Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
      return top ? `${top[0]} (${top[1]})` : null;
    })(),
  }), [products]);

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Georgia,serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }

        .sk { background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%);
          background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px;
          will-change:background-position; contain:strict; isolation:isolate; transform:translateZ(0); }

        .exp-table { width:100%; border-collapse:collapse; }
        .exp-table th { font-size:10.5px; font-weight:800; color:${DARK_GREEN}; letter-spacing:1.8px;
          text-transform:uppercase; padding:12px 20px; border-bottom:2.5px solid #b8d4b8;
          text-align:left; background:#f0f5f0; font-family:sans-serif; white-space:nowrap; }
        .exp-table td { padding:13px 20px; border-bottom:1.5px solid #d8e8d8;
          font-size:13.5px; color:#1a2e1e; vertical-align:middle; font-family:sans-serif; }
        .exp-table tr:last-child td { border-bottom:none; }
        .exp-table tbody tr { transition:background .12s; }
        .exp-table tbody tr:hover { background:#fdf7f7; }
        .exp-table tbody tr.selected { background:#fff1f1; }

        .cb { width:17px; height:17px; cursor:pointer; accent-color:#dc2626; }

        .btn-remove { background:#fff0f0; border:2px solid #f8a0a0; color:#dc2626;
          border-radius:8px; padding:6px 14px; font-size:12px; font-weight:800;
          cursor:pointer; font-family:sans-serif; transition:all .15s; white-space:nowrap; }
        .btn-remove:hover { background:#dc2626; color:white; }

        .btn-sel-all { background:white; border:2px solid #c0d4c0; color:#4b6358;
          border-radius:8px; padding:6px 16px; font-size:12px; font-weight:700;
          cursor:pointer; font-family:sans-serif; transition:all .15s; }
        .btn-sel-all:hover { border-color:${GREEN}; color:${GREEN}; }

        .btn-del-sel { background:#dc2626; border:none; color:white;
          border-radius:10px; padding:10px 22px; font-size:13px; font-weight:800;
          cursor:pointer; font-family:sans-serif; transition:all .15s;
          display:flex; align-items:center; gap:8px; }
        .btn-del-sel:hover { background:#b91c1c; transform:translateY(-1px); }

        .overdue-pill { display:inline-block; border-radius:100px; padding:3px 12px;
          font-size:12px; font-weight:800; font-family:sans-serif; white-space:nowrap; }

        .sec { display:flex; align-items:center; gap:14px; margin:28px 0 16px; }
        .sec-lbl { font-size:11px; font-weight:900; color:${DARK_GREEN}; letter-spacing:2.5px;
          text-transform:uppercase; white-space:nowrap; font-family:sans-serif; }
        .sec::after { content:''; flex:1; height:1px; background:#ccdccc; }

        .pt    { width:56px; height:56px; border-radius:12px; object-fit:cover; border:1.5px solid #e8e0d0; flex-shrink:0; }
        .pt-ph { width:42px; height:42px; border-radius:10px; background:#fef2f2; display:flex; align-items:center;
          justify-content:center; font-size:20px; flex-shrink:0; border:1.5px solid #fecaca; }

        .pr-overlay { position:fixed; inset:0; background:rgba(1,44,21,0.45); z-index:1000;
          display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:20px; }
        .pr-modal { background:#faf7f2; border-radius:20px; padding:32px; width:100%; max-width:420px;
          box-shadow:0 24px 64px rgba(1,44,21,0.25); animation:fadeUp .25s ease; border:1.5px solid #ddd5c8; }

        .blink { animation:blink 1.2s infinite; }
      `}</style>

      <Sidebar user={user} />

      <div style={{ padding:"36px 48px 64px" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:"#dc2626", letterSpacing:2.5, fontFamily:"sans-serif", marginBottom:8 }}>INVENTORY</div>
            <h1 style={{ fontSize:"clamp(32px,3.5vw,50px)", fontWeight:900, color:DARK_GREEN, letterSpacing:-2, margin:"0 0 8px", lineHeight:1 }}>⚠️ Expired Products</h1>
            <p style={{ fontSize:14, color:"#4b6358", fontFamily:"sans-serif", margin:0 }}>Products past their expiry date — remove or replace them immediately</p>
          </div>
          {selected.length > 0 && (
            <button className="btn-del-sel" onClick={() => setConfirmClear(true)}>
              🗑️ Delete Selected ({selected.length})
            </button>
          )}
        </div>

        {/* ── ALERT BANNER ── */}
        {!loading && products.length > 0 && (
          <div style={{
            background:"linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c)",
            borderRadius:16, padding:"16px 24px", marginBottom:24,
            display:"flex", alignItems:"center", gap:16,
            boxShadow:"0 6px 24px rgba(127,29,29,0.30)", position:"relative", overflow:"hidden"
          }}>
            <div style={{ position:"absolute", right:-30, top:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
            <div style={{ fontSize:30 }} className="blink">🚨</div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:"white", fontFamily:"Georgia,serif", marginBottom:2 }}>
                {products.length} expired product{products.length>1?"s":""} in inventory
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontFamily:"sans-serif" }}>
                Remove them immediately to prevent health risks and compliance issues
              </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:20 }}>
              {[
                { label:"Total Expired", val:stats.total,    color:"#fca5a5" },
                { label:"Recent (< 7d)", val:stats.recent,   color:"#fcd34d" },
                { label:"Critical (30d+)",val:stats.critical, color:"#f87171" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:900, color:s.color, fontFamily:"Georgia,serif", lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WASTE COST CALCULATOR ── */}
        {!loading && products.length > 0 && (
          <div style={{
            background:"white", borderRadius:16, border:"2px solid #fecaca",
            padding:"22px 28px", marginBottom:20,
            boxShadow:"0 2px 16px rgba(220,38,38,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16
          }}>
            {/* Left: waste value */}
            <div style={{ display:"flex", alignItems:"center", gap:18 }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, border:"2px solid #fecaca", flexShrink:0 }}>💸</div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:"#991b1b", letterSpacing:2, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:6 }}>Total Waste Cost</div>
                <div style={{ fontSize:42, fontWeight:900, color:"#dc2626", fontFamily:"Georgia,serif", letterSpacing:-2, lineHeight:1 }}>{formatCurrency(stats.wasteCost)}</div>
                <div style={{ fontSize:12, color:"#6b7280", fontFamily:"sans-serif", marginTop:4 }}>
                  Value lost across {stats.total} expired product{stats.total!==1?"s":""}
                </div>
              </div>
            </div>

            {/* Right: breakdown */}
            <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#6b7280", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:6 }}>Avg Loss/Item</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#dc2626", fontFamily:"Georgia,serif" }}>
                  {formatCurrency(stats.total > 0 ? stats.wasteCost / stats.total : 0)}
                </div>
              </div>
              {stats.worstCat && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#6b7280", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:6 }}>Most Wasted</div>
                  <div style={{ fontSize:16, fontWeight:900, color:"#991b1b", fontFamily:"Georgia,serif" }}>{getCategoryEmoji(stats.worstCat.split(" ")[0])} {stats.worstCat}</div>
                </div>
              )}
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#6b7280", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:6 }}>Critical Items</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#7f1d1d", fontFamily:"Georgia,serif" }}>{stats.critical}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── KPI CARDS ── */}
        {!loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
            {[
              { label:"Total Expired",   val:stats.total,    icon:"🗑️", topC:"#dc2626", bg:"#fef2f2", vColor:"#dc2626" },
              { label:"Expired < 7 days",val:stats.recent,   icon:"⏰", topC:"#d97706", bg:"#fffbeb", vColor:"#d97706" },
              { label:"Critical (30d+)", val:stats.critical, icon:"☠️", topC:"#7f1d1d", bg:"#fef2f2", vColor:"#7f1d1d" },
            ].map(k => (
              <div key={k.label} style={{
                background:"white", borderRadius:16, border:"2px solid #fecaca",
                padding:"22px 20px", display:"flex", alignItems:"center", justifyContent:"space-between",
                boxShadow:"0 2px 12px rgba(220,38,38,0.08)", position:"relative", overflow:"hidden"
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:k.topC, borderRadius:"16px 16px 0 0" }}/>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:"#991b1b", letterSpacing:1.5, textTransform:"uppercase", fontFamily:"sans-serif", marginBottom:8, opacity:.8 }}>{k.label}</div>
                  <div style={{ fontSize:44, fontWeight:900, letterSpacing:-2, lineHeight:1, color:k.vColor, fontFamily:"Georgia,serif" }}>{k.val}</div>
                </div>
                <div style={{ width:52, height:52, borderRadius:14, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, filter:"saturate(1.5) brightness(1.05)" }}>{k.icon}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── TABLE ── */}
        <div style={{ background:"white", borderRadius:16, border:"2px solid #fecaca", boxShadow:"0 2px 16px rgba(220,38,38,0.08)", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1.5px solid #fde8e8", background:"#fffafa" }}>
            <span style={{ fontSize:15, fontWeight:900, color:DARK_GREEN, fontFamily:"Georgia,serif" }}>
              Expired Items <span style={{ fontSize:13, color:"#dc2626", fontWeight:700 }}>({products.length})</span>
            </span>
            {products.length > 0 && (
              <button className="btn-sel-all" onClick={selectAll}>
                {selected.length===products.length ? "☐ Deselect All" : "☑ Select All"}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding:32 }}>
              {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height:56, marginBottom:10 }}/>)}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 32px" }}>
              <div style={{ fontSize:56, marginBottom:14 }}>✅</div>
              <h3 style={{ color:DARK_GREEN, margin:"0 0 8px", fontSize:20, fontWeight:900 }}>No expired products!</h3>
              <p style={{ color:"#9ca3af", fontSize:14, margin:0, fontFamily:"sans-serif" }}>Great job — all your products are within their expiry dates.</p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="exp-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>
                      <input type="checkbox" className="cb"
                        checked={selected.length===products.length && products.length>0}
                        onChange={selectAll}/>
                    </th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Expiry Date</th>
                    <th>Overdue By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const days = getDaysLeft(p.expiry);
                    const overdue = Math.abs(days);
                    const isSel = selected.includes(p.id);
                    const overdueColor = overdue >= 30 ? "#7f1d1d" : overdue >= 7 ? "#dc2626" : "#ea580c";
                    const overdueBg    = overdue >= 30 ? "#fecaca" : overdue >= 7 ? "#fee2e2" : "#fff7ed";
                    return (
                      <tr key={p.id} className={isSel ? "selected" : ""}>
                        <td>
                          <input type="checkbox" className="cb"
                            checked={isSel} onChange={() => toggleSelect(p.id)}/>
                        </td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="pt" onError={e=>e.target.style.display="none"}/>
                              : <div className="pt-ph">{getCategoryEmoji(p.category)}</div>
                            }
                            <div>
                              <div style={{ fontWeight:800, color:DARK_GREEN, fontSize:14 }}>{p.name}</div>
                              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>Exp: {p.expiry}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:"#edf7f1", color:DARK_GREEN, borderRadius:100, padding:"3px 11px", fontSize:12, fontWeight:700, border:"1px solid #b8d4c2" }}>
                            {getCategoryEmoji(p.category)} {p.category}
                          </span>
                        </td>
                        <td style={{ fontWeight:800, color:DARK_GREEN }}>{formatCurrency(p.price)}</td>
                        <td style={{ color:"#4b6358", fontWeight:600 }}>
                          {isNaN(p.quantity) ? "—" : `${p.quantity} ${p.unit||""}`}
                        </td>
                        <td style={{ color:"#dc2626", fontWeight:700 }}>{p.expiry}</td>
                        <td>
                          <span className="overdue-pill" style={{ background:overdueBg, color:overdueColor }}>
                            {overdue} day{overdue!==1?"s":""} ago
                          </span>
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            <button className="btn-remove" onClick={() => deleteSingle(p.id, p.name)}>
                              🗑️ Remove
                            </button>
                            <button onClick={() => openReorder(p)} style={{
                              background:"#f0f7f0", border:"2px solid #a8c8a8", color:DARK_GREEN,
                              borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800,
                              cursor:"pointer", fontFamily:"sans-serif", whiteSpace:"nowrap", transition:"all .15s"
                            }}
                            onMouseOver={e=>{e.currentTarget.style.background=DARK_GREEN;e.currentTarget.style.color="white"}}
                            onMouseOut={e=>{e.currentTarget.style.background="#f0f7f0";e.currentTarget.style.color=DARK_GREEN}}>
                              🔄 Reorder
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── BULK DELETE CONFIRM MODAL ── */}
      {confirmClear && (
        <div className="pr-overlay" onClick={e => { if(e.target===e.currentTarget) setConfirmClear(false); }}>
          <div className="pr-modal">
            <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🗑️</div>
              <h2 style={{ fontSize:20, fontWeight:900, color:DARK_GREEN, margin:"0 0 10px" }}>Confirm Deletion</h2>
              <p style={{ color:"#4b6358", fontSize:14, fontFamily:"sans-serif", margin:"0 0 24px", lineHeight:1.6 }}>
                Are you sure you want to permanently delete{" "}
                <strong style={{ color:"#dc2626" }}>{selected.length}</strong> expired product{selected.length>1?"s":""}?
                This cannot be undone.
              </p>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={() => setConfirmClear(false)} style={{ background:"white", border:"1.5px solid #dde8dd", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", color:"#4b6358" }}>
                  Cancel
                </button>
                <button onClick={deleteSelected} style={{ background:"#dc2626", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"sans-serif" }}>
                  Yes, Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REORDER MODAL ── */}
      {reorderItem && (
        <div className="pr-overlay" onClick={e => { if(e.target===e.currentTarget) setReorderItem(null); }}>
          <div className="pr-modal" style={{ maxWidth:520 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:11, color:GREEN, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:4 }}>REORDER</div>
                <h2 style={{ fontSize:20, fontWeight:900, color:DARK_GREEN, margin:0 }}>🔄 Reorder Product</h2>
              </div>
              <button onClick={() => setReorderItem(null)} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:34, height:34, fontSize:16, cursor:"pointer", color:"#dc2626", fontWeight:900 }}>✕</button>
            </div>

            {/* Pre-filled notice */}
            <div style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#065f46", fontFamily:"sans-serif" }}>
              ✅ Pre-filled from <strong>{reorderItem.name}</strong> — just update quantity and new expiry date
            </div>

            <form onSubmit={handleReorder} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Name + Category */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>PRODUCT NAME</label>
                  <input style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.name} onChange={e => setReorderForm(f=>({...f,name:e.target.value}))} required/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>CATEGORY</label>
                  <select style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.category} onChange={e => setReorderForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              {/* Price + Qty + Unit */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>PRICE (₹)</label>
                  <input type="number" min="0" step="0.01" style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.price} onChange={e => setReorderForm(f=>({...f,price:e.target.value}))} required/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>NEW QUANTITY *</label>
                  <input type="number" min="0" step="0.01" style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    placeholder="e.g. 10" value={reorderForm.quantity} onChange={e => setReorderForm(f=>({...f,quantity:e.target.value}))} required autoFocus/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>UNIT</label>
                  <select style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.unit} onChange={e => setReorderForm(f=>({...f,unit:e.target.value}))}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* MFG + Expiry */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>MFG DATE <span style={{ fontWeight:400, color:"#aaa" }}>(optional)</span></label>
                  <input type="date" style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.mfgDate} onChange={e => setReorderForm(f=>({...f,mfgDate:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#dc2626", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>NEW EXPIRY DATE *</label>
                  <input type="date" style={{ width:"100%", boxSizing:"border-box", background:"#fffdf8", border:"1.5px solid #c8b89a", borderRadius:10, color:"#111", padding:"10px 14px", fontSize:14, fontFamily:"sans-serif", outline:"none" }}
                    value={reorderForm.expiry} onChange={e => setReorderForm(f=>({...f,expiry:e.target.value}))} required/>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:12, borderTop:"1px solid #ddd5c8" }}>
                <button type="button" onClick={() => setReorderItem(null)} style={{ background:"#f5f0e8", border:"1.5px solid #c8b89a", borderRadius:10, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", color:"#4b6358" }}>Cancel</button>
                <button type="submit" disabled={reordering} style={{ background:reordering?"#aaa":DARK_GREEN, color:"white", border:"none", borderRadius:10, padding:"10px 26px", fontSize:14, fontWeight:800, cursor:reordering?"not-allowed":"pointer", fontFamily:"Georgia,serif" }}>
                  {reordering ? "Adding..." : "🔄 Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}