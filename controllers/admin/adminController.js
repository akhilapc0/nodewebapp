const User=require("../../models/userSchema");
const mongoose=require('mongoose');
const bcrypt=require('bcrypt');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");


const pageerror=async (req,res)=>{
    res.render("admin-error")
}








const loadLogin=(req,res)=>{
    try {
        // If already logged in, redirect to dashboard
        if(req.session.admin){
            return res.redirect("/admin");
        }
        // Otherwise show login page
        res.render("admin-login",{message:null})
    } catch (error) {
        console.log("Load login error:", error);
        res.redirect("/admin/pageerror");
    }
}

const login=async (req,res)=>{
    try {
        const { email, password } = req.body;
        console.log("Attempting login with email:", email);

        // First find the user by email only
        const user = await User.findOne({ email: email });
        console.log("Found user:", user);

        if (!user) {
            return res.render("admin-login", { message: "Admin not found" });
        }

        // Then check if the user is an admin
        if (user.isAdmin !== 1) {
            return res.render("admin-login", { message: "Not authorized as admin" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.render("admin-login", { message: "Incorrect password" });
        }

        // Set admin session and email
        req.session.admin = true;
        req.session.adminEmail = email;
        console.log("Admin session set:", req.session);
        return res.redirect("/admin");

    } catch (error) {
        console.log("Login error:", error);
        return res.render("admin-login", { message: "An error occurred during login" });
    }
}


const loadDashboard = async (req, res) => {
    try {
        console.log("Session in dashboard:", req.session);
        if (!req.session.admin) {
            console.log("No admin session found, redirecting to login");
            return res.redirect("/admin/login");
        }
        res.render("dashboard");
    } catch (error) {
        console.log("Dashboard error:", error);
        res.redirect("/admin/pageerror");
    }
};


const logout=async(req,res)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session:", err);
                return res.redirect("/admin/pageerror");
            }
            res.redirect("/admin/login")
        })
     
    }
    catch(error){
        console.log("Logout error:", error);
        res.redirect("/admin/pageerror")
    }
}

const loadCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Get search query if any
        const search = req.query.search || '';

        // Build search query
        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Get total count for pagination
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);

        // Get users with pagination and search
        const users = await User.find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.render('admin/customers', {
            data: users,
            currentPage: page,
            totalPages: totalPages,
            search: search
        });
    } catch (error) {
        console.log("Load customers error:", error);
        res.redirect("/admin/pageerror");
    }
};

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    loadCustomers
}
