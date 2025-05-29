// Calculate subtotal from cart items
const calculateSubtotal = (items) => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Calculate tax (e.g., 10% tax rate)
const calculateTax = (subtotal, taxRate = 0.1) => {
  return subtotal * taxRate;
};

// Calculate discount (e.g., 5% discount)
const calculateDiscount = (subtotal, discountRate = 0.05) => {
  return subtotal * discountRate;
};

// Calculate final total
const calculateFinalTotal = (subtotal, tax, discount) => {
  return subtotal + tax - discount;
};

module.exports = {
  calculateSubtotal,
  calculateTax,
  calculateDiscount,
  calculateFinalTotal
};