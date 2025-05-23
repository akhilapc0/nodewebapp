const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');

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
      cart.items.push({ product: productId, quantity: 1 });
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
          totalPrice += item.product.salesPrice * item.quantity;
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
      error: null
    };

    res.render('cart', viewData);

  } catch (err) {
    console.error('Get cart error:', err);
    res.render('cart', {
      cart: { items: [], totalPrice: 0 },
      message: null,
      error: 'Error loading cart. Please try again.'
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










module.exports = {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart
};