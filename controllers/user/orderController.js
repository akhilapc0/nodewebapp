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

        res.render('user/order-list', { orders, search, user: req.session.user });
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

        res.render('user/order-details', { order, user: req.session.user });
    } catch (error) {
        console.error('Error in getUserOrderDetails:', error);
        res.render('error', { message: 'Error fetching order details' });
    }
};

// Utility: Determine order status from item statuses
function _determineOrderStatusFromItems(items) {
    const statuses = items.map(item => (item.status || '').toLowerCase());
    const all = s => statuses.every(st => st === s);
    const any = s => statuses.includes(s);
    const some = s => statuses.some(st => st === s);
    const none = s => !statuses.includes(s);

    if (all('cancelled')) return 'cancelled';
    if (all('shipped')) return 'shipped';
    if (all('delivered')) return 'delivered';
    if (all('returned')) return 'returned';
    if (all('return requested')) return 'return-pending';
    if (all('return cancelled')) return 'return-cancelled';

    // Mixed/Partial states
    if (some('returned') && (some('delivered') || some('shipped') || some('pending'))) return 'partially returned';
    if (some('delivered') && (some('pending') || some('shipped'))) return 'partially delivered';
    if (some('cancelled') && !all('cancelled')) return 'partially cancelled';
    if (some('shipped') && (some('pending') || some('delivered'))) return 'partially shipped';
    if (some('return requested') && !all('return requested')) return 'partially return-pending';
    if (some('return cancelled') && !all('return cancelled')) return 'partially return-cancelled';

    // Fallback
    return 'pending';
}

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
                if (itemIds.includes(item._id.toString()) && item.status !== 'cancelled' && item.status !== 'returned') {
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
        } else {
            // Full order cancellation
            for (const item of order.items) {
                if(item.status !== 'cancelled' && item.status !== 'returned'){
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

        // Set order status based on items
        order.status = _determineOrderStatusFromItems(order.items);
        if (order.status === 'cancelled') {
            order.cancellationReason = cancellationReason || 'Not specified';
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

        console.log('--- REQUEST RETURN DEBUG ---');
        console.log('Order ID:', orderId);
        console.log('Item IDs:', itemIds);
        console.log('Return Reason:', returnReason);

        // Return reason is mandatory
        if (!returnReason) {
            console.log('Return reason missing');
            return res.render('error', { message: 'Return reason is required' });
        }

        const order = await Order.findOne({ orderID: orderId });
        if (!order) {
            console.log('Order not found');
            return res.render('error', { message: 'Order not found' });
        }

        console.log('Order items before:', order.items.map(i => ({ id: i._id, status: i.status })));

        // Mark return request as submitted
        order.returnRequest = order.returnRequest || {};
        order.returnRequest.requested = true;
        order.returnRequest.reason = returnReason;
        order.returnRequest.verified = false;

        let anyItemUpdated = false;
        if (itemIds && itemIds.length > 0) {
            // Partial return (specific items)
            for (const item of order.items) {
                if (itemIds.includes(item._id.toString()) && item.status === 'delivered') {
                    item.status = 'return requested';
                    item.returnReason = returnReason;
                    anyItemUpdated = true;
                }
            }
            if (!anyItemUpdated) {
                return res.render('error', { message: 'No eligible items to return.' });
            }
        } else {
            // Full order return (all delivered items)
            for (const item of order.items) {
                if (item.status === 'delivered') {
                    item.status = 'return requested';
                    item.returnReason = returnReason;
                    anyItemUpdated = true;
                }
            }
            if (!anyItemUpdated) {
                return res.render('error', { message: 'No eligible items to return.' });
            }
        }

        // Set order status based on items
        order.status = _determineOrderStatusFromItems(order.items);
        // Clear previous return verification status
        order.returnRequest.verified = undefined;
        order.adminNotes = undefined;

        console.log('Order items after:', order.items.map(i => ({ id: i._id, status: i.status })));
        console.log('Order status after:', order.status);

        await order.save();
        console.log('Order saved successfully');
        res.redirect('/user/orders');
    } catch (error) {
        console.error('Error in requestReturn:', error);
        res.render('error', { message: 'Error requesting return' });
    }
};

// Download invoice as PDF
exports.downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findOne({ orderID: req.params.orderId })
            .populate('user items.product');
        if (!order) return res.status(404).send('Order not found');

        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderID}.pdf`);
        doc.pipe(res);

        // Header: INVOICE, Order ID and Date on one line
        doc.font('Helvetica-Bold').fontSize(22).text('INVOICE', 40, 40, { continued: true });
        doc.font('Helvetica').fontSize(11).text(`   Order ID: ${order.orderID}   Date: ${order.orderDate.toLocaleDateString('en-IN')}`, { align: 'right' });
        doc.moveDown(1.5);

        // Customer Section
        let y = doc.y;
        doc.font('Helvetica-Bold').fontSize(12).text('Customer:', 40, y, { continued: true });
        doc.font('Helvetica').fontSize(12).text(` ${order.user.name}`);
        y = doc.y;
        doc.font('Helvetica-Bold').text('Status:', 40, y, { continued: true });
        doc.font('Helvetica').text(` ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`);
        y = doc.y;
        doc.font('Helvetica-Bold').text('Email:', 40, y, { continued: true });
        doc.font('Helvetica').text(` ${order.user.email || ''}`);
        y = doc.y;
        doc.font('Helvetica-Bold').text('Phone:', 40, y, { continued: true });
        doc.font('Helvetica').text(` ${order.shippingAddress.phone}  `, { continued: true });
        doc.font('Helvetica-Bold').text('Alt. Phone:', doc.x, y, { continued: true });
        doc.font('Helvetica').text(` ${order.shippingAddress.altPhone || ''}`);
        y = doc.y;
        doc.font('Helvetica-Bold').text('Shipping Address:', 40, y, { continued: true });
        doc.font('Helvetica').text(` ${order.shippingAddress.name}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`);
        doc.moveDown(1.5);

        // Items Table
        const tableTop = doc.y;
        const itemColX = 50, qtyColX = 250, priceColX = 320, subColX = 420;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Item', itemColX, tableTop);
        doc.text('Qty', qtyColX, tableTop, { width: 40, align: 'right' });
        doc.text('Price', priceColX, tableTop, { width: 60, align: 'right' });
        doc.text('Subtotal', subColX, tableTop, { width: 80, align: 'right' });
        doc.moveTo(itemColX, tableTop + 16).lineTo(570, tableTop + 16).strokeColor('#e0e0e0').stroke();
        let rowY = tableTop + 20;
        doc.font('Helvetica').fontSize(11);
        order.items.forEach(item => {
            doc.text(item.product.productName, itemColX, rowY);
            doc.text(item.quantity.toString(), qtyColX, rowY, { width: 40, align: 'right' });
            doc.text(`¥${item.price}`, priceColX, rowY, { width: 60, align: 'right' });
            doc.text(`¥${item.price * item.quantity}`, subColX, rowY, { width: 80, align: 'right' });
            rowY += 20;
        });
        // Border above totals
        doc.moveTo(itemColX, rowY + 2).lineTo(570, rowY + 2).strokeColor('#e0e0e0').stroke();
        rowY += 10;
        // Totals merged into table
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('', itemColX, rowY);
        doc.text('Subtotal:', qtyColX, rowY, { width: 70, align: 'right' });
        doc.text('', priceColX, rowY);
        doc.text(`¥${order.subtotal}`, subColX, rowY, { width: 80, align: 'right' });
        rowY += 18;
        doc.text('', itemColX, rowY);
        doc.text('Tax:', qtyColX, rowY, { width: 70, align: 'right' });
        doc.text('', priceColX, rowY);
        doc.text(`¥${order.tax}`, subColX, rowY, { width: 80, align: 'right' });
        rowY += 18;
        doc.text('', itemColX, rowY);
        doc.text('Discount:', qtyColX, rowY, { width: 70, align: 'right' });
        doc.text('', priceColX, rowY);
        doc.text(`-¥${order.discount}`, subColX, rowY, { width: 80, align: 'right' });
        rowY += 18;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('', itemColX, rowY);
        doc.text('Grand Total:', qtyColX, rowY, { width: 70, align: 'right' });
        doc.text('', priceColX, rowY);
        doc.text(`¥${order.finalTotal}`, subColX, rowY, { width: 80, align: 'right' });

        // Footer
        doc.moveDown(3);
        doc.font('Helvetica-Oblique').fontSize(13).fillColor('#888').text('Thank you!', 0, doc.y, { align: 'center' });
        doc.fillColor('black');

        doc.end();
    } catch (error) {
        console.error(error);
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
        res.render('user/notifications', { notifications: updatedUser.notifications, user: req.session.user });
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
        res.render('admin/order-details', { order, user: req.session.user });
    } catch (error) {
        res.render('error', { message: 'Error fetching order details' });
    }
};

module.exports._determineOrderStatusFromItems = _determineOrderStatusFromItems;