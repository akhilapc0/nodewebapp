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

const addProducts = async(req, res) => {
    try {
        const products = req.body;
        console.log("Received product data:", products);
        console.log("Received files:", req.files);
        
        const productExists = await Product.findOne({
            productName: products.productName,
        });
        
        if(!productExists) {
            const images = [];
            if(req.files && req.files.length > 0) {
                for(let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    console.log("Processing image:", originalImagePath);

                    // Create directory if it doesn't exist
                    const uploadDir = path.join('public', 'uploads', 'product-images');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                    
                    // Fix the sharp syntax
                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 440 })
                        .toFile(resizedImagePath);
                    
                    images.push(req.files[i].filename);
                }
            }
            
            const categoryId = await Category.findOne({ name: products.category });
            if(!categoryId) {
                return res.status(400).json({ error: "Invalid category name" });
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salesPrice: products.salePrice, // Fixed to match form field name
                createdOn: new Date(),
                quantity: products.quantity,
                size: products.size,
                productImage: images,
                status: 'Available',
            });

            await newProduct.save();
            console.log("Product saved successfully:", newProduct);
            return res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }
    }
    catch(error) {
        console.error("Error saving product:", error);
        return res.redirect("/admin/pageerror");
    }
}

const getAllProducts=async(req,res)=>{
    try{

        const search=req.query.search || "";
        const page=req.query.page || 1;
        const limit=4;


        const productData=await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},

            ],
        }).limit(limit*1).skip((page - 1)*limit).populate("category").exec();


        const count=await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},

            ],

        }).countDocuments();

        const category=await Category.find({isListed:true});
        const brand=await Brand.find({isBlocked:false});

        if(category && brand){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand

            })
        }else{
            res.render("page-404");
        }

    }
    catch(error){
        res.redirect("/pageerror");

    }
}







module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts
}