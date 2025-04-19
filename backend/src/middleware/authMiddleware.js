const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'africonnect_secret_key', {
    expiresIn: '30d',
  });
};

// Protect routes - middleware
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'africonnect_secret_key');

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

// Professional middleware
const professional = (req, res, next) => {
  if (req.user && req.user.role === 'professional') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a professional' });
  }
};

// Verified professional middleware
const verifiedProfessional = (req, res, next) => {
  if (
    req.user && 
    req.user.role === 'professional' && 
    req.user.verificationStatus === 'verified'
  ) {
    next();
  } else {
    res.status(401).json({ 
      message: 'Not authorized. Professional verification required.' 
    });
  }
};

module.exports = { 
  generateToken, 
  protect, 
  admin, 
  professional,
  verifiedProfessional 
};
