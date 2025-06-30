const User= require("../../models/userSchema");
const Address=require('../../models/addressSchema');
const nodemailer=require('nodemailer');
const bcrypt=require('bcrypt');
const env=require('dotenv').config();
const session=require('express-session');
const fs = require('fs');
const path = require('path');

function generateOtp(){
    const digits="1234567890";
    let otp="";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)];

    }
    return otp;
}





const sendVerificationEmail=async(email,otp)=>{
    try{
const transporter=nodemailer.createTransport({
    service:"gmail",
    port:587,
    secure:false,
    requireTLS:true,
    auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD,

    }
})


const mailOptions={
    from:process.env.NODEMAILER_EMAIL,
    to:email,
    subject:"Your OTP for psssword reset",
    text:`Your OTP is${otp}`,
    html:`<b><h4> Your OTP:${otp}</h4><br></b>`
}
const info=await transporter.sendMail(mailOptions);
console.log("Email sent:",info.messageId);
return true;

    }
    catch(error){

        console.error("Error sending email ",error);
        return false;
    }
}

const securePassword=async(password)=>{
    try{
        const passwordHash=await bcrypt.hash(password,10);
        return passwordHash;

    }
    catch(error){

    }

}









const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                console.log("OTP:", otp);
                return res.render("forgotPass-otp");
            } else {
                return res.json({ success: false, message: "Failed to send OTP. Please try again" });
            }

        } else {
            return res.render("forgot-password", {
                message: "User with this email does not exist"
            });
        }

    } catch (error) {
        return res.redirect("/user/pageNotFound");
    }
}









const getForgotPassPage=async(req,res)=>{
    try{
        res.render("forgot-password");

    }
    catch(error){
        res.redirect("/user/pageNotFound");
    }
}


const  verifyForgotPassOtp=async(req,res)=>{
    try{
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/user/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"});
        }
    }
    catch(error){
        res.status(500).json({success:false,message:"An error occured. please try again later"})
    }
}
const getResetPassPage=async(req,res)=>{
    try{
        res.render("reset-password");

    }
    catch(error){
        res.redirect("/user/pageNotFound")
    }
}


const resendOtp=async(req,res)=>{
    try{
        if (!req.session.email) {
            return res.status(400).json({success:false,message:'No email found in session. Please restart the forgot password process.'});
        }
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP successful"});
        } else {
            res.status(500).json({success:false,message:'Failed to send OTP. Please try again.'});
        }
    }
    catch(error){
        console.error("Error in resend otp",error);
        res.status(500).json({success:false,message:'internal server error'});
    }
}

const postNewPassword=async(req,res)=>{
    try{
        console.log('postNewPassword method called');
        console.log('Request body:', req.body);
        console.log('Session email:', req.session.email);
        
        const{newPass1,newPass2}=req.body;
        const email=req.session.email;
        
        if(!email) {
            console.log('No email in session, redirecting to forgot password');
            return res.redirect("/user/forgot-password");
        }
        
        if(newPass1===newPass2){
            console.log('Passwords match, updating password for email:', email);
            const passwordHash=await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            console.log('Password updated successfully, redirecting to login');
            res.redirect("/user/login");

        }else{
            console.log('Passwords do not match');
            res.render("reset-password",{message:"passwords do not match"});
        }
    }
    catch(error){
        console.error('Error in postNewPassword:', error);
        res.redirect("/user/pageNotFound");

    }
}


const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/user/login');
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect('/user/login');
        }

        // Check if profile image file exists
        if (userData.profileImage && userData.profileImage !== 'default-profile.png') {
            const imagePath = path.join(__dirname, '../../public/uploads/profile/', userData.profileImage);
            if (!fs.existsSync(imagePath)) {
                userData.profileImage = 'default-profile.png';
            }
        }

        const addressData = await Address.findOne({ userId: userId });
        
        res.render("profile", {
            user: userData,
            userAddress: addressData || null,
            message: null
        });
    } catch (error) {
        console.error("Error retrieving profile data:", error);
        res.render("profile", {
            user: null,
            userAddress: null,
            message: "Error loading profile data. Please try again."
        });
    }
}


const changeEmail=async (req,res)=>{
    try{
        res.render("change-email", { message: null });
    }
    catch(error){
        res.redirect("/user/pageNotFound")
    }
}



const changeEmailValid=async(req,res)=>{
    try{
        const {email}=req.body;
        const userExists=await User.findOne({email});
        if(userExists){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render("change-email-otp", { message: null });
                console.log("Email sent:",email);
                console.log("OTP:",otp);

            }else
            {
                res.render("change-email-otp", { message: "Failed to send OTP. Please try again." });
            }
        }else{
            res.render("change-email",{
                message:"User with this email not exists"
            });

        }
    }
    catch(error){
        console.error("Error in changeEmailValid:", error);
        res.redirect("/user/pageNotFound")
    }
}


