const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

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

        if(order.status=== "cancelled"){
             console.log(`Status is already cancelled. No change needed.`);
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
        const { status, adminNotes } = req.body; // Receive status from button value
        const order = await Order.findOne({ orderID: orderId }).populate('items.product');
        if (!order) return res.render('error', { message: 'Order not found' });

        // Only process if the current status is 'return-pending'
        if (order.status !== 'return-pending') {
            return res.render('error', { message: `Cannot verify return for order in ${order.status} state.` });
        }

        order.status = status; // Set the new status ('returned' or 'return-cancelled')
        if (adminNotes) order.adminNotes = adminNotes;

        if (order.status === 'returned') { // If approved
            order.paymentStatus = 'refunded';
            // Wallet refund logic
            const user = await User.findByIdAndUpdate(order.user, { $inc: { walletBalance: order.finalTotal } }, { new: true });

            // Increment product stock for all items in the order
            for (const item of order.items) {
                 // Only increment stock for items that were part of the return request
                if(item.status === 'return requested' ) {
                    await Product.findByIdAndUpdate(item.product._id, { // Use item.product._id
                        $inc: { stock: item.quantity },
                        stockLastUpdated: Date.now()
                    });
                }
            }

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

        } else if (order.status === 'return-cancelled') { // If rejected
             // Ensure adminNotes is mandatory for rejection (handled by frontend validation, but good to have backend check)
             if (!adminNotes) {
                  return res.render('error', { message: 'Admin notes are mandatory for rejecting a return request.' });
             }
             // Optionally update item statuses if needed, e.g., back to 'delivered'
             // for (const item of order.items) {
             //      if (item.status === 'return requested') {
             //           item.status = 'delivered';
             //      }
             // }
              // Send rejection notification to user
             await User.findByIdAndUpdate(order.user, {
                 $push: {
                     notifications: {
                         message: `Your return request for order ${order.orderID} has been rejected by the admin. Reason: ${adminNotes}`,
                         date: new Date(),
                         read: false
                     }
                 }
             });
        }

        await order.save();
        res.redirect('/admin/return-requests'); // Redirect to the return requests listing page
    } catch (error) {
        console.error("Error verifying return:", error);
        res.render('error', { message: 'Error verifying return' });
    }
};

// Add this new controller to list all return requests
exports.getAllReturnRequests = async (req, res) => {
    try {
        // Find all orders with status 'return-pending'
        const returnOrders = await Order.find({ status: 'return-pending' })
            .populate('user items.product');
        res.render('admin/return-requests', { returnOrders });
    } catch (error) {
        console.error("Error fetching return requests:", error);
        res.render('error', { message: 'Error fetching return requests' });
    }
};







