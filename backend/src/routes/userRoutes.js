const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  submitVerification,
  getUsers,
  verifyUser
} = require('../controllers/userController');
const { 
  protect, 
  admin, 
  professional 
} = require('../middleware/authMiddleware');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);

// Protected routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Professional routes
router.post('/verification', protect, professional, submitVerification);

// Admin routes
router.get('/', protect, admin, getUsers);
router.put('/:id/verify', protect, admin, verifyUser);

module.exports = router;
