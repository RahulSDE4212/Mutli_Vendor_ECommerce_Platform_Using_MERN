const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const vendorAuth = require('../middleware/vendorAuth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Vendor-only routes
router.post('/', vendorAuth, productController.createProduct);
router.put('/:id', vendorAuth, productController.updateProduct);
router.delete('/:id', vendorAuth, productController.deleteProduct);

module.exports = router;


