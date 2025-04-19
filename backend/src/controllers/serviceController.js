const Service = require('../models/serviceModel');
const User = require('../models/userModel');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private/Professional
const createService = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      pricing,
      countries,
      languages,
      deliveryTimeframe,
      tags,
      requirements
    } = req.body;

    // Create service
    const service = await Service.create({
      title,
      description,
      provider: req.user._id,
      category,
      subCategory,
      pricing,
      countries,
      languages,
      deliveryTimeframe,
      tags,
      requirements,
      status: req.user.verificationStatus === 'verified' ? 'active' : 'pending_review'
    });

    if (service) {
      res.status(201).json(service);
    } else {
      res.status(400).json({ message: 'Invalid service data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    // Build filter object
    const filter = { status: 'active' };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.countries) {
      filter.countries = { $in: req.query.countries.split(',') };
    }
    
    if (req.query.languages) {
      filter.languages = { $in: req.query.languages.split(',') };
    }
    
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const count = await Service.countDocuments(filter);
    
    const services = await Service.find(filter)
      .populate('provider', 'firstName lastName verificationStatus rating')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      services,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'firstName lastName verificationStatus rating country languages');

    if (service) {
      res.json(service);
    } else {
      res.status(404).json({ message: 'Service not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Professional
const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user is the service provider
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this service' });
    }

    // Update fields
    const {
      title,
      description,
      category,
      subCategory,
      pricing,
      countries,
      languages,
      deliveryTimeframe,
      tags,
      requirements,
      status
    } = req.body;

    if (title) service.title = title;
    if (description) service.description = description;
    if (category) service.category = category;
    if (subCategory) service.subCategory = subCategory;
    if (pricing) service.pricing = pricing;
    if (countries) service.countries = countries;
    if (languages) service.languages = languages;
    if (deliveryTimeframe) service.deliveryTimeframe = deliveryTimeframe;
    if (tags) service.tags = tags;
    if (requirements) service.requirements = requirements;
    
    // Only allow status change if user is verified
    if (status && req.user.verificationStatus === 'verified') {
      service.status = status;
    }

    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Professional
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user is the service provider
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this service' });
    }

    await service.remove();
    res.json({ message: 'Service removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get services by provider
// @route   GET /api/services/provider/:id
// @access  Public
const getServicesByProvider = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    const filter = { 
      provider: req.params.id,
      status: 'active'
    };

    const count = await Service.countDocuments(filter);
    
    const services = await Service.find(filter)
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      services,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get my services
// @route   GET /api/services/myservices
// @access  Private/Professional
const getMyServices = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    const filter = { provider: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const count = await Service.countDocuments(filter);
    
    const services = await Service.find(filter)
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      services,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByProvider,
  getMyServices
};
