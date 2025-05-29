const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const { calculateSubtotal, calculateTax, calculateDiscount, calculateFinalTotal } = require('../../helpers/calculations');
const User = require('../../models/userSchema');

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.body.productId;

    // Check if product exists and is available
    const product = await Product.findById(productId).populate('category');
    if (!product || product.isBlocked || !product.category.isListed || product.quantity <= 0) {
      return res.status(400).json({ error: 'Product not available' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if product is already in cart
    const itemIndex = cart.items.findIndex(item => item.product.equals(productId));
    const maxQty = Math.min(product.quantity, 5); // Maximum 5 items or available stock

    if (itemIndex > -1) {
      // Product exists in cart, increment quantity if possible
      if (cart.items[itemIndex].quantity < maxQty) {
        cart.items[itemIndex].quantity += 1;
      } else {
        return res.status(400).json({ error: 'Maximum quantity reached' });
      }
    } else {
      // Add new product to cart
      cart.items.push({ 
        product: productId, 
        quantity: 1,
        price: product.salesPrice // Added price field
      });
    }

    // Remove from wishlist if exists
    await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });

    await cart.save();
    return res.status(200).json({ message: 'Product added to cart' });
  } catch (err) {
    console.log('Add to cart error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log('Session user ID:', userId);
    
    if (!userId) {
      console.log('No user ID in session, redirecting to login');
      return res.redirect('/login');
    }

    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        populate: { 
          path: 'category',
          select: 'name isListed'
        }
      });
    
    console.log('Found cart:', cart ? 'yes' : 'no');

    // Calculate total price and filter out invalid items
    let totalPrice = 0;
    let validItems = [];

    if (cart && cart.items) {
      validItems = cart.items.filter(item => {
        if (item.product && !item.product.isBlocked && 
            item.product.category && item.product.category.isListed) {
          totalPrice += item.price * item.quantity; // Updated to use price field
          return true;
        }
        return false;
      });
    }

    // Update cart with valid items only
    if (cart && validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Prepare the view data
    const viewData = {
      cart: cart ? {
        ...cart.toObject(),
        items: validItems,
        totalPrice
      } : {
        items: [],
        totalPrice: 0
      },
      message: validItems.length === 0 ? 'Your cart is empty' : null,
      error: null,
      // Fetch and pass user data
      user: await User.findById(userId)
    };

    res.render('cart', viewData);
  } catch (err) {
    console.error('Get cart error:', err);
    res.render('cart', {
      cart: { items: [], totalPrice: 0 },
      message: null,
      error: 'Error loading cart. Please try again.',
      user: null // Pass null user on error
    });
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { productId, action } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ error: 'Please login to continue' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const item = cart.items.find(item => item.product.equals(productId));
    if (!item) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    const maxQty = Math.min(product.quantity, 5);

    if (action === 'increment') {
      if (item.quantity < maxQty) {
        item.quantity += 1;
      } else {
        return res.status(400).json({ 
          error: 'Maximum quantity reached',
          message: `Maximum quantity (${maxQty}) reached for this product`,
          maxReached: true
        });
      }
    } else if (action === 'decrement') {
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        return res.status(400).json({
          error: 'Minimum quantity reached',
          message: 'Minimum quantity (1) reached for this product',
          minReached: true
        });
      }
    }

    await cart.save();
    res.json({ 
      success: true, 
      newQuantity: item.quantity,
      message: 'Cart updated successfully',
      maxReached: item.quantity >= maxQty,
      minReached: item.quantity <= 1
    });
  } catch (err) {
    console.error('Quantity update error:', err);
    res.status(500).json({ error: 'Error updating quantity' });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ error: 'Please login to continue' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => !item.product.equals(productId));
    await cart.save();

    res.json({ 
      success: true,
      message: 'Item removed from cart'
    });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ error: 'Error removing item' });
  }
};

