import React, { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getDaysLeft, getExpiryStatus } from "../utils";

const GREEN      = "#1a9e5f";
const DARK_GREEN = "#0e6e40";

export default function VoiceAssistant({ user, userRole }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText,   setInputText]   = useState("");
  const [messages,    setMessages]    = useState([
    {
      from: "bot",
      text: "👋 Hi! I'm your StockSense Assistant! You can type or speak your question. Try asking about expired products, low stock, or inventory value!"
    }
  ]);
  const [products,  setProducts]  = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // ── Fetch products from Firestore ──
  useEffect(() => {
  if (!user || userRole !== "admin") return;
  
  // Reset chat history for new admin
  setMessages([
    {
      from: "bot",
      text: "👋 Hi! I'm your StockSense Assistant! You can type or speak your question. Try asking about expired products, low stock, or inventory value!"
    }
  ]);
  
  const fetchProducts = async () => {
    try {
      const q    = query(collection(db, "products"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("VoiceAssistant fetch error:", e);
    }
  };
  fetchProducts();
}, [user, userRole]);


  // ── Auto scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Speech Synthesis (speak answer) ──
  const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Clean text for speech - remove emojis and fix formatting
  const cleanText = text
    .replace(/😊|🌟|✅|⚠️|📦|💰|🎯|⏰|📉|🚫|🏆|📊|🤖|💡|🚨|💚|🌱|💪|🔥|🎉|📈|🛒|⚡|🤔|👋|🙏|💸|📍|🌍|🤲|👥|🌦️|🍿|🛒|🥛|🥦|🍎/g, '')
    .replace(/\n/g, '. ')
    .replace(/\|/g, ',')
    .replace(/₹/g, 'rupees ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const utter  = new SpeechSynthesisUtterance(cleanText);
  utter.lang   = "en-IN";
  utter.rate   = 0.95;
  utter.pitch  = 1;
  window.speechSynthesis.speak(utter);
};


  // ── Process question and get answer ──
  // ── SMART VOICE ASSISTANT with 50+ Question Types ──
const getAnswer = (question) => {
  const q = question.toLowerCase();
  
  const expired  = products.filter(p => getExpiryStatus(getDaysLeft(p.expiry)) === "expired");
  const expiring = products.filter(p => getExpiryStatus(getDaysLeft(p.expiry)) === "expiring");
  const safe     = products.filter(p => getExpiryStatus(getDaysLeft(p.expiry)) === "safe");
  const lowStock = products.filter(p => { const qty = Number(p.quantity)||0; return qty > 0 && qty <= 5; });
  const outStock = products.filter(p => (Number(p.quantity)||0) === 0);
  const total    = products.length;
  const value    = products.reduce((a, p) => a + (Number(p.price)||0) * (Number(p.quantity)||0), 0);

  // Calculate business metrics
  const expiredValue = expired.reduce((a, p) => a + (Number(p.price)||0) * (Number(p.quantity)||0), 0);
  const expiringValue = expiring.reduce((a, p) => a + (Number(p.price)||0) * (Number(p.quantity)||0), 0);
  const wastePreventedValue = expiringValue * 0.4; // Assuming 40% avg discount recovers 60% value

  // Category analysis
  const categoryMap = {};
  products.forEach(p => {
    const cat = p.category || "Others";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryMap).sort((a,b) => b[1] - a[1]);
  const topCategory = categories[0];

  // Time-based logic
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  // ═══ GREETINGS & SOCIAL ═══
  if (q.includes("good morning") || q.includes("morning") || q.includes("good afternoon") || q.includes("afternoon") || q.includes("good evening") || q.includes("evening")) {
    const urgentCount = expired.length + products.filter(p => getDaysLeft(p.expiry) === 0).length;
    if (urgentCount > 0) {
      return `Good ${timeGreeting}! Hope you're doing well! 🌟 Quick heads up - you have ${urgentCount} items that need immediate attention today!`;
    }
    return `Good ${timeGreeting}! Your inventory looks healthy today! 😊 ${safe.length} products are in perfect condition!`;
  }

  if (q.includes("hello") || q.includes("hi ") || q === "hi" || q === "hey" || q.includes("hey there")) {
    return `Hello! 👋 I'm here to help you manage your inventory smartly. You currently have ${total} products with ${expired.length} needing immediate removal. What would you like to know?`;
  }

  if (q.includes("how are you") || q.includes("how are u") || q.includes("how r u") || q.includes("whats up") || q.includes("what's up") || q.includes("sup")) {
    return `I'm doing great, thanks for asking! 😊 I've been keeping track of your inventory - ${safe.length} products are safe, but ${expired.length + expiring.length} need your attention. How can I help you today?`;
  }

  if (q.includes("thank you") || q.includes("thanks")) {
    return `You're very welcome! 🙏 I'm always here to help you run your business efficiently. Preventing food waste one product at a time! 💚`;
  }

  // ═══ EXPIRED PRODUCTS ═══
  if (q.includes("expired") || q.includes("expire")) {
    if (expired.length === 0)
      return "✅ Excellent! No expired products found! Your inventory management is on point! 🎯";
    const names = expired.slice(0, 3).map(p => p.name).join(", ");
    const lossAmount = expiredValue > 0 ? ` This represents ₹${expiredValue.toLocaleString("en-IN")} in potential losses.` : "";
    return `⚠️ Alert: ${expired.length} expired product${expired.length > 1 ? "s" : ""} found! ${names}${expired.length > 3 ? " and more." : "."} Please remove immediately to prevent customer complaints.${lossAmount}`;
  }

  // ═══ EXPIRING SOON ═══
  if (q.includes("expiring") || q.includes("expiry") || q.includes("soon")) {
    if (expiring.length === 0)
      return "🌟 Great news! No products expiring soon. Your inventory turnover is excellent!";
    const names = expiring.slice(0, 3).map(p => `${p.name} (${getDaysLeft(p.expiry)} days)`).join(", ");
    return `⏰ ${expiring.length} product${expiring.length > 1 ? "s are" : " is"} expiring soon: ${names}${expiring.length > 3 ? " and more." : "."} Auto-discounts are helping you recover value before expiry!`;
  }

  // ═══ TODAY'S PRIORITIES ═══
  if (q.includes("today") || q.includes("expire today") || q.includes("priority")) {
    const today = products.filter(p => getDaysLeft(p.expiry) === 0);
    if (today.length === 0)
      return "✅ Perfect! No products expire today. You can focus on restocking and sales! 📈";
    const names = today.map(p => p.name).join(", ");
    return `🚨 URGENT: ${today.length} product${today.length > 1 ? "s expire" : " expires"} TODAY! ${names}. Priority action: Apply maximum discount or remove from shelves immediately!`;
  }

  // ═══ FINANCIAL INSIGHTS ═══
  if (q.includes("money lost") || q.includes("loss") || q.includes("profit lost")) {
    if (expiredValue === 0) return "💰 Good news! No money lost from expired products!";
    return `💸 Estimated loss from expired products: ₹${expiredValue.toLocaleString("en-IN")}. But don't worry - StockSense helps prevent future losses through early alerts!`;
  }

  if (q.includes("money saved") || q.includes("recovered") || q.includes("discount saved")) {
    if (wastePreventedValue === 0) return "💡 Start applying discounts to expiring products to recover money!";
    return `💚 Estimated value recovery through smart discounting: ₹${wastePreventedValue.toLocaleString("en-IN")}! You're turning waste into profit!`;
  }

  if (q.includes("inventory value") || q.includes("total value") || q.includes("worth")) {
    const healthPercentage = Math.round((safe.length / total) * 100);
    return `💰 Total inventory value: ₹${value.toLocaleString("en-IN")}! Your inventory health score: ${healthPercentage}% (${safe.length}/${total} products in good condition)`;
  }
  // ═══ FOOD BANK & DONATION ═══
if (q.includes("food bank") || q.includes("donation") || q.includes("donate") || q.includes("ngo")) {
  const donationEligible = products.filter(p => {
    const daysLeft = getDaysLeft(p.expiry);
    return daysLeft >= 0 && daysLeft <= 3;
  });
  
  if (donationEligible.length === 0) {
    return "🤲 No products are currently eligible for food bank donation. Products expiring in 0-3 days can be safely donated to help families!";
  }
  
  return `🤲 You have ${donationEligible.length} product${donationEligible.length > 1 ? 's' : ''} eligible for food bank donation: ${donationEligible.slice(0,3).map(p => p.name).join(", ")}${donationEligible.length > 3 ? " and more" : ""}. Help feed families while reducing waste!`;
}

if (q.includes("social impact") || q.includes("help families") || q.includes("community")) {
  return "🌟 Great question! Through food bank donations, you're helping feed families while preventing waste. Every donated item provides approximately 2 meals to families in need. You're making a real difference in your community! 💚";
}

if (q.includes("tax benefit") || q.includes("tax deduction")) {
  return "📜 Food donations to registered NGOs like Feeding India Foundation provide tax deduction benefits under Section 80G. You'll receive official receipts for all donations. Doing good while saving on taxes! 🎯";
}
  // ═══ BUSINESS INTELLIGENCE ═══
  if (q.includes("waste percentage") || q.includes("waste stats") || q.includes("efficiency")) {
    const wastePercentage = total > 0 ? Math.round((expired.length / total) * 100) : 0;
    const efficiency = 100 - wastePercentage;
    return `📊 Waste Analysis: ${wastePercentage}% products expired, ${efficiency}% efficiency rate! Industry average is 15% waste - you're ${wastePercentage < 15 ? "performing better than average! 🌟" : "above average, but improving with StockSense!"}`;
  }

  // ═══ BUSINESS INTELLIGENCE ═══
if (q.includes("bestselling") || q.includes("top category") || q.includes("most popular")) {
  if (!topCategory) return "📦 Add more products to see category analysis!";
  
  // Check for ties
  const topCount = topCategory[1];
  const tiedCategories = categories.filter(cat => cat[1] === topCount);
  
  if (tiedCategories.length > 1) {
    const tiedNames = tiedCategories.map(cat => cat[0]).join(", ");
    return `📊 Tie for top categories! ${tiedNames} each have ${topCount} items (${Math.round((topCount/total)*100)}% each). All performing equally well in your store! 🏆`;
  }
  
  return `🏆 Top category: ${topCategory[0]} with ${topCategory[1]} items (${Math.round((topCategory[1]/total)*100)}% of inventory). This category moves fastest in your store!`;
}


  // ═══ ACTION SUGGESTIONS ═══
  if (q.includes("what should i do") || q.includes("what to do") || q.includes("suggest") || q.includes("recommend")) {
    const actions = [];
    if (expired.length > 0) actions.push(`🚨 Remove ${expired.length} expired items`);
    if (products.filter(p => getDaysLeft(p.expiry) === 0).length > 0) actions.push(`⚡ Apply max discount to ${products.filter(p => getDaysLeft(p.expiry) === 0).length} expiring today`);
    if (lowStock.length > 0) actions.push(`📦 Restock ${lowStock.length} low items`);
    if (outStock.length > 0) actions.push(`🛒 Purchase ${outStock.length} out-of-stock items`);
    
    if (actions.length === 0) return "✅ All good! Your inventory is well-managed. Focus on sales and customer service! 😊";
    return `🎯 Priority Actions: ${actions.join(", ")}. Start with expired items first!`;
  }

  if (q.includes("shopping list") || q.includes("need to buy") || q.includes("restock list")) {
    const needRestock = [...lowStock, ...outStock];
    if (needRestock.length === 0) return "✅ No restocking needed right now!";
    const list = needRestock.slice(0, 5).map(p => `${p.name} (${p.quantity || 0} left)`).join(", ");
    return `🛒 Shopping List: ${list}${needRestock.length > 5 ? " and more." : "."} Prioritize fast-moving items!`;
  }

  // ═══ STOCK ANALYSIS ═══
  if (q.includes("low stock") || q.includes("low") || q.includes("restock")) {
    if (lowStock.length === 0)
      return "✅ All products have healthy stock levels! Your inventory planning is spot-on! 📊";
    const names = lowStock.slice(0, 3).map(p => `${p.name} (${p.quantity} left)`).join(", ");
    return `📉 ${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} running low: ${names}${lowStock.length > 3 ? " and more." : "."} Consider restocking popular items first!`;
  }

  if (q.includes("out of stock") || q.includes("empty") || q.includes("finished")) {
    if (outStock.length === 0)
      return "🎉 No out-of-stock items! Perfect inventory management!";
    const names = outStock.slice(0, 3).map(p => p.name).join(", ");
    return `🚫 ${outStock.length} product${outStock.length > 1 ? "s are" : " is"} out of stock: ${names}${outStock.length > 3 ? " and more." : "."} These might be fast-moving items - consider increasing order quantities!`;
  }

  // ═══ MOTIVATIONAL & PERSONAL ═══
  if (q.includes("tired") || q.includes("stressed") || q.includes("difficult")) {
    return `💪 Running a business is challenging, but you're doing amazing! You've prevented ₹${wastePreventedValue.toLocaleString("en-IN")} in waste through smart management. Every day you're helping reduce food waste! 🌱`;
  }

  if (q.includes("encourage") || q.includes("motivate") || q.includes("inspire")) {
    const goodStats = safe.length;
    return `🌟 You're making a real difference! ${goodStats} products in perfect condition shows excellent inventory management. Small businesses like yours are the backbone of sustainable commerce! Keep going! 🚀`;
  }

  // ═══ EXISTING BASIC QUERIES ═══
  if (q.includes("total") || q.includes("how many") || q.includes("count")) {
    return `📦 Inventory Overview: ${total} total products | ✅ ${safe.length} safe | ⏰ ${expiring.length} expiring | ⚠️ ${expired.length} expired | 📉 ${lowStock.length} low stock | 🚫 ${outStock.length} out of stock`;
  }

  if (q.includes("safe") || q.includes("good") || q.includes("healthy")) {
    const percentage = total > 0 ? Math.round((safe.length / total) * 100) : 0;
    return `✅ ${safe.length} products (${percentage}%) are in excellent condition! These form the healthy core of your inventory. Well done! 🌟`;
  }

  if (q.includes("summary") || q.includes("overview") || q.includes("report")) {
    return `📊 StockSense Summary:\n🏪 Total: ${total} products | 💰 Value: ₹${value.toLocaleString("en-IN")}\n✅ Safe: ${safe.length} | ⏰ Expiring: ${expiring.length} | ⚠️ Expired: ${expired.length}\n📉 Low Stock: ${lowStock.length} | 🚫 Out of Stock: ${outStock.length}\n🏆 Top Category: ${topCategory ? topCategory[0] : "None"}`;
  }

  // ═══ HELP & CAPABILITIES ═══
  if (q.includes("help") || q.includes("what can") || q.includes("commands")) {
    return `🤖 I can help with: "Expired items?", "What should I do?", "Money saved?", "Shopping list?", "Today's priorities?", "Waste percentage?", "Top category?", "Encourage me!", or just say "Good morning!" for daily insights! 😊`;
  }

  // ═══ FALLBACK WITH SMART SUGGESTIONS ═══
  return `🤔 I didn't catch that specific question, but I noticed you have ${expired.length} expired items and ${expiring.length} expiring soon. Try asking: "What should I do?", "Today's priorities?", "Money saved?", or "Shopping list?" for actionable insights! 💡`;
};

  // ── Handle submit (text or voice) ──
  const handleAsk = () => {
    if (!inputText.trim()) return;
    const question = inputText.trim();

    // Add user message
    setMessages(prev => [...prev, { from: "user", text: question }]);
    setInputText("");
    setIsLoading(true);

    // Simulate thinking delay
    setTimeout(() => {
      const answer = getAnswer(question);
      setMessages(prev => [...prev, { from: "bot", text: answer }]);
      speak(answer);
      setIsLoading(false);
    }, 600);
  };

  // ── Voice input ──
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Please use Chrome browser!");
      return;
    }

    const recognition         = new SpeechRecognition();
    recognition.lang          = "en-IN";
    recognition.continuous    = false;
    recognition.interimResults = false;
    recognitionRef.current    = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);    // ← shows in input box for confirmation
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ── Only show for admin ──
  if (!user || userRole !== "admin") return null;

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-8px); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform:scale(1);   opacity:1; }
          100% { transform:scale(1.5); opacity:0; }
        }
        .va-fab {
          position:fixed; bottom:32px; right:32px; zIndex:9999;
          width:60px; height:60px; border-radius:50%;
          background:linear-gradient(135deg, ${GREEN}, ${DARK_GREEN});
          border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:26px;
          box-shadow:0 8px 32px rgba(14,110,64,0.45);
          transition:all 0.3s;
          animation: bounce 2.5s ease-in-out infinite;
        }
        .va-fab:hover {
          transform:scale(1.1) !important;
          box-shadow:0 12px 40px rgba(14,110,64,0.6) !important;
          animation:none !important;
        }
        .va-pulse {
          position:absolute; width:60px; height:60px;
          border-radius:50%;
          background:rgba(26,158,95,0.4);
          animation:pulse-ring 1.8s ease-out infinite;
        }
        .va-window {
          position:fixed; bottom:106px; right:32px; zIndex:9998;
          width:360px;
          background:white; border-radius:20px;
          box-shadow:0 20px 60px rgba(0,0,0,0.18);
          display:flex; flex-direction:column;
          overflow:hidden;
          animation:fadeInUp 0.3s ease;
          border:1.5px solid #e0ece0;
          max-height:520px;
        }
        .va-header {
          background:linear-gradient(135deg,${DARK_GREEN},${GREEN});
          padding:16px 20px;
          display:flex; align-items:center;
          justify-content:space-between;
        }
        .va-messages {
          flex:1; overflow-y:auto;
          padding:16px; display:flex;
          flex-direction:column; gap:10px;
          min-height:280px; max-height:320px;
          background:#f9fdf9;
        }
        .va-msg-bot {
          background:white; border:1.5px solid #e0ece0;
          border-radius:16px 16px 16px 4px;
          padding:10px 14px; font-size:13px;
          color:#1a2e1e; font-family:sans-serif;
          max-width:85%; line-height:1.5;
          box-shadow:0 2px 8px rgba(0,0,0,0.06);
        }
        .va-msg-user {
          background:${GREEN}; color:white;
          border-radius:16px 16px 4px 16px;
          padding:10px 14px; font-size:13px;
          font-family:sans-serif; max-width:85%;
          align-self:flex-end; line-height:1.5;
        }
        .va-input-row {
          padding:12px 14px;
          border-top:1px solid #e8f0e8;
          background:white;
          display:flex; gap:8px; align-items:center;
        }
        .va-input {
          flex:1; border:1.5px solid #e0ece0;
          border-radius:100px; padding:10px 16px;
          font-size:13px; font-family:sans-serif;
          outline:none; color:#111;
          transition:border-color 0.2s;
        }
        .va-input:focus {
          border-color:${GREEN};
          box-shadow:0 0 0 3px ${GREEN}22;
        }
        .va-mic {
          width:38px; height:38px; border-radius:50%;
          border:none; cursor:pointer;
          display:flex; align-items:center;
          justify-content:center; font-size:16px;
          transition:all 0.2s; flex-shrink:0;
        }
        .va-send {
          width:38px; height:38px; border-radius:50%;
          border:none; cursor:pointer;
          background:${DARK_GREEN}; color:white;
          display:flex; align-items:center;
          justify-content:center; font-size:16px;
          transition:all 0.2s; flex-shrink:0;
        }
        .va-send:hover { background:${GREEN}; transform:scale(1.05); }
        .va-typing {
          display:flex; gap:4px;
          align-items:center; padding:4px 0;
        }
        .va-dot {
          width:7px; height:7px; border-radius:50%;
          background:${GREEN}; opacity:0.6;
          animation:bounce 0.8s ease-in-out infinite;
        }
        .va-dot:nth-child(2) { animation-delay:0.15s; }
        .va-dot:nth-child(3) { animation-delay:0.30s; }
        .va-suggestions {
          display:flex; gap:6px; flex-wrap:wrap;
          padding:8px 14px; background:#f0f7f0;
          border-top:1px solid #e8f0e8;
        }
        .va-chip {
          background:white; border:1.5px solid #c8e0c8;
          border-radius:100px; padding:4px 12px;
          font-size:11px; font-weight:700;
          color:${DARK_GREEN}; cursor:pointer;
          font-family:sans-serif;
          transition:all 0.15s;
        }
        .va-chip:hover {
          background:${GREEN}; color:white;
          border-color:${GREEN};
        }
      `}</style>

      {/* ── Floating Button ── */}
      <div style={{ position:"fixed", bottom:32, right:32, zIndex:9999 }}>
        <div className="va-pulse" style={{ position:"absolute" }}/>
        <button
          className="va-fab"
          onClick={() => setIsOpen(!isOpen)}
          title="StockSense Voice Assistant"
        >
          {isOpen ? "✕" : "🤖"}
        </button>
      </div>

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="va-window">

          {/* Header */}
          <div className="va-header">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                background:"rgba(255,255,255,0.2)",
                display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:18
              }}>🤖</div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"white", fontFamily:"sans-serif" }}>
                  StockSense Assistant
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontFamily:"sans-serif" }}>
                  🟢 Online · Voice + Text
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background:"rgba(255,255,255,0.2)", border:"none",
                borderRadius:"50%", width:30, height:30,
                cursor:"pointer", color:"white",
                fontSize:14, display:"flex",
                alignItems:"center", justifyContent:"center"
              }}
            >✕</button>
          </div>

          {/* Messages */}
          <div className="va-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.from === "bot" ? "va-msg-bot" : "va-msg-user"}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="va-msg-bot">
                <div className="va-typing">
                  <div className="va-dot"/>
                  <div className="va-dot"/>
                  <div className="va-dot"/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="va-suggestions">
            {["Expired?", "What should I do?", "Food bank?", "Social impact?", "Shopping list?", "Summary"].map(chip => (


              <button
                key={chip}
                className="va-chip"
                onClick={() => {
                  setInputText(chip);
                  setTimeout(() => {
                    setMessages(prev => [...prev, { from:"user", text:chip }]);
                    setInputText("");
                    setIsLoading(true);
                    setTimeout(() => {
                      const ans = getAnswer(chip);
                      setMessages(prev => [...prev, { from:"bot", text:ans }]);
                      speak(ans);
                      setIsLoading(false);
                    }, 600);
                  }, 100);
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Row */}
          <div className="va-input-row">
            {/* Mic Button */}
            <button
              className="va-mic"
              onClick={isListening ? stopListening : startListening}
              style={{
                background: isListening ? "#fee2e2" : "#edfaf3",
                color:      isListening ? "#dc2626" : GREEN,
                boxShadow:  isListening ? "0 0 0 3px #fca5a522" : "none",
              }}
              title={isListening ? "Stop listening" : "Click to speak"}
            >
              {isListening ? "⏹" : "🎤"}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              className="va-input"
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAsk()}
              placeholder={isListening ? "🎤 Listening..." : "Type or speak a question..."}
            />

            {/* Send Button */}
            <button
              className="va-send"
              onClick={handleAsk}
              disabled={!inputText.trim()}
              style={{
                background: inputText.trim() ? DARK_GREEN : "#ccc",
                cursor: inputText.trim() ? "pointer" : "not-allowed"
              }}
            >
              ➤
            </button>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div style={{
              textAlign:"center", padding:"6px",
              fontSize:12, color:"#dc2626",
              fontFamily:"sans-serif", fontWeight:700,
              background:"#fff5f5",
            }}>
              🎤 Listening... speak now, then click Send!
            </div>
          )}
        </div>
      )}
    </>
  );
}