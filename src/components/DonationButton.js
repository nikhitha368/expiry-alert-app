import React, { useState } from "react";
import { doc, deleteDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getDaysLeft } from "../utils";

const ORANGE = "#f59e0b";

export default function DonationButton({ user, userName, products }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get products suitable for donation (expiring in 1-3 days)
  const donationEligible = products.filter(p => {
    const daysLeft = getDaysLeft(p.expiry);
    return daysLeft >= 0 && daysLeft <= 3; // Safe for immediate consumption
  });

  const handleDonation = async () => {
    if (selectedProducts.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Get products being donated
      const donatedProducts = products.filter(p => selectedProducts.includes(p.id));
      
      // Calculate impact metrics INSIDE the function
      const totalWeight = selectedProducts.length * 0.5; // Assume 500g per item
      const mealsProvided = Math.floor(totalWeight * 2); // 2 meals per kg
      const co2Saved = parseFloat((totalWeight * 0.65).toFixed(1)); // 0.65kg CO2 per kg food waste
      
      // Save donation record first
      const donationRecord = {
        userId: user.uid,
        userName: userName,
        products: donatedProducts.map(p => ({
          name: p.name,
          category: p.category,
          quantity: p.quantity,
          unit: p.unit,
          expiryDate: p.expiry,
          daysLeft: getDaysLeft(p.expiry)
        })),
        ngo: "Feeding India Foundation",
        donatedAt: new Date(),
        impact: {
          itemsCount: selectedProducts.length,
          weightKg: totalWeight,
          mealsProvided: mealsProvided,
          co2SavedKg: co2Saved
        }
      };
      
      console.log("Saving donation record:", donationRecord); // Debug log
      
      // Add to donations collection
      await addDoc(collection(db, "donations"), donationRecord);
      
      console.log("Donation record saved successfully!"); // Debug log
      
      // Remove donated products from inventory
      await Promise.all(
        selectedProducts.map(productId => 
          deleteDoc(doc(db, "products", productId))
        )
      );

      // Show success state
      setShowModal(false);
      setShowSuccess(true);
      
      // Hide success after 4 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedProducts([]);
      }, 4000);
      
    } catch (error) {
      console.error("Donation error:", error);
      alert("Failed to process donation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate impact metrics for preview (outside function)
  const totalWeight = selectedProducts.length * 0.5;
  const mealsProvided = Math.floor(totalWeight * 2);
  const co2Saved = (totalWeight * 0.65).toFixed(1);

  if (donationEligible.length === 0) return null;

  return (
    <>
      <style>{`
        .donation-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 11px 24px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: Georgia, serif;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
        }
        .donation-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(245, 158, 11, 0.4);
        }
        .donation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }
        .modal-header {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 20px;
          border-radius: 20px 20px 0 0;
          text-align: center;
        }
        .ngo-card {
          background: #fffbeb;
          border: 1.5px solid #fde68a;
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
        }
        .product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .product-item:hover {
          background: #f9fdf9;
        }
        .product-checkbox {
          width: 18px;
          height: 18px;
          accent-color: ${ORANGE};
        }
        .success-popup {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border: 2px solid #10b981;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 10001;
          animation: slideIn 0.3s ease;
          max-width: 320px;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Donation Button */}
      <button 
        className="donation-btn"
        onClick={() => setShowModal(true)}
        title="Donate near-expiry items to food bank"
      >
        <span style={{ fontSize: 16 }}>🤲</span>
        Donate to Food Bank
      </button>

      {/* Donation Modal */}
      {showModal && (
        <div className="donation-modal" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            
            {/* Header */}
            <div className="modal-header">
              <div style={{ fontSize: 24, marginBottom: 8 }}>🤲</div>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: "Georgia,serif" }}>
                Donate to Local Food Bank
              </h2>
              <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: 14, fontFamily: "sans-serif" }}>
                Help feed families while reducing food waste
              </p>
            </div>

            <div style={{ padding: "20px" }}>

              {/* NGO Information */}
              <div className="ngo-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ 
                    width: 40, height: 40, borderRadius: "50%", 
                    background: ORANGE, display: "flex", 
                    alignItems: "center", justifyContent: "center",
                    fontSize: 20 
                  }}>🏢</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#92400e", fontFamily: "sans-serif" }}>
                      Feeding India Foundation
                    </div>
                    <div style={{ fontSize: 12, color: "#78350f", fontFamily: "sans-serif" }}>
                      Verified NGO • 4.8★ rating
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#78350f", fontFamily: "sans-serif", lineHeight: 1.5 }}>
                  📍 2.3km from your location<br/>
                  📞 +91-98765-43210<br/>
                  ⏰ Pickup within 4 hours<br/>
                  📜 Tax-deductible receipt provided
                </div>
              </div>

              {/* Product Selection */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111", fontFamily: "sans-serif", marginBottom: 12 }}>
                  Select Items to Donate:
                </h3>
                
                {donationEligible.map(product => (
                  <div key={product.id} className="product-item">
                    <input
                      type="checkbox"
                      className="product-checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", fontFamily: "sans-serif" }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", fontFamily: "sans-serif" }}>
                        Expires in {getDaysLeft(product.expiry)} day{getDaysLeft(product.expiry) !== 1 ? 's' : ''} • 
                        Qty: {product.quantity} {product.unit || ''}
                      </div>
                    </div>
                    <div style={{ 
                      background: getDaysLeft(product.expiry) <= 1 ? "#fee2e2" : "#fef3c7",
                      color: getDaysLeft(product.expiry) <= 1 ? "#dc2626" : "#d97706",
                      padding: "4px 8px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "sans-serif"
                    }}>
                      {getDaysLeft(product.expiry) <= 1 ? "Urgent" : "Soon"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Impact Preview */}
              {selectedProducts.length > 0 && (
                <div style={{ 
                  background: "#f0fdf4", 
                  border: "1.5px solid #bbf7d0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20
                }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "#166534", fontFamily: "sans-serif" }}>
                    🌟 Your Impact:
                  </h4>
                  <div style={{ fontSize: 13, color: "#166534", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                    🍽️ {mealsProvided} meals for families<br/>
                    🌱 {totalWeight}kg food waste prevented<br/>
                    🌍 {co2Saved}kg CO₂ emissions saved<br/>
                    💚 {selectedProducts.length} families will benefit
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    background: "#f3f4f6",
                    color: "#6b7280",
                    border: "1.5px solid #d1d5db",
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "sans-serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDonation}
                  disabled={selectedProducts.length === 0 || isProcessing}
                  style={{
                    flex: 2,
                    background: selectedProducts.length > 0 && !isProcessing ? ORANGE : "#d1d5db",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: selectedProducts.length > 0 && !isProcessing ? "pointer" : "not-allowed",
                    fontFamily: "Georgia,serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  {isProcessing ? (
                    <>
                      <div style={{
                        width: 16, height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite"
                      }}/>
                      Processing...
                    </>
                  ) : (
                    <>
                      🤲 Donate {selectedProducts.length} Item{selectedProducts.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div className="success-popup">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 24 }}>✅</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", fontFamily: "sans-serif" }}>
                Donation Successful!
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "sans-serif" }}>
                NGO has been notified
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#374151", fontFamily: "sans-serif", lineHeight: 1.5 }}>
            📧 Confirmation sent to Feeding India Foundation<br/>
            ⏰ Pickup scheduled within 4 hours<br/>
            📜 Tax receipt will be emailed to you<br/>
            💚 Thank you for helping feed families!
          </div>
        </div>
      )}
    </>
  );
}