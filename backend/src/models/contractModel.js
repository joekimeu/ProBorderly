const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Contract title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Contract description is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  terms: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  paymentTerms: {
    type: String,
    required: true
  },
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'approved', 'disputed'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'completed', 'cancelled', 'disputed'],
    default: 'draft'
  },
  disputeDetails: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputeReason: String,
    disputeDate: Date,
    resolution: String,
    resolutionDate: Date
  },
  blockchain: {
    isOnChain: {
      type: Boolean,
      default: false
    },
    contractAddress: String,
    transactionHash: String,
    network: String
  },
  jurisdictions: [{
    type: String,
    required: true
  }],
  complianceStatus: {
    type: String,
    enum: ['pending', 'compliant', 'non_compliant'],
    default: 'pending'
  },
  complianceDetails: [{
    jurisdiction: String,
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'warning']
    },
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
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

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
