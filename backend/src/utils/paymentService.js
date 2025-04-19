const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const Contract = require('../models/contractModel');
const blockchainService = require('../utils/blockchainService');

// Payment processor configurations
const paymentProcessors = {
  credit_card: {
    name: 'Stripe',
    fee: 0.029, // 2.9%
    fixedFee: 0.30, // $0.30
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS']
  },
  mobile_money: {
    name: 'Flutterwave',
    fee: 0.015, // 1.5%
    fixedFee: 0.10, // $0.10
    supportedCurrencies: ['NGN', 'KES', 'GHS', 'UGX', 'TZS', 'ZMW']
  },
  bank_transfer: {
    name: 'PayStack',
    fee: 0.015, // 1.5%
    fixedFee: 0.20, // $0.20
    supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'KES']
  },
  crypto: {
    name: 'Polygon',
    fee: 0.005, // 0.5%
    fixedFee: 0.05, // $0.05
    supportedCurrencies: ['USDC', 'USDT', 'MATIC', 'ETH']
  },
  wallet: {
    name: 'Platform Wallet',
    fee: 0.01, // 1%
    fixedFee: 0, // $0
    supportedCurrencies: ['USD', 'EUR', 'NGN', 'KES', 'ZAR', 'GHS', 'USDC']
  }
};

// Calculate payment processor fee
const calculateFee = (amount, paymentMethod, currency) => {
  const processor = paymentProcessors[paymentMethod];
  
  if (!processor) {
    throw new Error(`Payment method ${paymentMethod} not supported`);
  }
  
  if (!processor.supportedCurrencies.includes(currency)) {
    throw new Error(`Currency ${currency} not supported for payment method ${paymentMethod}`);
  }
  
  const percentageFee = amount * processor.fee;
  const totalFee = percentageFee + processor.fixedFee;
  
  return {
    amount,
    fee: totalFee,
    netAmount: amount - totalFee,
    processor: processor.name,
    currency
  };
};

// Process a payment
const processPayment = async (paymentData) => {
  try {
    const { 
      amount, 
      currency, 
      paymentMethod, 
      senderId, 
      recipientId, 
      contractId, 
      milestoneId,
      description 
    } = paymentData;
    
    // Calculate fee
    const paymentDetails = calculateFee(amount, paymentMethod, currency);
    
    // Create transaction record
    const transaction = await Transaction.create({
      transactionType: contractId ? 'escrow_deposit' : 'payment',
      amount,
      currency,
      sender: senderId,
      recipient: recipientId,
      contract: contractId,
      milestone: milestoneId,
      status: 'pending',
      paymentMethod,
      paymentDetails: {
        provider: paymentDetails.processor,
        feeAmount: paymentDetails.fee,
        feeCurrency: currency
      },
      description
    });
    
    // In a real implementation, this would integrate with the actual payment processor
    // For this example, we'll simulate the payment processing
    
    // Simulate payment processing
    const paymentResult = await simulatePaymentProcessing(transaction);
    
    if (paymentResult.success) {
      // Update transaction status
      transaction.status = 'completed';
      transaction.paymentDetails.transactionId = paymentResult.transactionId;
      
      // If this is a blockchain payment, create blockchain transaction
      if (paymentMethod === 'crypto' || paymentMethod === 'wallet') {
        const blockchainData = await blockchainService.createBlockchainTransaction({
          sender: senderId,
          recipient: recipientId,
          amount,
          contractAddress: contractId ? (await Contract.findById(contractId))?.blockchain?.contractAddress : null
        });
        
        // Update transaction with blockchain info
        await blockchainService.updateTransactionWithBlockchainInfo(transaction._id, blockchainData);
      }
      
      // Update user wallets
      if (transaction.status === 'completed') {
        await updateUserWallets(transaction);
      }
      
      await transaction.save();
    } else {
      transaction.status = 'failed';
      await transaction.save();
      throw new Error(paymentResult.message);
    }
    
    return transaction;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};

// Simulate payment processing (in a real implementation, this would call the payment processor API)
const simulatePaymentProcessing = async (transaction) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate 95% success rate
      const success = Math.random() < 0.95;
      
      if (success) {
        resolve({
          success: true,
          transactionId: 'txn_' + Math.random().toString(36).substring(2, 15)
        });
      } else {
        resolve({
          success: false,
          message: 'Payment processing failed. Please try again.'
        });
      }
    }, 1000); // Simulate processing delay
  });
};

// Update user wallets after a successful transaction
const updateUserWallets = async (transaction) => {
  try {
    // Only update wallets for completed transactions
    if (transaction.status !== 'completed') {
      return;
    }
    
    const sender = await User.findById(transaction.sender);
    const recipient = await User.findById(transaction.recipient);
    
    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found');
    }
    
    // Update sender's wallet (deduct amount)
    if (sender.wallet.currency === transaction.currency) {
      sender.wallet.balance -= transaction.amount;
    } else {
      // In a real implementation, currency conversion would happen here
      // For simplicity, we'll just deduct the amount
      sender.wallet.balance -= transaction.amount;
    }
    
    // Add transaction to sender's transaction history
    sender.wallet.transactions.push(transaction._id);
    
    // For escrow deposits, don't update recipient wallet yet
    if (transaction.transactionType !== 'escrow_deposit') {
      // Update recipient's wallet (add amount minus fees)
      const netAmount = transaction.amount - (transaction.paymentDetails?.feeAmount || 0);
      
      if (recipient.wallet.currency === transaction.currency) {
        recipient.wallet.balance += netAmount;
      } else {
        // In a real implementation, currency conversion would happen here
        // For simplicity, we'll just add the net amount
        recipient.wallet.balance += netAmount;
      }
      
      // Add transaction to recipient's transaction history
      recipient.wallet.transactions.push(transaction._id);
    }
    
    // Save both users
    await sender.save();
    await recipient.save();
    
    return { sender, recipient };
  } catch (error) {
    console.error('Error updating user wallets:', error);
    throw error;
  }
};

