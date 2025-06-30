const multer=require('multer');
const path=require('path');

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        // Check if this is a product image upload
        if (req.baseUrl && req.baseUrl.includes('/admin') && (req.path === '/addProducts' || req.path.startsWith('/editProduct/'))) {
            cb(null,path.join(__dirname,"../public/uploads/product-images"))
        } else {
            cb(null,path.join(__dirname,"../public/uploads/re-image"))
        }
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.originalname)
    }

})


module.exports= storage;
