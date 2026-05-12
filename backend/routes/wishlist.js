const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

// All wishlist routes require authentication
router.use(auth);

router.get('/', wishlistController.getWishlist);
router.post('/add', wishlistController.addToWishlist);
router.delete('/remove', wishlistController.removeFromWishlist);
router.delete('/clear', wishlistController.clearWishlist);

module.exports = router;