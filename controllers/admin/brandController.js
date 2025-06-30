const Brand=require("../../models/brandSchema");
const product=require("../../models/productSchema");


const getBrandPage=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)|| 1;
        const limit=6;
        const skip=(page-1)*limit;
        const search = req.query.search || "";

        // Base query to exclude soft-deleted brands
        let query = { isDeleted: false };

        // Add search functionality (case-insensitive)
        if (search) {
            query.brandName = { $regex: search, $options: 'i' };
        }

        const brandData=await Brand.find(query)
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit);
        const totalBrands=await Brand.countDocuments(query);
        const totalPages=Math.ceil(totalBrands/limit);
        res.render("brands",{
            data:brandData,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands,
            search: search, // Pass search term to the view
        })
    }
    catch(error){
        res.redirect("/pageerror")
    }
}

const addBrand=async(req,res)=>{
    try{
        const brand=req.body.name.trim();
        // Case-insensitive check
        const findBrand=await Brand.findOne({brandName: { $regex: `^${brand}$`, $options: 'i' }});
        if(findBrand){
            return res.status(400).json({ error: 'Brand already exists' });
        }
        // File type validation
        if(!req.file || !req.file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)){
            return res.status(400).json({ error: 'Only image files are allowed' });
        }
        const image=req.file.filename;
        const newBrand=new Brand({
            brandName:brand,
            brandImage:image,
        })
        await newBrand.save();
        return res.status(200).json({ message: 'Brand created successfully!' });
    }
    catch(error){
        return res.status(500).json({ error: 'An error occurred while adding the brand' });
    }
}

const editBrand=async(req,res)=>{
    try{
        const id=req.params.id;
        const brandName=req.body.name.trim();
        // Case-insensitive check, exclude current
        const findBrand=await Brand.findOne({ brandName: { $regex: `^${brandName}$`, $options: 'i' }, _id: { $ne: id } });
        if(findBrand){
            return res.status(400).json({ error: 'Brand already exists' });
        }
        let updateFields = { brandName };
        if(req.file && req.file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)){
            updateFields.brandImage = req.file.filename;
        } else if(req.file) {
            return res.status(400).json({ error: 'Only image files are allowed' });
        }
        await Brand.findByIdAndUpdate(id, updateFields, { new: true });
        return res.status(200).json({ message: 'Brand updated successfully!' });
    } catch(error){
        return res.status(500).json({ error: 'An error occurred while updating the brand' });
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
            return res.status(400).json({ error: 'Brand ID is required' });
        }
        // Perform soft delete
        await Brand.findByIdAndUpdate(id, { isDeleted: true });
        return res.status(200).json({ message: 'Brand deleted successfully!' });
    } catch(error) {
        console.error("Error soft deleting brand:", error);
        return res.status(500).json({ error: 'Error deleting brand' });
    }
}

module.exports={
    getBrandPage,
    addBrand,
    editBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}