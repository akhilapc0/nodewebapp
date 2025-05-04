const User=require("../../models/userSchema");
const env=require('dotenv').config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");

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
        console.log(process.env.NODEMAILER_PASSWORD)
        
        res.render("signup")
    }
    catch(error){
        console.log("homepage not loading",error);
        res.status(500).send("server error");
    }
}

const loadHomePage=async (req,res)=>{
    try{
        const user=req.session.user;
       
        if(user){
            const userData = await User.findOne({ _id: user });
        res.render("home",{user:userData})
        }
        else{
            return res.render("home")
        }
    }
    catch(error){
         console.log("home page not found");
         res.status(500).send("server error");
    }
}



// const signup=async(req,res)=>{
//     try{
//         const{name, email, phone, password, cpassword}=req.body;
        
//         // Check if passwords match
//         if(password!==cpassword){
//             return res.render("signup",{message:"Passwords do not match"})
//         }

//         // Check if user already exists
//         const existingUser = await user.findOne({ email: email });
//         if(existingUser){
//             return res.render("signup",{message:"Email already registered"})
//         }

//         // Create new user
//         const newUser = new user({
//             name,
//             email,
//             phone,
//             password
//         });

//         // Save user to database
//         await newUser.save();
        
//         // Redirect to login page after successful registration
//         res.redirect("/login");
//     }
//     catch(error){
//         console.log("Error in signup:", error);
//         res.render("signup",{message:"An error occurred during registration"})
//     }
// }

    function generateOtp(){
        return Math.floor(100000+ Math.random()*900000).toString();
    }
    async function sendVerificationEmail(email,otp){
        try{
            const transporter=nodemailer.createTransport({

                service:'gmail',
                port:587,
                secure:false,
                requireTLS:true,
                auth:{
                    user:process.env.NODEMAILER_EMAIL,

                    pass:process.env.NODEMAILER_PASSWORD
                }

            })

            const info=await transporter.sendMail({
                from:process.env.NODEMAILER_EMAIL,
                to:email,
                subject:"verify your account",
                text:`your OTP is ${otp}`,
                html:`<b>your otp :${otp}</b>`
            })
            return info.accepted.length >0
        }
        catch(error){
            console.error("error sending email",error);
            return false;
        }
    }




    const signup=async (req,res)=>{
        
        try{
            console.log("dfsdfs")
            const{name,phone,email,password,cpassword}=req.body;
            if(password!==cpassword){
                return res.render("signup",{message:"passwords do not match"});
            }
            const findUser=await User.findOne({email});
            if(findUser){
                return res.render("signup",{message:"User with this email alreday exist"})
            }
            const otp=generateOtp();

            const emailSent=await sendVerificationEmail(email,otp);
            if(!emailSent){
                return res.json("email.error");
            }
            req.session.userOtp=otp;
            req.session.userData={name,phone,email,password};
            res.render("verify-otp");
            console.log('otp send',otp)

        }
        catch(error){
            console.error("signup error",error);
            res.redirect("/pageNotFound")
        }
    }

    const securePassword=async(password)=>{
        try{
            const passwordHash=await bcrypt.hash(password,10);
            return passwordHash
        }
        catch(error){

        }
    }


    const verifyOtp=async (req,res)=>{
        try{
            const {otp}=req.body;
            console.log(otp);
            if(otp===req.session.userOtp){
                const userData=req.session.userData;
                const passwordHash=await securePassword(userData.password);

                const saveUserData=new User({
                    name:userData.name,
                    email:userData.email,
                    phone:userData.phone,
                    password:passwordHash

                })
                await saveUserData.save();

                req.session.user=saveUserData._id;
                req.session.userOtp=null;
                req.session.userData=null;
                res.json({success:true,redirectUrl:"/"})

            }
            else{
                res.status(400).json({success:false,message:"Invalid OTP,please try again"})
            }
        }
        catch(error){
            console.log("error verifying OTP",error);
            res.status(500).json({success:"false",message:"an error occured"});

        }
    }

    const resendOtp=async (req,res)=>{
        try{
            const {email}=req.session.userData;
            if(!email){
                return res.status(400).json({success:false,message:"email not found in session"});

            }
            const otp=generateOtp();
            req.session.userOtp=otp;
            
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                console.log("resend OTP:",otp);
                res.status(200).json({success:true,message:"OTP resent successfully"})
            }else{
                res.status(500).json({success:false,message:"failed to resend OTP,pls try again"})
            }



        }
        catch(error){
            console.error("error resending OTP",error);
            res.status(500).json({success:false,message:"internal server error.pls try again"})
        }

    }
    const loadLogin=async (req,res)=>{
        try{
            if(!req.session.user){
                return res.render("login");
            }else{
                res.redirect('/')
            }
        }
        catch(error){
            res.redirect("pageNotFound")
        }
    }
    const login=async (req,res)=>{
        try{
            const{email,password}=req.body;
            const findUser=await User.findOne({isAdmin:0,email:email});
            if(!findUser){
                return res.render ("login",{message:"user not found"})
            }
            if(findUser.isBlocked){
                return res.render ("login",{message:"user is blocked by admin"})
            }
            const passwordMatch=await bcrypt.compare(password,findUser.password);
            if(!passwordMatch){
                return res.render("login",{message:" incorrect password "});
            }
            req.session.user=findUser._id;
            res.redirect('/')
        }
        catch(error){
            console.error("login error",error);
            res.render("login",{message:"login failed please try again later"})

        }
    }
    const logout=async(req,res)=>{
        try{

            req.session.destroy((err)=>{
                if(err){
                    console.log("session destruction error",err.message);
                    return res.redirect("/pageNotFound")
                }
                return res.redirect("/login")

            })
        }
        catch(error){
            console.log("logout error",error);
            res.redirect("/pageNotFound")
        }
    }

module.exports={
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}



