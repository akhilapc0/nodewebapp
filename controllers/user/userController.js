const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Wishlist = require('../../models/wishlistSchema');

const env = require('dotenv').config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    }
    catch (error) {
        res.redirect("/pageNotFound")
    }
}
const loadSignup = async (req, res) => {
    try {
        console.log(process.env.NODEMAILER_PASSWORD)

        res.render("signup")
    }
    catch (error) {
        console.log("homepage not loading", error);
        res.status(500).send("server error");
    }
}

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        console.log("Listed categories:", categories.map(c => c._id));

        
        const allProducts = await Product.find({});
        console.log("All products in database:", allProducts.map(p => ({
            name: p.productName,
            category: p.category,
            isBlocked: p.isBlocked,
            quantity: p.quantity,
            createdOn: p.createdOn
        })));

    
        const categoryIds = categories.map(category => category._id);
        console.log("Category IDs for filtering:", categoryIds);

        let productData = await Product.find()
            .populate('category')
            .populate('brand');
        const newArrivals = productData.slice(0, 4);
        
        console.log("New arrivals:", newArrivals.length);
        console.log("New arrivals details:", newArrivals.map(p => ({
            name: p.productName,
            createdOn: p.createdOn
        })));

        console.log("Products sent to home view:", newArrivals);
        let cartCount = 0;
        if (user) {
            const userData = await User.findOne({ _id: user });
            // Fetch cart count
            const Cart = require('../../models/cartSchema');
            const cart = await Cart.findOne({ user: user });
            cartCount = cart && cart.items ? cart.items.length : 0;
            return res.render("home", {
                user: userData,
                products: newArrivals,
                cartCount
            });
        } else {
            return res.render("home", {
                products: newArrivals,
                cartCount
            });
        }
    } catch (error) {
        console.error("Home page error:", error);
        res.status(500).send("Server error");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({

            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,

                pass: process.env.NODEMAILER_PASSWORD
            }

        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "verify your account",
            text: `your OTP is ${otp}`,
            html: `<b>your otp :${otp}</b>`
        })
        return info.accepted.length > 0
    }
    catch (error) {
        console.error("error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {

    try {
        console.log("dfsdfs")
        const { name, phone, email, password, cpassword } = req.body;
        if (password !== cpassword) {
            return res.render("signup", { message: "passwords do not match" });
        }
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email alreday exist" })
        }
        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email.error");
        }
        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
        res.render("verify-otp");
        console.log('otp send', otp)

    }
    catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound")
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash
    }
    catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        if (otp === req.session.userOtp) {
            const userData = req.session.userData;
            const passwordHash = await securePassword(userData.password);

            const saveUserData = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash

            })
            await saveUserData.save();

            req.session.user = saveUserData._id;
            req.session.userOtp = null;
            req.session.userData = null;
            res.json({ success: true, redirectUrl: "/" })

        }
        else {
            res.status(400).json({ success: false, message: "Invalid OTP,please try again" })
        }
    }
    catch (error) {
        console.log("error verifying OTP", error);
        res.status(500).json({ success: "false", message: "an error occured" });

    }
}

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "email not found in session" });

        }
        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP resent successfully" })
        } else {
            res.status(500).json({ success: false, message: "failed to resend OTP,pls try again" })
        }



    }
    catch (error) {
        console.error("error resending OTP", error);
        res.status(500).json({ success: false, message: "internal server error.pls try again" })
    }

}
const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            const message = req.query.message || null;
            return res.render("login", { message });
        } else {
            res.redirect('/user/')
        }
    }
    catch (error) {
        res.redirect("pageNotFound")
    }
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const findUser = await User.findOne({ email: email });
        
        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }

        // Check if user is blocked
        if (findUser.isBlocked) {
            return res.render("login", { message: "Your account has been blocked. Please contact support." });
        }

        // Check if user is admin
        if (findUser.isAdmin === 1) {
            return res.render("login", { message: "Please use admin login page" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" });
        }

        // Set user session
        req.session.user = findUser._id;
        
        // Redirect to user homepage
        res.redirect('/user/');
    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed. Please try again later." });
    }
};
const logout = async (req, res) => {
    try {
        
        req.session.destroy((err) => {
            if (err) {
                console.log("session destruction error", err.message);
                return res.redirect("/pageNotFound");
            }
            
            
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Expires', '0');
            res.set('Pragma', 'no-cache');
            
            
            res.clearCookie('connect.sid');
            
        
            return res.redirect("/user/login");
        });
    } catch (error) {
        console.log("logout error", error);
        res.redirect("/pageNotFound");
    }
}

