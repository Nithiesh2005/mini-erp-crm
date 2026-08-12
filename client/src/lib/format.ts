// Indian Rupee display formatting. DB values stay raw numbers — this is
// presentation only. 30 → ₹30.00, 2.5 → ₹2.50.
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
export const formatINR = (n: number) => inr.format(n);
