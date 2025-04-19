const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const Contract = require('../models/contractModel');

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      transactionType,
      amount,
      currency,
      recipientId,
      contractId,
      milestoneId,
      paymentMethod,
      paymentDetails,
      description
    } = req.body;

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Validate contract if provided
    let contract = null;
    if (contractId) {
      contract = await Contract.findById(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      // Verify user is part of this contract
      if (
        contract.client.toString() !== req.user._id.toString() &&
        contract.provider.toString() !== req.user._id.toString()
      ) {
        return res.status(401).json({ message: 'Not authorized to create transactions for this contract' });
      }
    }

    // Create transaction
    const transaction = await Transaction.create({
      transactionType,
      amount,
      currency,
      sender: req.user._id,
      recipient: recipientId,
      contract: contractId,
      milestone: milestoneId,
      paymentMethod,
      paymentDetails,
      description,
      status: 'pending'
    });

    if (transaction) {
      // Update user wallet balances (simplified for now)
      // In a real implementation, this would be handled by a payment processor
      if (transactionType === 'payment' || transactionType === 'escrow_deposit') {
        // Deduct from sender's wallet
        const sender = await User.findById(req.user._id);
        if (sender.wallet.currency === currency) {
          sender.wallet.balance -= amount;
          sender.wallet.transactions.push(transaction._id);
          await sender.save();
        }
      }

      res.status(201).json(transaction);
    } else {
      res.status(400).json({ message: 'Invalid transaction data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
const getMyTransactions = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    // Build filter object
    let filter = {
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    };
    
    if (req.query.type) {
      filter.transactionType = req.query.type;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const count = await Transaction.countDocuments(filter);
    
    const transactions = await Transaction.find(filter)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('contract', 'title status')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      transactions,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('contract', 'title status');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user is authorized to view this transaction
    if (
      transaction.sender._id.toString() !== req.user._id.toString() &&
      transaction.recipient._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({ message: 'Not authorized to view this transaction' });
    }

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update transaction status
// @route   PUT /api/transactions/:id/status
// @access  Private/Admin
const updateTransactionStatus = async (req, res) => {
  try {
    const { status, blockchainDetails } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only admins can update transaction status
    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to update transaction status' });
    }

    // Update transaction status
    transaction.status = status;
    
    // Update blockchain details if provided
    if (blockchainDetails) {
      transaction.blockchain = {
        isOnChain: true,
        ...blockchainDetails
      };
    }

    const updatedTransaction = await transaction.save();

    // If transaction is completed, update recipient's wallet
    if (status === 'completed') {
      const recipient = await User.findById(transaction.recipient);
      
      if (recipient) {
        // If currencies match, add to balance
        if (recipient.wallet.currency === transaction.currency) {
          recipient.wallet.balance += transaction.amount;
        } else {
          // In a real implementation, currency conversion would happen here
          recipient.wallet.balance += transaction.amount; // Simplified
        }
        
        recipient.wallet.transactions.push(transaction._id);
        await recipient.save();
      }
    }

    res.json(updatedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get transactions for a contract
// @route   GET /api/transactions/contract/:contractId
// @access  Private
const getTransactionsByContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.contractId);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized to view transactions for this contract
    if (
      contract.client.toString() !== req.user._id.toString() &&
      contract.provider.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({ message: 'Not authorized to view transactions for this contract' });
    }

    const transactions = await Transaction.find({ contract: req.params.contractId })
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createTransaction,
  getMyTransactions,
  getTransactionById,
  updateTransactionStatus,
  getTransactionsByContract
};
