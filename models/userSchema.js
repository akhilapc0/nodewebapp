const mongoose=require('mongoose');
const{Schema}=mongoose;
const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        
    },
    phone:{
        type:String,
        required:true,
        unique:false,
        
        
    },
    password:{
        type:String,
        required:true
    },
    
    googleId:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",

    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    }],
    orderHistroy:[{

        type:Schema.Types.ObjectId,
        ref:"order",
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{

        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        },

    }]

})

const  User=mongoose.model("User",userSchema);
module.exports=User;
