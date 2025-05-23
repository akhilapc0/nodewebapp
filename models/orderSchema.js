const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-schema for order items (matches the structure of cart items in cartSchema.js)
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product', // References the 'product' model (same as in cartSchema.js)
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  price: {
    type: Number,
    required: true // Store the product price at the time of order placement
  }
});

// Main order schema
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // References the 'User' model (same as userId in addressSchema.js and user in cartSchema.js)
    required: true
  },
  items: [orderItemSchema], // Array of items, copied from the cart
  subtotal: {
    type: Number,
    required: true // Sum of price * quantity for all items
  },
  tax: {
    type: Number,
    default: 0 // Optional tax amount (e.g., 10% of subtotal)
  },
  discount: {
    type: Number,
    default: 0 // Optional discount amount (e.g., 5% of subtotal)
  },
  finalTotal: {
    type: Number,
    required: true // Final amount: subtotal + tax - discount
  },
  shippingAddress: {
    // Matches the structure of an address object in addressSchema.js
    addressType: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    landMark: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: Number,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    altPhone: {
      type: String,
      required: true
    }
  },
  paymentMethod: {
    type: String,
    default: 'Cash on Delivery' // As per your requirement
  },
  status: {
    type: String,
    default: 'Pending' // Initial status of the order
  }
}, { timestamps: true }); // Adds createdAt and updatedAt fields

// Create the Order model
const Order = mongoose.model('Order', orderSchema);

// Export the model
module.exports = Order;