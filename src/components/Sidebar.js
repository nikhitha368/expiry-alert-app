import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const BagLogo = () => (
  <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
    <path d="M7 13h22l-2.5 16H9.5L7 13z" stroke="white" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
    <path d="M13 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
    <circle cx="13.5" cy="21" r="1.7" fill="#7fffc4"/>
    <circle cx="18"   cy="21" r="1.7" fill="#7fffc4"/>
    <circle cx="22.5" cy="21" r="1.7" fill="#7fffc4"/>
  </svg>
);

const links = [
  { path:"/",          label:"Home",           icon:"🏠" },
  { path:"/dashboard", label:"Dashboard",     icon:"📊" },
  { path:"/products",  label:"Manage Products", icon:"📦" },
  { path:"/clearance", label:"Clearance",     icon:"🏷️" },
  { path:"/expired",   label:"Expired",       icon:"⚠️" },
  { path:"/analytics", label:"Analytics",     icon:"📈" },
  { path:"/offers",    label:"Customer View", icon:"🛍️" },
];

export default function Sidebar({ user, userName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initials = (userName||user?.email||"U").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  return (
    <>
      <style>{`
        .app-layout { display:flex!important; flex-direction:column!important; }
        .main-content { width:100%!important; margin-left:0!important; }
        @keyframes nbDrop { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }

        .nb {
          position:sticky; top:0; z-index:999;
          background: #012910;
          border-bottom: 2px solid rgba(127,255,196,0.18);
          box-shadow: 0 3px 24px rgba(0,0,0,0.30);
          animation: nbDrop 0.35s ease both;
        }
        .nb-in {
          display:flex; align-items:center;
          padding:0 40px; height:64px; gap:2px;
        }
        .nb-logo {
          display:flex; align-items:center; gap:11px;
          margin-right:32px; cursor:pointer; flex-shrink:0;
        }
        .nb-logo-txt {
          font-size:20px; font-weight:900;
          color:white; font-family:Georgia,serif; letter-spacing:-0.5px;
        }
        .nb-logo-txt span { color:#7fffc4; }

        .nb-link {
          display:flex; align-items:center; gap:7px;
          padding:8px 15px; border-radius:8px; border:none;
          background:transparent; cursor:pointer;
          font-size:14px; font-weight:500;
          color:rgba(255,255,255,0.70);
          transition:all .16s; white-space:nowrap; position:relative;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        }
        .nb-link:hover {
          background:rgba(255,255,255,0.10);
          color:white;
        }
        .nb-link.act {
          color:#014421; font-weight:800;
          background:#ffffff;
          border:1px solid rgba(255,255,255,0.40);
        }
        .nb-link.act::after {
          content:''; position:absolute;
          bottom:-2px; left:10px; right:10px;
          height:2.5px; background:#7fffc4;
          border-radius:2px 2px 0 0;
        }

        .nb-r { display:flex; align-items:center; gap:10px; margin-left:auto; flex-shrink:0; }
        .nb-user {
          display:flex; align-items:center; gap:9px;
          background:rgba(255,255,255,0.10);
          border:1px solid rgba(255,255,255,0.20);
          border-radius:100px; padding:5px 14px 5px 5px;
        }
        .nb-av {
          width:32px; height:32px; border-radius:50%;
          background:#1a5e30;
          border:2px solid rgba(127,255,196,0.50);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:white;
          font-family:sans-serif; flex-shrink:0;
        }
        .nb-un { font-size:14px; font-weight:700; color:white; font-family:sans-serif; }
        .nb-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; box-shadow:0 0 8px rgba(74,222,128,0.85); }
        .nb-out {
          display:flex; align-items:center; gap:7px;
          padding:8px 18px; border-radius:8px;
          border:1px solid rgba(255,255,255,0.22);
          background:transparent; cursor:pointer;
          font-size:13px; font-weight:600;
          color:rgba(255,255,255,0.80); transition:all .16s;
          font-family:sans-serif;
        }
        .nb-out:hover { background:rgba(239,68,68,0.22); color:#fca5a5; border-color:rgba(239,68,68,0.45); }
      `}</style>

      <nav className="nb">
        <div className="nb-in">
          <div className="nb-logo" onClick={() => navigate("/dashboard")}>
            <BagLogo/>
            <span className="nb-logo-txt">Stock<span>Sense</span></span>
          </div>

          {links.map(l => (
            <button key={l.path}
              className={`nb-link${location.pathname===l.path?" act":""}`}
              onClick={() => navigate(l.path)}>
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </button>
          ))}

          <div className="nb-r">
            <div className="nb-user">
              <div className="nb-av">{initials}</div>
              <span className="nb-un">{userName||"Admin"}</span>
              <div className="nb-dot"/>
            </div>
            <button className="nb-out" onClick={handleLogout}>🚪 Logout</button>
          </div>
        </div>
      </nav>
    </>
  );
}