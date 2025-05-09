const Brand=require("../../models/brandSchema");
const product=require("../../models/productSchema");


const getBrandPage=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)|| 1;
        const limit=4;
        const skip=(page-1)*limit;
        const brandData=await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands=await Brand.countDocuments();
        const totalPages=Math.ceil(totalBrands/limit);
        const reverseBrand=brandData.reverse();
        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands
        })
    }
    catch(error){
        res.redirect("/pageerror")

    }
}
const addBrand=async(req,res)=>{
    try{
        const brand=req.body.name;
        const findBrand=await Brand.findOne({brand});
        if(!findBrand){
            const image=req.file.filename;
            const newBrand=new Brand({
               brandName:brand,
                brandImage:image,

            })
            await newBrand.save();
            res.redirect("/admin/brands");
        }

    }
    catch(error){

        res.redirect("/pageerror")

    }
}

const blockBrand=async(req,res)=>{
    try{
        const id=req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/brands");

    }
    catch(error){
        res.redirect("/pageerror")

    }
}

const unBlockBrand=async(req,res)=>{
    try{

        const id=req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/brands");

    }
    catch(error){
        res.redirect("/pagerror")

    }
}

const deleteBrand=async(req,res)=>{
    try{
        const id = req.query.id;
        if(!id){
            return res.status(400).json({ success: false, message: "Brand ID is required" });
        }

        // Check if brand exists
        const brand = await Brand.findById(id);
        if(!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        // Check if brand is used in any products
        const productsWithBrand = await product.find({ brand: brand.brandName });
        if(productsWithBrand.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Cannot delete brand as it is associated with products" 
            });
        }

        // Delete the brand
        await Brand.findByIdAndDelete(id);
        res.json({ success: true, message: "Brand deleted successfully" });

    } catch(error) {
        console.error("Error deleting brand:", error);
        res.status(500).json({ success: false, message: "Error deleting brand" });
    }
}

module.exports={
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}