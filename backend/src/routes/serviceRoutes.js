const express = require('express');
const router = express.Router();
const { 
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByProvider,
  getMyServices
} = require('../controllers/serviceController');
const { 
  protect, 
  professional,
  verifiedProfessional 
} = require('../middleware/authMiddleware');

// Public routes
router.get('/', getServices);
router.get('/:id', getServiceById);
router.get('/provider/:id', getServicesByProvider);

// Professional routes
router.post('/', protect, professional, createService);
router.get('/user/myservices', protect, professional, getMyServices);
router.route('/:id')
  .put(protect, professional, updateService)
  .delete(protect, professional, deleteService);

module.exports = router;
