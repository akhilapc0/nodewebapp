const User=require("../../models/userSchema");


// const customerInfo=async (req,res)=>{

//     try{

//         let search="";
//         if(req.query.search){

//             search=req.query.search;

//         }
//         let page=1;
//         if(req.query.page){
//             page=req.query.page;

//         }
//         const limit=3;
//         const userData=await User.find({
//             isAdmin:false,
//             $or:[
//                {name:{$regex:".*"+search+".*"}} ,
//                {email:{$regex:".*"+search+".*"}}
//             ],

//         })
//         .limit(limit*1)
//         .skip((page-1)*limit)
//         .exec();

//         const count=await User.find({

//             isAdmin:false,
//             $or:[
//                {name:{$regex:".*"+search+".*"}} ,
//                {email:{$regex:".*"+search+".*"}}
//             ],

//         }).countDocuments();

//         res.render('customers')


//     }
//     catch(error){

//     }
// }


// module.exports={
//     customerInfo
// }






const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 10; // Increased limit for better display

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
                { phone: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
                { phone: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        res.render('admin/customers', {
            data: userData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};
const customerBlocked=async (req,res)=>{
    try{
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        
        // If the blocked user is currently logged in, destroy their session
        if(req.session.user === id) {
            req.session.destroy((err) => {
                if (err) {
                    console.log("session destruction error", err.message);
                }
            });
        }
        
        res.redirect("/admin/users")
    }
    catch(error){
        res.redirect("/pageerror")
    }
}

    const customerunBlocked=async(req,res)=>{
        try{

            let id=req.query.id;
            await User.updateOne({_id:id},{$set:{isBlocked:false}});
            res.redirect("/admin/users")
        }
        catch(error){
            res.redirect("/pageerror")
        }
    }




module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
};
