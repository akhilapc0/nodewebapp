const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
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

// const loadHomePage = async (req, res) => {
//     try {
//         const user = req.session.user;
//         const categories = await Category.find({ isListed: true });
//         let productData = await Product.find(
//             {
//                 isBlocked: false,
//                 category: { $in: categories.map(category => category._id) }, quanatity: { $gt: 0 }
//             }
//         )

//         productData.sort((a, b) => new Date(a, createdOn));
//         productData = productData.slice(0, 4);
//         console.log("",productData)
//         if (user) {
//             const userData = await User.findOne({ _id: user });
//             res.render("home", { user: userData, products: productData })
//         }
//         else {
//             return res.render("home", { products: productData })
//         }
//     }
//     catch (error) {
//         console.log("home page not found");
//         res.status(500).send("server error");
//     }
// }
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
            .then(products => {
                return products.filter(product => {
                    const isValid = !product.isBlocked && 
                                  product.quantity > 0 && 
                                  categoryIds.some(id => id.toString() === product.category._id.toString());
                    console.log(`Filtering ${product.productName}:`, {
                        isBlocked: product.isBlocked,
                        quantity: product.quantity,
                        categoryId: product.category._id,
                        isValid: isValid
                    });
                    return isValid;
                });
            });

        console.log("Filtered products:", productData.length);
        console.log("Products details with categories:", productData.map(p => ({
            name: p.productName,
            category: p.category,
            categoryId: p.category._id,
            isBlocked: p.isBlocked,
            quantity: p.quantity,
            createdOn: p.createdOn
        })));

        
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        const newArrivals = productData.slice(0, 4);
        
        console.log("New arrivals:", newArrivals.length);
        console.log("New arrivals details:", newArrivals.map(p => ({
            name: p.productName,
            createdOn: p.createdOn
        })));

        if (user) {
            const userData = await User.findOne({ _id: user });
            return res.render("home", {
                user: userData,
                products: newArrivals
            });
        } else {
            return res.render("home", {
                products: newArrivals
            });
        }
    } catch (error) {
        console.error("Home page error:", error);
        res.status(500).send("Server error");
    }
};



// const signup=async(req,res)=>{
//     try{
//         const{name, email, phone, password, cpassword}=req.body;

//         // Check if passwords match
//         if(password!==cpassword){
//             return res.render("signup",{message:"Passwords do not match"})
//         }

//         // Check if user already exists
//         const existingUser = await user.findOne({ email: email });
//         if(existingUser){
//             return res.render("signup",{message:"Email already registered"})
//         }

//         // Create new user
//         const newUser = new user({
//             name,
//             email,
//             phone,
//             password
//         });

//         // Save user to database
//         await newUser.save();

//         // Redirect to login page after successful registration
//         res.redirect("/login");
//     }
//     catch(error){
//         console.log("Error in signup:", error);
//         res.render("signup",{message:"An error occurred during registration"})
//     }
// }

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
            res.redirect('/')
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
        
        // Redirect to home page
        res.redirect('/');
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
            
        
            return res.redirect("/login");
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

        console.log('Query Parameters:', { search, category, brand, minPrice, maxPrice, page });

        
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id);
        
        
        let filter = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        
        if (category) {
            filter.category = category;
        } else {
            filter.category = { $in: categoryIds };
        }

        
        if (brand) {
            filter.brand = brand;
        }

        
        if (minPrice || maxPrice) {
            filter.salesPrice = {};
            if (minPrice) filter.salesPrice.$gte = Number(minPrice);
            if (maxPrice) filter.salesPrice.$lte = Number(maxPrice);
        }

        if (search) {
            filter.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        
        console.log('Final Filter:', JSON.stringify(filter, null, 2));

        
        const totalProducts = await Product.countDocuments(filter);
        console.log('Total products matching filter:', totalProducts);

        
        const limit = 9;
        const skip = (page - 1) * limit;

        
        const products = await Product.find(filter)
            .populate('category')
            .populate('brand')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        
        console.log('Products found:', products.length);
        products.forEach(p => {
            console.log('Product:', {
                name: p.productName,
                category: p.category?.name,
                brand: p.brand?.brandName,
                price: p.salesPrice,
                isBlocked: p.isBlocked,
                quantity: p.quantity
            });
        });

        const totalPages = Math.ceil(totalProducts / limit);
        
        
        const brands = await Brand.find({ isBlocked: false });
        
        
        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name
        }));

        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: parseInt(page),
            totalPages: totalPages,
            search: search || '',
            selectedCategory: category || '',
            selectedBrand: brand || '',
            minPrice: minPrice || '',
            maxPrice: maxPrice || ''
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
            return res.redirect('/shop');
        }

        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;

        const product = await Product.findOne({ _id: productId, isBlocked: false })
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.redirect('/shop');
        }

        res.render('product-details', {
            user: userData,
            product: product,
            category: product.category,
            brand: product.brand,
            quantity: product.quantity
        });

    } catch (error) {
        console.error('Error in loadProductDetails:', error);
        res.redirect('/shop');
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Find product and populate category (model name is lowercase 'category')
        const product = await Product.findOne({ _id: productId }).populate({ path: 'category', model: 'category' });

        // Debug log
        if (!product) {
            console.error('addToCart: Product not found for id', productId);
        } else if (!product.category) {
            console.error('addToCart: Product found but category not populated', productId);
        }

        // Check product and category status
        if (!product || product.isBlocked || product.quantity <= 0) {
            return res.status(404).json({ success: false, message: 'Product not found or not available' });
        }
        if (!product.category || product.category.isListed === false) {
            return res.status(403).json({ success: false, message: 'Product category is unlisted. Cannot add to cart.' });
        }

        // If you have a Cart model, add logic here to actually add to cart
        // For now, just return success
        res.json({ success: true, message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({ success: false, message: 'Error adding product to cart' });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

       
        const product = await Product.findOne({ 
            _id: productId,
            isBlocked: false
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product added to wishlist successfully' });

    } catch (error) {
        console.error('Error in addToWishlist:', error);
        res.status(500).json({ success: false, message: 'Error adding product to wishlist' });
    }
};

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });

        res.render('cart', { user: userData });

    } catch (error) {
        console.error('Error in loadCart:', error);
        res.redirect('/pageNotFound');
    }
};

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });

        res.render('wishlist', { user: userData });

    } catch (error) {
        console.error('Error in loadWishlist:', error);
        res.redirect('/pageNotFound');
    }
};

module.exports = {
    loadHomePage,
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
    addToCart,
    addToWishlist,
    loadCart,
    loadWishlist
}



