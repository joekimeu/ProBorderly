const mongoose = require('mongoose');

const regulationSchema = new mongoose.Schema({
  country: {
    type: String,
    required: [true, 'Country is required'],
    index: true
  },
  sector: {
    type: String,
    enum: ['legal', 'tax', 'development', 'creative', 'general'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Regulation title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Regulation description is required']
  },
  fullText: {
    type: String
  },
  source: {
    name: String,
    url: String,
    lastUpdated: Date
  },
  requirements: [{
    title: String,
    description: String,
    isMandatory: Boolean
  }],
  applicability: {
    professionalTypes: [{
      type: String,
      enum: ['lawyer', 'tax_advisor', 'developer', 'creative', 'other']
    }],
    serviceTypes: [{
      type: String
    }],
    crossBorderOnly: {
      type: Boolean,
      default: false
    }
  },
  penalties: {
    description: String,
    financialPenalties: [{
      description: String,
      amount: Number,
      currency: String
    }],
    otherPenalties: [String]
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'superseded', 'archived'],
    default: 'active'
  },
  effectiveDate: {
    type: Date
  },
  expirationDate: {
    type: Date
  },
  relatedRegulations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Regulation'
  }],
  keywords: [{
    type: String,
    index: true
  }],
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

// Create text index for search
regulationSchema.index({ 
  title: 'text', 
  description: 'text', 
  fullText: 'text',
  keywords: 'text'
});

const Regulation = mongoose.model('Regulation', regulationSchema);

module.exports = Regulation;
