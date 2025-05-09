const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const { userAuth } = require('../middleware/auth');

//error management
router.get('/pageNotFound', userController.pageNotFound)

//sign up management
router.get("/", userController.loadHomePage);
router.get("/signup", userController.loadSignup)
router.post("/signup", userController.signup)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/');
})

//login management
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

//home page and shopping page
router.get("/shop", userController.loadShoppingPage);

//profile management
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);

//product management
router.get("/productDetails", userAuth, userController.loadProductDetails);

// Protected routes
router.get('/cart', userAuth, userController.loadCart);
router.get('/wishlist', userAuth, userController.loadWishlist);

// Cart and Wishlist API routes
router.post('/add-to-cart', userAuth, userController.addToCart);
router.post('/add-to-wishlist', userAuth, userController.addToWishlist);

module.exports = router;