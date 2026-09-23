import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const GREEN      = "#1a9e5f";
const DARK_GREEN = "#0e6e40";
const GOLD       = "#d4a017";
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

const BG_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80";

export default function Register() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name:"", email:"", phone:"", password:"", confirm:"", role:"admin" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showP,   setShowP]   = useState(false);
  const [showC,   setShowC]   = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isValidPhone = (ph) => /^[6-9]\d{9}$/.test(ph.replace(/\s/g, ""));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(form.phone))          return setError("Enter a valid 10-digit Indian mobile number.");
    if (form.password !== form.confirm)     return setError("Passwords do not match.");
    if (form.password.length < 6)           return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name:      form.name,
        email:     form.email,
        phone:     form.phone.replace(/\s/g, ""),
        role:      form.role,
        createdAt: serverTimestamp(),
      });
      navigate(form.role === "admin" ? "/dashboard" : "/offers");
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Email is already registered.",
        "auth/weak-password":        "Password is too weak.",
        "auth/invalid-email":        "Invalid email address.",
      };
      setError(msgs[err.code] || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", fontFamily:"Georgia,serif", background:CREAM, overflowX:"hidden" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-32px)} to{opacity:1;transform:translateX(0)} }
        .inp { transition:border-color 0.2s,box-shadow 0.2s !important; }
        .inp:focus { border-color:${GREEN} !important; box-shadow:0 0 0 3px ${GREEN}22 !important; outline:none !important; }
        .inp::placeholder { color:#bbb; }
        .subbtn:hover:not(:disabled) { transform:translateY(-2px) !important; box-shadow:0 14px 36px ${GREEN}55 !important; }
        .backbtn:hover { background:rgba(255,255,255,0.18) !important; }
        .rolebox { transition:all 0.22s; cursor:pointer; }
        .rolebox:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.10) !important; }
        .signinbtn:hover { background:${DARK_GREEN} !important; color:white !important; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background:"rgba(14,110,64,0.97)",
        backdropFilter:"blur(12px)",
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
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:13, color:"rgba(255,255,255,0.65)", fontFamily:"sans-serif" }}>Already have an account?</span>
          <button onClick={() => navigate("/login")} style={{
            background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.3)",
            borderRadius:100, padding:"8px 20px", color:"white",
            fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", transition:"all 0.2s"
          }}>Sign In</button>
          <button className="backbtn" onClick={() => navigate("/")} style={{
            background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.3)",
            borderRadius:100, padding:"8px 20px", color:"white",
            fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", transition:"all 0.2s"
          }}>← Home</button>
        </div>
      </nav>

      {/* SPLIT */}
      <div style={{ display:"grid", gridTemplateColumns:"1.15fr 0.85fr", minHeight:"100vh" }}>

        {/* LEFT */}
        <div style={{ position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-start", animation:"slideIn 0.7s ease both", minHeight:"100vh" }}>
          <div style={{ position:"absolute", inset:0, zIndex:0, background:`url(${BG_IMAGE}) center/cover no-repeat` }}/>
          <video autoPlay muted loop playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", zIndex:1 }} onError={e => { e.target.style.display="none"; }}>
            <source src="/cusadmin.mp4" type="video/mp4"/>
          </video>
          <div style={{ position:"absolute", inset:0, zIndex:2, background:"linear-gradient(to bottom, rgba(8,18,10,0.88) 0%, rgba(8,18,10,0.55) 45%, rgba(8,18,10,0.25) 100%)" }}/>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, zIndex:4, background:"linear-gradient(90deg, transparent, #1a9e5f, #7fffc4, #1a9e5f, transparent)" }}/>
          <div style={{ position:"relative", zIndex:3, padding:"110px 52px 64px" }}>
            <div style={{ width:52, height:4, background:`linear-gradient(90deg,${GOLD},#f59e0b)`, borderRadius:4, marginBottom:24 }}/>
            <h2 style={{ fontSize:"clamp(34px,3.8vw,56px)", fontWeight:900, color:"white", lineHeight:1.07, letterSpacing:-2.5, margin:"0 0 18px", textShadow:"0 4px 24px rgba(0,0,0,0.6)" }}>
              Start managing<br/>your store<br/><span style={{ color:"#7fffc4" }}>smarter today.</span>
            </h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,0.82)", lineHeight:1.85, maxWidth:360, margin:"0 0 36px", fontFamily:"sans-serif", textShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>
              Automate expiry tracking, apply smart discounts, and recover revenue from near-expiry products.
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[{icon:"🆓",label:"Free forever"},{icon:"⚡",label:"2 min setup"},{icon:"🤖",label:"Zero manual work"}].map(s => (
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.10)", backdropFilter:"blur(14px)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:100, padding:"8px 18px" }}>
                  <span style={{ fontSize:14 }}>{s.icon}</span>
                  <span style={{ fontSize:12, color:"white", fontWeight:700, fontFamily:"sans-serif" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — FORM */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"90px 44px 56px", background:CREAM, overflowY:"auto", animation:"fadeUp 0.7s 0.15s ease both" }}>
          <div style={{ width:"100%", maxWidth:460 }}>

            <div style={{ width:36, height:3, background:`linear-gradient(90deg,${GOLD},#f59e0b)`, borderRadius:4, marginBottom:18 }}/>
            <div style={{ fontSize:11, color:GOLD, fontWeight:800, letterSpacing:2, fontFamily:"sans-serif", marginBottom:8 }}>CREATE ACCOUNT</div>
            <h1 style={{ fontSize:"clamp(24px,2.5vw,36px)", fontWeight:900, color:"#111", letterSpacing:-1.5, margin:"0 0 8px", lineHeight:1.05 }}>Get started free 🚀</h1>
            <p style={{ fontSize:14, color:"#888", fontFamily:"sans-serif", margin:"0 0 28px", lineHeight:1.6 }}>Set up your StockSense account in under 2 minutes.</p>

            {error && (
              <div style={{ background:"#fff0f0", border:"1.5px solid #fca5a5", borderRadius:12, padding:"12px 16px", color:"#dc2626", fontSize:13, marginBottom:20, fontFamily:"sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display:"flex", flexDirection:"column", gap:15 }}>

              {/* Role */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:10 }}>ACCOUNT TYPE</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    { value:"admin",    img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80", label:"Admin",    desc:"Manage inventory" },
                    { value:"customer", img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80", label:"Customer", desc:"Browse deals" },
                  ].map(r => (
                    <div key={r.value} className="rolebox" onClick={() => update("role", r.value)} style={{
                      padding:"16px 12px", textAlign:"center",
                      border:`2px solid ${form.role===r.value ? GREEN : "#e0dbd0"}`,
                      borderRadius:14,
                      background: form.role===r.value ? `${GREEN}0d` : "white",
                      boxShadow: form.role===r.value ? `0 4px 20px ${GREEN}22` : "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                      <img src={r.img} alt={r.label} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", marginBottom:8, border:`2.5px solid ${form.role===r.value ? GREEN : "#ddd"}` }} onError={e => { e.target.style.display="none"; }}/>
                      <div style={{ fontSize:13, fontWeight:800, color: form.role===r.value ? DARK_GREEN : "#333", fontFamily:"sans-serif", marginBottom:2 }}>{r.label}</div>
                      <div style={{ fontSize:11, color:"#aaa", fontFamily:"sans-serif" }}>{r.desc}</div>
                      {form.role===r.value && (
                        <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:4, background:GREEN, borderRadius:100, padding:"2px 10px" }}>
                          <span style={{ fontSize:10, color:"white", fontWeight:700, fontFamily:"sans-serif" }}>✓ Selected</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:7 }}>FULL NAME</label>
                <input className="inp" type="text" value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Ravi Kumar" required autoComplete="name"
                  style={{ width:"100%", boxSizing:"border-box", background:"white", border:"1.5px solid #e0dbd0", borderRadius:12, color:"#111", padding:"13px 16px", fontSize:15, fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}/>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:7 }}>EMAIL ADDRESS</label>
                <input className="inp" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" required autoComplete="email"
                  style={{ width:"100%", boxSizing:"border-box", background:"white", border:"1.5px solid #e0dbd0", borderRadius:12, color:"#111", padding:"13px 16px", fontSize:15, fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}/>
              </div>

              {/* ── PHONE (NEW) ── */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:7 }}>
                  MOBILE NUMBER &nbsp;<span style={{ color:GREEN, fontSize:10, fontWeight:700 }}>📱 For SMS alerts</span>
                </label>
                <div style={{ position:"relative" }}>
                  <div style={{
                    position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                    fontSize:14, fontWeight:700, color:"#555", fontFamily:"sans-serif",
                    borderRight:"1.5px solid #e0dbd0", paddingRight:10, lineHeight:1, zIndex:1
                  }}>+91</div>
                  <input
                    className="inp"
                    type="tel"
                    value={form.phone}
                    onChange={e => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    style={{
                      width:"100%", boxSizing:"border-box", background:"white",
                      border:"1.5px solid #e0dbd0", borderRadius:12, color:"#111",
                      padding:"13px 16px 13px 58px", fontSize:15,
                      fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.04)"
                    }}
                  />
                </div>
                {form.phone.length > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background: isValidPhone(form.phone) ? GREEN : "#ef4444", transition:"background 0.2s" }}/>
                    <span style={{ fontSize:12, fontFamily:"sans-serif", color: isValidPhone(form.phone) ? GREEN : "#ef4444" }}>
                      {isValidPhone(form.phone) ? "Valid number ✓" : "Must start with 6–9 and be 10 digits"}
                    </span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:7 }}>PASSWORD</label>
                <div style={{ position:"relative" }}>
                  <input className="inp" type={showP ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} placeholder="Min. 6 characters" required autoComplete="new-password"
                    style={{ width:"100%", boxSizing:"border-box", background:"white", border:"1.5px solid #e0dbd0", borderRadius:12, color:"#111", padding:"13px 46px 13px 16px", fontSize:15, fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}/>
                  <button type="button" onClick={() => setShowP(!showP)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#bbb", padding:0 }}>{showP ? "🙈" : "👁️"}</button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label style={{ fontSize:11, fontWeight:800, color:"#666", fontFamily:"sans-serif", letterSpacing:1.2, display:"block", marginBottom:7 }}>CONFIRM PASSWORD</label>
                <div style={{ position:"relative" }}>
                  <input className="inp" type={showC ? "text" : "password"} value={form.confirm} onChange={e => update("confirm", e.target.value)} placeholder="Repeat your password" required autoComplete="new-password"
                    style={{ width:"100%", boxSizing:"border-box", background:"white", border:"1.5px solid #e0dbd0", borderRadius:12, color:"#111", padding:"13px 46px 13px 16px", fontSize:15, fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}/>
                  <button type="button" onClick={() => setShowC(!showC)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#bbb", padding:0 }}>{showC ? "🙈" : "👁️"}</button>
                </div>
              </div>

              {form.confirm.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:-6 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background: form.password===form.confirm ? GREEN : "#ef4444", transition:"background 0.2s" }}/>
                  <span style={{ fontSize:12, fontFamily:"sans-serif", color: form.password===form.confirm ? GREEN : "#ef4444" }}>
                    {form.password===form.confirm ? "Passwords match ✓" : "Passwords do not match"}
                  </span>
                </div>
              )}

              <button type="submit" disabled={loading} className="subbtn" style={{
                width:"100%", background: loading ? "#aaa" : DARK_GREEN, color:"white", border:"none",
                borderRadius:12, padding:"16px", fontWeight:900, fontSize:17,
                cursor: loading ? "not-allowed" : "pointer", fontFamily:"Georgia,serif",
                transition:"all 0.25s", boxShadow:`0 6px 24px ${GREEN}44`,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:4
              }}>
                {loading ? (
                  <><span style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin 0.75s linear infinite", display:"inline-block" }}/> Creating account...</>
                ) : "Create Account →"}
              </button>
            </form>

            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"22px 0" }}>
              <div style={{ flex:1, height:1, background:"#e0dbd0" }}/>
              <span style={{ fontSize:11, color:"#bbb", fontFamily:"sans-serif", fontWeight:700, letterSpacing:1 }}>OR</span>
              <div style={{ flex:1, height:1, background:"#e0dbd0" }}/>
            </div>

            <div style={{ background:"white", borderRadius:16, padding:"16px 20px", border:"1.5px solid #e8e0d0", boxShadow:"0 4px 16px rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#111", fontFamily:"sans-serif", marginBottom:2 }}>Already have an account?</div>
                <div style={{ fontSize:11, color:"#bbb", fontFamily:"sans-serif" }}>Sign in to your existing account</div>
              </div>
              <button className="signinbtn" onClick={() => navigate("/login")} style={{ background:"transparent", color:DARK_GREEN, border:`2px solid ${DARK_GREEN}`, borderRadius:100, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"sans-serif", transition:"all 0.2s", whiteSpace:"nowrap", flexShrink:0 }}>
                Sign In →
              </button>
            </div>

            <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:20, flexWrap:"wrap" }}>
              {["✅ Free forever","🔒 Secure signup","📦 Instant access"].map(b => (
                <span key={b} style={{ fontSize:11, color:"#bbb", fontFamily:"sans-serif" }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}