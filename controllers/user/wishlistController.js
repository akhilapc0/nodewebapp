const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const wishlist = await Wishlist.findOne({ user: userId }).populate('products');

    res.render('wishlist', { wishlist: wishlist || { products: [] } });
  } catch (error) {
    console.error('Error loading wishlist:', error);
    res.status(500).send('Error loading wishlist');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
        return res.status(400).json({ success: false, message: 'Product not available' });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [] });
    }

    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
      await wishlist.save();
      res.json({ success: true, message: 'Product added to wishlist!' });
    } else {
      res.json({ success: false, message: 'Product already in wishlist.' });
    }

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Error adding product to wishlist' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist) {
      wishlist.products.pull(productId);
      await wishlist.save();
      res.json({ success: true, message: 'Item removed from wishlist' });
    } else {
        res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Error removing from wishlist' });
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist
};
