const Order = require('../../models/orderSchema');

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
        const order = await Order.findOne({ orderID: req.params.orderId })
            .populate('user items.product');
        if (!order) return res.render('error', { message: 'Order not found' });
        res.render('admin/order-details', { order });
    } catch (error) {
        res.render('error', { message: 'Error fetching order details' });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber, expectedDelivery } = req.body;

        const order = await Order.findOne({ orderID: orderId });
        if (!order) return res.render('error', { message: 'Order not found' });

        order.status = status;
        if (trackingNumber) order.trackingNumber = trackingNumber;
        if (expectedDelivery) order.expectedDelivery = new Date(expectedDelivery);

        await order.save();
        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
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

        if (order.status !== 'Returned') {
            return res.render('error', { message: 'Order must be in Returned state' });
        }

        order.returnVerified = verified === 'true';
        if (adminNotes) order.adminNotes = adminNotes;

        if (order.returnVerified && order.paymentStatus !== 'Refunded') {
            order.paymentStatus = 'Refunded';
            // Placeholder for wallet refund logic (since walletSchema.js was skipped)
            // Example: await Wallet.findOneAndUpdate({ user: order.user }, { $inc: { balance: order.finalTotal } });
            console.log(`Refund of ₹${order.finalTotal} to be processed for user ${order.user}`);
        }

        await order.save();
        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
        res.render('error', { message: 'Error verifying return' });
    }
};