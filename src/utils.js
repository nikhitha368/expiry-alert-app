// ===== EXPIRY UTILITIES =====

export function getDaysLeft(expiryDateStr) {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp - today) / 86400000);
}

export function getShelfLifeDays(mfgDate, expiryDate) {
  if (!mfgDate || !expiryDate) return null;
  const mfg = new Date(mfgDate);
  const exp = new Date(expiryDate);
  return Math.floor((exp - mfg) / 86400000);
}

export function getShelfLifeUsedPercent(mfgDate, expiryDate) {
  const totalDays = getShelfLifeDays(mfgDate, expiryDate);
  if (!totalDays || totalDays <= 0) return 0;
  const daysLeft = getDaysLeft(expiryDate);
  if (daysLeft === null) return 0;
  const used = totalDays - daysLeft;
  return Math.min(100, Math.max(0, Math.round((used / totalDays) * 100)));
}

export function getExpiryStatus(daysLeft) {
  if (daysLeft === null) return "unknown";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 15) return "expiring";
  return "safe";
}

export function getStatusBadge(daysLeft) {
  const status = getExpiryStatus(daysLeft);
  if (status === "expired") return { label: "Expired", cls: "badge-expired" };
  if (status === "expiring") return { label: "Expiring Soon", cls: "badge-expiring" };
  return { label: "Safe", cls: "badge-safe" };
}

// ===== REALISTIC FOOD-SAFE DISCOUNT ENGINE =====
// Modeled after Blinkit/Zepto clearance pricing
// Pharmacy removed - medicines cannot be discounted by law
// Dairy/Meat get lower caps for food safety reasons

const CATEGORY_MAX_DISCOUNT = {
  Dairy:      35,   // Milk, Curd, Paneer - food safety
  Meat:       30,   // Chicken, Fish - food safety
  Bakery:     45,   // Bread, Cake
  Vegetables: 60,   // Fresh produce
  Fruits:     60,   // Fresh produce
  Beverages:  55,
  Snacks:     65,
  Frozen:     50,
  Cosmetics:  55,
  Electronics:40,
  Groceries:  60,
  Others:     60,
};

// Realistic tiered discounts - not too extreme
// 1 day   → 50% (capped by category)
// 2-3 days → 40%
// 4-7 days → 25%
// 8-15 days → 10%
export function getDiscount(daysLeft, category = "Others") {
  let base;
  if (daysLeft === null || daysLeft < 0) base = 50;
  else if (daysLeft <= 1) base = 50;
  else if (daysLeft <= 3) base = 40;
  else if (daysLeft <= 7) base = 25;
  else if (daysLeft <= 15) base = 10;
  else base = 0;

  const cap = CATEGORY_MAX_DISCOUNT[category] ?? 60;
  return Math.min(base, cap);
}

export function getDiscountLabel(daysLeft, category) {
  const pct = getDiscount(daysLeft, category);
  if (pct >= 45) return "Flash Deal";
  if (pct >= 30) return "Hot Deal";
  if (pct >= 20) return "Good Deal";
  if (pct > 0) return "Early Bird";
  return "None";
}

export function getDiscountedPrice(originalPrice, daysLeft, category = "Others") {
  const pct = getDiscount(daysLeft, category);
  return parseFloat((originalPrice * (1 - pct / 100)).toFixed(2));
}

export function isClearanceItem(daysLeft) {
  return daysLeft !== null && daysLeft <= 15;
}

// ===== CATEGORY EMOJI =====
export function getCategoryEmoji(category) {
  const map = {
    Vegetables: "🥦", Fruits: "🍎", Dairy: "🥛", Meat: "🥩",
    Bakery: "🍞", Beverages: "🥤", Snacks: "🍿", Frozen: "🧊",
    Cosmetics: "💄", Electronics: "📱", Groceries: "🛒", Others: "📦",
  };
  return map[category] || "📦";
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}