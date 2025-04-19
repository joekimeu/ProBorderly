const User = require('../models/userModel');
const { generateToken } = require('../middleware/authMiddleware');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, country, languages } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      country,
      languages: languages || ['english'],
      professionalType: role === 'professional' ? req.body.professionalType : undefined
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        country: user.country,
        languages: user.languages,
        professionalType: user.professionalType,
        verificationStatus: user.verificationStatus,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        country: user.country,
        languages: user.languages,
        professionalType: user.professionalType,
        verificationStatus: user.verificationStatus,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        country: user.country,
        languages: user.languages,
        professionalType: user.professionalType,
        verificationStatus: user.verificationStatus,
        profileComplete: user.profileComplete,
        rating: user.rating,
        wallet: {
          balance: user.wallet.balance,
          currency: user.wallet.currency
        },
        createdAt: user.createdAt
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;
      user.country = req.body.country || user.country;
      user.languages = req.body.languages || user.languages;
      
      if (user.role === 'professional') {
        user.professionalType = req.body.professionalType || user.professionalType;
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Check if profile is complete
      const requiredFields = ['firstName', 'lastName', 'email', 'country', 'languages'];
      if (user.role === 'professional') {
        requiredFields.push('professionalType');
      }
      
      const isComplete = requiredFields.every(field => user[field]);
      user.profileComplete = isComplete;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        country: updatedUser.country,
        languages: updatedUser.languages,
        professionalType: updatedUser.professionalType,
        verificationStatus: updatedUser.verificationStatus,
        profileComplete: updatedUser.profileComplete,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit verification documents
// @route   POST /api/users/verification
// @access  Private/Professional
const submitVerification = async (req, res) => {
  try {
    const { documentType, documentUrl } = req.body;
    
    if (!documentType || !documentUrl) {
      return res.status(400).json({ message: 'Document type and URL are required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add verification document
    user.verificationDocuments.push({
      documentType,
      documentUrl,
      verificationStatus: 'pending'
    });

    // Update verification status if it's unverified
    if (user.verificationStatus === 'unverified') {
      user.verificationStatus = 'pending';
    }

    await user.save();

    res.status(201).json({
      message: 'Verification documents submitted successfully',
      verificationStatus: user.verificationStatus,
      documents: user.verificationDocuments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify a professional user
// @route   PUT /api/users/:id/verify
// @access  Private/Admin
const verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'professional') {
      return res.status(400).json({ message: 'Only professional users can be verified' });
    }

    const { documentId, status, rejectionReason } = req.body;

    // Find the document
    const document = user.verificationDocuments.id(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Update document status
    document.verificationStatus = status;
    if (status === 'rejected' && rejectionReason) {
      document.rejectionReason = rejectionReason;
    }

    // Update user verification status based on documents
    const pendingDocs = user.verificationDocuments.some(doc => doc.verificationStatus === 'pending');
    const approvedDocs = user.verificationDocuments.some(doc => doc.verificationStatus === 'approved');
    
    if (approvedDocs && !pendingDocs) {
      user.verificationStatus = 'verified';
    } else if (pendingDocs) {
      user.verificationStatus = 'pending';
    } else {
      user.verificationStatus = 'unverified';
    }

    await user.save();

    res.json({
      message: 'User verification updated successfully',
      verificationStatus: user.verificationStatus,
      documents: user.verificationDocuments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  submitVerification,
  getUsers,
  verifyUser
};
