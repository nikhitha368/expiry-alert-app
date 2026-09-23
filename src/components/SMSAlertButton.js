import React, { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getDaysLeft, getExpiryStatus } from "../utils";
import emailjs from "@emailjs/browser";

const DARK_GREEN = "#0e6e40";
const GREEN      = "#1a9e5f";

// ── EmailJS Keys ──
const SERVICE_ID  = "service_1dhhrcn";
const TEMPLATE_ID = "template_doncl5e";
const PUBLIC_KEY  = "dC5v3e_aJ0GgXTeKt";

export default function SMSAlertButton({ user, userName, products }) {
  const [status,  setStatus]  = useState("idle");
  const [message, setMessage] = useState("");

  const sendAlert = async () => {
    setStatus("loading");
    setMessage("");
    try {
      // Step 1: Get admin email from Firestore
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) throw new Error("User not found.");
      const adminEmail = userSnap.data().email;
      if (!adminEmail) throw new Error("No email found on your account.");

      // Step 2: Count products
      const expired  = products.filter(p => getExpiryStatus(getDaysLeft(p.expiry)) === "expired");
      const expiring = products.filter(p => getExpiryStatus(getDaysLeft(p.expiry)) === "expiring");
      const lowStock = products.filter(p => { const q = Number(p.quantity)||0; return q > 0 && q <= 5; });
      const outStock = products.filter(p => (Number(p.quantity)||0) === 0);

      // Step 3: Send email via EmailJS
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_name:  userName,
          to_email: adminEmail,
          expired:  expired.length,
          expiring: expiring.length,
          lowStock: lowStock.length,
          outStock: outStock.length,
          total:    products.length,
        },
        PUBLIC_KEY
      );

      setStatus("success");
      setMessage(`Alert sent to ${adminEmail} ✓`);
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);

    } catch (err) {
      console.error("Email Alert Error:", err);
      setStatus("error");
      setMessage(err.message || "Failed to send alert.");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 5000);
    }
  };

  const btnBg  = { idle:DARK_GREEN, loading:"#888", success:"#059669", error:"#dc2626" };
  const icons  = { idle:"📧", success:"✅", error:"❌" };
  const labels = { idle:"Send Email Alert", loading:"Sending...", success:"Alert Sent!", error:"Failed" };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
      <button
        onClick={sendAlert}
        disabled={status === "loading"}
        style={{
          background:   btnBg[status],
          color:        "white",
          border:       "none",
          borderRadius: 12,
          padding:      "11px 24px",
          fontSize:     14,
          fontWeight:   800,
          cursor:       status === "loading" ? "not-allowed" : "pointer",
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          fontFamily:   "Georgia,serif",
          transition:   "all .2s",
          boxShadow:    "0 4px 20px rgba(1,68,33,0.30)",
        }}
        onMouseOver={e => {
          if (status === "idle") {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 28px rgba(1,68,33,0.40)";
          }
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(1,68,33,0.30)";
        }}
      >
        {status === "loading" ? (
          <>
            <span style={{
              width:16, height:16,
              border:"2.5px solid rgba(255,255,255,0.3)",
              borderTopColor:"white", borderRadius:"50%",
              display:"inline-block",
              animation:"spin 0.7s linear infinite"
            }}/>
            Sending...
          </>
        ) : (
          <>
            <span style={{ fontSize:16 }}>{icons[status]}</span>
            {labels[status]}
          </>
        )}
      </button>

      {message && (
        <div style={{
          fontSize:     12,
          fontFamily:   "sans-serif",
          fontWeight:   600,
          color:        status === "success" ? "#059669" : "#dc2626",
          padding:      "4px 12px",
          background:   status === "success" ? "#d1fae5" : "#fee2e2",
          borderRadius: 100,
          whiteSpace:   "nowrap",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
