const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

const productDetails = async (req, res) => {
    try {
        const productId = req.query.id;
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        const product = await Product.findOne({ _id: productId })
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.redirect('/shop');
        }

        res.render('product-details', {
            user: userData,
            product: product
        });

    } catch (error) {
        console.error('Error in productDetails:', error);
        res.redirect('/shop');
    }
};

module.exports = {
    productDetails
};