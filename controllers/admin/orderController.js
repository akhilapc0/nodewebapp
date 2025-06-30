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
        let { status } = req.body;
        status = status.toLowerCase();

        const order = await Order.findOne({ orderID: orderId });
        if (!order) {
            return res.render('error', { message: 'Order not found' });
        }

        // Prevent invalid transitions from cancelled/returned
        if (order.status === 'cancelled' || order.status === 'returned') {
            return res.redirect(`/admin/orders/${orderId}`);
        }

        // Only allow valid transitions
        const validTransitions = {
            'pending': ['shipped', 'out for delivery', 'delivered', 'cancelled'],
            'shipped': ['out for delivery', 'delivered', 'cancelled'],
            'out for delivery': ['delivered', 'cancelled'],
            'delivered': ['return-pending', 'cancelled'],
            'return-pending': ['returned', 'cancelled']
        };
        const current = order.status;
        if (!validTransitions[current] || !validTransitions[current].includes(status)) {
            // If trying to set to same status, allow
            if (current !== status) {
                return res.redirect(`/admin/orders/${orderId}`);
            }
        }

        // Update order status
        order.status = status;

        // Update item statuses if needed
        if (status === 'delivered') {
            for (const item of order.items) {
                if (item.status !== 'cancelled' && item.status !== 'return requested' && item.status !== 'returned' && item.status !== 'return accepted' && item.status !== 'return rejected') {
                    item.status = 'delivered';
                }
            }
        } else if (status === 'cancelled') {
            for (const item of order.items) {
                item.status = 'cancelled';
            }
        }

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

            // Update item statuses to 'returned' for approved items
            for (const item of order.items) {
                if (item.status === 'return requested') {
                    item.status = 'returned'; // Update item status to 'returned'
                }
            }

            // Wallet refund logic
            const user = await User.findByIdAndUpdate(order.user, { $inc: { walletBalance: order.finalTotal } }, { new: true });

            // Increment product stock for all items that were part of the return request (which we just set to 'returned')
            for (const item of order.items) {
                 if(item.status === 'returned' ) { // Check for the new status 'returned'
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
             // Update item statuses from 'return requested' to 'return cancelled'
             for (const item of order.items) {
                  if (item.status === 'return requested') {
                       item.status = 'return cancelled';
                  }
             }
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

        // --- New Logic to update overall order status based on item statuses ---
        const allItemsReturned = order.items.every(item => item.status === 'returned');
        const allItemsCancelled = order.items.every(item => item.status === 'cancelled');

        if (allItemsReturned) {
            order.status = 'returned';
        } else if (allItemsCancelled) {
             order.status = 'cancelled';
        }

        await order.save();
        
        // Redirect back to order details with a success indicator
        if (order.status === 'returned') {
            res.redirect(`/admin/orders/${orderId}?returnAction=approved`);
        } else if (order.status === 'return-cancelled') {
            res.redirect(`/admin/orders/${orderId}?returnAction=rejected`);
        }
        
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