// Release funds from escrow
const releaseEscrow = async (releaseData) => {
  try {
    const { contractId, milestoneId, releasedBy } = releaseData;
    
    // Find the contract
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      throw new Error('Contract not found');
    }
    
    // Verify the user is authorized to release funds
    if (contract.client.toString() !== releasedBy.toString()) {
      throw new Error('Only the client can release escrow funds');
    }
    
    // Find the milestone if provided
    let milestone = null;
    if (milestoneId) {
      milestone = contract.milestones.id(milestoneId);
      
      if (!milestone) {
        throw new Error('Milestone not found');
      }
      
      if (milestone.status !== 'completed') {
        throw new Error('Milestone must be completed before releasing funds');
      }
    }
    
    // Find the escrow deposit transaction
    const escrowTransaction = await Transaction.findOne({
      contract: contractId,
      milestone: milestoneId,
      transactionType: 'escrow_deposit',
      status: 'completed'
    });
    
    if (!escrowTransaction) {
      throw new Error('No escrow deposit found for this contract/milestone');
    }
    
    // Create escrow release transaction
    const releaseTransaction = await Transaction.create({
      transactionType: 'escrow_release',
      amount: escrowTransaction.amount,
      currency: escrowTransaction.currency,
      sender: contract.client,
      recipient: contract.provider,
      contract: contractId,
      milestone: milestoneId,
      status: 'pending',
      paymentMethod: 'wallet', // Escrow releases always use the platform wallet
      paymentDetails: {
        provider: 'Platform Escrow',
        feeAmount: 0, // No additional fee for escrow release
        feeCurrency: escrowTransaction.currency
      },
      description: `Escrow release for ${milestone ? 'milestone' : 'contract'} ${milestone ? milestone.title : contract.title}`
    });
    
    // Process the release
    const releaseResult = await simulatePaymentProcessing(releaseTransaction);
    
    if (releaseResult.success) {
      // Update transaction status
      releaseTransaction.status = 'completed';
      releaseTransaction.paymentDetails.transactionId = releaseResult.transactionId;
      
      // Update milestone status if applicable
      if (milestone) {
        milestone.status = 'approved';
        await contract.save();
        
        // If this is a blockchain contract, update the blockchain
        if (contract.blockchain?.isOnChain) {
          await blockchainService.completeMilestone(
            { contractAddress: contract.blockchain.contractAddress },
            { milestoneId, amount: escrowTransaction.amount }
          );
        }
      }
      
      // Update user wallets
      await updateUserWallets(releaseTransaction);
      
      await releaseTransaction.save();
    } else {
      releaseTransaction.status = 'failed';
      await releaseTransaction.save();
      throw new Error(releaseResult.message);
    }
    
    return releaseTransaction;
  } catch (error) {
    console.error('Error releasing escrow:', error);
    throw error;
  }
};

// Get exchange rates for currency conversion
const getExchangeRates = async (baseCurrency) => {
  try {
    // In a real implementation, this would call an exchange rate API
    // For this example, we'll return mock exchange rates
    
    const mockRates = {
      USD: {
        EUR: 0.92,
        GBP: 0.79,
        NGN: 1550.0,
        KES: 130.5,
        ZAR: 18.6,
        GHS: 15.2,
        USDC: 1.0,
        USDT: 1.0,
        MATIC: 0.5,
        ETH: 0.0003
      },
      EUR: {
        USD: 1.09,
        GBP: 0.86,
        NGN: 1690.0,
        KES: 142.3,
        ZAR: 20.3,
        GHS: 16.6,
        USDC: 1.09,
        USDT: 1.09,
        MATIC: 0.55,
        ETH: 0.00033
      },
      // Add more currencies as needed
    };
    
    // If the base currency is not in our mock data, default to USD
    const rates = mockRates[baseCurrency] || mockRates.USD;
    
    return {
      base: baseCurrency,
      rates,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting exchange rates:', error);
    throw error;
  }
};

// Convert amount between currencies
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    const exchangeRates = await getExchangeRates(fromCurrency);
    
    if (!exchangeRates.rates[toCurrency]) {
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
    }
    
    const convertedAmount = amount * exchangeRates.rates[toCurrency];
    
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      convertedCurrency: toCurrency,
      exchangeRate: exchangeRates.rates[toCurrency],
      timestamp: exchangeRates.timestamp
    };
  } catch (error) {
    console.error('Error converting currency:', error);
    throw error;
  }
};

module.exports = {
  processPayment,
  releaseEscrow,
  getExchangeRates,
  convertCurrency,
  calculateFee
};
