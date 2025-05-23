
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
    const userId = req.session.userId;
    const productId = req.params.productId;

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [] });
    }

    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }

    await wishlist.save();
    res.redirect('/wishlist');
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).send('Error adding to wishlist');
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist) {
      wishlist.products.pull(productId);
      await wishlist.save();
    }

    res.redirect('/wishlist');
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).send('Error removing from wishlist');
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist
};
