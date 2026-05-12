const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('products');
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user.id, products: [] });
      await wishlist.save();
    }
    res.json(wishlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ userId: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user.id, products: [] });
    }

    // Check if already in wishlist
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    wishlist.products.push(productId);
    await wishlist.save();
    res.json({ message: 'Product added to wishlist', wishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ userId: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await wishlist.save();
    res.json({ message: 'Product removed from wishlist', wishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear wishlist
exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = [];
    await wishlist.save();
    res.json({ message: 'Wishlist cleared', wishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