const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        
        const { 
            search, 
            category, 
            brand, 
            minPrice, 
            maxPrice, 
            page = 1
        } = req.query;

        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        // --- Build Filter ---
        let filter = {
            isBlocked: false,
            stock: { $gt: 0 } // Use stock instead of quantity
        };

        // Category filter
        if (category && category !== 'all' && category.length > 0) {
            filter.category = category;
        } else {
            // Default to all listed categories if no specific one is chosen
            const categoryIds = categories.map(c => c._id);
            filter.category = { $in: categoryIds };
        }

        // Brand filter
        if (brand && brand !== 'all' && brand.length > 0) {
            filter.brand = brand;
        }

        // Price filter
        if (minPrice || maxPrice) {
            filter.salesPrice = {};
            if (minPrice) filter.salesPrice.$gte = Number(minPrice);
            if (maxPrice) filter.salesPrice.$lte = Number(maxPrice);
        }

        // Search filter
        if (search) {
            const trimmedSearch = search.trim().toLowerCase();
            filter.$or = [
                { productName: { $regex: trimmedSearch, $options: 'i' } },
                { description: { $regex: trimmedSearch, $options: 'i' } }
            ];
        }
        
        const totalProducts = await Product.countDocuments(filter);
        
        const limit = 9;
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .populate('category')
            .populate('brand')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalProducts / limit);
        
        let cartCount = 0;
        if (user) {
            const Cart = require('../../models/cartSchema');
            const cart = await Cart.findOne({ user: user });
            cartCount = cart && cart.items ? cart.items.length : 0;
        }

        res.render("shop", {
            user: userData,
            products: products,
            category: categories, // Pass full category objects
            brand: brands,       // Pass full brand objects
            totalProducts: totalProducts,
            currentPage: parseInt(page),
            totalPages: totalPages,
            search: search || '',
            selectedCategory: category || '',
            selectedBrand: brand || '',
            minPrice: minPrice || '',
            maxPrice: maxPrice || '',
            cartCount
        });

    } catch (error) {
        console.error("Error in loadShoppingPage:", error);
        res.redirect("/pageNotFound");
    }
};

const loadProductDetails = async (req, res) => {
    try {
        const productId = req.query.id;
        if (!productId) {
            return res.redirect('/user/shop');
        }

        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;

        // Fetch cart count
        let cartCount = 0;
        if (user) {
            const Cart = require('../../models/cartSchema');
            const cart = await Cart.findOne({ user: user });
            cartCount = cart && cart.items ? cart.items.length : 0;
        }

        const product = await Product.findOne({ _id: productId, isBlocked: false })
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.redirect('/user/shop');
        }

        res.render('product-details', {
            user: userData,
            product: product,
            category: product.category,
            brand: product.brand,
            quantity: product.quantity,
            cartCount
        });

    } catch (error) {
        console.error('Error in loadProductDetails:', error);
        res.redirect('/user/shop');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to add items to wishlist' });
        }
        
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Find the product
        const product = await Product.findOne({ 
            _id: productId,
            isBlocked: false
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find or create wishlist for the user
        let wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                products: [productId]
            });
        } else {
            // Check if product is already in wishlist
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ success: false, message: 'Product already in wishlist' });
            }
            wishlist.products.push(productId);
        }

        await wishlist.save();

        res.json({ success: true, message: 'Product added to wishlist successfully' });

    } catch (error) {
        console.error('Error in addToWishlist:', error);
        res.status(500).json({ success: false, message: 'Error adding product to wishlist' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login to manage wishlist' });
        }

        const wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        // Remove the product from the wishlist
        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();

        res.json({ success: true, message: 'Product removed from wishlist' });

    } catch (error) {
        console.error('Error in removeFromWishlist:', error);
        res.status(500).json({ success: false, message: 'Error removing product from wishlist' });
    }
};

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        
        // Check if user is logged in
        if (!userId) {
            console.log('No user ID in session, redirecting to login for wishlist');
            return res.redirect('/user/login');
        }

        const userData = await User.findOne({ _id: userId });

        // Check if user data was found
        if (!userData) {
            console.log('User data not found for ID in session, destroying session and redirecting to login');
            req.session.destroy(err => {
                if (err) console.log("Error destroying session after user not found:", err);
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.set('Expires', '0');
                res.set('Pragma', 'no-cache');
                res.clearCookie('connect.sid');
                return res.redirect('/user/login?message=Session invalid. Please login again.');
            });
            return;
        }

        // Fetch the user's wishlist and populate product details
        let wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'products',
                match: { isBlocked: false },
                select: 'productName productImage salesPrice originalPrice quantity discountPercentage'
            });

        // If no wishlist exists, create an empty one
        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                products: []
            });
            await wishlist.save();
        }

        // Filter out any null products (in case they were deleted)
        wishlist.products = wishlist.products.filter(product => product !== null);
        
        console.log('Fetched wishlist:', wishlist);

        res.render('wishlist', { 
            user: userData,
            wishlist: wishlist,
            title: 'My Wishlist',
            siteName: 'Perfume Store'
        });

    } catch (error) {
        console.error('Error in loadWishlist:', error);
        res.status(500).render('error', { 
            message: 'Error loading wishlist',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

const loadOrderSuccessPage = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user; // Get user ID from session
        let userData = null;

        if (userId) {
            userData = await User.findById(userId); // Fetch user data if logged in
        }

        // In a real application, you would fetch order details from the database here
        // using the orderId and pass them to the EJS template.

        // For now, we'll just render the success page with the orderId and user data
        res.render('user/order-success', { orderId, user: userData });
    } catch (error) {
        console.error('Error loading order success page:', error);
        res.status(500).send('Error loading order success page.');
    }
};

module.exports = {
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    loadProductDetails,
    addToWishlist,
    removeFromWishlist,
    loadWishlist,
    loadHomePage,
    loadOrderSuccessPage
};



