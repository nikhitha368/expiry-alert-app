import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

const GREEN      = "#1a9e5f";
const DARK_GREEN = "#0e6e40";
const CREAM      = "#f5f0e8";

const BagLogo = ({ size = 36, stroke = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <path d="M7 13h22l-2.5 16H9.5L7 13z" stroke={stroke} strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
    <path d="M13 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
    <circle cx="13.5" cy="21" r="1.7" fill="#ff4d4d"/>
    <circle cx="18"   cy="21" r="1.7" fill="#ff4d4d"/>
    <circle cx="22.5" cy="21" r="1.7" fill="#ff4d4d"/>
  </svg>
);

const BG_IMAGE   = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1400&q=80";
const SIDE_IMG_1 = "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80";
const SIDE_IMG_2 = "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80";
const SIDE_IMG_3 = "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&q=80";

const isPhoneNumber = (val) => /^[6-9]\d{9}$/.test(val.replace(/\s/g, ""));

export default function Login() {
  const navigate     = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [showPass,   setShowPass]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError("Please enter your email (or phone) and password.");
      return;
    }
    setLoading(true);
    try {
      let emailToUse = identifier.trim();

      if (isPhoneNumber(identifier)) {
        const q    = query(collection(db, "users"), where("phone", "==", identifier.replace(/\s/g, "")));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError("No account found with this phone number.");
          setLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const role = snap.exists() ? snap.data().role : "customer";
      navigate(role === "admin" ? "/dashboard" : "/offers");

    } catch (err) {
      const msgs = {
        "auth/invalid-credential": "Invalid credentials. Please try again.",
        "auth/user-not-found":     "No account found.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Try again later.",
      };
      setError(msgs[err.code] || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const INP = {
    width:"100%", boxSizing:"border-box", background:"white",
    border:"1.5px solid #ddd", borderRadius:12, color:"#111",
    padding:"14px 16px", fontSize:15, fontFamily:"sans-serif",
    boxShadow:"0 2px 8px rgba(0,0,0,0.05)"
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"Georgia,serif", background:CREAM, overflowX:"hidden" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
        .inp { transition: border-color 0.2s, box-shadow 0.2s !important; }
        .inp:focus { border-color:${GREEN} !important; box-shadow:0 0 0 3px ${GREEN}22 !important; outline:none !important; }
        .inp::placeholder { color:#bbb; }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display:none !important; }
        .loginbtn:hover:not(:disabled) { transform:translateY(-2px) !important; box-shadow:0 14px 36px ${GREEN}55 !important; }
        .backbtn:hover { background:rgba(255,255,255,0.18) !important; }
        .regbtn:hover  { opacity:0.88 !important; transform:translateY(-1px) !important; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background:"rgba(14,110,64,0.97)", backdropFilter:"blur(12px)",
        padding:"0 60px", height:64,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 2px 24px rgba(0,0,0,0.18)"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => navigate("/")}>
          <BagLogo size={32} stroke="white" />
          <span style={{ fontSize:20, fontWeight:900, color:"white", fontFamily:"Georgia,serif", letterSpacing:-0.5 }}>
            Stock<span style={{ color:"#7fffc4" }}>Sense</span>
          </span>
        </div>
        <button className="backbtn" onClick={() => navigate("/")} style={{
          background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.3)",
          borderRadius:100, padding:"9px 22px", color:"white",
          fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", transition:"all 0.2s"
        }}>← Back to Home</button>
      </nav>

      {/* SPLIT */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.15fr 0.85fr", minHeight:"100vh" }}>

        {/* LEFT */}
        <div style={{
          position:"relative", overflow:"hidden",
          background:`linear-gradient(160deg,rgba(30,15,5,0.62) 0%,rgba(20,10,0,0.52) 100%), url(${BG_IMAGE}) center/cover no-repeat`,
          padding:"120px 60px 64px", animation:"slideIn 0.7s ease both"
        }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(127,255,196,0.18)", border:"1.5px solid rgba(127,255,196,0.65)", borderRadius:100, padding:"6px 16px", fontSize:11, color:"#f7f3e7", fontWeight:700, letterSpacing:1.5, fontFamily:"sans-serif", marginBottom:30, width:"fit-content" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#f0e7c7", display:"inline-block" }}/>
            SMART INVENTORY · ZERO WASTE
          </div>
          <h2 style={{ fontSize:"clamp(30px,3.5vw,52px)", fontWeight:900, color:"white", lineHeight:1.07, letterSpacing:-2, margin:"0 0 18px" }}>
            Welcome back to<br/><span style={{ color:"#7fffc4" }}>StockSense</span>
          </h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.75)", lineHeight:1.8, maxWidth:360, marginBottom:44, fontFamily:"sans-serif" }}>
            Manage your inventory, track expiry dates, and turn near-expiry stock into profit — automatically.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:360 }}>
            {[
              { img:SIDE_IMG_1, label:"Packaged Goods", stat:"8 items expiring soon", color:"#fbbf24" },
              { img:SIDE_IMG_2, label:"Dairy & Drinks",  stat:"Auto 35% OFF applied",  color:"#4ade80" },
              { img:SIDE_IMG_3, label:"Meat & Deli",     stat:"Stock updated live",    color:"#60a5fa" },
            ].map((card, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, background:"rgba(255,255,255,0.16)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.45)", borderRadius:14, padding:"11px 16px" }}>
                <img src={card.img} alt={card.label} style={{ width:50, height:50, borderRadius:10, objectFit:"cover", flexShrink:0, border:"2px solid rgba(255,255,255,0.2)" }} onError={e => { e.target.style.background="#1a3d2b"; }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"white", fontFamily:"sans-serif", marginBottom:2 }}>{card.label}</div>
                  <div style={{ fontSize:11, color:card.color, fontFamily:"sans-serif", fontWeight:600 }}>{card.stat}</div>
                </div>
                <div style={{ width:8, height:8, borderRadius:"50%", background:card.color, flexShrink:0, boxShadow:`0 0 8px ${card.color}` }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:32, marginTop:44, paddingTop:28, borderTop:"1px solid rgba(255,255,255,0.15)" }}>
            {[{v:"500+",l:"Products"},{v:"50%",l:"Max Discount"},{v:"Zero",l:"Manual Work"}].map(s => (
              <div key={s.l}>
                <div style={{ fontSize:20, fontWeight:900, color:CREAM, fontFamily:"sans-serif", letterSpacing:-1 }}>{s.v}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontFamily:"sans-serif", marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — FORM */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"100px 44px 60px", background:CREAM, animation:"fadeUp 0.7s 0.15s ease both" }}>
          <div style={{ width:"100%", maxWidth:460 }}>
            <div style={{ marginBottom:36 }}>
              <div style={{ fontSize:11, color:GREEN, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:10 }}>SIGN IN</div>
              <h1 style={{ fontSize:"clamp(26px,2.8vw,40px)", fontWeight:900, color:"#111", letterSpacing:-2, margin:"0 0 10px", lineHeight:1.05 }}>Welcome back 👋</h1>
              <p style={{ fontSize:15, color:"#777", fontFamily:"sans-serif", margin:0, lineHeight:1.6 }}>Enter your email or phone number and password.</p>
            </div>

            {error && (
              <div style={{ background:"#fff0f0", border:"1.5px solid #fca5a5", borderRadius:12, padding:"12px 16px", color:"#dc2626", fontSize:13, marginBottom:24, fontFamily:"sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin} autoComplete="off" style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {/* ── Dummy hidden inputs to stop browser autofill ── */}
  <input type="text"     style={{ display:"none" }} autoComplete="username"/>
  <input type="password" style={{ display:"none" }} autoComplete="current-password"/>

              {/* Email or Phone */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:8 }}>
                  EMAIL OR PHONE NUMBER
                </label>
                <input
                  className="inp"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@example.com  or  9876543210"
                  autoComplete="off"
                  style={{
                    ...INP,
                    borderColor: isPhoneNumber(identifier) ? GREEN : "#ddd",
                    boxShadow:   isPhoneNumber(identifier) ? `0 0 0 3px ${GREEN}22` : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                />
                {identifier.length > 0 && (
                  <div style={{ marginTop:6 }}>
                    <span style={{
                      fontSize:11, fontFamily:"sans-serif", fontWeight:700,
                      padding:"3px 12px", borderRadius:100,
                      background: isPhoneNumber(identifier) ? `${GREEN}18` : "#f0f0ff",
                      color:      isPhoneNumber(identifier) ? GREEN : "#6366f1",
                    }}>
                      {isPhoneNumber(identifier) ? "📱 Phone login detected" : "📧 Email login detected"}
                    </span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1, display:"block", marginBottom:8 }}>PASSWORD</label>
                <div style={{ position:"relative" }}>
                  <input
                    className="inp"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    style={{ ...INP, padding:"14px 48px 14px 16px" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:17, color:"#aaa", padding:0 }}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="loginbtn" style={{
                width:"100%", background: loading ? "#aaa" : DARK_GREEN, color:"white", border:"none",
                borderRadius:12, padding:"16px", fontWeight:900, fontSize:17,
                cursor: loading ? "not-allowed" : "pointer", fontFamily:"Georgia,serif",
                transition:"all 0.25s", boxShadow:`0 6px 24px ${GREEN}44`,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:4
              }}>
                {loading
                  ? <><span style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin 0.75s linear infinite", display:"inline-block" }}/> Signing in...</>
                  : "Sign In →"}
              </button>
            </form>

            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"28px 0" }}>
              <div style={{ flex:1, height:1, background:"#e0dbd0" }}/>
              <span style={{ fontSize:11, color:"#bbb", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1 }}>OR</span>
              <div style={{ flex:1, height:1, background:"#e0dbd0" }}/>
            </div>

            <div style={{ background:"white", borderRadius:16, padding:"18px 22px", border:"1.5px solid #e8e0d0", boxShadow:"0 4px 16px rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#111", fontFamily:"sans-serif", marginBottom:3 }}>New to StockSense?</div>
                <div style={{ fontSize:12, color:"#aaa", fontFamily:"sans-serif" }}>Create your free account in 60 seconds</div>
              </div>
              <button className="regbtn" onClick={() => navigate("/register")} style={{ background:GREEN, color:"white", border:"none", borderRadius:100, padding:"11px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", transition:"all 0.2s", whiteSpace:"nowrap", flexShrink:0 }}>
                Register →
              </button>
            </div>

            <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:28 }}>
              {["✅ Free forever","🔒 Secure login","🤖 Auto-managed"].map(b => (
                <span key={b} style={{ fontSize:11, color:"#bbb", fontFamily:"sans-serif" }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}