// New functions for the checkout system
const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log('[loadCheckout] User ID:', userId);
    if (!userId) {
      console.log('[loadCheckout] No user ID in session, redirecting to login');
      return res.redirect('/login');
    }

    console.log('[loadCheckout] Fetching cart...');
    // Fetch cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        populate: { 
          path: 'category',
          select: 'name isListed'
        }
      });
    console.log('[loadCheckout] Cart fetched:', cart ? 'Found' : 'Not Found');

    console.log('[loadCheckout] Fetching addresses...');
    // Fetch addresses
    const addressData = await Address.findOne({ userId });
    const addresses = addressData ? addressData.address : [];
    console.log(`[loadCheckout] Addresses fetched: ${addresses.length} found`);

    console.log('[loadCheckout] Calculating totals...');
    // Calculate totals
    let subtotal = 0;
    let validItems = [];

    if (cart && cart.items) {
      console.log(`[loadCheckout] Processing ${cart.items.length} cart items.`);
      validItems = cart.items.filter(item => {
        if (item.product && !item.product.isBlocked && 
            item.product.category && item.product.category.isListed) {
          subtotal += item.price * item.quantity;
          return true;
        }
        console.log('[loadCheckout] Filtering out invalid item:', item);
        return false;
      });
       console.log(`[loadCheckout] Processed valid items: ${validItems.length}. Subtotal: ${subtotal}`);

      // Update cart with valid items only
       if (validItems.length !== cart.items.length) {
         console.log('[loadCheckout] Updating cart with valid items...');
         cart.items = validItems;
         await cart.save();
         console.log('[loadCheckout] Cart updated.');
       }
    }

    if (!cart || validItems.length === 0) {
      console.log('[loadCheckout] Cart is empty or invalid, redirecting to cart page.');
      return res.redirect('/cart');
    }

    console.log('[loadCheckout] Calculating tax, discount, and final total...');
    const tax = calculateTax(subtotal);
    const discount = calculateDiscount(subtotal);
    const finalTotal = calculateFinalTotal(subtotal, tax, discount);
    console.log(`[loadCheckout] Totals calculated: Tax=${tax}, Discount=${discount}, Final Total=${finalTotal}`);

    console.log('[loadCheckout] Rendering checkout page...');
    res.render('checkout', {
      cart: cart ? { ...cart.toObject(), items: validItems } : { items: [] },
      addresses,
      subtotal,
      tax,
      discount,
      finalTotal,
      message: null,
      error: null,
      user: await User.findById(userId)
    });
  } catch (err) {
    console.error('Load checkout error:', err);
    res.render('checkout', {
      cart: { items: [] },
      addresses: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      finalTotal: 0,
      message: null,
      error: 'Error loading checkout page. Please try again.',
      user: null
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      // Send JSON response for AJAX request
      return res.status(401).json({ success: false, message: 'Please login to continue' });
    }

    const { addressId, paymentMethod } = req.body; // Get addressId and paymentMethod from request body

    // Fetch cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        populate: {
          path: 'category',
          select: 'name isListed'
        }
      });

    if (!cart || cart.items.length === 0) {
      // Send JSON response for empty cart
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    // Fetch addresses and find the selected one
    const addressData = await Address.findOne({ userId });
    if (!addressData || addressData.address.length === 0) {
       // Send JSON response if no addresses found
      return res.status(404).json({ success: false, message: 'No shipping addresses found. Please add one.' });
    }

    const selectedAddress = addressData.address.id(addressId); // Find selected address by ID
    if (!selectedAddress) {
      // Send JSON response if selected address not found
      return res.status(404).json({ success: false, message: 'Selected shipping address not found.' });
    }

    // Calculate totals (re-calculate in backend for security)
    let subtotal = 0;
    let validItems = [];

    validItems = cart.items.filter(item => {
      if (item.product && !item.product.isBlocked &&
          item.product.category && item.product.category.isListed) {
        subtotal += item.price * item.quantity;
        return true;
      }
      return false;
    });
     // Note: We should ideally update cart with valid items here if needed, but for order placement, we proceed with available valid items.

    const tax = calculateTax(subtotal);
    const discount = calculateDiscount(subtotal);
    const finalTotal = calculateFinalTotal(subtotal, tax, discount);

    // Create order
    const order = new Order({
      user: userId,
      items: validItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal,
      tax,
      discount,
      finalTotal,
      shippingAddress: { // Use selected address data
        addressType: selectedAddress.addressType, // Use from selectedAddress
        name: selectedAddress.name, // Use from selectedAddress
        city: selectedAddress.city, // Use from selectedAddress
        landMark: selectedAddress.landMark, // Include landmark from selectedAddress
        state: selectedAddress.state, // Use from selectedAddress
        pincode: selectedAddress.pincode, // Use from selectedAddress
        phone: selectedAddress.phone, // Use from selectedAddress
        altPhone: selectedAddress.altPhone // Include altPhone from selectedAddress
      },
      paymentMethod: paymentMethod, // Use selected payment method from req.body
      status: paymentMethod === 'COD' ? 'Pending' : 'Payment Pending' // Set initial status based on payment method
    });

    await order.save();

    // Clear cart only if order is successfully created
    cart.items = [];
    await cart.save();

    // For COD, send JSON success response with orderId
    if (paymentMethod === 'COD') {
        res.json({ success: true, orderId: order._id });
    } else if (paymentMethod === 'Razorpay') {
        // Handle Razorpay payment initiation here
        // For now, sending a success response (will need further implementation)
         res.json({ success: true, orderId: order._id, message: 'Razorpay payment initiated' });
    }

  } catch (err) {
    console.error('Place order error:', err);
    // Send JSON error response for AJAX request
    res.status(500).json({ success: false, message: 'Error placing order. Please try again.' });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  loadCheckout,
  placeOrder
};