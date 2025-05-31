const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Get all orders for the logged-in user
exports.getUserOrders = async (req, res) => {
    try {
        console.log("hiihih")
        const userId = req.session.user // Assuming user is authenticated
        console.log('Fetching orders for user ID:', userId);
        let orders = await Order.find({ user: userId , orderID : { $exists: true, $ne: null }})
            .populate('items.product')
            .sort({ createdAt: -1 }); // Sort by order date (newest first)


        console.log('Found', orders.length, 'orders for user ID:', userId);

        // Client-side search by orderID
        const search = req.query.search || '';
        if (search) {
            orders = orders.filter(order => order.orderID.toLowerCase().includes(search.toLowerCase()));
        }

        res.render('user/order-list', { orders, search, user: req.user });
    } catch (error) {
        res.render('error', { message: 'Error fetching orders' });
    }
};

// Get details of a specific order
exports.getUserOrderDetails = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            console.log('User not authenticated, redirecting to login.');
            return res.redirect('/user/login');
        }

        
        
        const query = { orderID: req.params.orderId, user: req.session.user };
        console.log('Order details query:', query);
        const order = await Order.findOne(query)
            .populate('user items.product');
        console.log('Order found:', order);

        if (!order) {
            console.log('Order not found for query:', query);
            return res.render('error', { message: 'Order not found' });
        }

        res.render('user/order-details', { order, user: req.user });
    } catch (error) {
        console.error('Error in getUserOrderDetails:', error);
        res.render('error', { message: 'Error fetching order details' });
    }
};

// Cancel an order or specific items
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { cancellationReason, itemIds } = req.body;

        const order = await Order.findOne({ orderID: orderId });
        if (!order) return res.render('error', { message: 'Order not found' });

        // Prevent cancellation if order is already 'delivered' or 'cancelled'
        if (order.status === 'delivered' || order.status === 'cancelled') {
            return res.render('error', { message: 'Cannot cancel order' });
        }

        const productsToUpdate = {};

        if (itemIds && itemIds.length > 0) {
            // Partial cancellation (specific items)
            for (const item of order.items) {
                if (itemIds.includes(item._id.toString()) && item.status !== 'cancelled') {
                    item.status = 'cancelled';
                    item.cancellationReason = cancellationReason || 'Not specified';
                    // Collect product stock to increment
                    if (productsToUpdate[item.product]) {
                        productsToUpdate[item.product] += item.quantity;
                    } else {
                        productsToUpdate[item.product] = item.quantity;
                    }
                }
            }
            // If all items are cancelled, mark the entire order as 'cancelled'
            if (order.items.every(item => item.status === 'cancelled')) {
                order.status = 'cancelled';
                order.cancellationReason = cancellationReason || 'Not specified';
            }
        } else {
            // Full order cancellation
            // Only cancel if the overall order status is not already 'cancelled'
             if (order.status !== 'cancelled') {
                order.status = 'cancelled';
                order.cancellationReason = cancellationReason || 'Not specified';
                 for (const item of order.items) {
                    if(item.status !== 'cancelled'){
                       item.status = 'cancelled';
                       item.cancellationReason = cancellationReason || 'Not specified';
                        // Collect product stock to increment
                        if (productsToUpdate[item.product]) {
                            productsToUpdate[item.product] += item.quantity;
                        } else {
                            productsToUpdate[item.product] = item.quantity;
                        }
                    }
                }
             }
        }

        // Save the order changes
        await order.save();

        // Increment product stock for all cancelled items
        for (const productId in productsToUpdate) {
            await Product.findByIdAndUpdate(productId, {
                $inc: { stock: productsToUpdate[productId] },
                stockLastUpdated: Date.now()
            });
        }

        res.redirect('/user/orders');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.render('error', { message: 'Error cancelling order' });
    }
};

