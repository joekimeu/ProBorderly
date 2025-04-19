const express = require('express');
const router = express.Router();
const { 
  createContract,
  getMyContracts,
  getContractById,
  updateContractStatus,
  updateMilestoneStatus,
  addComplianceCheck
} = require('../controllers/contractController');
const { 
  protect, 
  admin,
  professional,
  verifiedProfessional 
} = require('../middleware/authMiddleware');

// Protected routes
router.route('/')
  .post(protect, createContract)
  .get(protect, getMyContracts);

router.get('/:id', protect, getContractById);
router.put('/:id/status', protect, updateContractStatus);
router.put('/:id/milestones/:milestoneId', protect, updateMilestoneStatus);

// Admin routes
router.post('/:id/compliance', protect, admin, addComplianceCheck);

module.exports = router;
