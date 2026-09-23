import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const ORANGE = "#f59e0b";

export default function DonationHistory({ user }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up donations listener for user:", user.uid);
    
    const q = query(
      collection(db, "donations"), 
      where("userId", "==", user.uid)
      // Removed orderBy and limit for debugging
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Donations snapshot received, docs:", snapshot.docs.length);
      
      const donationList = snapshot.docs.map(doc => {
        console.log("Donation doc:", doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        };
      });
      
      setDonations(donationList);
      setLoading(false);
    }, (error) => {
      console.error("Donations listener error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  console.log("Current donations state:", donations);

  if (loading) {
    return (
      <div className="panel" style={{ border: `3px solid ${ORANGE}` }}>
        <div className="phd">
          <span className="ptitle">🤲 Recent Donations</span>
        </div>
        <div style={{ padding: "38px", textAlign: "center", color: "#9ca3af", fontSize: 14, fontFamily: "sans-serif" }}>
          Loading donations... (Debug: Listening for user {user?.uid})
        </div>
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="panel" style={{ border: `3px solid ${ORANGE}` }}>
        <div className="phd">
          <span className="ptitle">🤲 Recent Donations</span>
        </div>
        <div style={{ padding: "38px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🤲</div>
          <p style={{ color: "#9ca3af", fontSize: 15, margin: "0 0 18px", fontFamily: "sans-serif" }}>
            No donations found for user {user?.uid}. Try making a donation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ border: `3px solid ${ORANGE}` }}>
      <div className="phd">
        <span className="ptitle">🤲 Recent Donations ({donations.length})</span>
      </div>
      
      <div style={{ padding: "20px" }}>
        {donations.map((donation, index) => (
          <div key={donation.id || index} style={{ 
            padding: "16px", 
            marginBottom: "12px",
            background: "#fffbeb",
            borderRadius: "8px",
            border: "1px solid #fde68a"
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
              Donation to {donation.ngo || "NGO"}
            </div>
            <div style={{ fontSize: 12, color: "#78350f" }}>
              Products: {donation.products?.map(p => p.name).join(", ") || "No products"}
            </div>
            <div style={{ fontSize: 12, color: "#78350f" }}>
              Impact: {donation.impact?.itemsCount || 0} items, {donation.impact?.mealsProvided || 0} meals
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}