const mongoose = require('mongoose');
const { Schema } = mongoose;
const shortid = require('shortid'); // For generating human-friendly orderIDs

// Sub-schema for order items
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  status: {  // Individual item status
    type: String,
    enum: ['ordered', 'cancelled', 'return requested', 'delivered','returned','return rejected','return accepted'],
    default: 'ordered'
  },
  cancelReason: {
    type: String
  },
  returnReason: {
    type: String
  }
});

// Main order schema
const orderSchema = new mongoose.Schema({
  orderID: {
    type: String,
    unique: true,
    default: shortid.generate
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  finalTotal: {
    type: Number,
    required: true
  },
  shippingAddress: {
    addressType: String,
    name: String,
    city: String,
    landMark: String,
    state: String,
    pincode: Number,
    phone: String,
    altPhone: String
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Razorpay'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'shipped', 'out for delivery', 'delivered', 'cancelled', 'returned', 'return-pending', 'return-cancelled'],
    default: 'pending'
  },
  cancelReason: {
    type: String
  },
  returnRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  refund: {
    refunded: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number
    }
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  adminNotes: String,         // For internal admin comments
  trackingNumber: String,     // For shipped orders
  expectedDelivery: Date      // Estimated delivery date
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted order date
orderSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Pre-save hook to ensure consistency
orderSchema.pre('save', function(next) {
  // Auto-update payment status for COD orders
  if (this.paymentMethod === 'COD' && this.isModified('status')) {
    if (this.status === 'delivered') {
      this.paymentStatus = 'paid';
    }
  }
  next();
});

// Static method for order search
orderSchema.statics.searchOrders = async function(query) {
  return this.find({
    $or: [
      { orderID: { $regex: query, $options: 'i' } },
      { 'user.name': { $regex: query, $options: 'i' } },
      { trackingNumber: { $regex: query, $options: 'i' } }
    ]
  }).populate('user items.product');
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;