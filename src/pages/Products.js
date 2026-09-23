import React, { useEffect, useState, useMemo, memo } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import { Toast, useToast } from "../components/Toast";
import { getDaysLeft, getExpiryStatus, formatCurrency, getCategoryEmoji, getShelfLifeUsedPercent } from "../utils";

const CATEGORIES = ["Vegetables","Fruits","Dairy","Meat","Bakery","Beverages","Snacks","Frozen","Cosmetics","Groceries","Others"];
const UNITS = ["kg","g","L","ml","pcs","pack","box","dozen","pair","bottle"];
const EMPTY_FORM = { name:"", category:"Vegetables", price:"", quantity:"", unit:"kg", imageUrl:"", expiry:"", mfgDate:"" };

const GREEN      = "#1a7a45";
const DARK_GREEN = "#014421";
const CREAM      = "#f5f0e8";


// Isolated memoized component — never re-renders when parent data changes
const MarqueeStrip = memo(function MarqueeStrip({ onAdd }) {
  const GREEN = "#1a7a45";
  const DARK_GREEN = "#014421";
  const cats = [
    {icon:"🥦",name:"Vegetables",bg:"#85d4a0"},{icon:"🍎",name:"Fruits",bg:"#ff9eae"},
    {icon:"🥛",name:"Dairy",bg:"#ffe080"},{icon:"🥩",name:"Meat",bg:"#ffaa88"},
    {icon:"🍞",name:"Bakery",bg:"#ffd070"},{icon:"🥤",name:"Beverages",bg:"#80c8f8"},
    {icon:"🍿",name:"Snacks",bg:"#ff90c0"},{icon:"❄️",name:"Frozen",bg:"#78d8f5"},
    {icon:"💄",name:"Cosmetics",bg:"#f085cc"},{icon:"🛒",name:"Groceries",bg:"#7ecca0"},
    {icon:"📦",name:"Others",bg:"#c8b090"},
  ];
  const doubled = [...cats,...cats];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"space-between", paddingLeft:40, minWidth:0, overflow:"hidden" }}>
      <button onClick={onAdd} style={{
        background:DARK_GREEN, color:"white", border:"none", borderRadius:12,
        padding:"12px 26px", fontSize:15, fontWeight:800, cursor:"pointer",
        fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8,
        boxShadow:"0 4px 20px #1a7a4544", transition:"all .2s", flexShrink:0, alignSelf:"flex-end"
      }}
      onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px #1a7a4555"}}
      onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 20px #1a7a4544"}}>
        + Add Product
      </button>
      <div style={{ width:"100%", marginTop:18 }}>
        <div className="mq-wrap" style={{ width:"100%", padding:"0 0 28px", position:"relative" }}>
          <div className="mq-track mq-track-lbl" style={{ marginBottom:6 }}>
            {doubled.map((cat,i) => (
              <div key={i} style={{ width:110, flexShrink:0, display:"flex", justifyContent:"center", alignItems:"center", height:24 }}>
                {(i===5||i===16) && (
                  <span style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:16, color:"#2d6a42", fontWeight:900, letterSpacing:0.6, whiteSpace:"nowrap" }}>Smart Inventory Management ✦</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ position:"relative", padding:"10px 0 0" }}>
            <div className="mq-line"/>
            <div className="mq-track">
              {doubled.map((cat,i) => (
                <div key={i} className="mq-item">
                  <div className="mq-circle" style={{ background:cat.bg }}>{cat.icon}</div>
                  <div className="mq-label">{cat.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Products({ user }) {
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [editId,        setEditId]        = useState(null);
  const [restockModal,  setRestockModal]  = useState(null);
  const [restockQty,    setRestockQty]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const hasLoaded = React.useRef(false);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterCat,     setFilterCat]     = useState("all");
  const [viewMode,      setViewMode]      = useState("table"); // "table" | "card"
  const [sortBy,        setSortBy]        = useState("name");  // "name" | "expiry" | "price" | "qty"
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const q = query(collection(db,"products"), where("userId","==",user.uid));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    });
    return unsub;
  }, [user.uid]);

  const upd = (k,v) => setForm(p => ({ ...p, [k]:v }));
  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ name:p.name||"", category:p.category||"Vegetables", price:p.price||"",
      quantity:isNaN(p.quantity)?"":p.quantity, unit:p.unit||"kg",
      imageUrl:p.imageUrl||"", expiry:p.expiry||"", mfgDate:p.mfgDate||"" });
    setEditId(p.id); setShowForm(true);
  };

  const handleRestock = async () => {
    const qty = parseFloat(restockQty);
    if (!qty || isNaN(qty) || qty <= 0) return addToast("Enter a valid quantity.", "error");
    try {
      const cur = Number(restockModal.quantity) || 0;
      await updateDoc(doc(db,"products",restockModal.id), { quantity: cur + qty });
      addToast(`✅ Restocked! ${restockModal.name} now has ${cur+qty} ${restockModal.unit}`, "success");
      setRestockModal(null); setRestockQty("");
    } catch { addToast("Failed to restock. Try again.", "error"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()||!form.price||!form.quantity||!form.expiry)
      return addToast("Please fill all required fields.", "error");
    if (form.mfgDate && form.expiry && form.mfgDate >= form.expiry)
      return addToast("Manufacture date must be before expiry date.", "error");
    setSaving(true);
    try {
      const data = {
        name:form.name.trim(), category:form.category,
        price:parseFloat(form.price), quantity:parseFloat(form.quantity),
        unit:form.unit, imageUrl:form.imageUrl.trim(),
        expiry:form.expiry, mfgDate:form.mfgDate||null, userId:user.uid,
      };
      if (editId) {
        await updateDoc(doc(db,"products",editId), data);
        addToast("Product updated successfully!", "success");
      } else {
        await addDoc(collection(db,"products"), { ...data, createdAt:serverTimestamp() });
        addToast("Product added successfully!", "success");
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null);
    } catch { addToast("Failed to save product. Try again.", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteDoc(doc(db,"products",id)); addToast("Product deleted.", "success"); }
    catch { addToast("Failed to delete.", "error"); }
    setDeleteConfirm(null);
  };

  const stats = useMemo(() => products.reduce((a,p) => {
    const s = getExpiryStatus(getDaysLeft(p.expiry));
    if (s==="expired") a.exp++; else if (s==="expiring") a.soon++; else a.safe++;
    return a;
  }, { exp:0, soon:0, safe:0 }), [products]);

  const filtered = useMemo(() => products
    .filter(p => {
      const days = getDaysLeft(p.expiry);
      const status = getExpiryStatus(days);
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus==="all" || status===filterStatus;
      const matchCat    = filterCat==="all"    || p.category===filterCat;
      return matchSearch && matchStatus && matchCat;
    })
    .sort((a,b) => {
      if (sortBy==="expiry") return (a.expiry||"").localeCompare(b.expiry||"");
      if (sortBy==="price")  return (Number(b.price)||0) - (Number(a.price)||0);
      if (sortBy==="qty")    return (Number(b.quantity)||0) - (Number(a.quantity)||0);
      return (a.name||"").localeCompare(b.name||"");
    }), [products, search, filterStatus, filterCat, sortBy]);

  const INP = {
    width:"100%", boxSizing:"border-box", background:"#fffdf8",
    border:"1.5px solid #c8b89a", borderRadius:10, color:"#111",
    padding:"11px 14px", fontSize:14, fontFamily:"sans-serif",
    outline:"none", transition:"border-color .2s, box-shadow .2s"
  };
  const SEL = { ...INP };

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Georgia,serif" }}>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .mq-track-lbl { display:flex; animation:marquee 28s linear infinite; width:max-content; will-change:transform; transform:translateZ(0); backface-visibility:hidden; }

        /* ── ICON MARQUEE ── */
        .mq-wrap  { overflow:hidden; position:relative; contain:layout paint; isolation:isolate; }
        .mq-line  { position:absolute; top:53px; left:0; right:0; height:0;
          border-top:2.5px dashed #a8c0a8; pointer-events:none; z-index:0; }
        .mq-track { display:flex; align-items:center; gap:0; animation:marquee 28s linear infinite; width:max-content; will-change:transform; transform:translateZ(0); backface-visibility:hidden; }
        .mq-track:hover { animation-play-state:paused; }
        .mq-item  { position:relative; display:flex; flex-direction:column; align-items:center; margin:0 16px; z-index:1; cursor:default; padding-bottom:28px; }
        .mq-circle { width:78px; height:78px; border-radius:50%;
          border:3px solid rgba(255,255,255,1);
          display:flex; align-items:center; justify-content:center;
          font-size:38px; box-shadow:0 5px 20px rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.12);
          transition:transform .22s, box-shadow .22s; flex-shrink:0; filter:saturate(1.3); }
        .mq-item:hover .mq-circle { transform:scale(1.18); box-shadow:0 12px 34px rgba(0,0,0,0.26); filter:saturate(1.6); }
        .mq-label { position:absolute; top:88px; left:50%; transform:translateX(-50%) translateY(6px);
          color:#014421; font-size:13px; font-weight:700; font-family:Georgia,serif;
          font-style:italic; white-space:nowrap; letter-spacing:0.3px;
          opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; z-index:10; }
        .mq-item:hover .mq-label { opacity:1; transform:translateX(-50%) translateY(0); }

        .pr-inp:focus { border-color:${GREEN} !important; box-shadow:0 0 0 3px ${GREEN}22 !important; }
        .pr-inp::placeholder { color:#bbb; }

        /* ── STAT PILLS ── */
        .st-pill { border-radius:12px; padding:12px 20px; display:flex; align-items:center; gap:10px; border:2px solid; transition:transform .18s,box-shadow .18s; cursor:default; }
        .st-pill:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.10); }

        /* ── TABLE ── */
        .pr-table { width:100%; border-collapse:collapse; }
        .pr-table th { font-size:10.5px; font-weight:800; color:${DARK_GREEN}; letter-spacing:1.8px; text-transform:uppercase; padding:12px 20px; border-bottom:2px solid #dde8dd; text-align:left; background:#f0f5f0; font-family:sans-serif; white-space:nowrap; }
        .pr-table td { padding:13px 20px; border-bottom:1.5px solid #d8e8d8; font-size:13.5px; color:#1a2e1e; vertical-align:middle; font-family:sans-serif; }
        .pr-table tr:last-child td { border-bottom:none; }
        .pr-table tbody tr { transition:background .12s; }
        .pr-table tbody tr:hover { background:#f7fbf7; }

        /* ── CARD GRID ── */
        .card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
        .pr-card { background:white; border-radius:16px; border:1.5px solid #dde8dd; overflow:hidden; transition:all .2s; box-shadow:0 2px 10px rgba(1,68,33,0.06); }
        .pr-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(1,68,33,0.14); }

        /* ── BADGE ── */
        .b-safe    { background:#d1fae5; color:#065f46; padding:3px 11px; border-radius:100px; font-size:11.5px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .b-exp     { background:#fef3c7; color:#78350f; padding:3px 11px; border-radius:100px; font-size:11.5px; font-weight:700; font-family:sans-serif; white-space:nowrap; }
        .b-expired { background:#fee2e2; color:#7f1d1d; padding:3px 11px; border-radius:100px; font-size:11.5px; font-weight:700; font-family:sans-serif; white-space:nowrap; }

        /* ── BUTTONS ── */
        .btn-edit    { background:#f0f7f0; border:1.5px solid #c8dfc8; color:${DARK_GREEN}; border-radius:8px; padding:6px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:sans-serif; transition:all .15s; }
        .btn-edit:hover { background:${DARK_GREEN}; color:white; }
        .btn-restock { background:#eff6ff; border:2px solid #93c5fd; color:#1d4ed8; border-radius:8px; padding:6px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:sans-serif; transition:all .15s; }
        .btn-restock:hover { background:#1d4ed8; color:white; }
        .btn-del     { background:#fff0f0; border:2px solid #f8a0a0; color:#dc2626; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:700; cursor:pointer; font-family:sans-serif; transition:all .15s; }
        .btn-del:hover { background:#dc2626; color:white; }

        /* ── MODAL ── */
        .pr-overlay { position:fixed; inset:0; background:rgba(1,44,21,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:20px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .pr-modal   { background:#faf7f2; border-radius:20px; padding:32px; width:100%; max-width:580px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(1,44,21,0.25); animation:fadeUp .25s ease; border:1.5px solid #ddd5c8; }
        .pr-modal-sm { max-width:400px; }

        /* ── SORT/VIEW BAR ── */
        .view-btn { padding:7px 14px; border-radius:8px; border:2px solid #c0d4c0; background:white; font-size:13px; font-weight:600; cursor:pointer; font-family:sans-serif; color:#4b6358; transition:all .15s; }
        .view-btn.active { background:${DARK_GREEN}; color:white; border-color:${DARK_GREEN}; }
        .view-btn:hover:not(.active) { border-color:${GREEN}; color:${GREEN}; }

        /* ── URGENCY RING on card ── */
        .urg-ring { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

        /* ── SEARCH ── */
        .search-wrap { position:relative; flex:1; min-width:220px; }
        .search-wrap .s-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); font-size:15px; pointer-events:none; }
        .search-wrap input { padding-left:38px !important; }

        /* ── HORIZONTAL CARD HOVER ── */
        .pr-hcard:hover { box-shadow:0 6px 24px rgba(1,68,33,0.13) !important; transform:translateY(-2px); border-color:#c8dfc8 !important; }

        /* skeleton */
        .sk { background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }
      `}</style>

      <Sidebar user={user} />

      <div style={{ padding:"36px 48px 64px" }}>

        {/* ── PAGE HEADER: Title left, Marquee+Button right ── */}
        <div style={{ display:"flex", alignItems:"stretch", justifyContent:"space-between", marginBottom:28, gap:0 }}>

          {/* LEFT: Title block */}
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", flex:"0 0 auto", maxWidth:420 }}>
            <div style={{ fontSize:11, fontWeight:800, color:GREEN, letterSpacing:2.5, fontFamily:"sans-serif", marginBottom:8 }}>INVENTORY</div>
            <h1 style={{ fontSize:"clamp(46px,5.5vw,72px)", fontWeight:900, color:DARK_GREEN, letterSpacing:-3, margin:"0 0 10px", lineHeight:0.95 }}>📦 Manage<br/>Products</h1>
            <p style={{ fontSize:14, color:"#4b6358", fontFamily:"sans-serif", margin:0 }}>Add, edit, restock and track all your inventory items</p>
          </div>

          <MarqueeStrip onAdd={openAdd} />
        </div>

        {/* ── STAT PILLS ── */}
        <div style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap" }}>
          {loading ? (
            [0,1,2,3].map(i => <div key={i} className="sk" style={{ width:110, height:60, borderRadius:12 }}/>)
          ) : (
            [
              { label:"Total",    val:products.length, icon:"📦", bg:"#edfaf3", border:"#b8dfc8", tc:DARK_GREEN },
              { label:"Expired",  val:stats.exp,       icon:"⚠️", bg:"#fef2f2", border:"#fecaca", tc:"#991b1b"  },
              { label:"Expiring", val:stats.soon,      icon:"⏰", bg:"#fffbeb", border:"#fde68a", tc:"#92400e"  },
              { label:"Safe",     val:stats.safe,      icon:"✅", bg:"#ecfdf5", border:"#a7f3d0", tc:"#065f46"  },
            ].map(s => (
              <div key={s.label} className="st-pill" style={{ background:s.bg, borderColor:s.border }}>
                <span style={{ fontSize:20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:22, fontWeight:900, color:s.tc, fontFamily:"Georgia,serif", letterSpacing:-1, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:s.tc, fontFamily:"sans-serif", fontWeight:700, opacity:.75, marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── FILTER + VIEW BAR ── */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <div className="search-wrap">
            <span className="s-icon">🔍</span>
            <input className="pr-inp" style={{ ...INP, paddingLeft:38, width:"100%" }}
              placeholder="Search by name or category..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="pr-inp" style={{ ...SEL, width:150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring Soon</option>
            <option value="safe">Safe</option>
          </select>
          <select className="pr-inp" style={{ ...SEL, width:150 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="pr-inp" style={{ ...SEL, width:140 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="expiry">Sort: Expiry</option>
            <option value="price">Sort: Price</option>
            <option value="qty">Sort: Qty</option>
          </select>
          {/* View toggle */}
          <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
            <button className={`view-btn${viewMode==="table"?" active":""}`} onClick={() => setViewMode("table")}>☰ Table</button>
            <button className={`view-btn${viewMode==="card"?" active":""}`}  onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ background:"white", borderRadius:16, border:"2px solid #c8dcc8", boxShadow:"0 2px 16px rgba(1,68,33,0.08)", overflow:"hidden" }}>

          {/* Panel header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1.5px solid #d8e8d8", background:"#fafcfa" }}>
            <span style={{ fontSize:15, fontWeight:900, color:DARK_GREEN, fontFamily:"Georgia,serif" }}>
              Products <span style={{ fontSize:13, color:"#4b6358", fontWeight:600 }}>({filtered.length})</span>
            </span>
            {filtered.length !== products.length && (
              <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCat("all"); }}
                style={{ fontSize:12, color:GREEN, fontFamily:"sans-serif", fontWeight:700, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding:32 }}>
              {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height:52, marginBottom:10 }}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 32px" }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
              <h3 style={{ color:DARK_GREEN, margin:"0 0 8px", fontSize:18 }}>{products.length===0?"No products yet":"No results found"}</h3>
              <p style={{ color:"#9ca3af", fontSize:14, margin:"0 0 20px", fontFamily:"sans-serif" }}>
                {products.length===0?"Add your first product to get started":"Try adjusting your search or filters"}
              </p>
              {products.length===0 && (
                <button onClick={openAdd} style={{ background:DARK_GREEN, color:"white", border:"none", borderRadius:12, padding:"11px 26px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                  Add First Product
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (

            /* ══ TABLE VIEW ══ */
            <div style={{ overflowX:"auto" }}>
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Product</th><th>Category</th><th>Price</th>
                    <th>Stock</th><th>Mfg Date</th><th>Expiry</th>
                    <th>Shelf Life</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const days = getDaysLeft(p.expiry);
                    const status = getExpiryStatus(days);
                    const bm = { expired:{cls:"b-expired",label:"Expired"}, expiring:{cls:"b-exp",label:"Expiring Soon"}, safe:{cls:"b-safe",label:"Safe"} };
                    const b = bm[status]||bm.safe;
                    const qty = Number(p.quantity);
                    const usedPct = getShelfLifeUsedPercent(p.mfgDate, p.expiry);
                    const shelfColor = usedPct>=85?"#ef4444":usedPct>=60?"#f59e0b":"#1a9e5f";
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} style={{ width:48,height:48,borderRadius:10,objectFit:"cover",border:"1.5px solid #e8e0d0",flexShrink:0 }} onError={e=>e.target.style.display="none"}/>
                              : <div style={{ width:48,height:48,borderRadius:10,background:"#f0f5f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:"1.5px solid #e8e0d0" }}>{getCategoryEmoji(p.category)}</div>
                            }
                            <span style={{ fontWeight:800, color:DARK_GREEN }}>{p.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:"#edf7f1", color:DARK_GREEN, borderRadius:100, padding:"3px 11px", fontSize:12, fontWeight:700, fontFamily:"sans-serif", border:"1px solid #b8d4c2" }}>
                            {getCategoryEmoji(p.category)} {p.category}
                          </span>
                        </td>
                        <td style={{ fontWeight:800, color:DARK_GREEN, fontSize:14 }}>{formatCurrency(p.price)}</td>
                        <td>
                          {isNaN(qty)
                            ? <span style={{ color:"#dc2626", fontFamily:"sans-serif", fontSize:13 }}>Invalid</span>
                            : qty===0
                              ? <span style={{ background:"#fee2e2", color:"#dc2626", borderRadius:100, padding:"3px 11px", fontSize:12, fontWeight:700, fontFamily:"sans-serif" }}>Out of Stock</span>
                              : <span style={{ color:qty<=5?"#d97706":"#166534", fontFamily:"sans-serif", fontWeight:700, fontSize:13 }}>
                                  {qty} {p.unit} {qty<=5&&qty>0&&<span style={{ fontSize:11, marginLeft:3 }}>⚠ Low</span>}
                                </span>
                          }
                        </td>
                        <td style={{ color:"#4b6358", fontSize:12.5, fontFamily:"sans-serif" }}>{p.mfgDate||"—"}</td>
                        <td style={{ color:"#4b6358", fontSize:12.5, fontFamily:"sans-serif", fontWeight:600 }}>{p.expiry}</td>
                        <td style={{ minWidth:110 }}>
                          {p.mfgDate ? (
                            <div>
                              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#4b6358", marginBottom:4, fontFamily:"sans-serif" }}>
                                <span>Used</span><span style={{ color:shelfColor, fontWeight:700 }}>{usedPct}%</span>
                              </div>
                              <div style={{ height:6, background:"#e0ece0", borderRadius:100, overflow:"hidden" }}>
                                <div style={{ width:`${usedPct}%`, height:"100%", background:shelfColor, borderRadius:100, transition:"width .8s" }}/>
                              </div>
                            </div>
                          ) : <span style={{ color:"#bbb", fontSize:12, fontFamily:"sans-serif" }}>No mfg date</span>}
                        </td>
                        <td><span className={b.cls}>{b.label}</span></td>
                        <td>
                          <div style={{ display:"flex", gap:5 }}>
                            <button className="btn-edit"    onClick={() => openEdit(p)}>✏️ Edit</button>
                            <button className="btn-restock" onClick={() => { setRestockModal(p); setRestockQty(""); }}>📦 Restock</button>
                            <button className="btn-del"     onClick={() => setDeleteConfirm(p)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          ) : (

            /* ══ CARD VIEW — Compact Horizontal Data Card ══ */
            <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(p => {
                const days = getDaysLeft(p.expiry);
                const status = getExpiryStatus(days);
                const bm = {
                  expired: { cls:"b-expired", label:"Expired",      ring:"#ef4444", ringBg:"#fef2f2" },
                  expiring:{ cls:"b-exp",     label:"Expiring Soon", ring:"#f59e0b", ringBg:"#fffbeb" },
                  safe:    { cls:"b-safe",    label:"Safe",          ring:"#1a9e5f", ringBg:"#ecfdf5" },
                };
                const b = bm[status]||bm.safe;
                const qty = Number(p.quantity);
                const usedPct = getShelfLifeUsedPercent(p.mfgDate, p.expiry);
                const shelfColor = usedPct>=85?"#ef4444":usedPct>=60?"#f59e0b":"#1a9e5f";
                const daysColor  = days===0?"#dc2626":days!==null&&days<=5?"#ef4444":days!==null&&days<=15?"#d97706":"#166534";
                return (
                  <div key={p.id} className="pr-hcard" style={{
                    background:"white", borderRadius:14,
                    border:"1.5px solid #e4ede4",
                    boxShadow:"0 1px 8px rgba(1,68,33,0.06)",
                    display:"flex", alignItems:"center", gap:0,
                    overflow:"hidden", transition:"all .2s"
                  }}>
                    {/* LEFT accent bar */}
                    <div style={{ width:4, alignSelf:"stretch", background:b.ring, flexShrink:0 }}/>

                    {/* Image */}
                    <div style={{ width:130, height:130, flexShrink:0, margin:"0 20px" }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} style={{ width:130,height:130,borderRadius:14,objectFit:"cover",border:"1.5px solid #e8e8e0" }} onError={e=>e.target.style.display="none"}/>
                        : <div style={{ width:130,height:130,borderRadius:14,background:"#f5f7f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,border:"1.5px solid #e0e8e0" }}>{getCategoryEmoji(p.category)}</div>
                      }
                    </div>

                    {/* Name + Category — fixed width */}
                    <div style={{ width:180, flexShrink:0, paddingRight:20 }}>
                      <div style={{ fontWeight:900, color:DARK_GREEN, fontSize:16, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                      <span style={{ background:"#f0f7f2", color:"#2d6a4f", borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:700, fontFamily:"sans-serif", border:"1px solid #c8e6d4" }}>
                        {getCategoryEmoji(p.category)} {p.category}
                      </span>
                    </div>

                    {/* Divider */}
                    <div style={{ width:1, alignSelf:"stretch", background:"#eef3ee", flexShrink:0 }}/>

                    {/* Data grid — 4 columns */}
                    <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(4,1fr)", padding:"0 20px", gap:0 }}>
                      {/* Price */}
                      <div style={{ padding:"18px 12px", borderRight:"1px solid #eef3ee" }}>
                        <div style={{ fontSize:11, color:"#4b6358", fontFamily:"sans-serif", fontWeight:900, letterSpacing:1.4, textTransform:"uppercase", marginBottom:5 }}>Price</div>
                        <div style={{ fontSize:19, fontWeight:900, color:DARK_GREEN, fontFamily:"Georgia,serif", letterSpacing:-0.5 }}>{formatCurrency(p.price)}</div>
                      </div>
                      {/* Stock */}
                      <div style={{ padding:"18px 12px", borderRight:"1px solid #eef3ee" }}>
                        <div style={{ fontSize:11, color:"#4b6358", fontFamily:"sans-serif", fontWeight:900, letterSpacing:1.4, textTransform:"uppercase", marginBottom:5 }}>Stock</div>
                        <div style={{ fontSize:17, fontWeight:900, fontFamily:"sans-serif", color:qty===0?"#dc2626":qty<=5?"#d97706":"#166534" }}>
                          {isNaN(qty)?"—":`${qty} ${p.unit}`}
                          {qty<=5&&qty>0&&<span style={{ fontSize:10, marginLeft:4, verticalAlign:"middle" }}>⚠</span>}
                        </div>
                      </div>
                      {/* Expiry */}
                      <div style={{ padding:"18px 12px", borderRight:"1px solid #eef3ee" }}>
                        <div style={{ fontSize:11, color:"#4b6358", fontFamily:"sans-serif", fontWeight:900, letterSpacing:1.4, textTransform:"uppercase", marginBottom:5 }}>Expiry</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#1a2e1e", fontFamily:"sans-serif" }}>{p.expiry}</div>
                        <div style={{ fontSize:13, fontWeight:900, color:daysColor, fontFamily:"sans-serif", marginTop:3 }}>
                          {days===null?"—":days===0?"Today!":days<0?`${Math.abs(days)}d ago`:`${days}d left`}
                        </div>
                      </div>
                      {/* Shelf life */}
                      <div style={{ padding:"18px 12px" }}>
                        <div style={{ fontSize:10, color:"#8a9e8a", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:6 }}>Shelf Life</div>
                        {p.mfgDate ? (<>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontFamily:"sans-serif", marginBottom:4 }}>
                            <span style={{ color:"#8a9e8a" }}>Used</span>
                            <span style={{ fontWeight:800, color:shelfColor }}>{usedPct}%</span>
                          </div>
                          <div style={{ height:5, background:"#e8f0e8", borderRadius:100, overflow:"hidden" }}>
                            <div style={{ width:`${usedPct}%`, height:"100%", background:shelfColor, borderRadius:100, transition:"width .8s" }}/>
                          </div>
                        </>) : <span style={{ fontSize:11, color:"#ccc", fontFamily:"sans-serif" }}>No mfg date</span>}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width:1, alignSelf:"stretch", background:"#eef3ee", flexShrink:0 }}/>

                    {/* Status badge */}
                    <div style={{ width:120, flexShrink:0, display:"flex", justifyContent:"center", padding:"0 12px" }}>
                      <span className={b.cls} style={{ fontSize:11 }}>{b.label}</span>
                    </div>

                    {/* Divider */}
                    <div style={{ width:1, alignSelf:"stretch", background:"#eef3ee", flexShrink:0 }}/>

                    {/* Actions */}
                    <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"14px 16px", flexShrink:0 }}>
                      <button className="btn-edit"    onClick={() => openEdit(p)}>✏️ Edit</button>
                      <button className="btn-restock" onClick={() => { setRestockModal(p); setRestockQty(""); }}>📦 Restock</button>
                      <button className="btn-del"     onClick={() => setDeleteConfirm(p)}>🗑️ Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ ADD / EDIT MODAL ══ */}
      {showForm && (
        <div className="pr-overlay" onClick={e => { if (e.target===e.currentTarget) setShowForm(false); }}>
          <div className="pr-modal">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:11, color:GREEN, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:4 }}>{editId?"EDIT":"ADD NEW"}</div>
                <h2 style={{ fontSize:22, fontWeight:900, color:DARK_GREEN, margin:0, letterSpacing:-0.5 }}>{editId?"✏️ Edit Product":"➕ Add Product"}</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:34, height:34, fontSize:16, cursor:"pointer", color:"#dc2626", fontWeight:900 }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>PRODUCT NAME *</label>
                  <input className="pr-inp" style={INP} value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. Tomatoes" required/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>CATEGORY *</label>
                  <select className="pr-inp" style={SEL} value={form.category} onChange={e=>upd("category",e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>PRICE (₹) *</label>
                  <input className="pr-inp" style={INP} type="number" min="0" step="0.01" value={form.price} onChange={e=>upd("price",e.target.value)} placeholder="0.00" required/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>QUANTITY *</label>
                  <input className="pr-inp" style={INP} type="number" min="0" step="0.01" value={form.quantity} onChange={e=>upd("quantity",e.target.value)} placeholder="0" required/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>UNIT</label>
                  <select className="pr-inp" style={SEL} value={form.unit} onChange={e=>upd("unit",e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  {["ml","g"].includes(form.unit) && (
                    <div style={{ fontSize:11, color:"#d97706", marginTop:4, fontFamily:"sans-serif" }}>⚠️ Consider using L or kg instead</div>
                  )}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>MFG DATE <span style={{ fontWeight:400, color:"#aaa" }}>(optional)</span></label>
                  <input className="pr-inp" style={INP} type="date" value={form.mfgDate} onChange={e=>upd("mfgDate",e.target.value)} max={form.expiry||undefined}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>EXPIRY DATE *</label>
                  <input className="pr-inp" style={INP} type="date" value={form.expiry} onChange={e=>upd("expiry",e.target.value)} min={form.mfgDate||undefined} required/>
                </div>
              </div>

              {/* Shelf life preview */}
              {form.mfgDate && form.expiry && (
                <div style={{ background:"#f0f7f0", border:"1px solid #c8dfc8", borderRadius:10, padding:"10px 14px", fontSize:13, color:DARK_GREEN, fontFamily:"sans-serif" }}>
                  📅 Total shelf life: <strong>{Math.max(0,Math.floor((new Date(form.expiry)-new Date(form.mfgDate))/86400000))} days</strong>
                </div>
              )}

              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:6 }}>IMAGE URL <span style={{ fontWeight:400, color:"#aaa" }}>(optional)</span></label>
                <input className="pr-inp" style={INP} type="url" value={form.imageUrl} onChange={e=>upd("imageUrl",e.target.value)} placeholder="https://..."/>
              </div>

              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview" style={{ width:80, height:60, objectFit:"cover", borderRadius:10, border:"1.5px solid #dde8dd" }} onError={e=>e.target.style.display="none"}/>
              )}

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:14, borderTop:"1px solid #ddd5c8" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ background:"#f5f0e8", border:"1.5px solid #c8b89a", borderRadius:10, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", color:"#4b6358" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ background:saving?"#aaa":DARK_GREEN, color:"white", border:"none", borderRadius:10, padding:"10px 26px", fontSize:14, fontWeight:800, cursor:saving?"not-allowed":"pointer", fontFamily:"Georgia,serif" }}>
                  {saving?"Saving...":editId?"Update Product":"Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {deleteConfirm && (
        <div className="pr-overlay">
          <div className="pr-modal pr-modal-sm" style={{ background:"#faf7f2", border:"1.5px solid #ddd5c8" }}>
            <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
              <h2 style={{ fontSize:20, fontWeight:900, color:DARK_GREEN, margin:"0 0 10px" }}>Delete Product?</h2>
              <p style={{ color:"#4b6358", fontSize:14, fontFamily:"sans-serif", margin:"0 0 24px" }}>
                Are you sure you want to delete <strong style={{ color:DARK_GREEN }}>{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ background:"white", border:"1.5px solid #dde8dd", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", color:"#4b6358" }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} style={{ background:"#dc2626", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"sans-serif" }}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESTOCK MODAL ══ */}
      {restockModal && (
        <div className="pr-overlay" onClick={e => { if (e.target===e.currentTarget) setRestockModal(null); }}>
          <div className="pr-modal pr-modal-sm" style={{ background:"#faf7f2", border:"1.5px solid #ddd5c8" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:900, color:DARK_GREEN, margin:0 }}>📦 Restock</h2>
              <button onClick={() => setRestockModal(null)} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:32, height:32, fontSize:15, cursor:"pointer", color:"#dc2626", fontWeight:900 }}>✕</button>
            </div>

            <div style={{ background:"#f0f7f0", border:"1px solid #c8dfc8", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:28 }}>{getCategoryEmoji(restockModal.category)}</span>
              <div>
                <div style={{ fontWeight:800, color:DARK_GREEN, fontSize:15 }}>{restockModal.name}</div>
                <div style={{ fontSize:12, color:"#4b6358", fontFamily:"sans-serif", marginTop:2 }}>
                  Current: <strong style={{ color:Number(restockModal.quantity)===0?"#dc2626":"#d97706" }}>{restockModal.quantity} {restockModal.unit}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:800, color:"#4b6358", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:7 }}>ADD QUANTITY ({restockModal.unit})</label>
              <div style={{ display:"flex", gap:8 }}>
                <input className="pr-inp" style={{ ...INP, flex:1 }} type="number" min="0.01" step="0.01"
                  placeholder={`e.g. 10 ${restockModal.unit}`} value={restockQty}
                  onChange={e => setRestockQty(e.target.value)} autoFocus/>
                <div style={{ background:"#f0f5f0", border:"1.5px solid #dde8dd", borderRadius:10, padding:"11px 14px", fontWeight:700, color:DARK_GREEN, fontSize:14, fontFamily:"sans-serif" }}>
                  {restockModal.unit}
                </div>
              </div>
            </div>

            {restockQty && !isNaN(parseFloat(restockQty)) && parseFloat(restockQty)>0 && (
              <div style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#065f46", fontFamily:"sans-serif", marginBottom:18 }}>
                ✅ New total: <strong>{(Number(restockModal.quantity)||0)+parseFloat(restockQty)} {restockModal.unit}</strong>
              </div>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setRestockModal(null)} style={{ background:"white", border:"1.5px solid #dde8dd", borderRadius:10, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", color:"#4b6358" }}>Cancel</button>
              <button onClick={handleRestock} style={{ background:DARK_GREEN, color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"Georgia,serif" }}>Add Stock</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}