const express = require('express');
const router = express.Router();
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController');
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const wishlistController = require('../controllers/user/wishlistController');

// Add the root route
router.get('/', userController.loadHomePage);

// Add routes for signup page (GET and POST)
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);

// Add route for shop page, using userController
router.get('/shop', userController.loadShoppingPage);

// Add route for product details page
router.get('/productDetails', userController.loadProductDetails);

// Profile and user management routes (assumed to already exist)
router.get('/profile', profileController.userProfile);
router.get('/edit-profile', profileController.getEditProfile);
router.post('/edit-profile', profileController.postEditProfile);
router.post('/update-profile-image', profileController.updateProfileImage);
router.get('/change-email', profileController.changeEmail);
router.post('/change-email', profileController.changeEmailValid);
router.post('/verify-email-otp', profileController.verifyEmailOtp);
router.post('/update-email', profileController.updateEmail);
router.get('/change-password', profileController.changePassword);
router.post('/change-password', profileController.changePasswordValid);
router.post('/verify-change-pass-otp', profileController.verifyChangePassOtp);
router.post('/resend-change-pass-otp', profileController.resendChangePassOtp);
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-password', profileController.forgotEmailValid);
router.post('/verify-forgot-pass-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);

// Address management routes (assumed to already exist)
router.get('/add-address', profileController.addAddress);
router.post('/add-address', profileController.postAddAddress);
router.get('/edit-address/:id', profileController.editAddress);
router.post('/edit-address/:id', profileController.updateAddress);
router.post('/delete-address/:id', profileController.deleteAddress);

// Cart routes (assumed to already exist)
router.post('/add-to-cart', cartController.addToCart);
router.get('/cart', cartController.getCart);
router.post('/update-quantity', cartController.updateQuantity);
router.post('/remove-from-cart/:productId', cartController.removeFromCart);

// Checkout routes (new)
router.get('/checkout', cartController.loadCheckout);
router.post('/place-order', cartController.placeOrder);
router.post('/set-default-address/:id', profileController.setDefaultAddress);

// Login and wishlist routes (GET and POST for login)
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);
router.get('/wishlist', userController.loadWishlist);

// Wishlist routes
router.post('/add-to-wishlist', wishlistController.addToWishlist);

// Order success route
router.get('/order/success/:orderId', userController.loadOrderSuccessPage);

module.exports = router;