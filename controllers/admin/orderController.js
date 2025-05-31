const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');

// Get all orders with pagination, search, sort, and filter
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};

        // Search by orderID, user name, or tracking number
        if (search) {
            query.$or = [
                { orderID: { $regex: search, $options: 'i' } },
                { 'user.name': { $regex: search, $options: 'i' } },
                { trackingNumber: { $regex: search, $options: 'i' } }
            ];
        }
        query.orderID = { $exists: true, $ne: null };
        // Filter by status
        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('user items.product')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);
        res.render('admin/orders', {
            orders,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            sortBy,
            sortOrder
        });
    } catch (error) {
        res.render('error', { message: 'Error fetching orders' });
    }
};

// Get details of a specific order
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

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        console.log(`Attempting to update order status for orderID: ${orderId}`);
        console.log(`Received status from frontend: ${status}`);

        const order = await Order.findOne({ orderID: orderId });
       
        if (!order) {
            console.log(`Order not found for orderID: ${orderId}`);
            return res.render('error', { message: 'Order not found' });
        }

        console.log(`Found order. Current status: ${order.status}`);

        // Convert status to lowercase before saving
        const newStatus = status.toLowerCase();
        console.log(`Converted status to lowercase: ${newStatus}`);

        // Check if the status is actually changing to prevent unnecessary saves
        if (order.status === newStatus) {
            console.log(`Status is already ${newStatus}. No change needed.`);
            return res.redirect(`/admin/orders/${orderId}`);
        }

        order.status = newStatus;
        
        console.log(`Order status set to: ${order.status}`);

        await order.save();
        console.log('Order saved successfully.');
        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
        console.error("error in updateOrderStatus:", error);
        res.render('error', { message: 'Error updating order status' });
    }
};

// Verify return request
exports.verifyReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { verified, adminNotes } = req.body;
        const order = await Order.findOne({ orderID: orderId });
        if (!order) return res.render('error', { message: 'Order not found' });
        console.log('Order status:', order.status);
        // Allow both 'returned' and 'Returned' for robustness
        if (!order.status || order.status.toLowerCase() !== 'returned') {
            return res.render('error', { message: `Order must be in Returned state (got: ${order.status})` });
        }
        order.returnVerified = verified === 'true';
        if (adminNotes) order.adminNotes = adminNotes;
        if (order.returnVerified && order.paymentStatus !== 'refunded') {
            order.paymentStatus = 'refunded';
            // Wallet refund logic (add walletBalance to userSchema first)
            await User.findByIdAndUpdate(order.user, { $inc: { walletBalance: order.finalTotal } });
            // Send notification to user
            await User.findByIdAndUpdate(order.user, {
                $push: {
                    notifications: {
                        message: `Your return request for order ${order.orderID} has been approved. Refund of ₹${order.finalTotal} has been credited to your wallet.`,
                        date: new Date(),
                        read: false
                    }
                }
            });
        }
        if (!order.returnVerified) {
            // If rejected, you may want to set a different status or leave as returned
            order.status = 'delivered'; // Or another status as per your business logic
        }
        await order.save();
        res.redirect('/admin/return-requests');
    } catch (error) {
        res.render('error', { message: 'Error verifying return' });
    }
};

// Add this new controller to list all return requests
exports.getAllReturnRequests = async (req, res) => {
    try {
        // Find all orders with status 'returned' and not yet verified
        const returnOrders = await Order.find({ status: 'returned', $or: [{ returnVerified: { $exists: false } }, { returnVerified: false }] })
            .populate('user items.product');
        res.render('admin/return-requests', { returnOrders });
    } catch (error) {
        res.render('error', { message: 'Error fetching return requests' });
    }
};







