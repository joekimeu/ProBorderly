const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['legal', 'tax', 'development', 'creative', 'consulting', 'other'],
    required: true
  },
  subCategory: {
    type: String
  },
  pricing: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'milestone'],
      default: 'fixed'
    }
  },
  countries: [{
    type: String,
    required: true
  }],
  languages: [{
    type: String,
    required: true
  }],
  deliveryTimeframe: {
    type: Number, // in days
    required: true
  },
  tags: [{
    type: String
  }],
  requirements: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_review'],
    default: 'pending_review'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
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

// Create index for search
serviceSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
