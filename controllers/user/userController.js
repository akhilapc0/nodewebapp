const user=require("../../models/userSchema")
const pageNotFound=async(req,res)=>{
    try{
          res.render("page-404")
    }
    catch(error){
          res.redirect("/pageNotFound")
    }
}
const loadSignup=async(req,res)=>{
    try{
        res.render("signup")
    }
    catch(error){
        console.log("homepage not loading",error);
        res.status(500).send("server error");
    }
}

const loadHomePage=async (req,res)=>{
    try{
        res.render("home")
    }
    catch(error){
         console.log("home page not found");
         res.status(500).send("server error");
    }
}
const signup=async(req,res)=>{
    try{
        const{email,password,cpassword}=req.body;
        if(password!==cpassword){
            return res.render("signup",{message:"password do not match"})
        }
    }
    catch(error){

    }
}


module.exports={
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup
    
}


