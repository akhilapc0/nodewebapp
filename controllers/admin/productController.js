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
        const product=await Product.findOne({_id:id});
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


const editProduct=async(req,res)=>{
    try{
        const id=req.params.id;
        const product=await Product.findOne({_id:id});
        const data=req.body;
        const existingProduct=await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        if(existingProduct){
            return res.status(400).json({error:"product with this name alreday exists.please try with another name"});
        }
        const images=[];
        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename);

            }
        }
        const updateFields={
            productName:data.productName,
            description:data.description,
            category:product.category,
            regularPrice:data.regularPrice,
            salesPrice:data.salesPrice,
            quantity:data.quantity,
            size:data.size,
            // color:data.color,


        }
        if(req.files.length>0){
            updateFields.$push={productImage:{$each:images}};

        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect("/admin/products");


    }
    catch(error){

        console.error(error);
        res.redirect("/pageerror")

    }
}


const deleteSingleImage=async(req,res)=>{
    try{
        const{imageNameToServer,productIdToServer}=req.body;
        const product=await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath=path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);

        }else{
            console.log(`Image ${imageNameToServer} not found `);
        }
        res.send({status:true})

    }
    catch(error){

        res.redirect("/pageerror")

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