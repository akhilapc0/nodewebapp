const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Number,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: 'default-profile.png'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    address: [{
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    }],
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: ''
    },
    googleId: {
        type: String,
        unique: true
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart",
    }],
    wallet: [{
        type: Schema.Types.ObjectId,
        ref: "wishlist"
    }],
    orderHistroy: [{
        type: Schema.Types.ObjectId,
        ref: "order",
    }],
    referalCode: {
        type: String,
    },
    redeemed: {
        type: Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        },
    }]
});

const User = mongoose.model('User', userSchema);
module.exports = User;
