const Contract = require('../models/contractModel');
const Service = require('../models/serviceModel');
const User = require('../models/userModel');

// @desc    Create a new contract
// @route   POST /api/contracts
// @access  Private
const createContract = async (req, res) => {
  try {
    const {
      title,
      description,
      providerId,
      serviceId,
      terms,
      startDate,
      endDate,
      amount,
      currency,
      paymentTerms,
      milestones,
      jurisdictions
    } = req.body;

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Verify provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Verify provider is verified
    if (provider.verificationStatus !== 'verified') {
      return res.status(400).json({ message: 'Provider must be verified to create contracts' });
    }

    // Create contract
    const contract = await Contract.create({
      title,
      description,
      client: req.user._id,
      provider: providerId,
      service: serviceId,
      terms,
      startDate,
      endDate,
      amount,
      currency,
      paymentTerms,
      milestones: milestones || [],
      status: 'draft',
      jurisdictions
    });

    if (contract) {
      res.status(201).json(contract);
    } else {
      res.status(400).json({ message: 'Invalid contract data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all contracts for a user (as client or provider)
// @route   GET /api/contracts
// @access  Private
const getMyContracts = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    // Build filter object
    let filter = {};
    
    if (req.query.role === 'provider') {
      filter.provider = req.user._id;
    } else if (req.query.role === 'client') {
      filter.client = req.user._id;
    } else {
      // Default: get contracts where user is either client or provider
      filter = {
        $or: [
          { client: req.user._id },
          { provider: req.user._id }
        ]
      };
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const count = await Contract.countDocuments(filter);
    
    const contracts = await Contract.find(filter)
      .populate('client', 'firstName lastName email')
      .populate('provider', 'firstName lastName email verificationStatus')
      .populate('service', 'title category')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      contracts,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get contract by ID
// @route   GET /api/contracts/:id
// @access  Private
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('client', 'firstName lastName email country')
      .populate('provider', 'firstName lastName email verificationStatus country')
      .populate('service', 'title description category pricing');

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized to view this contract
    if (
      contract.client._id.toString() !== req.user._id.toString() &&
      contract.provider._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({ message: 'Not authorized to view this contract' });
    }

    res.json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update contract status
// @route   PUT /api/contracts/:id/status
// @access  Private
const updateContractStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized to update this contract
    if (
      contract.client.toString() !== req.user._id.toString() &&
      contract.provider.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({ message: 'Not authorized to update this contract' });
    }

    // Validate status transitions
    const validTransitions = {
      'draft': ['pending', 'cancelled'],
      'pending': ['active', 'cancelled'],
      'active': ['completed', 'disputed'],
      'disputed': ['completed', 'cancelled']
    };

    if (!validTransitions[contract.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${contract.status} to ${status}` 
      });
    }

    // Additional validation for specific transitions
    if (status === 'active' && contract.status === 'pending') {
      // Only provider can accept a contract
      if (contract.provider.toString() !== req.user._id.toString()) {
        return res.status(401).json({ 
          message: 'Only the service provider can accept a contract' 
        });
      }
    }

    if (status === 'completed' && contract.status === 'active') {
      // Only client can mark a contract as completed
      if (contract.client.toString() !== req.user._id.toString()) {
        return res.status(401).json({ 
          message: 'Only the client can mark a contract as completed' 
        });
      }
    }

    // Update contract status
    contract.status = status;
    
    // If contract is being disputed, add dispute details
    if (status === 'disputed') {
      const { disputeReason } = req.body;
      if (!disputeReason) {
        return res.status(400).json({ message: 'Dispute reason is required' });
      }
      
      contract.disputeDetails = {
        isDisputed: true,
        disputeReason,
        disputeDate: Date.now()
      };
    }

    const updatedContract = await contract.save();

    res.json(updatedContract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update milestone status
// @route   PUT /api/contracts/:id/milestones/:milestoneId
// @access  Private
const updateMilestoneStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Find the milestone
    const milestone = contract.milestones.id(req.params.milestoneId);
    
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Check if user is authorized to update this milestone
    if (
      (status === 'completed' && contract.provider.toString() !== req.user._id.toString()) ||
      (status === 'approved' && contract.client.toString() !== req.user._id.toString())
    ) {
      return res.status(401).json({ 
        message: 'Not authorized to update this milestone status' 
      });
    }

    // Validate status transitions
    const validTransitions = {
      'pending': ['completed', 'disputed'],
      'completed': ['approved', 'disputed'],
      'disputed': ['completed', 'approved']
    };

    if (!validTransitions[milestone.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${milestone.status} to ${status}` 
      });
    }

    // Update milestone status
    milestone.status = status;
    
    const updatedContract = await contract.save();

    res.json({
      message: 'Milestone updated successfully',
      milestone: milestone,
      contract: updatedContract
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add compliance check result to contract
// @route   POST /api/contracts/:id/compliance
// @access  Private/Admin
const addComplianceCheck = async (req, res) => {
  try {
    const { jurisdiction, status, details } = req.body;
    
    if (!jurisdiction || !status || !details) {
      return res.status(400).json({ 
        message: 'Jurisdiction, status, and details are required' 
      });
    }

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Add compliance check
    contract.complianceDetails.push({
      jurisdiction,
      status,
      details,
      timestamp: Date.now()
    });

    // Update overall compliance status
    const nonCompliantChecks = contract.complianceDetails.some(
      check => check.status === 'non_compliant'
    );
    
    if (nonCompliantChecks) {
      contract.complianceStatus = 'non_compliant';
    } else if (contract.complianceDetails.length > 0) {
      contract.complianceStatus = 'compliant';
    }

    const updatedContract = await contract.save();

    res.json({
      message: 'Compliance check added successfully',
      complianceStatus: updatedContract.complianceStatus,
      complianceDetails: updatedContract.complianceDetails
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createContract,
  getMyContracts,
  getContractById,
  updateContractStatus,
  updateMilestoneStatus,
  addComplianceCheck
};
