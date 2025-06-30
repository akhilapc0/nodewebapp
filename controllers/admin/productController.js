const Product=require('../../models/productSchema');
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema");
const User=require("../../models/userSchema");
const fs=require('fs');
const path=require('path');
const sharp=require('sharp');




const getProductAddPage=async(req,res)=>{
    try{

        const category=await Category.find({isListed:true});
        const brand=await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:category,
            brand:brand
        });

    }
    catch(error){

        res.redirect("/pageerror")
    }
}

// const addProducts=async(req,res)=>{
//     try{
//         const products=req.body;
//         const productExists=await Product.findOne({
//             productName:products.productName,
//         });
//         if(!productExists){
//             const images=[];
//           if(req.files && req.files.length>0) {
//             for(let i=0;i<req.files.length;i++){
//                 const originalImagePath=req.files[i].path;

//                 const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename);
//                 await sharp[originalImagePath].resize({width:440,height:440}).toFile(resizedImagePath);
//                 images.push(req.files[i].filename);

//             }
//           }
//           const categoryId=await Category.findOne({name:products.category}) ;
//           if(!categoryId){
//             return res.status(400).join("invalid category name ")
//           }

//           const newProduct=new Product({
//             productName:products.productName,
//             description:products.description,
//             brand:products.brand,
//             category:categoryId._id,
//             regularPrice:products.regularPrice,
//             salesPrice:products.salesPrice,
//             craetedOn:new Date(),
//             quantity:products.quantity,
//             size:products.size,
//             color:products.color,
//             productImage:images,
//             status:'Available',

//           });

//           await newProduct.save();
//           return res.redirect("/admin/addProducts");


//         }else{
//             return res.status(400).json("product already exist,please try with another name")
//         }
//     }
//     catch(error){
//         console.error("error saving product",error);
//         return res.redirect("/admin/pageerror")
//     }
// }

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        
        // --- Validations ---
        if (!products.productName || products.productName.trim() === "") {
            return res.status(400).json({ error: "Product name cannot be empty." });
        }
        if (parseInt(products.quantity) <= 0) {
            return res.status(400).json({ error: "Quantity must be greater than 0." });
        }
        if (parseFloat(products.salesPrice) > parseFloat(products.regularPrice)) {
            return res.status(400).json({ error: "Sales price cannot be greater than the actual price." });
        }

        const productExists = await Product.findOne({
            productName: { $regex: `^${products.productName.trim()}$`, $options: 'i' }
        });
        
        if (productExists) {
            return res.status(400).json({ error: "Product with this name already exists." });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        } else {
            return res.status(400).json({ error: "At least one product image is required." });
        }
        
        const [categoryId, brandId] = await Promise.all([
            Category.findOne({ name: products.category }),
            Brand.findOne({ brandName: products.brand })
        ]);

        if (!categoryId) {
            return res.status(400).json({ error: "Invalid category name" });
        }
        if (!brandId) {
            return res.status(400).json({ error: "Invalid brand name" });
        }

        const newProduct = new Product({
            productName: products.productName.trim(),
            description: products.description,
            brand: brandId._id,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salesPrice: products.salesPrice,
            createdOn: new Date(),
            stock: parseInt(products.quantity),
            size: products.size,
            productImage: images,
            status: 'Available',
            isBlocked: false
        });

        await newProduct.save();
        return res.status(200).json({ message: "Product added successfully!" });

    } catch (error) {
        console.error("Error saving product:", error);
        return res.status(500).json({ error: "An internal error occurred." });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery = {
            $or: [
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

        // Get products with populated fields
        const productData = await Product.find(searchQuery)
            .populate('category')
            .populate('brand')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const count = await Product.countDocuments(searchQuery);

        // Get categories and brands for filters
        const [categories, brands] = await Promise.all([
            Category.find({ isListed: true }),
            Brand.find({ isBlocked: false })
        ]);

        res.render("products", {
            data: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            cat: categories,
            brand: brands,
            search: search
        });

    } catch (error) {
        console.error("Error in getAllProducts:", error);
        res.redirect("/pageerror");
    }
}


const blockProduct=async(req,res)=>{
    try{
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    }
    catch(error){
        res.redirect("/pageerror")

    }
}


const unblockProduct=async(req,res)=>{
    try{

        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")

    }
    catch(error){
        res.redirect("/pageerror")

    }
}


const getEditProduct=async(req,res)=>{
    try{
        const id=req.query.id;
        const product=await Product.findOne({_id:id}).populate('category').populate('brand');
        const category=await Category.find({});
        const brand=await Brand.find({});
        res.render('edit-product',{
            product:product,
            cat:category,
            brand:brand,

        })

    }
    catch(error){
        res.redirect("/pageerror")

    }
}


const editProduct = async(req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // --- Validations ---
        if (!data.productName || data.productName.trim() === "") {
            return res.status(400).json({ error: "Product name cannot be empty." });
        }
        // Check for duplicate product name
        const existingProduct = await Product.findOne({
            productName: { $regex: `^${data.productName.trim()}$`, $options: 'i' },
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists." });
        }
        
        // --- Find Category and Brand IDs ---
        const [categoryId, brandId] = await Promise.all([
            Category.findOne({ name: data.category }),
            Brand.findOne({ brandName: data.brand })
        ]);

        if (!categoryId) {
            return res.status(400).json({ error: "Invalid category selected." });
        }
        if (!brandId) {
            return res.status(400).json({ error: "Invalid brand selected." });
        }

        // --- Handle Images ---
        let existingImages = [];
        if (data.existingImages && data.existingImages !== '[]') {
            try {
                existingImages = JSON.parse(data.existingImages);
                // Ensure existingImages is an array
                if (!Array.isArray(existingImages)) {
                    existingImages = [];
                }
            } catch (e) {
                console.error('Error parsing existingImages:', e);
                existingImages = [];
            }
        }
        
        const newImages = req.files ? req.files.map(file => file.filename) : [];
        const allImages = [...existingImages, ...newImages];

        if (allImages.length === 0) {
            return res.status(400).json({ error: "At least one image is required." });
        }
        if (allImages.length > 4) {
            return res.status(400).json({ error: "A maximum of 4 images are allowed." });
        }
        
        // --- Update Product ---
        const updateData = {
            productName: data.productName.trim(),
            description: data.description,
            category: categoryId._id,
            brand: brandId._id,
            regularPrice: data.regularPrice,
            salesPrice: data.salesPrice,
            stock: data.quantity, // The form uses 'quantity'
            productImage: allImages
        };

        await Product.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({ message: "Product updated successfully!" });

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "An internal server error occurred." });
    }
}


const deleteSingleImage = async(req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        
        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).json({ status: false, message: "Missing required parameters" });
        }

        // Update product to remove the image
        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Delete the image file from the correct directory
        const imagePath = path.join("public", "uploads", "product-images", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log(`Image ${imageNameToServer} not found at path: ${imagePath}`);
        }

        res.json({ status: true, message: "Image deleted successfully" });

    } catch(error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ status: false, message: "Error deleting image" });
    }
}

module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage


}