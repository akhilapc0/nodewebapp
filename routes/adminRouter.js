const express = require('express');
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController"); // New import for order management
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({ storage: storage });
const { adminAuth } = require("../middleware/auth");

// Public routes (no auth required)
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/pageerror", adminController.pageerror);

// Protected routes (auth required)
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminAuth, adminController.logout);

// Customer management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// Category management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/edit-category/:id", adminAuth, categoryController.editCategory);

// Brand management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", adminAuth, uploads.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);

// Product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProducts);
router.get('/products', adminAuth, productController.getAllProducts);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);

// Order management routes (new)
router.get("/orderList", adminAuth, orderController.getAllOrders);
router.get("/orders/:orderId", adminAuth, orderController.getAdminOrderDetails);
router.post("/orders/:orderId/status", adminAuth, orderController.updateOrderStatus);
router.post("/orders/:orderId/return", adminAuth, orderController.verifyReturn);

module.exports = router; 










