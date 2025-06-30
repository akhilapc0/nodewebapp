const Category=require("../../models/categorySchema");

const categoryInfo=async (req,res)=>{
    try{
        const page=parseInt(req.query.page )|| 1;
        const limit=4;
        const skip=(page-1)*limit;
        const search = req.query.search ? req.query.search.trim() : '';
        let query = {};
        if (search) {
            query = { name: { $regex: search, $options: 'i' } };
        }
        const categoryData=await Category.find(query)
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);
        const totalCategories=await Category.countDocuments(query);
        const totalPages=Math.ceil(totalCategories / limit)
        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories,
            search: search
        });
    }
    catch(error){
        console.error(error);
        res.redirect("/pageerror")
    }
}

const addCategory=async(req,res)=>{
    const{name,description}=req.body;
    try{
        if(!name || !description) {
            return res.status(400).json({error: "Name and description are required"});
        }
        // Case-insensitive duplicate check
        const existingCategory=await Category.findOne({name: { $regex: `^${name}$`, $options: 'i' }});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"});
        }
        const newCategory=new Category({
            name,
            description
        })
        await newCategory.save();
        return res.status(200).json({message:"Category created successfully"})
    }
    catch(error){
        console.error("Error while creating category:", error);
        if(error.code === 11000) {
            return res.status(400).json({error: "Category already exists"});
        }
        return res.status(500).json({error:"An error occurred while adding the category"})
    }
}

const getListCategory=async(req,res)=>{
    try{
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");

    }
    catch(error){
        res.redirect("/pageerror")

    }
}

const getUnlistCategory=async(req,res)=>{

    try{
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category")

    }
    catch(error){
        res.redirect("/pageerror")

    }

}

const getEditCategory=async(req,res)=>{
    try{
        const id=req.query.id;
        const category=await Category.findOne({_id:id});
        res.render("edit-category",{category:category})

    }
    catch(error){
        res.redirect("/pageerror")

    }
}

const editCategory=async(req,res)=>{
    try{
        const id=req.params.id;
        const{categoryName,description}=req.body;
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({error:"category not found"});
        }
        // Case-insensitive duplicate check, excluding current category
        const existingCategory = await Category.findOne({
            name: { $regex: `^${categoryName}$`, $options: 'i' },
            _id: { $ne: id }
        });
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        // Always update, even if no changes
        await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true})
        return res.status(200).json({message: "Category updated successfully"});
    }
    catch(error){
        console.error("Error while updating category:", error);
        res.status(500).json({error:"An error occurred while updating the category"})
    }
}

module.exports={
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
}