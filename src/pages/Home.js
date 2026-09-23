import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const GREEN       = "#1a9e5f";
const DARK_GREEN  = "#0e6e40";
const TEXT_DARK   = "#111111";
const TEXT_MID    = "#444444";
const HERO_BG     = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80";

const SEC_TRACK    = "#0e6e40";
const SEC_MANAGE   = "#f5f0e8";
const SEC_SELL     = "#ffffff";
const SEC_CYCLE    = "#f0ebe0";
const SEC_FEATURES = "#f7f7f5";
const SEC_TESTI    = "#ffffff";

const FLOATING = [
  { src:"https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80", label:"40% OFF · Tomatoes", top:"8%",  left:"52%", size:144, anim:"f0" },
  { src:"https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",    label:"35% OFF · Dairy",   top:"54%", left:"49%", size:122, anim:"f1" },
  { src:"https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&q=80", label:"50% OFF · Grapes",  top:"16%", left:"78%", size:116, anim:"f2" },
  { src:"https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&q=80",    label:"25% OFF · Bakery",  top:"64%", left:"75%", size:108, anim:"f3" },
];

const NODES = [
  { emoji:"📦", label:"Admin adds product",    sub:"with expiry date",     baseDeg:180, bg:"#064e3b", border:"#34d399", glow:"#6ee7b7" },
  { emoji:"🤖", label:"Auto-discount applied", sub:"as expiry approaches", baseDeg:270, bg:"#78350f", border:"#fbbf24", glow:"#fde68a" },
  { emoji:"🛒", label:"Customer buys",         sub:"at discounted price",  baseDeg:0,   bg:"#1e3a5f", border:"#60a5fa", glow:"#bfdbfe" },
  { emoji:"📊", label:"Stock updated",         sub:"in real time",         baseDeg:90,  bg:"#4c1d95", border:"#a78bfa", glow:"#ddd6fe" },
];