// Request a return for a delivered order
exports.requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { returnReason, itemIds } = req.body;

        // Return reason is mandatory
        if (!returnReason) {
            return res.render('error', { message: 'Return reason is required' });
        }

        const order = await Order.findOne({ orderID: orderId });
        if (!order) return res.render('error', { message: 'Order not found' });

        // Only delivered orders can be returned
        if (order.status !== 'delivered') {
            return res.render('error', { message: 'Order must be delivered to request a return' });
        }

        // Mark return request as submitted
        order.returnRequest = order.returnRequest || {};
        order.returnRequest.requested = true;
        order.returnRequest.reason = returnReason;
        order.returnRequest.verified = false;

        if (itemIds && itemIds.length > 0) {
            // Partial return (specific items)
            for (const item of order.items) {
                if (itemIds.includes(item._id.toString())) {
                    item.status = 'returned';
                    item.returnReason = returnReason;
                    // Increment product stock
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity },
                        stockLastUpdated: Date.now()
                    });
                }
            }
            // If all items are returned, mark the entire order as returned
            if (order.items.every(item => item.status === 'returned')) {
                order.status = 'returned';
                order.returnReason = returnReason;
            }
        } else {
            // Full order return
            order.status = 'returned';
            order.returnReason = returnReason;
            for (const item of order.items) {
                item.status = 'returned';
                item.returnReason = returnReason;
                // Increment product stock
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity },
                    stockLastUpdated: Date.now()
                });
            }
        }

        await order.save();
        res.redirect('/user/orders');
    } catch (error) {
        res.render('error', { message: 'Error requesting return' });
    }
};

// Download invoice as PDF
exports.downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findOne({ orderID: req.params.orderId })
            .populate('user items.product');
        if (!order) return res.status(404).send('Order not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderID}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Order Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order.orderID}`);
        doc.text(`Order Date: ${order.orderDate.toLocaleDateString('en-IN')}`);
        doc.text(`Customer: ${order.user.name}`);
        doc.text(`Status: ${order.status}`);
        doc.moveDown();

        // Shipping Address
        doc.fontSize(14).text('Shipping Address:');
        doc.fontSize(12).text(`${order.shippingAddress.name}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.pincode}`);
        doc.text(`Phone: ${order.shippingAddress.phone}`);
        doc.moveDown();

        // Items Table
        doc.fontSize(14).text('Items:');
        order.items.forEach((item, idx) => {
            doc.fontSize(12).text(`${idx + 1}. ${item.product.productName} x${item.quantity} - ₹${item.price}`);
        });
        doc.moveDown();

        // Totals
        doc.fontSize(12).text(`Subtotal: ₹${order.subtotal}`);
        doc.text(`Tax: ₹${order.tax}`);
        doc.text(`Discount: ₹${order.discount}`);
        doc.text(`Total: ₹${order.finalTotal}`);
        doc.end();
    } catch (error) {
        res.status(500).send('Error generating invoice');
    }
};

// Show user notifications
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.session.user;
        const User = require('../../models/userSchema');
        // Mark all notifications as read
        await User.updateOne({ _id: userId }, { $set: { 'notifications.$[].read': true } });
        // Fetch the updated user
        const updatedUser = await User.findById(userId);
        if (!updatedUser) return res.render('error', { message: 'User not found' });
        res.render('user/notifications', { notifications: updatedUser.notifications });
    } catch (error) {
        res.render('error', { message: 'Error fetching notifications' });
    }
};

exports.getAdminOrderDetails = async (req, res) => {
    try {
        console.log('Looking for orderID:', req.params.orderId);
        const order = await Order.findOne({ orderID: new RegExp('^' + req.params.orderId + '$', 'i') })
            .populate('user items.product');
        if (!order) {
            console.log('Order not found for orderID:', req.params.orderId);
            return res.render('error', { message: 'Order not found' });
        }
        res.render('admin/order-details', { order });
    } catch (error) {
        res.render('error', { message: 'Error fetching order details' });
    }
};