const verifyEmailOtp=async(req,res)=>{
    try{
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            //req.session.userData=req.body.userData;
            res.render("new-email",{
                userData:req.session.userData,

            })
        }else{
            res.render("change-email-otp",{
                message:"OTP not matching",
                userData:req.session.userData
            })

        }

    }
    catch(error){
        console.log("error in the verificationEmailOtp:",error)
        res.redirect("/user/pageNotFound")

    }
}
const updateEmail=async(req,res)=>{
    try{
        const newEmail=req.body.newEmail;
        const userId=req.session.user;
        console.log('updateEmail called. newEmail:', newEmail, 'userId:', userId);
        if (!newEmail || !userId) {
            return res.render('new-email', { userData: req.session.userData, message: 'Missing new email or user session.' });
        }
        await User.findByIdAndUpdate(userId,{email:newEmail});
        res.redirect("/user/profile")
    }
    catch(error){
        console.error("error updating email:",error)
        res.render('new-email', { userData: req.session.userData, message: 'Error updating email. Please try again.' });
    }
}


const changePassword=async(req,res)=>{

    try{
        res.render("change-password")

    }
    catch(error){

        res.redirect("/user/pageNotFound")

    }


}
const changePasswordValid=async(req,res)=>{
    try{
        const {email}=req.body;
        const userExists=await User.findOne({email});
        if(userExists){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render("change-password-otp");
                console.log('OTP:',otp)
            }
            else{
                res.json({
                    success:false,
                    message:"failed to send OTP.please try again"
                })
            }
        }else{
            res.render("change-password",{
                message:"user with this email does not exist"
            });

        }

    }
    catch(error){

      console.log("error in change password validation",error)
      res.redirect("/user/pageNotFound")
      


    }
}

const verifyChangePassOtp = async (req, res) => {
    try {
        if (!req.session.userOtp) {
            return res.status(400).json({ success: false, message: "Session expired. Please restart the password change process." });
        }
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/user/reset-password" });
        } else {
            res.json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in verifyChangePassOtp:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
    }
}

const resendChangePassOtp = async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired. Please restart the password change process." });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        
        if (emailSent) {
            req.session.userOtp = otp;
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in resendChangePassOtp:", error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again." });
    }
}

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("add-address", { 
            user: userData,
            message: null
        });
    } catch (error) {
        console.error("Error in addAddress:", error);
        res.redirect("/user/pageNotFound");
    }
};

const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone, isDefault } = req.body;

        if (!name || !city || !state || !pincode || !phone) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields" });
        }

        const userAddress = await Address.findOne({ userId });
        
        const newAddressData = {
            addressType: addressType || 'Other',
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
            isDefault: isDefault === 'on'
        };

        if (!userAddress) {
            const newAddress = new Address({
                userId,
                address: [newAddressData]
            });
            newAddress.address[0].isDefault = true;
            await newAddress.save();
        } else {
            if (newAddressData.isDefault) {
                userAddress.address.forEach(addr => {
                    addr.isDefault = false;
                });
            }
            userAddress.address.push(newAddressData);
            await userAddress.save();
        }
        
        res.json({ success: true, message: "Address added successfully" });

    } catch (error) {
        console.error("Error in postAddAddress:", error);
        res.status(500).json({ success: false, message: "Error adding address. Please try again." });
    }
};

const editAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;
        
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.redirect("/user/profile");
        }

        const address = userAddress.address.id(addressId);
        if (!address) {
            return res.redirect("/user/profile");
        }

        res.render("edit-address", {
            user: req.session.user,
            address: address,
            message: null
        });
    } catch (error) {
        console.error("Error in editAddress:", error);
        res.redirect("/user/profile");
    }
};

const updateAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        if (!addressType || !name || !city || !state || !pincode || !phone) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields" });
        }

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ success: false, message: "User addresses not found" });
        }
        
        const address = userAddress.address.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        
        address.addressType = addressType;
        address.name = name;
        address.city = city;
        address.landMark = landMark;
        address.state = state;
        address.pincode = pincode;
        address.phone = phone;
        address.altPhone = altPhone;

        await userAddress.save();
        return res.json({ success: true, message: "Address updated successfully" });
    } catch (error) {
        console.error("Error in updateAddress:", error);
        return res.status(500).json({ success: false, message: "Failed to save address. Please try again." });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }


        userAddress.address = userAddress.address.filter(addr => addr._id.toString() !== addressId);
        await userAddress.save();

        res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error in deleteAddress:", error);
        res.status(500).json({ success: false, message: "Error deleting address" });
    }
};

const updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        const userId = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update profile image
        user.profileImage = req.file.filename;
        await user.save();

        res.redirect('/user/profile');
    } catch (error) {
        console.error('Error updating profile image:', error);
        res.status(500).json({ success: false, message: 'Error updating profile image' });
    }
};


const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/user/login');
        res.render('edit-profile', { user, message: null });
    } catch (error) {
        res.render('error', { message: 'Error loading edit profile page.' });
    }
};


const postEditProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, email, phone } = req.body;

        console.log('postEditProfile called');
        console.log('Received userId:', userId);
        console.log('Received body:', req.body);
        console.log('Received file:', req.file);

        // Server-side validation
        if (!name || name.trim() === '') {
            const user = await User.findById(userId);
            console.log('Validation failed: Name is required');
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: 'Name is required.' });
            }
            return res.render('edit-profile', { user, message: 'Name is required.' });
        }
        // Basic email format validation
        if (!email || !/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
             const user = await User.findById(userId);
             console.log('Validation failed: Invalid email format');
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
            }
            return res.render('edit-profile', { user, message: 'Please enter a valid email address.' });
        }
        // Basic phone number validation (10 digits)
        if (!phone || !/^[0-9]{10}$/.test(phone)) {
             const user = await User.findById(userId);
             console.log('Validation failed: Invalid phone number format');
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit phone number.' });
            }
            return res.render('edit-profile', { user, message: 'Please enter a valid 10-digit phone number.' });
        }

        const updateData = { name, email, phone };
        console.log('Initial updateData:', updateData);

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found for update');
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
            return res.redirect('/user/login'); // User not found
        }

        // Check if the new email is already used by another user
        if (email !== user.email) { // Only check if email is changed
            console.log('Email changed, checking for existing user with same email');
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                console.log('Email already in use');
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({ success: false, message: 'Email is already in use by another account.' });
                }
                return res.render('edit-profile', { user, message: 'Email is already in use by another account.' });
            }
             console.log('Email is unique');
        }

        if (req.file) {
            console.log('File received, processing image update');
            // Delete old profile image if it's not the default one
            if (user.profileImage && user.profileImage !== 'default-profile.png') {
                const oldImagePath = path.join(__dirname, '..', '..', 'public', 'uploads', 'profile', user.profileImage);
                console.log('Deleting old image:', oldImagePath);
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old profile image:', err);
                    else console.log('Old image deleted successfully');
                });
            }
            updateData.profileImage = req.file.filename;
            console.log('updateData with new profileImage:', updateData);
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }); // Use { new: true } to get the updated user document
        console.log('Database update attempted. Updated user:', updatedUser);
        
        if (updatedUser) {
             console.log('Database update successful, redirecting to profile page');
             if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Profile updated successfully!' });
             }
             res.redirect('/user/profile');
        } else {
             console.log('Database update failed');
             // This case might occur if userId is valid but no document was found (less likely with the check above)
             const userAfterFail = await User.findById(userId);
             if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ success: false, message: 'Error updating profile. Database update failed.' });
             }
             res.render('edit-profile', { user: userAfterFail, message: 'Error updating profile. Database update failed.' });
        }

    } catch (error) {
        console.error('Error updating profile in catch block:', error);
        const user = await User.findById(req.session.user);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred while updating profile. Please try again.' });
        }
        res.render('edit-profile', { user, message: 'An unexpected error occurred while updating profile. Please try again.' });
    }
};

// New functions for the checkout system
const getAddresses = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to continue" });
        }

        const addressData = await Address.findOne({ userId });
        if (!addressData) {
            return res.status(200).json({ success: true, addresses: [] });
        }

        res.status(200).json({ success: true, addresses: addressData.address });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).json({ success: false, message: "Error fetching addresses" });
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.params.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login to continue" });
        }

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ success: false, message: "No addresses found" });
        }

        // Set all addresses to non-default
        userAddress.address.forEach(addr => {
            addr.isDefault = false;
        });

        // Set the selected address as default
        const address = userAddress.address.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        address.isDefault = true;

        await userAddress.save();
        res.status(200).json({ success: true, message: "Default address set successfully" });
    } catch (error) {
        console.error("Error setting default address:", error);
        res.status(500).json({ success: false, message: "Error setting default address" });
    }
};







module.exports={
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    resendChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    updateAddress,
    deleteAddress,
    updateProfileImage,
    getEditProfile,
    postEditProfile,
    getAddresses,
    setDefaultAddress
}




