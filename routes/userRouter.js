const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const { userAuth, noCache } = require('../middleware/auth');
const upload = require('../middleware/upload');


router.use(noCache);


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
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail);
router.post('/resend-otp', profileController.resendOtp);
router.get('/change-password',userAuth,profileController.changePassword);
router.post('/change-password',userAuth,profileController.changePasswordValid);
router.post("/change-password-otp",userAuth,profileController.verifyChangePassOtp);
router.post("/resend-changepassword-otp", userAuth, profileController.resendChangePassOtp);

//Address Management
router.get("/add-address", userAuth, profileController.addAddress);
router.post("/add-address", userAuth, profileController.postAddAddress);
router.get("/edit-address/:id", userAuth, profileController.editAddress);
router.post("/edit-address/:id", userAuth, profileController.updateAddress);
router.post("/delete-address/:id", userAuth, profileController.deleteAddress);

//product management
router.get("/productDetails", userController.loadProductDetails);

// Protected routes
router.get('/cart', userAuth, userController.loadCart);
router.get('/wishlist', userAuth, userController.loadWishlist);

// Cart and Wishlist API routes
router.post('/add-to-cart', userAuth, userController.addToCart);
router.post('/add-to-wishlist', userAuth, userController.addToWishlist);

// User profile
router.get('/profile', userAuth, profileController.userProfile);

// Profile Image Update
router.post("/update-profile-image", userAuth, upload.single('profileImage'), profileController.updateProfileImage);

// Edit Profile
router.get('/edit-profile', userAuth, profileController.getEditProfile);
router.post('/edit-profile', userAuth, upload.single('profileImage'), profileController.postEditProfile);

module.exports = router;