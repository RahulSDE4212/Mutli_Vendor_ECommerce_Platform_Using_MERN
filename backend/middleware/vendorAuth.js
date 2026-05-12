const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const vendorAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) {
      return res.status(401).json({ message: 'Vendor not found' });
    }
    req.vendor = vendor;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = vendorAuth;
