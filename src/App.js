import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import VoiceAssistant from "./components/VoiceAssistant";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Clearance from "./pages/Clearance";
import Expired from "./pages/Expired";
import Offers from "./pages/Offers";
import Analytics from "./pages/Analytics";
import PurchaseHistory from "./pages/PurchaseHistory";

import "./App.css";

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ user, userRole, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (userRole === null) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (userRole !== "admin") return <Navigate to="/offers" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          setUserRole(snap.exists() ? snap.data().role || "customer" : "customer");
        } catch { setUserRole("customer"); }
      } else { setUserRole(null); }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p className="loading-text">Loading StockSense...</p>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} userRole={userRole} />} />
        <Route path="/login" element={user ? <Navigate to={userRole === "admin" ? "/dashboard" : "/offers"} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={userRole === "admin" ? "/dashboard" : "/offers"} replace /> : <Register />} />

        {/* Admin only */}
        <Route path="/dashboard" element={<AdminRoute user={user} userRole={userRole}><Dashboard user={user} /></AdminRoute>} />
        <Route path="/products" element={<AdminRoute user={user} userRole={userRole}><Products user={user} /></AdminRoute>} />
        <Route path="/clearance" element={<AdminRoute user={user} userRole={userRole}><Clearance user={user} /></AdminRoute>} />
        <Route path="/expired" element={<AdminRoute user={user} userRole={userRole}><Expired user={user} /></AdminRoute>} />
        <Route path="/analytics" element={<AdminRoute user={user} userRole={userRole}><Analytics user={user} /></AdminRoute>} />

        {/* All logged-in users */}
        <Route path="/offers" element={<ProtectedRoute user={user}><Offers user={user} userRole={userRole} /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute user={user}><PurchaseHistory user={user} /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
      {/* ── Voice Assistant (all pages) ── */}
      <VoiceAssistant user={user} userRole={userRole} />
    </Router>
  );
}