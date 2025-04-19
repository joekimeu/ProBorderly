const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['payment', 'escrow_deposit', 'escrow_release', 'refund', 'withdrawal', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'mobile_money', 'crypto', 'wallet'],
    required: true
  },
  paymentDetails: {
    provider: String,
    transactionId: String,
    feeAmount: Number,
    feeCurrency: String
  },
  blockchain: {
    isOnChain: {
      type: Boolean,
      default: false
    },
    transactionHash: String,
    network: String,
    blockNumber: Number
  },
  exchangeRate: {
    rate: Number,
    baseCurrency: String,
    quoteCurrency: String,
    timestamp: Date
  },
  description: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
