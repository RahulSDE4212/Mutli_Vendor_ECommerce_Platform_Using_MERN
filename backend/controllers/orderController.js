const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
require('../models/User'); // required for populate('userId')
const mongoose = require('mongoose');
const { notifyVendorsNewOrder } = require('../socket');

const formatShippingAddress = (address) => {
  if (!address) return 'N/A';
  const parts = [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
};

const getVendorDisplayName = (vendorDoc) => {
  if (!vendorDoc) return 'Unknown Vendor';
  return vendorDoc.storeName || vendorDoc.name || 'Unknown Vendor';
};

// Create a new order from cart
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'cash_on_delivery' } = req.body;

    const cart = await Cart.findOne({ userId: req.user.id }).populate({
      path: 'items.productId',
      populate: { path: 'vendorId', select: 'storeName name' },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let totalAmount = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const cartItem of cart.items) {
      const product = cartItem.productId;
      if (!product) {
        return res.status(404).json({ message: 'Product not found in cart' });
      }

      const requestedQty = Number(cartItem.quantity) || 0;
      const productPrice = Number(product.price) || 0;

      if (requestedQty < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
      }

      const vendorDoc = product.vendorId;
      if (!vendorDoc || !vendorDoc._id) {
        return res.status(400).json({ message: `Vendor not found for product ${product.name}` });
      }

      // Atomic stock decrement — avoids stale populated docs and race conditions
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: requestedQty } },
        { $inc: { stock: -requestedQty } },
        { new: true }
      );

      if (!updatedProduct) {
        const fresh = await Product.findById(product._id).select('stock name');
        const available = Number(fresh?.stock) || 0;
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${requestedQty}`,
        });
      }

      totalAmount += productPrice * requestedQty;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: productPrice,
        qty: requestedQty,
        size: cartItem.size || null,
        vendor: getVendorDisplayName(vendorDoc),
        vendorId: vendorDoc._id,
      });

      stockUpdates.push({
        productId: updatedProduct._id.toString(),
        stock: updatedProduct.stock,
      });
    }

    const order = new Order({
      userId: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      status: 'processing',
    });

    await order.save();

    const customer = await User.findById(req.user.id).select('name');
    const vendorIdsNotified = new Set();

    for (const item of orderItems) {
      const vid = item.vendorId?.toString();
      if (!vid || vendorIdsNotified.has(vid)) continue;

      vendorIdsNotified.add(vid);
      const vendorItems = orderItems.filter((i) => i.vendorId?.toString() === vid);
      const vendorTotal = vendorItems.reduce(
        (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
        0
      );

      notifyVendorsNewOrder(vid, {
        orderId: order._id.toString(),
        customer: customer?.name || 'Customer',
        items: vendorItems.map((i) => `${i.qty}x ${i.name}`).join(', '),
        total: vendorTotal,
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        items: orderItems,
        totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      stockUpdates,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { userId: req.user.id };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ message: 'Invalid startDate' });
        }
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ message: 'Invalid endDate' });
        }
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all orders (for admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching all orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get orders for a specific vendor (matches by product ownership — works for legacy orders too)
exports.getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: 'Invalid vendor ID' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const vendorProductIds = await Product.find({ vendorId: vendorObjectId }).distinct('_id');
    const vendorProductIdSet = new Set(vendorProductIds.map((id) => id.toString()));

    const storeNameLower = (vendor.storeName || '').trim().toLowerCase();
    const vendorNameLower = (vendor.name || '').trim().toLowerCase();

    const itemBelongsToVendor = (item) => {
      if (item.vendorId && item.vendorId.toString() === vendorId) return true;

      const productRef = item.productId?._id || item.productId;
      if (productRef && vendorProductIdSet.has(productRef.toString())) return true;

      if (item.productId?.vendorId?.toString() === vendorId) return true;

      const itemVendor = (item.vendor || '').trim().toLowerCase();
      if (itemVendor && (itemVendor === storeNameLower || itemVendor === vendorNameLower)) {
        return true;
      }

      return false;
    };

    const orderQuery = {
      $or: [
        { 'items.vendorId': vendorObjectId },
        ...(vendorProductIds.length > 0
          ? [{ 'items.productId': { $in: vendorProductIds } }]
          : []),
        { 'items.vendor': vendor.storeName },
        ...(vendor.name && vendor.name !== vendor.storeName
          ? [{ 'items.vendor': vendor.name }]
          : []),
      ],
    };

    const orders = await Order.find(orderQuery)
      .populate('userId', 'name email')
      .populate('items.productId')
      .sort({ createdAt: -1 });

    let totalRevenue = 0;
    const ordersWithVendorTotals = [];

    for (const order of orders) {
      const vendorItems = order.items.filter(itemBelongsToVendor);

      if (vendorItems.length === 0) continue;

      const vendorOrderTotal = vendorItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
        0
      );
      totalRevenue += vendorOrderTotal;

      // Backfill legacy order lines missing vendorId / wrong vendor name
      let orderUpdated = false;
      for (const item of order.items) {
        if (!itemBelongsToVendor(item)) continue;
        if (!item.vendorId || item.vendor === 'Unknown Vendor') {
          item.vendorId = vendor._id;
          item.vendor = vendor.storeName;
          orderUpdated = true;
        }
      }
      if (orderUpdated) {
        await order.save();
      }

      ordersWithVendorTotals.push({
        ...order.toObject(),
        vendorItems,
        vendorOrderTotal,
      });
    }

    res.json({
      orders: ordersWithVendorTotals,
      stats: {
        totalRevenue,
        orderCount: ordersWithVendorTotals.length,
        storeName: vendor.storeName,
      },
    });
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit feedback for a delivered order (customer only)
exports.submitOrderFeedback = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;

    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Feedback is only allowed after delivery' });
    }

    if (order.feedback?.rating) {
      return res.status(400).json({ message: 'Feedback already submitted for this order' });
    }

    order.feedback = {
      rating: parsedRating,
      comment: (comment || '').trim(),
      createdAt: new Date(),
    };
    await order.save();

    res.json({
      message: 'Feedback submitted successfully',
      feedback: order.feedback,
    });
  } catch (err) {
    console.error('Error submitting order feedback:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download order invoice PDF (customer only)
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId).populate('userId', 'name email mobile');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderUserId = order.userId?._id?.toString() || order.userId?.toString();
    if (orderUserId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to download this invoice' });
    }

    const customer = order.userId?.name ? order.userId : null;
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `invoice-${orderId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('UniBox', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Tax Invoice', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details');
    doc.font('Helvetica');
    doc.text(`Invoice No: ${order._id}`);
    doc.text(`Order Date: ${orderDate}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment: ${(order.paymentMethod || 'cash_on_delivery').replace(/_/g, ' ')}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Bill To');
    doc.font('Helvetica');
    if (customer) {
      doc.text(customer.name || 'Customer');
      if (customer.email) doc.text(customer.email);
      if (customer.mobile) doc.text(customer.mobile);
    }
    doc.text(`Shipping: ${formatShippingAddress(order.shippingAddress)}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    const colName = 50;
    const colQty = 300;
    const colPrice = 360;
    const colTotal = 450;

    doc.font('Helvetica-Bold');
    doc.text('Item', colName, tableTop);
    doc.text('Qty', colQty, tableTop);
    doc.text('Price', colPrice, tableTop);
    doc.text('Total', colTotal, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    doc.font('Helvetica');

    let y = tableTop + 22;
    for (const item of order.items) {
      const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
      const itemLabel = `${item.name}${item.size ? ` (Size: ${item.size})` : ''}`;

      doc.text(itemLabel, colName, y, { width: 240 });
      doc.text(String(item.qty), colQty, y);
      doc.text(`₹${Number(item.price).toFixed(2)}`, colPrice, y);
      doc.text(`₹${lineTotal.toFixed(2)}`, colTotal, y);

      if (item.vendor) {
        y += 14;
        doc.fontSize(8).fillColor('#555555').text(`Vendor: ${item.vendor}`, colName, y, { width: 240 });
        doc.fillColor('#000000').fontSize(10);
      }

      y += 24;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    }

    const totalY = y + 16;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Grand Total: ₹${Number(order.totalAmount).toFixed(2)}`, 50, totalY, {
      align: 'right',
      width: 495,
    });

    doc.fontSize(9).font('Helvetica').fillColor('#555555');
    doc.text(
      'Thank you for shopping with UniBox!',
      50,
      doc.page.height - 70,
      { align: 'center', width: doc.page.width - 100 }
    );

    doc.end();
  } catch (err) {
    console.error('Error generating invoice:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate invoice' });
    }
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
