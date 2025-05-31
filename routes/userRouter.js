const express = require('express');
const router = express.Router();
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController');
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const wishlistController = require('../controllers/user/wishlistController');
const orderController = require('../controllers/user/orderController'); // New import for order management

// Assuming you have a userAuth middleware similar to adminAuth
const { userAuth } = require('../middleware/auth');

// Add the root route
router.get('/', userController.loadHomePage);

// Add routes for signup page (GET and POST)
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);

// Add route for shop page, using userController
router.get('/shop', userController.loadShoppingPage);

// Add route for product details page
router.get('/productDetails', userController.loadProductDetails);

// Profile and user management routes
router.get('/profile', userAuth, profileController.userProfile);
router.get('/edit-profile', userAuth, profileController.getEditProfile);
router.post('/edit-profile', userAuth, profileController.postEditProfile);
router.post('/update-profile-image', userAuth, profileController.updateProfileImage);
router.get('/change-email', userAuth, profileController.changeEmail);
router.post('/change-email', userAuth, profileController.changeEmailValid);
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp);
router.post('/update-email', userAuth, profileController.updateEmail);
router.get('/change-password', userAuth, profileController.changePassword);
router.post('/change-password', userAuth, profileController.changePasswordValid);
router.post('/verify-change-pass-otp', userAuth, profileController.verifyChangePassOtp);
router.post('/resend-change-pass-otp', userAuth, profileController.resendChangePassOtp);
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-password', profileController.forgotEmailValid);
router.post('/verify-forgot-pass-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);

// Address management routes
router.get('/add-address', userAuth, profileController.addAddress);
router.post('/add-address', userAuth, profileController.postAddAddress);
router.get('/edit-address/:id', userAuth, profileController.editAddress);
router.post('/edit-address/:id', userAuth, profileController.updateAddress);
router.post('/delete-address/:id', userAuth, profileController.deleteAddress);

// Cart routes
router.post('/add-to-cart', userAuth, cartController.addToCart);
router.get('/cart', userAuth, cartController.getCart);
router.post('/update-quantity', userAuth, cartController.updateQuantity);
router.post('/remove-from-cart/:productId', userAuth, cartController.removeFromCart);
router.post('/cart/update-quantity', userAuth, cartController.updateQuantity);

// Checkout routes
router.get('/checkout', userAuth, cartController.loadCheckout);
router.post('/place-order', userAuth, cartController.placeOrder);
router.post('/set-default-address/:id', userAuth, profileController.setDefaultAddress);

// Login and wishlist routes
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userAuth, userController.logout);
router.get('/wishlist', userAuth, userController.loadWishlist);

// Wishlist routes
router.post('/add-to-wishlist', userAuth, userController.addToWishlist);
router.post('/wishlist/remove/:productId', userAuth, userController.removeFromWishlist);

// Order success route
router.get('/order/success/:orderId', userAuth, userController.loadOrderSuccessPage);

// Order management routes (new)
router.get('/orders', userAuth, orderController.getUserOrders);
router.get('/orders/:orderId', userAuth, orderController.getUserOrderDetails);
router.post('/orders/:orderId/cancel', userAuth, orderController.cancelOrder);
router.post('/orders/:orderId/return', userAuth, orderController.requestReturn);
router.get('/orders/:orderId/invoice', userAuth, orderController.downloadInvoice);

// User notifications route
router.get('/notifications', orderController.getUserNotifications);

module.exports = router;