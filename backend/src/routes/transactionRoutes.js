const express = require('express');
const router = express.Router();
const { 
  createTransaction,
  getMyTransactions,
  getTransactionById,
  updateTransactionStatus,
  getTransactionsByContract
} = require('../controllers/transactionController');
const { 
  protect, 
  admin
} = require('../middleware/authMiddleware');

// Protected routes
router.route('/')
  .post(protect, createTransaction)
  .get(protect, getMyTransactions);

router.get('/:id', protect, getTransactionById);
router.get('/contract/:contractId', protect, getTransactionsByContract);

// Admin routes
router.put('/:id/status', protect, admin, updateTransactionStatus);

module.exports = router;
