require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/userModel');
const Service = require('./models/serviceModel');
const Contract = require('./models/contractModel');
const Transaction = require('./models/transactionModel');
const Regulation = require('./models/regulationModel');

// Import utilities
const blockchainService = require('./utils/blockchainService');
const paymentService = require('./utils/paymentService');
const complianceEngine = require('./utils/complianceEngine');

// Test data
const testData = {
  users: [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'professional',
      country: 'Nigeria',
      languages: ['English', 'Yoruba'],
      professionalType: 'lawyer',
      verificationStatus: 'verified'
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'client',
      country: 'Kenya',
      languages: ['English', 'Swahili']
    }
  ],
  services: [
    {
      title: 'Legal Consultation',
      description: 'Professional legal consultation for business contracts',
      category: 'legal',
      subCategory: 'contract_review',
      pricing: {
        amount: 100,
        currency: 'USD',
        type: 'hourly'
      },
      countries: ['Nigeria', 'Kenya', 'Ghana'],
      languages: ['English'],
      deliveryTimeframe: 3,
      tags: ['legal', 'contracts', 'business'],
      requirements: 'Please provide all relevant documents for review'
    }
  ],
  regulations: [
    {
      country: 'Nigeria',
      sector: 'legal',
      title: 'Legal Practice Regulations',
      description: 'Regulations governing legal practice in Nigeria',
      source: {
        name: 'Nigerian Bar Association',
        url: 'https://example.com/nba-regulations',
        lastUpdated: new Date()
      },
      requirements: [
        {
          title: 'Confidentiality Clause',
          description: 'All legal contracts must include a confidentiality clause',
          isMandatory: true
        },
        {
          title: 'Jurisdiction Clause',
          description: 'Contracts must specify the governing jurisdiction',
          isMandatory: true
        }
      ],
      applicability: {
        professionalTypes: ['lawyer'],
        serviceTypes: ['contract_review', 'legal_advice'],
        crossBorderOnly: true
      },
      status: 'active',
      effectiveDate: new Date(),
      keywords: ['legal', 'practice', 'nigeria', 'regulations']
    }
  ]
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/africonnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Clear test database
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Cannot clear database in non-test environment');
    process.exit(1);
  }
  
  await User.deleteMany({});
  await Service.deleteMany({});
  await Contract.deleteMany({});
  await Transaction.deleteMany({});
  await Regulation.deleteMany({});
  
  console.log('Database cleared');
};

// Seed test data
const seedTestData = async () => {
  try {
    // Create users
    const users = await User.create(testData.users);
    console.log(`${users.length} users created`);
    
    // Create services
    const services = await Promise.all(
      testData.services.map(service => {
        service.provider = users[0]._id; // Assign to professional user
        return Service.create(service);
      })
    );
    console.log(`${services.length} services created`);
    
    // Create regulations
    const regulations = await Regulation.create(testData.regulations);
    console.log(`${regulations.length} regulations created`);
    
    // Create a contract
    const contract = await Contract.create({
      title: 'Legal Services Agreement',
      description: 'Contract for legal consultation services',
      client: users[1]._id, // Client user
      provider: users[0]._id, // Professional user
      service: services[0]._id,
      terms: 'This agreement includes confidentiality provisions and is governed by Nigerian law.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      amount: 500,
      currency: 'USD',
      paymentTerms: 'Payment due upon completion',
      status: 'draft',
      jurisdictions: ['Nigeria']
    });
    console.log('Contract created');
    
    // Test compliance engine
    const complianceResult = await complianceEngine.checkContractCompliance(contract);
    console.log('Compliance check result:', complianceResult);
    
    // If not compliant, suggest modifications
    if (!complianceResult.isCompliant) {
      const suggestions = await complianceEngine.suggestContractModifications(
        contract, 
        complianceResult
      );
      console.log('Compliance suggestions:', suggestions);
    }
    
    // Test payment service
    const paymentFee = paymentService.calculateFee(100, 'credit_card', 'USD');
    console.log('Payment fee calculation:', paymentFee);
    
    // Test blockchain service (simulated)
    const blockchainDeployment = await blockchainService.deployServiceContract({
      clientAddress: '0x1234...',
      providerAddress: '0x5678...',
      amount: 500,
      contractId: contract._id.toString()
    });
    console.log('Blockchain contract deployment:', blockchainDeployment);
    
    console.log('Test data seeded and functionality tested successfully');
    return { users, services, regulations, contract };
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
};

// Run tests
const runTests = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Clear database
    await clearDatabase();
    
    // Seed test data and run functionality tests
    const testEntities = await seedTestData();
    
    // Disconnect from database
    await mongoose.disconnect();
    
    console.log('All tests completed successfully');
    return testEntities;
  } catch (error) {
    console.error('Test failed:', error);
    
    // Disconnect from database
    await mongoose.disconnect();
    
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  // Set environment to test
  process.env.NODE_ENV = 'test';
  
  runTests();
}

module.exports = { runTests, connectDB, clearDatabase, seedTestData };
