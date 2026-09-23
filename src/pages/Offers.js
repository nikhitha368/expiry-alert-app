import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { Toast, useToast } from "../components/Toast";
import { getDaysLeft, getDiscount, getDiscountedPrice, formatCurrency, getCategoryEmoji } from "../utils";

const DG = "#014421", G = "#1a7a45", CREAM = "#f5f0e8";

export default function Offers({ user, userRole }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filterCat,      setFilterCat]      = useState("all");
  const [filterDiscount, setFilterDiscount] = useState("all");
  const [filterDays,     setFilterDays]     = useState("all");
  const [sortBy,         setSortBy]         = useState("default");
  const [buyModal,       setBuyModal]       = useState(null);
  const [buying,         setBuying]         = useState(false);
  const { toasts, addToast, removeToast }   = useToast();
  const hasLoaded = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), { includeMetadataChanges: false }, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => { const d = getDaysLeft(p.expiry); return d !== null && d >= 0 && d <= 15 && Number(p.quantity) > 0; });
      setProducts(items);
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    });
    return unsub;
  }, []);

  const cats = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);

  const displayed = useMemo(() => {
    let d = [...products];
    if (filterCat !== "all") d = d.filter(p => p.category === filterCat);
    if (filterDiscount !== "all") d = d.filter(p => {
      const pct = getDiscount(getDaysLeft(p.expiry), p.category);
      if (filterDiscount === "50") return pct >= 45;
      if (filterDiscount === "40") return pct >= 35 && pct < 45;
      if (filterDiscount === "25") return pct >= 20 && pct < 35;
      if (filterDiscount === "10") return pct < 20;
      return true;
    });
    if (filterDays !== "all") d = d.filter(p => {
      const days = getDaysLeft(p.expiry);
      if (filterDays === "today")  return days <= 1;
      if (filterDays === "3days")  return days >= 2 && days <= 3;
      if (filterDays === "week")   return days >= 4 && days <= 7;
      if (filterDays === "15days") return days >= 8 && days <= 15;
      return true;
    });
    if (sortBy === "discount")   d.sort((a,b) => getDiscount(getDaysLeft(b.expiry),b.category) - getDiscount(getDaysLeft(a.expiry),a.category));
    if (sortBy === "price-low")  d.sort((a,b) => getDiscountedPrice(+a.price,getDaysLeft(a.expiry),a.category) - getDiscountedPrice(+b.price,getDaysLeft(b.expiry),b.category));
    if (sortBy === "price-high") d.sort((a,b) => getDiscountedPrice(+b.price,getDaysLeft(b.expiry),b.category) - getDiscountedPrice(+a.price,getDaysLeft(a.expiry),a.category));
    if (sortBy === "expiry")     d.sort((a,b) => getDaysLeft(a.expiry) - getDaysLeft(b.expiry));
    return d;
  }, [products, filterCat, filterDiscount, filterDays, sortBy]);

  const handleBuy = async () => {
    if (!buyModal) return;
    const { product, qty } = buyModal;
    const n = Number(qty);
    if (!n || n <= 0)         return addToast("Enter a valid quantity.", "error");
    if (n > +product.quantity) return addToast(`Only ${product.quantity} ${product.unit} available.`, "error");
    setBuying(true);
    try {
      await updateDoc(doc(db, "products", product.id), { quantity: +product.quantity - n });
      const days = getDaysLeft(product.expiry);
      const sp   = getDiscountedPrice(+product.price, days);
      await addDoc(collection(db, "sales"), {
        productId: product.id, productName: product.name, category: product.category,
        originalPrice: +product.price, salePrice: sp,
        discountPercent: getDiscount(days, product.category),
        quantityPurchased: n, unit: product.unit, totalAmount: sp * n,
        buyerId: user.uid, buyerEmail: user.email, sellerId: product.userId,
        expiryDate: product.expiry, purchasedAt: serverTimestamp(),
      });
      addToast(`✅ Purchased ${n} ${product.unit} of ${product.name}!`, "success");
      setBuyModal(null);
    } catch { addToast("Purchase failed. Try again.", "error"); }
    finally { setBuying(false); }
  };

  const urgencyBg    = d => d <= 1 ? "#fef2f2" : d <= 3 ? "#fff7ed" : d <= 7 ? "#fffbeb" : "#f0fdf4";
  const urgencyColor = d => d <= 1 ? "#dc2626" : d <= 3 ? "#ea580c" : d <= 7 ? "#d97706" : "#16a34a";
  const urgencyLabel = d => d === 0 ? "Expires TODAY!" : d === 1 ? "Last day!" : `${d} days left`;
  const discBg       = p => p >= 45 ? "#dc2626" : p >= 35 ? "#ea580c" : p >= 20 ? "#d97706" : "#16a34a";
  const hasFilters   = filterCat !== "all" || filterDiscount !== "all" || filterDays !== "all";

  return (
    <div style={{ minHeight:"100vh", background:CREAM, fontFamily:"Georgia,serif" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes spin{to{transform:rotate(360deg)}}

        .sk{background:linear-gradient(90deg,#eef3ee 25%,#e4ece4 50%,#eef3ee 75%);
          background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:14px;}

        /* NAV */
        .on{background:${DG};height:62px;padding:0 48px;display:flex;
          align-items:center;justify-content:space-between;
          position:sticky;top:0;z-index:200;box-shadow:0 2px 20px rgba(1,68,33,.35);}
        .on-logo{font-size:21px;font-weight:900;color:white;letter-spacing:-1px;}
        .on-logo em{color:#86efac;font-style:normal;}
        .on-pill{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);
          color:white;border-radius:100px;padding:3px 13px;font-size:12px;
          font-weight:700;font-family:sans-serif;}
        .on-btn{background:transparent;border:1.5px solid rgba(255,255,255,.3);
          color:rgba(255,255,255,.85);border-radius:8px;padding:6px 16px;
          font-size:12px;font-weight:700;cursor:pointer;font-family:sans-serif;transition:all .15s;}
        .on-btn:hover{background:rgba(255,255,255,.12);color:white;}
        .on-btn.red{border-color:rgba(252,165,165,.5);color:#fca5a5;}
        .on-btn.red:hover{background:rgba(220,38,38,.2);}
        .on-btn.sky{border-color:rgba(147,197,253,.45);color:#93c5fd;}

        /* FILTER BAR */
        .of{display:flex;gap:10px;align-items:center;flex-wrap:wrap;
          background:white;border-radius:16px;border:2px solid #c8dcc8;
          padding:14px 20px;margin-bottom:22px;
          box-shadow:0 2px 10px rgba(1,68,33,.06);}
        .os{background:#f7fbf7;border:1.5px solid #c0d8c0;border-radius:10px;
          padding:9px 14px;font-size:13px;color:${DG};font-family:sans-serif;
          font-weight:600;cursor:pointer;outline:none;}
        .os:focus{border-color:${G};}
        .os-sort{background:${DG};color:white;border:none;border-radius:10px;
          padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;
          font-family:sans-serif;outline:none;}
        .os-reset{background:#fff0f0;border:1.5px solid #fca5a5;color:#dc2626;
          border-radius:8px;padding:8px 15px;font-size:12px;font-weight:800;
          cursor:pointer;font-family:sans-serif;}

        /* GRID */
        .og{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:18px;}

        /* CARD */
        .oc{background:white;border-radius:18px;border:2px solid #c8dcc8;overflow:hidden;
          box-shadow:0 2px 14px rgba(1,68,33,.08);
          transition:transform .18s,box-shadow .18s;display:flex;flex-direction:column;}
        .oc:hover{transform:translateY(-5px);box-shadow:0 14px 36px rgba(1,68,33,.16);}
        .oc-img{width:100%;height:170px;object-fit:cover;display:block;}
        .oc-ph{width:100%;height:170px;background:linear-gradient(135deg,#e8f5ee,#d4edd8);
          display:flex;align-items:center;justify-content:center;font-size:60px;
          filter:saturate(1.3);}
        .oc-body{padding:14px 16px 16px;flex:1;display:flex;flex-direction:column;}
        .oc-name{font-size:16px;font-weight:900;color:${DG};margin-bottom:4px;}
        .oc-cat{display:inline-flex;align-items:center;gap:4px;
          background:#d4f0e2;border:1.5px solid #8cc8a8;border-radius:100px;
          padding:3px 11px;font-size:12px;color:${DG};font-weight:700;
          font-family:sans-serif;margin-bottom:10px;filter:saturate(1.3);}
        .oc-prices{display:flex;align-items:baseline;gap:7px;margin-bottom:10px;}
        .oc-orig{text-decoration:line-through;color:#9ca3af;font-size:13px;font-family:sans-serif;}
        .oc-sale{font-size:22px;font-weight:900;color:${DG};letter-spacing:-1px;}
        .oc-unit{font-size:12px;color:#6b7280;font-family:sans-serif;}
        .oc-pills{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
        .oc-pill{font-size:11px;font-weight:800;font-family:sans-serif;
          border-radius:8px;padding:5px 10px;}
        .oc-buy{background:${DG};color:white;border:none;border-radius:12px;
          padding:12px;font-size:14px;font-weight:800;cursor:pointer;width:100%;
          font-family:Georgia,serif;transition:all .18s;display:flex;
          align-items:center;justify-content:center;gap:8px;margin-top:auto;}
        .oc-buy:hover{background:${G};transform:translateY(-1px);
          box-shadow:0 6px 20px rgba(1,68,33,.28);}
        .oc-buy:disabled{background:#9ca3af;cursor:not-allowed;transform:none;box-shadow:none;}
        .oc-disc{position:absolute;top:10px;right:10px;color:white;
          border-radius:9px;padding:5px 11px;font-size:13px;font-weight:900;
          font-family:sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.22);}
        .oc-low{position:absolute;bottom:10px;left:10px;background:#dc2626;color:white;
          border-radius:7px;padding:3px 10px;font-size:11px;font-weight:800;font-family:sans-serif;}

        /* MODAL */
        .om-ov{position:fixed;inset:0;background:rgba(1,44,21,.5);z-index:1000;
          display:flex;align-items:center;justify-content:center;
          backdrop-filter:blur(4px);padding:20px;}
        .om{background:#faf7f2;border-radius:22px;padding:30px;width:100%;max-width:440px;
          box-shadow:0 28px 72px rgba(1,68,33,.3);animation:fadeUp .22s ease;
          border:1.5px solid #ddd5c8;}
        .om-close{background:#fee2e2;border:none;border-radius:8px;width:32px;height:32px;
          font-size:15px;cursor:pointer;color:#dc2626;font-weight:900;}
        .om-inp{width:100%;box-sizing:border-box;background:#fffdf8;border:1.5px solid #c8b89a;
          border-radius:10px;color:#111;padding:10px 14px;font-size:15px;
          font-family:sans-serif;outline:none;}
        .om-inp:focus{border-color:${G};}
        .om-qbtn{width:38px;height:38px;border-radius:9px;background:#e8f5ee;
          border:1.5px solid #c8dcc8;font-size:18px;cursor:pointer;color:${DG};
          font-weight:900;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .spin-r{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.3);
          border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
      `}</style>

      {/* ── NAV ── */}
      <nav className="on">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span className="on-logo">Stock<em>Sense</em></span>
          <span className="on-pill">🛍️ Customer Offers</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"rgba(255,255,255,.55)", fontSize:12, fontFamily:"sans-serif" }}>👤 {user?.email}</span>
          <button className="on-btn sky" onClick={() => navigate("/purchases")}>🛒 My Purchases</button>
          {userRole === "admin" && <button className="on-btn" onClick={() => navigate("/dashboard")}>⚙️ Admin</button>}
          <button className="on-btn red" onClick={async () => { await signOut(auth); navigate("/"); }}>Logout</button>
        </div>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div style={{ padding:"32px 48px 0" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:G, letterSpacing:2.5, fontFamily:"sans-serif", marginBottom:8 }}>STOCKSENSE · CUSTOMER STORE</div>
            <h1 style={{ fontSize:"clamp(26px,3vw,42px)", fontWeight:900, color:DG, letterSpacing:-2, margin:"0 0 6px", lineHeight:1 }}>🏷️ Clearance Offers</h1>
            <p style={{ fontSize:14, color:"#4b6358", margin:0, fontFamily:"sans-serif" }}>Fresh products near expiry — massive discounts, still perfectly safe!</p>
          </div>
          {/* Live count badge */}
          <div style={{ background:"white", border:`2px solid #c8dcc8`, borderRadius:14, padding:"12px 20px", textAlign:"center", boxShadow:"0 2px 10px rgba(1,68,33,.08)" }}>
            <div style={{ fontSize:32, fontWeight:900, color:DG, fontFamily:"Georgia,serif", lineHeight:1 }}>{products.length}</div>
            <div style={{ fontSize:10, color:G, fontFamily:"sans-serif", fontWeight:800, letterSpacing:1.5, marginTop:3 }}>LIVE OFFERS</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"center", marginTop:4 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#16a34a", animation:"pulse 1.8s infinite" }}/>
              <span style={{ fontSize:10, color:"#6b7280", fontFamily:"sans-serif", fontWeight:600 }}>Updates live</span>
            </div>
          </div>
        </div>

        {/* ── DISCOUNT TIERS ── */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {[
            { pct:"50% OFF", label:"Expires Today",  reason:"Still safe today!",   bg:"#fef2f2", border:"#fca5a5", pctC:"#dc2626", lC:"#991b1b" },
            { pct:"40% OFF", label:"2–3 Days Left",  reason:"Very fresh, act fast",bg:"#fff7ed", border:"#fdba74", pctC:"#ea580c", lC:"#9a3412" },
            { pct:"25% OFF", label:"4–7 Days Left",  reason:"Good deal, grab it",  bg:"#fffbeb", border:"#fde68a", pctC:"#d97706", lC:"#78350f" },
            { pct:"10% OFF", label:"8–15 Days Left", reason:"Early bird discount", bg:"#f0fdf4", border:"#86efac", pctC:"#16a34a", lC:"#14532d" },
          ].map(t => (
            <div key={t.pct} style={{ flex:1, minWidth:155, background:t.bg, border:`2px solid ${t.border}`, borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 2px 8px rgba(0,0,0,.05)", transition:"transform .15s,box-shadow .15s", cursor:"default" }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 18px rgba(0,0,0,.1)"}}
              onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.05)"}}>
              <div style={{ fontSize:26, fontWeight:900, color:t.pctC, fontFamily:"Georgia,serif", lineHeight:1, letterSpacing:-1, flexShrink:0 }}>{t.pct}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:t.lC, fontFamily:"sans-serif" }}>{t.label}</div>
                <div style={{ fontSize:11, color:"#6b7280", fontFamily:"sans-serif", marginTop:1, fontStyle:"italic" }}>{t.reason}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER BAR ── */}
        <div className="of">
          <select className="os" value={filterCat}      onChange={e=>setFilterCat(e.target.value)}>
            <option value="all">🗂️ All Categories</option>
            {cats.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="os" value={filterDiscount} onChange={e=>setFilterDiscount(e.target.value)}>
            <option value="all">🏷️ Any Discount</option>
            <option value="50">🔥 50% OFF</option>
            <option value="40">⚡ 40% OFF</option>
            <option value="25">🎯 25% OFF</option>
            <option value="10">🌱 10% OFF</option>
          </select>
          <select className="os" value={filterDays}     onChange={e=>setFilterDays(e.target.value)}>
            <option value="all">⏰ Any Urgency</option>
            <option value="today">🚨 Expires Today</option>
            <option value="3days">⚡ Within 3 Days</option>
            <option value="week">📅 Within a Week</option>
            <option value="15days">🌱 Within 15 Days</option>
          </select>
          <select className="os-sort" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="default">Sort: Default</option>
            <option value="discount">Highest Discount</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="expiry">Expiring Soonest</option>
          </select>
          {hasFilters && <button className="os-reset" onClick={()=>{setFilterCat("all");setFilterDiscount("all");setFilterDays("all");}}>✕ Reset</button>}
          <div style={{ marginLeft:"auto", fontSize:14, color:"#4b6358", fontFamily:"sans-serif", fontWeight:700 }}>
            <span style={{ fontSize:20, fontWeight:900, color:DG, fontFamily:"Georgia,serif" }}>{displayed.length}</span> offer{displayed.length!==1?"s":""} available
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      <div style={{ padding:"0 48px 64px" }}>
        {loading ? (
          <div className="og">{[0,1,2,3,4,5,6,7].map(i=><div key={i} className="sk" style={{height:360}}/>)}</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign:"center", padding:"72px 0", background:"white", borderRadius:18, border:"2px solid #c8dcc8" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🛍️</div>
            <h3 style={{ color:DG, margin:"0 0 8px", fontSize:20 }}>No offers right now</h3>
            <p style={{ color:"#9ca3af", fontSize:14, fontFamily:"sans-serif" }}>Check back soon — new clearance items appear automatically.</p>
          </div>
        ) : (
          <div className="og">
            {displayed.map(p => {
              const days     = getDaysLeft(p.expiry);
              const pct      = getDiscount(days, p.category);
              const salePrice= getDiscountedPrice(+p.price, days, p.category);
              const qty      = +p.quantity;
              const isLow    = qty <= 3;
              return (
                <div key={p.id} className="oc">
                  <div style={{ position:"relative" }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="oc-img" onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
                      : null}
                    <div className="oc-ph" style={{ display:p.imageUrl?"none":"flex" }}>{getCategoryEmoji(p.category)}</div>
                    <div className="oc-disc" style={{ background:discBg(pct) }}>{pct}% OFF</div>
                    {isLow && <div className="oc-low">🔥 Only {qty} left!</div>}
                  </div>
                  <div className="oc-body">
                    <div className="oc-name">{p.name}</div>
                    <span className="oc-cat">{getCategoryEmoji(p.category)} {p.category}</span>
                    <div className="oc-prices">
                      <span className="oc-orig">{formatCurrency(p.price)}</span>
                      <span className="oc-sale">{formatCurrency(salePrice)}</span>
                      <span className="oc-unit">/{p.unit}</span>
                    </div>
                    <div className="oc-pills">
                      <span className="oc-pill" style={{ background:urgencyBg(days), color:urgencyColor(days) }}>⏰ {urgencyLabel(days)}</span>
                      <span className="oc-pill" style={{ background:isLow?"#fef2f2":"#f0f7f2", color:isLow?"#dc2626":"#4b6358", border:`1px solid ${isLow?"#fca5a5":"#c8dcc8"}` }}>
                        {isLow?`⚠️ ${qty} ${p.unit} left`:`📦 ${qty} ${p.unit}`}
                      </span>
                    </div>
                    <button className="oc-buy" onClick={()=>setBuyModal({product:p,qty:1})}>
                      🛒 Buy Now — {formatCurrency(salePrice)}/{p.unit}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BUY MODAL ── */}
      {buyModal && (()=>{
        const p=buyModal.product, days=getDaysLeft(p.expiry), pct=getDiscount(days,p.category);
        const sp=getDiscountedPrice(+p.price,days,p.category), qty=+buyModal.qty||0, maxQty=+p.quantity;
        const over=qty>maxQty;
        return (
          <div className="om-ov" onClick={e=>{if(e.target===e.currentTarget&&!buying)setBuyModal(null);}}>
            <div className="om">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <span style={{ fontSize:18, fontWeight:900, color:DG }}>🛒 Confirm Purchase</span>
                {!buying && <button className="om-close" onClick={()=>setBuyModal(null)}>✕</button>}
              </div>
              {/* Product summary */}
              <div style={{ background:"#f0f7f2", border:"2px solid #c8dcc8", borderRadius:14, padding:14, marginBottom:18, display:"flex", gap:12, alignItems:"center" }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name} style={{ width:58,height:58,objectFit:"cover",borderRadius:9,border:"1.5px solid #c8dcc8",flexShrink:0 }} onError={e=>e.target.style.display="none"}/>
                  : <div style={{ width:58,height:58,background:"#e8f5ee",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,border:"1.5px solid #c8dcc8",flexShrink:0,filter:"saturate(1.4)" }}>{getCategoryEmoji(p.category)}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:900,color:DG,marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:12,color:"#4b6358",fontFamily:"sans-serif",marginBottom:6 }}>{p.category} · Expires {p.expiry}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    <span style={{ textDecoration:"line-through",color:"#9ca3af",fontSize:12,fontFamily:"sans-serif" }}>{formatCurrency(p.price)}</span>
                    <span style={{ fontSize:16,fontWeight:900,color:G,fontFamily:"Georgia,serif" }}>{formatCurrency(sp)}/{p.unit}</span>
                    <span style={{ background:discBg(pct),color:"white",borderRadius:100,padding:"2px 9px",fontSize:11,fontWeight:800,fontFamily:"sans-serif" }}>{pct}% OFF</span>
                  </div>
                </div>
              </div>
              {/* Qty */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#4b6358",fontFamily:"sans-serif",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Quantity ({maxQty} {p.unit} available)</div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <button className="om-qbtn" onClick={()=>setBuyModal(v=>({...v,qty:Math.max(0.5,+v.qty-1)}))}>−</button>
                  <input type="number" className="om-inp" min="0.01" max={maxQty} step={["ml","g"].includes(p.unit)?"1":"0.5"}
                    value={buyModal.qty} onChange={e=>setBuyModal(v=>({...v,qty:e.target.value}))}
                    style={{ textAlign:"center",fontWeight:900,fontSize:17 }}/>
                  <button className="om-qbtn" onClick={()=>setBuyModal(v=>({...v,qty:Math.min(maxQty,+v.qty+1)}))}>+</button>
                  <span style={{ background:"#e8f5ee",border:"1.5px solid #c8dcc8",borderRadius:9,padding:"9px 14px",fontWeight:800,color:DG,fontFamily:"sans-serif",flexShrink:0 }}>{p.unit}</span>
                </div>
              </div>
              {/* Total */}
              <div style={{ background:over?"#fef2f2":"#e8f5ee", border:`2px solid ${over?"#fca5a5":"#a8d4bc"}`, borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:over?10:18 }}>
                <span style={{ fontSize:13,color:"#4b6358",fontFamily:"sans-serif",fontWeight:700 }}>Total Amount</span>
                <span style={{ fontSize:22,fontWeight:900,color:over?"#dc2626":G,fontFamily:"Georgia,serif" }}>{formatCurrency(sp*qty)}</span>
              </div>
              {over && <div style={{ background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:10,padding:"9px 14px",marginBottom:16,fontSize:13,color:"#dc2626",fontFamily:"sans-serif",fontWeight:700 }}>⚠️ Only {maxQty} {p.unit} available</div>}
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setBuyModal(null)} disabled={buying} style={{ flex:1,background:"white",border:"1.5px solid #c8b89a",borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"sans-serif",color:"#4b6358" }}>Cancel</button>
                <button onClick={handleBuy} disabled={buying||qty<=0||over}
                  style={{ flex:2,background:buying||qty<=0||over?"#9ca3af":DG,color:"white",border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:900,cursor:buying||qty<=0||over?"not-allowed":"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .15s" }}>
                  {buying?<><span className="spin-r"/>Processing...</>:`✅ Confirm — ${formatCurrency(sp*qty)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}