const TrackMockup = () => (
  <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",fontFamily:"sans-serif"}}>
    <div style={{fontSize:15,fontWeight:720,color:"#111",marginBottom:14}}>📦 Products</div>
    {[
      {name:"Full Cream Milk",cat:"Dairy",      status:"Expiring Soon",color:"#ef4444",days:"1 day left" },
      {name:"Tomatoes",       cat:"Vegetables", status:"Expiring Soon",color:"#f59e0b",days:"4 days left"},
      {name:"Chicken Breast", cat:"Meat",       status:"Expiring Soon",color:"#f97316",days:"2 days left"},
      {name:"Basmati Rice",   cat:"Groceries",  status:"Safe",         color:"#1a9e5f",days:"300 days"   },
    ].map(p=>(
      <div key={p.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f0f0f0"}}>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{p.name}</div>
          <div style={{fontSize:11,color:"#999"}}>{p.cat} · {p.days}</div>
        </div>
        <span style={{background:p.color+"18",color:p.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{p.status}</span>
      </div>
    ))}
  </div>
);

const ManageMockup = () => (
  <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.10)",fontFamily:"sans-serif"}}>
    <div style={{fontSize:15,fontWeight:720,color:"#111",marginBottom:14}}>🤖 Auto Discount Engine</div>
    {[
      {days:"1 day left",    discount:"50% OFF",color:"#ef4444",product:"Pav Bun · Bakery"      },
      {days:"2–3 days left", discount:"40% OFF",color:"#f97316",product:"Strawberry · Fruits"    },
      {days:"4–7 days left", discount:"25% OFF",color:"#f59e0b",product:"Tomatoes · Vegetables"  },
      {days:"8–15 days left",discount:"10% OFF",color:"#1a9e5f",product:"Cheese Slices · Dairy"  },
    ].map(d=>(
      <div key={d.days} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
        <span style={{background:d.color+"18",color:d.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,minWidth:76,textAlign:"center"}}>{d.discount}</span>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#111"}}>{d.product}</div>
          <div style={{fontSize:11,color:"#999"}}>{d.days}</div>
        </div>
      </div>
    ))}
  </div>
);

const SellMockup = () => (
  <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.08)",fontFamily:"sans-serif"}}>
    <div style={{fontSize:15,fontWeight:720,color:"#111",marginBottom:14}}>🛒 Clearance Offers</div>
    {[
      {name:"Fish (Rohu)", price:"₹110", orig:"₹220",badge:"50% OFF",color:"#ef4444",img:"🐟"},
      {name:"Skimmed Milk",price:"₹15.6",orig:"₹26", badge:"40% OFF",color:"#f97316",img:"🥛"},
      {name:"Beetroot",    price:"₹22.5",orig:"₹30", badge:"25% OFF",color:"#f59e0b",img:"🥕"},
    ].map(p=>(
      <div key={p.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>{p.img}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{p.name}</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#1a9e5f"}}>{p.price}</span>
              <span style={{fontSize:11,color:"#bbb",textDecoration:"line-through"}}>{p.orig}</span>
            </div>
          </div>
        </div>
        <span style={{background:p.color+"18",color:p.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800}}>{p.badge}</span>
      </div>
    ))}
  </div>
);

/* ── Shopping bag SVG logo ── */
const BagLogo = ({ size, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <path d="M7 13h22l-2.5 16H9.5L7 13z" stroke={stroke} strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
    <path d="M13 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
    <circle cx="13.5" cy="21" r="1.7" fill="#ff4d4d"/>
    <circle cx="18"   cy="21" r="1.7" fill="#ff4d4d"/>
    <circle cx="22.5" cy="21" r="1.7" fill="#ff4d4d"/>
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const [scrollY,     setScrollY]     = useState(0);
  const [activeTab,   setActiveTab]   = useState("track");
  const [tabVisible,  setTabVisible]  = useState(false);
  const [activeCycle, setActiveCycle] = useState(0);
  const [orbitDeg,    setOrbitDeg]    = useState(0);
  const [manualTab,   setManualTab]   = useState(false);

  const trackRef   = useRef(null);
  const manageRef  = useRef(null);
  const sellRef    = useRef(null);
  const tabZoneRef = useRef(null);
  const rafRef     = useRef(null);
  const degRef     = useRef(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setTabVisible(e.isIntersecting), { threshold:0.03 });
    if (tabZoneRef.current) obs.observe(tabZoneRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (manualTab) return;
    const pairs = [
      { ref:trackRef,  id:"track"  },
      { ref:manageRef, id:"manage" },
      { ref:sellRef,   id:"sell"   },
    ];
    const obs = pairs.map(({ ref, id }) => {
      const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActiveTab(id); }, { threshold:0.45 });
      if (ref.current) o.observe(ref.current);
      return o;
    });
    return () => obs.forEach(o => o.disconnect());
  }, [manualTab]);

  useEffect(() => {
    const t = setInterval(() => setActiveCycle(p => (p+1) % NODES.length), 1800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const step = () => {
      degRef.current = (degRef.current + 0.22) % 360;
      setOrbitDeg(degRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleTabClick = (id) => {
    setActiveTab(id);
    setManualTab(true);
    const map = { track:trackRef, manage:manageRef, sell:sellRef };
    map[id]?.current?.scrollIntoView({ behavior:"smooth", block:"start" });
    setTimeout(() => setManualTab(false), 1600);
  };

  const navScrolled = scrollY > 60;

  return (
    <div style={{ fontFamily:"Georgia,serif", background:"white", color:TEXT_DARK, overflowX:"hidden" }}>
      <style>{`
        @keyframes f0{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(-6deg) translateY(-18px)}}
        @keyframes f1{0%,100%{transform:rotate(5deg)  translateY(0)}50%{transform:rotate(5deg)  translateY(-14px)}}
        @keyframes f2{0%,100%{transform:rotate(8deg)  translateY(0)}50%{transform:rotate(8deg)  translateY(-20px)}}
        @keyframes f3{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-12px)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.55)}50%{box-shadow:0 0 0 14px rgba(255,255,255,0)}}
        .fc:hover{transform:translateY(-6px)!important;box-shadow:0 18px 48px rgba(0,0,0,0.12)!important}
        .hcta:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(26,158,95,0.5)!important}
        .gcta:hover{background:rgba(255,255,255,0.15)!important}
        .tp{font-family:Georgia,serif;font-style:italic;font-weight:700;border:none;cursor:pointer;transition:all 0.28s}
      `}</style>

      {/* ══ NAV ══ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:1000,
        background: navScrolled ? "#0a3d22" : "transparent",
        borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.1)" : "none",
        backdropFilter: navScrolled ? "blur(12px)" : "none",
        padding:"0 60px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"background 0.4s ease"
      }}>
        {/* Logo: shopping bag + StockSense */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <BagLogo size={36} stroke="white" />
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-0.5, color:"white", fontFamily:"Georgia,serif" }}>
            Stock<span style={{ color: navScrolled ? "#4ade80" : "#7fffc4" }}>Sense</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => navigate("/login")} style={{
            background:"transparent", border:"1.5px solid rgba(255,255,255,0.5)",
            borderRadius:100, padding:"10px 26px", fontSize:14, fontWeight:600,
            cursor:"pointer", color:"white", fontFamily:"sans-serif"
          }}>Sign In</button>
          <button onClick={() => navigate("/register")} style={{
            background:GREEN, border:"none", borderRadius:100, padding:"10px 26px",
            fontSize:14, fontWeight:700, cursor:"pointer", color:"white", fontFamily:"sans-serif"
          }}>Sign Up Now</button>
        </div>
      </nav>

      {/* ══ FLOATING TAB PILL ══ */}
      <div style={{
        position:"fixed", top:76, left:0, right:0, zIndex:90,
        display:"flex", justifyContent:"center",
        opacity: tabVisible ? 1 : 0,
        pointerEvents: tabVisible ? "auto" : "none",
        transform: tabVisible ? "translateY(0)" : "translateY(-12px)",
        transition:"opacity 0.3s, transform 0.3s"
      }}>
        <div style={{
          display:"inline-flex", background:"#3d3d2e",
          borderRadius:100, padding:5, gap:2,
          boxShadow:"0 8px 32px rgba(0,0,0,0.35)",
        }}>
          {[{id:"track",label:"Track"},{id:"manage",label:"Manage"},{id:"sell",label:"Sell"}].map(t=>(
            <button key={t.id} className="tp" onClick={() => handleTabClick(t.id)} style={{
              background: activeTab===t.id ? GREEN : "transparent",
              color: activeTab===t.id ? "white" : "rgba(255,255,255,0.6)",
              borderRadius:100, padding:"12px 38px", fontSize:16,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══ HERO ══ */}
      <section style={{
        minHeight:"100vh",
        background:`linear-gradient(135deg,rgba(0,0,0,0.6) 0%,rgba(14,110,64,0.55) 100%),url(${HERO_BG}) center/cover no-repeat`,
        display:"flex", alignItems:"center",
        padding:"120px 60px 80px", position:"relative", overflow:"hidden"
      }}>
        <div style={{ flex:"0 0 48%", zIndex:2 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(127,255,196,0.15)", border:"1px solid rgba(127,255,196,0.3)",
            borderRadius:100, padding:"6px 16px", fontSize:12,
            color:"#7fffc4", fontWeight:700, marginBottom:28, letterSpacing:1.5, fontFamily:"sans-serif"
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#7fffc4", display:"inline-block" }}/>
            SMART INVENTORY · ZERO WASTE
          </div>
          <h1 style={{ fontSize:"clamp(48px,6.5vw,86px)", fontWeight:900, lineHeight:1.0, color:"white", margin:"0 0 6px", letterSpacing:-3 }}>
            Turn expiring<br/>stock into
          </h1>
          <h1 style={{ fontSize:"clamp(48px,6.5vw,86px)", fontWeight:900, lineHeight:1.0, color:"#7fffc4", margin:"0 0 28px", letterSpacing:-3 }}>
            profit.
          </h1>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.8)", lineHeight:1.8, maxWidth:420, marginBottom:44, fontFamily:"sans-serif" }}>
            StockSense automatically detects near-expiry products and applies smart discounts — so customers buy before stock goes to waste.
          </p>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:48 }}>
            <button className="hcta" onClick={() => navigate("/register")} style={{
              background:GREEN, color:"white", border:"none", borderRadius:100,
              padding:"16px 36px", fontSize:16, fontWeight:700, cursor:"pointer",
              boxShadow:"0 8px 28px rgba(26,158,95,0.45)", transition:"all 0.25s", fontFamily:"sans-serif"
            }}>Get Started Free →</button>
            <button className="gcta" onClick={() => navigate("/login")} style={{
              background:"rgba(255,255,255,0.1)", color:"white",
              border:"1.5px solid rgba(255,255,255,0.35)",
              borderRadius:100, padding:"16px 36px", fontSize:16, fontWeight:600,
              cursor:"pointer", transition:"all 0.25s", fontFamily:"sans-serif"
            }}>Sign In</button>
          </div>
          <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
            {["✅ Real-time tracking","🤖 Auto discounts","📊 Live analytics"].map(b=>(
              <span key={b} style={{ fontSize:13, color:"rgba(255,255,255,0.65)", fontFamily:"sans-serif" }}>{b}</span>
            ))}
          </div>
        </div>
        <div style={{ flex:1, position:"relative", minHeight:480 }}>
          {FLOATING.map((img,i)=>(
            <div key={i} style={{ position:"absolute", top:img.top, left:img.left, animation:`${img.anim} ${3.6+i*0.5}s ease-in-out infinite`, zIndex:2 }}>
              <div style={{ width:img.size, height:img.size, borderRadius:20, overflow:"hidden", boxShadow:"0 20px 56px rgba(0,0,0,0.45)", border:"3px solid rgba(255,255,255,0.25)" }}>
                <img src={img.src} alt={img.label}
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                  onError={e=>{
                    const fallback={Tomatoes:"🍅",Dairy:"🥛",Grapes:"🍇",Bakery:"🍞"};
                    const word=img.label.split("·")[1]?.trim()||"";
                    e.target.parentNode.style.cssText+=";background:#1a3d2b;display:flex;align-items:center;justify-content:center;";
                    e.target.parentNode.innerHTML=`<span style="font-size:52px">${fallback[word]||"🛒"}</span>`;
                  }}
                />
              </div>
              <div style={{ marginTop:8, background:"white", borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:800, color:GREEN, textAlign:"center", fontFamily:"sans-serif", boxShadow:"0 6px 16px rgba(0,0,0,0.25)" }}>{img.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ STATS STRIP — cream bg ══ */}
      <section style={{ background:"#f5f0e8", padding:"40px 60px", borderTop:"1px solid #e8e0d0", borderBottom:"1px solid #e8e0d0" }}>
        <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:24 }}>
          {[
            {value:"₹92,000Cr",label:"Food wasted annually in India"     },
            {value:"15 Days",  label:"Expiry window tracked automatically"},
            {value:"50% OFF",  label:"Maximum auto-discount applied"      },
            {value:"Real-time",label:"Stock updates after every sale"     },
          ].map(s=>(
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, fontFamily:"sans-serif", color:DARK_GREEN }}>{s.value}</div>
              <div style={{ fontSize:13, marginTop:4, fontFamily:"sans-serif", color:"#5a5a4a" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TAB ZONE ══ */}
      <div ref={tabZoneRef}>

        {/* TRACK */}
        <section ref={trackRef} style={{ background:SEC_TRACK, padding:"90px 60px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center", maxWidth:1100, margin:"0 auto" }}>
            <div>
              <div style={{ fontSize:20, fontStyle:"italic", color:"#7fffc4", fontWeight:600, marginBottom:12 }}>Track</div>
              <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)", fontWeight:900, lineHeight:1.07, letterSpacing:-2.5, color:"white", margin:"0 0 20px" }}>
                Know exactly what's<br/><span style={{ color:"#7fffc4" }}>expiring.</span>
              </h2>
              <p style={{ fontSize:16, lineHeight:1.8, color:"rgba(255,255,255,0.75)", maxWidth:400, marginBottom:36, fontFamily:"sans-serif" }}>
                StockSense scans your entire inventory in real time. Every product is automatically classified as Safe, Expiring Soon, or Expired — no manual checking ever again.
              </p>
              <button onClick={()=>navigate("/register")} style={{ background:"transparent", border:"2px solid rgba(255,255,255,0.5)", borderRadius:100, padding:"13px 32px", fontSize:15, fontWeight:700, cursor:"pointer", color:"white", fontFamily:"sans-serif" }}>
                Start tracking today ›
              </button>
            </div>
            <div style={{ transform:"perspective(1200px) rotateY(-8deg)" }}><TrackMockup/></div>
          </div>
        </section>

        {/* MANAGE */}
        <section ref={manageRef} style={{ background:SEC_MANAGE, padding:"90px 60px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center", maxWidth:1100, margin:"0 auto" }}>
            <div>
              <div style={{ fontSize:20, fontStyle:"italic", color:GREEN, fontWeight:600, marginBottom:12 }}>Manage</div>
              <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)", fontWeight:900, lineHeight:1.07, letterSpacing:-2.5, color:TEXT_DARK, margin:"0 0 20px" }}>
                Your entire inventory,<br/><span style={{ color:GREEN }}>automated.</span>
              </h2>
              <p style={{ fontSize:16, lineHeight:1.8, color:TEXT_MID, maxWidth:400, marginBottom:36, fontFamily:"sans-serif" }}>
                Auto-discounts kick in as products near expiry. Stock levels update instantly after every purchase, and low stock alerts fire before you run out.
              </p>
              <button onClick={()=>navigate("/register")} style={{ background:"transparent", border:"2px solid #333", borderRadius:100, padding:"13px 32px", fontSize:15, fontWeight:700, cursor:"pointer", color:TEXT_DARK, fontFamily:"sans-serif" }}>
                See how it works ›
              </button>
            </div>
            <div style={{ transform:"perspective(1200px) rotateY(-8deg)" }}><ManageMockup/></div>
          </div>
        </section>

        {/* SELL */}
        <section ref={sellRef} style={{ background:SEC_SELL, padding:"90px 60px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center", maxWidth:1100, margin:"0 auto" }}>
            <div>
              <div style={{ fontSize:20, fontStyle:"italic", color:GREEN, fontWeight:600, marginBottom:12 }}>Sell</div>
              <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)", fontWeight:900, lineHeight:1.07, letterSpacing:-2.5, color:TEXT_DARK, margin:"0 0 20px" }}>
                Turn expiring stock into<br/><span style={{ color:GREEN }}>revenue.</span>
              </h2>
              <p style={{ fontSize:16, lineHeight:1.8, color:TEXT_MID, maxWidth:400, marginBottom:36, fontFamily:"sans-serif" }}>
                Customers browse real-time clearance deals, filter by price, discount and urgency, and buy in one click. Every sale reduces waste and recovers lost money.
              </p>
              <button onClick={()=>navigate("/register")} style={{ background:"transparent", border:"2px solid #333", borderRadius:100, padding:"13px 32px", fontSize:15, fontWeight:700, cursor:"pointer", color:TEXT_DARK, fontFamily:"sans-serif" }}>
                Start selling in style ›
              </button>
            </div>
            <div style={{ transform:"perspective(1200px) rotateY(-8deg)" }}><SellMockup/></div>
          </div>
        </section>
      </div>

      {/* ══ CYCLE DIAGRAM ══ */}
      <section style={{ background:SEC_CYCLE, padding:"100px 60px", textAlign:"center" }}>
        <div style={{ fontSize:22, fontStyle:"italic", color:GREEN, marginBottom:14, fontFamily:"Georgia,serif" }}>How it works</div>
        <h2 style={{
          fontSize:"clamp(40px,5vw,70px)", fontWeight:900, letterSpacing:-2.5,
          maxWidth:900, margin:"0 auto 18px", lineHeight:1.1, color:TEXT_DARK, fontFamily:"Georgia,serif"
        }}>
          From adding stock to customer purchase,<br/>
          <span style={{ color:GREEN }}>fully automated.</span>
        </h2>
        <p style={{ color:"#666", maxWidth:520, margin:"0 auto 72px", fontSize:15, lineHeight:1.40, fontFamily:"sans-serif", fontWeight:400 }}>
          StockSense handles detection, discounting and selling — you only focus on restocking.
        </p>

        <div style={{ position:"relative", width:1040, height:640, margin:"0 auto" }}>
          <svg width="1040" height="640" style={{ position:"absolute", top:0, left:0 }}>
            <ellipse cx="520" cy="320" rx="420" ry="245" fill="none" stroke="#2d6a4f" strokeWidth="3.5"/>
          </svg>
          {NODES.map((n,i)=>{
            const deg = (n.baseDeg + orbitDeg) % 360;
            const rad = (deg - 90) * Math.PI / 180;
            const x   = 520 + 420 * Math.cos(rad);
            const y   = 320 + 245 * Math.sin(rad);
            const isActive = activeCycle === i;
            return (
              <div key={i} style={{ position:"absolute", left:x, top:y, transform:"translate(-50%,-50%)", textAlign:"center", zIndex:3 }}>
                <div style={{
                  width:isActive?116:98, height:isActive?116:98, borderRadius:"50%",
                  background:n.bg, border:`4px solid ${isActive?n.glow:n.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:isActive?48:40, margin:"0 auto 10px", transition:"all 0.35s ease",
                  boxShadow:isActive?`0 0 0 8px ${n.glow}50,0 10px 36px ${n.border}80`:`0 6px 20px ${n.border}40`,
                  animation:isActive?"pulse 1.6s ease infinite":"none",
                }}>{n.emoji}</div>
                <div style={{ fontSize:15, fontWeight:800, color:isActive?TEXT_DARK:"#666", lineHeight:1.35, fontFamily:"sans-serif", whiteSpace:"nowrap", transition:"color 0.3s" }}>{n.label}</div>
                <div style={{ fontSize:13, color:"#999", fontFamily:"sans-serif" }}>{n.sub}</div>
              </div>
            );
          })}
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
            <div style={{ fontSize:30, fontStyle:"italic", color:GREEN, fontFamily:"Georgia,serif", marginBottom:8 }}>Manage</div>
            <div style={{ fontSize:44, fontWeight:960, letterSpacing:-2, lineHeight:1.25, color:TEXT_DARK, fontFamily:"Georgia,serif" }}>
              Zero<br/>waste cycle
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES — bold bento card layout ══ */}
      <section style={{ background:SEC_FEATURES, padding:"90px 60px" }}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <div style={{ fontSize:20, fontStyle:"italic", color:GREEN, marginBottom:12, fontFamily:"Georgia,serif" }}>Features</div>
          <h2 style={{ fontSize:"clamp(36px,4.5vw,58px)", fontWeight:900, letterSpacing:-2, margin:0, color:TEXT_DARK, fontFamily:"Georgia,serif" }}>Everything your store needs.</h2>
        </div>

        {/* Row 1 — 2 large cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, maxWidth:1200, margin:"0 auto 24px" }}>
          <div className="fc" style={{ background:"#f5f0e8", borderRadius:24, padding:"44px 44px 0", overflow:"hidden", minHeight:300, display:"flex", justifyContent:"space-between", alignItems:"flex-end", cursor:"default", transition:"all 0.25s" }}>
            <div style={{ paddingBottom:44 }}>
              <div style={{ fontSize:12, color:"#c0392b", fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:16 }}>TRACKING</div>
              <h3 style={{ fontSize:"clamp(24px,2.8vw,36px)", fontWeight:900, color:TEXT_DARK, margin:"0 0 16px", lineHeight:1.15, fontFamily:"Georgia,serif" }}>Real-time expiry<br/>detection</h3>
              <p style={{ fontSize:15, color:TEXT_MID, lineHeight:1.7, maxWidth:320, margin:0, fontFamily:"sans-serif" }}>Products auto-classified as Safe, Expiring Soon or Expired the moment their date changes.</p>
            </div>
            <div style={{ fontSize:100, lineHeight:1, flexShrink:0 }}>🔴</div>
          </div>

          <div className="fc" style={{ background:"white", borderRadius:24, padding:"44px 44px 0", overflow:"hidden", minHeight:300, display:"flex", justifyContent:"space-between", alignItems:"flex-end", border:"1px solid #ebebeb", boxShadow:"0 4px 24px rgba(0,0,0,0.06)", cursor:"default", transition:"all 0.25s" }}>
            <div style={{ paddingBottom:44 }}>
              <div style={{ fontSize:12, color:GREEN, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:16 }}>DISCOUNTS</div>
              <h3 style={{ fontSize:"clamp(24px,2.8vw,36px)", fontWeight:900, color:TEXT_DARK, margin:"0 0 16px", lineHeight:1.15, fontFamily:"Georgia,serif" }}>Smart discount<br/>engine</h3>
              <p style={{ fontSize:15, color:TEXT_MID, lineHeight:1.7, maxWidth:320, margin:0, fontFamily:"sans-serif" }}>Category-aware caps — Dairy 35%, Meat 30%, Fruits up to 60% OFF automatically.</p>
            </div>
            <div style={{ fontSize:100, lineHeight:1, flexShrink:0 }}>🤖</div>
          </div>
        </div>

        {/* Row 2 — 3 equal cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:24, maxWidth:1200, margin:"0 auto 24px" }}>
          <div className="fc" style={{ background:DARK_GREEN, borderRadius:24, padding:"36px 32px 0", overflow:"hidden", minHeight:260, display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"default", transition:"all 0.25s" }}>
            <div>
              <div style={{ fontSize:12, color:"#6ee7b7", fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:14 }}>ANALYTICS</div>
              <h3 style={{ fontSize:"clamp(20px,2vw,28px)", fontWeight:900, color:"white", margin:"0 0 12px", lineHeight:1.2, fontFamily:"Georgia,serif" }}>Inventory<br/>intelligence</h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.7)", lineHeight:1.65, margin:0, fontFamily:"sans-serif" }}>Dashboards showing category breakdown, expiry risk timeline and stock health.</p>
            </div>
            <div style={{ fontSize:72, lineHeight:1, marginTop:16 }}>📊</div>
          </div>

          <div className="fc" style={{ background:"white", borderRadius:24, padding:"36px 32px 0", overflow:"hidden", minHeight:260, display:"flex", flexDirection:"column", justifyContent:"space-between", border:"1px solid #ebebeb", boxShadow:"0 4px 24px rgba(0,0,0,0.06)", cursor:"default", transition:"all 0.25s" }}>
            <div>
              <div style={{ fontSize:12, color:"#c0392b", fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:14 }}>ALERTS</div>
              <h3 style={{ fontSize:"clamp(20px,2vw,28px)", fontWeight:900, color:TEXT_DARK, margin:"0 0 12px", lineHeight:1.2, fontFamily:"Georgia,serif" }}>One-click<br/>Email alerts</h3>
              <p style={{ fontSize:14, color:TEXT_MID, lineHeight:1.65, margin:0, fontFamily:"sans-serif" }}>One click sends a detailed email report of expired, expiring and low-stock items directly to admin's inbox.</p>
            </div>
            <div style={{ fontSize:72, lineHeight:1, marginTop:16 }}>📧</div>
          </div>

          <div className="fc" style={{ background:"#f5f0e8", borderRadius:24, padding:"36px 32px 0", overflow:"hidden", minHeight:260, display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"default", transition:"all 0.25s" }}>
            <div>
              <div style={{ fontSize:12, color:GREEN, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:14 }}>SHOPPING</div>
              <h3 style={{ fontSize:"clamp(20px,2vw,28px)", fontWeight:900, color:TEXT_DARK, margin:"0 0 12px", lineHeight:1.2, fontFamily:"Georgia,serif" }}>Customer<br/>clearance store</h3>
              <p style={{ fontSize:14, color:TEXT_MID, lineHeight:1.65, margin:0, fontFamily:"sans-serif" }}>Customers filter by price, discount % and urgency to find deals fast.</p>
            </div>
            <div style={{ fontSize:72, lineHeight:1, marginTop:16 }}>🛒</div>
          </div>
        </div>

        {/* Row 3 — 1 full-width card */}
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="fc" style={{ background:GREEN, borderRadius:24, padding:"44px 56px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"default", transition:"all 0.25s" }}>
            <div>
              <div style={{ fontSize:12, color:"#d1fae5", fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:14 }}>HISTORY</div>
              <h3 style={{ fontSize:"clamp(24px,3vw,42px)", fontWeight:900, color:"white", margin:"0 0 14px", lineHeight:1.1, fontFamily:"Georgia,serif" }}>Complete purchase history</h3>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.8)", lineHeight:1.7, maxWidth:560, margin:0, fontFamily:"sans-serif" }}>Every customer tracks all orders, total spent and total saved — permanently stored and accessible any time.</p>
            </div>
            <div style={{ fontSize:110, lineHeight:1, flexShrink:0 }}>🧾</div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIAL ══ */}
      <section style={{ padding:"80px 60px", background:SEC_TESTI }}>
        <div style={{ background:"#f0f5f2", borderRadius:24, display:"grid", gridTemplateColumns:"1.3fr 0.7fr 1fr", overflow:"hidden", minHeight:260 }}>
          <div style={{ padding:"48px 44px" }}>
            <div style={{ fontSize:52, color:GREEN, lineHeight:1, marginBottom:14 }}>"</div>
            <div style={{ fontSize:19, lineHeight:1.65, fontWeight:400, color:TEXT_DARK, marginBottom:24 }}>
              StockSense solved a problem we didn't know how to measure. Products that used to expire unsold now move within days — at a price customers love.
            </div>
            <div style={{ fontWeight:700, color:TEXT_DARK, fontFamily:"sans-serif" }}>Ravi Kumar</div>
            <div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif" }}>Store Manager, FreshMart</div>
          </div>
          <div style={{ padding:"48px 20px", display:"flex", flexDirection:"column", justifyContent:"center", gap:22, borderLeft:"1px solid #d4e4da" }}>
            {[{value:"500+",label:"Products tracked"},{value:"1,200",label:"Monthly customers"},{value:"65%",label:"Less food waste"}].map(s=>(
              <div key={s.label} style={{ fontFamily:"sans-serif" }}>
                <div style={{ fontSize:28, fontWeight:900, color:TEXT_DARK, letterSpacing:-1 }}>{s.value}</div>
                <div style={{ fontSize:12, color:"#888" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&q=80) center/cover", minHeight:260 }}/>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background:DARK_GREEN, padding:"90px 60px", textAlign:"center" }}>
        <h2 style={{ fontSize:"clamp(32px,4.5vw,58px)", fontWeight:900, color:"white", letterSpacing:-2.5, marginBottom:18, lineHeight:1.05 }}>
          Stop throwing money away.<br/>
          <span style={{ color:"#7fffc4" }}>Start StockSense today.</span>
        </h2>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:17, maxWidth:440, margin:"0 auto 44px", fontFamily:"sans-serif", lineHeight:1.7 }}>
          Free to set up. Works immediately. No complex configuration needed.
        </p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={()=>navigate("/register")} style={{ background:"white", color:DARK_GREEN, border:"none", borderRadius:100, padding:"17px 44px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"sans-serif" }}>Create Free Account →</button>
          <button onClick={()=>navigate("/login")} style={{ background:"transparent", color:"white", border:"2px solid rgba(255,255,255,0.35)", borderRadius:100, padding:"17px 44px", fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif" }}>Sign In</button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:"#0d0d0d", color:"#555", padding:"28px 60px", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"sans-serif", fontSize:13 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <BagLogo size={28} stroke={GREEN} />
          <span style={{ color:"white", fontWeight:900, fontFamily:"Georgia,serif", fontSize:18 }}>
            Stock<span style={{ color:GREEN }}>Sense</span>
          </span>
        </div>
        <span>© 2026 StockSense · Built to reduce food waste.</span>
      </footer>
    </div>
  );
}