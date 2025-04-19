const Regulation = require('../models/regulationModel');
const Contract = require('../models/contractModel');
const User = require('../models/userModel');

// NLP utilities for text processing
const nlpUtils = {
  // Extract key terms from text
  extractKeyTerms: (text) => {
    // In a real implementation, this would use NLP libraries like natural or compromise
    // For this example, we'll use a simple approach
    if (!text) return [];
    
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const filteredWords = words.filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Count word frequency
    const wordFreq = {};
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedTerms = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
    
    return sortedTerms;
  },
  
  // Calculate text similarity (cosine similarity of term frequency vectors)
  calculateSimilarity: (text1, text2) => {
    if (!text1 || !text2) return 0;
    
    const terms1 = nlpUtils.extractKeyTerms(text1);
    const terms2 = nlpUtils.extractKeyTerms(text2);
    
    // Create term frequency vectors
    const allTerms = [...new Set([...terms1, ...terms2])];
    
    const vector1 = allTerms.map(term => terms1.includes(term) ? 1 : 0);
    const vector2 = allTerms.map(term => terms2.includes(term) ? 1 : 0);
    
    // Calculate cosine similarity
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }
};

// AI Compliance Engine
const complianceEngine = {
  // Check contract compliance against regulations
  checkContractCompliance: async (contract) => {
    try {
      if (!contract) {
        throw new Error('Contract is required');
      }
      
      // Get relevant regulations based on contract jurisdictions and service type
      const service = await getServiceDetails(contract.service);
      
      if (!service) {
        throw new Error('Service not found');
      }
      
      const relevantRegulations = await findRelevantRegulations(
        contract.jurisdictions,
        service.category,
        service.subCategory
      );
      
      if (relevantRegulations.length === 0) {
        return {
          isCompliant: true,
          complianceDetails: [{
            jurisdiction: contract.jurisdictions[0],
            status: 'compliant',
            details: 'No specific regulations found for this jurisdiction and service type.',
            timestamp: new Date()
          }]
        };
      }
      
      // Check compliance for each regulation
      const complianceResults = await Promise.all(
        relevantRegulations.map(regulation => 
          checkRegulationCompliance(contract, regulation)
        )
      );
      
      // Determine overall compliance status
      const isCompliant = complianceResults.every(result => result.status === 'compliant');
      
      return {
        isCompliant,
        complianceDetails: complianceResults
      };
    } catch (error) {
      console.error('Error checking contract compliance:', error);
      throw error;
    }
  },
  
  // Suggest contract modifications to ensure compliance
  suggestContractModifications: async (contract, complianceResults) => {
    try {
      if (!contract || !complianceResults) {
        throw new Error('Contract and compliance results are required');
      }
      
      const suggestions = [];
      
      // For each non-compliant item, generate a suggestion
      complianceResults.complianceDetails
        .filter(detail => detail.status === 'non_compliant')
        .forEach(detail => {
          const suggestion = generateComplianceSuggestion(contract, detail);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        });
      
      return suggestions;
    } catch (error) {
      console.error('Error suggesting contract modifications:', error);
      throw error;
    }
  },
  
  // Check professional service provider compliance with regulations
  checkProviderCompliance: async (providerId, jurisdictions, serviceCategory) => {
    try {
      // Get provider details
      const provider = await User.findById(providerId);
      
      if (!provider) {
        throw new Error('Provider not found');
      }
      
      // Check if provider is verified
      if (provider.verificationStatus !== 'verified') {
        return {
          isCompliant: false,
          complianceDetails: [{
            jurisdiction: jurisdictions[0],
            status: 'non_compliant',
            details: 'Provider is not verified. Verification is required to offer services.',
            timestamp: new Date()
          }]
        };
      }
      
      // Get relevant regulations for professional requirements
      const relevantRegulations = await findRelevantRegulations(
        jurisdictions,
        serviceCategory,
        null,
        provider.professionalType
      );
      
      if (relevantRegulations.length === 0) {
        return {
          isCompliant: true,
          complianceDetails: [{
            jurisdiction: jurisdictions[0],
            status: 'compliant',
            details: 'No specific regulations found for this professional type in the jurisdiction.',
            timestamp: new Date()
          }]
        };
      }
      
      // Check compliance for each regulation
      const complianceResults = await Promise.all(
        relevantRegulations.map(regulation => 
          checkProviderRegulationCompliance(provider, regulation)
        )
      );
      
      // Determine overall compliance status
      const isCompliant = complianceResults.every(result => result.status === 'compliant');
      
      return {
        isCompliant,
        complianceDetails: complianceResults
      };
    } catch (error) {
      console.error('Error checking provider compliance:', error);
      throw error;
    }
  },
  
  // Monitor regulatory changes and update compliance status
  monitorRegulatoryChanges: async () => {
    try {
      // In a real implementation, this would connect to regulatory APIs or use web scraping
      // For this example, we'll simulate finding updated regulations
      
      // Get all active contracts
      const activeContracts = await Contract.find({ status: 'active' });
      
      const updatedComplianceStatuses = [];
      
      // Check each contract against the latest regulations
      for (const contract of activeContracts) {
        const complianceResults = await complianceEngine.checkContractCompliance(contract);
        
        // If compliance status has changed, update the contract
        if (complianceResults.isCompliant !== (contract.complianceStatus === 'compliant')) {
          contract.complianceStatus = complianceResults.isCompliant ? 'compliant' : 'non_compliant';
          contract.complianceDetails = complianceResults.complianceDetails;
          await contract.save();
          
          updatedComplianceStatuses.push({
            contractId: contract._id,
            previousStatus: contract.complianceStatus,
            newStatus: complianceResults.isCompliant ? 'compliant' : 'non_compliant',
            details: complianceResults.complianceDetails
          });
        }
      }
      
      return updatedComplianceStatuses;
    } catch (error) {
      console.error('Error monitoring regulatory changes:', error);
      throw error;
    }
  }
};

// Helper functions

// Get service details
const getServiceDetails = async (serviceId) => {
  try {
    // In a real implementation, this would fetch the service from the database
    // For this example, we'll simulate a service
    return {
      _id: serviceId,
      title: 'Legal Consultation',
      category: 'legal',
      subCategory: 'contract_review',
      provider: 'provider_id',
      countries: ['Nigeria', 'Kenya'],
      languages: ['English', 'Swahili']
    };
  } catch (error) {
    console.error('Error getting service details:', error);
    throw error;
  }
};

// Find relevant regulations
const findRelevantRegulations = async (jurisdictions, category, subCategory, professionalType) => {
  try {
    // Build query
    const query = {
      country: { $in: jurisdictions },
      status: 'active'
    };
    
    if (category) {
      query.sector = category;
    }
    
    if (professionalType) {
      query['applicability.professionalTypes'] = professionalType;
    }
    
    // Find regulations
    const regulations = await Regulation.find(query);
    
    // Further filter by subCategory if provided
    let filteredRegulations = regulations;
    if (subCategory) {
      filteredRegulations = regulations.filter(reg => {
        if (!reg.applicability.serviceTypes || reg.applicability.serviceTypes.length === 0) {
          return true; // Applies to all service types
        }
        return reg.applicability.serviceTypes.includes(subCategory);
      });
    }
    
    return filteredRegulations;
  } catch (error) {
    console.error('Error finding relevant regulations:', error);
    throw error;
  }
};

// Check regulation compliance
const checkRegulationCompliance = async (contract, regulation) => {
  try {
    // Extract contract terms
    const contractTerms = contract.terms;
    
    // Check if contract terms comply with regulation requirements
    let isCompliant = true;
    let details = '';
    
    // Check each requirement
    for (const requirement of regulation.requirements) {
      if (requirement.isMandatory) {
        // Use NLP to check if the requirement is addressed in the contract terms
        const similarity = nlpUtils.calculateSimilarity(
          contractTerms,
          requirement.description
        );
        
        if (similarity < 0.3) { // Threshold for compliance
          isCompliant = false;
          details += `Missing mandatory requirement: ${requirement.title}. `;
        }
      }
    }
    
    // Check for prohibited terms or clauses
    if (regulation.penalties && regulation.penalties.description) {
      const prohibitedTerms = extractProhibitedTerms(regulation.penalties.description);
      
      for (const term of prohibitedTerms) {
        if (contractTerms.toLowerCase().includes(term.toLowerCase())) {
          isCompliant = false;
          details += `Contract contains prohibited term: "${term}". `;
        }
      }
    }
    
    return {
      jurisdiction: regulation.country,
      status: isCompliant ? 'compliant' : 'non_compliant',
      details: isCompliant ? 
        `Contract complies with ${regulation.title}` : 
        `Contract does not comply with ${regulation.title}. ${details}`,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error checking regulation compliance:', error);
    throw error;
  }
};

// Check provider regulation compliance
const checkProviderRegulationCompliance = async (provider, regulation) => {
  try {
    // Check if provider meets the requirements
    let isCompliant = true;
    let details = '';
    
    // Check each requirement
    for (const requirement of regulation.requirements) {
      if (requirement.isMandatory) {
        // In a real implementation, this would check provider credentials against requirements
        // For this example, we'll simulate compliance based on verification status
        
        if (provider.verificationStatus !== 'verified') {
          isCompliant = false;
          details += `Provider is not verified for requirement: ${requirement.title}. `;
        }
      }
    }
    
    return {
      jurisdiction: regulation.country,
      status: isCompliant ? 'compliant' : 'non_compliant',
      details: isCompliant ? 
        `Provider complies with ${regulation.title}` : 
        `Provider does not comply with ${regulation.title}. ${details}`,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error checking provider regulation compliance:', error);
    throw error;
  }
};

// Extract prohibited terms from regulation penalties
const extractProhibitedTerms = (penaltyDescription) => {
  // In a real implementation, this would use NLP to extract prohibited terms
  // For this example, we'll use a simple approach
  
  if (!penaltyDescription) return [];
  
  // Look for phrases like "prohibited: X, Y, Z" or "not allowed: X, Y, Z"
  const prohibitedMatch = penaltyDescription.match(/prohibited:?\s*([^\.]+)/i);
  const notAllowedMatch = penaltyDescription.match(/not allowed:?\s*([^\.]+)/i);
  
  let prohibitedText = '';
  
  if (prohibitedMatch && prohibitedMatch[1]) {
    prohibitedText = prohibitedMatch[1];
  } else if (notAllowedMatch && notAllowedMatch[1]) {
    prohibitedText = notAllowedMatch[1];
  }
  
  if (prohibitedText) {
    return prohibitedText
      .split(/,|;/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
  }
  
  return [];
};

// Generate compliance suggestion
const generateComplianceSuggestion = (contract, complianceDetail) => {
  try {
    if (complianceDetail.status !== 'non_compliant') {
      return null;
    }
    
    // Extract the non-compliance reason
    const details = complianceDetail.details;
    
    // Generate suggestion based on the type of non-compliance
    if (details.includes('Missing mandatory requirement')) {
      const requirementMatch = details.match(/Missing mandatory requirement: ([^\.]+)/);
      if (requirementMatch && requirementMatch[1]) {
        const requirement = requirementMatch[1];
        return {
          type: 'add_clause',
          requirement,
          suggestion: `Add a clause addressing "${requirement}" to comply with regulations in ${complianceDetail.jurisdiction}.`
        };
      }
    }
    
    if (details.includes('prohibited term')) {
      const termMatch = details.match(/prohibited term: "([^"]+)"/);
      if (termMatch && termMatch[1]) {
        const term = termMatch[1];
        return {
          type: 'remove_term',
          term,
          suggestion: `Remove the prohibited term "${term}" to comply with regulations in ${complianceDetail.jurisdiction}.`
        };
      }
    }
    
    // Generic suggestion if specific issue not identified
    return {
      type: 'general',
      suggestion: `Review contract terms to address compliance issues in ${complianceDetail.jurisdiction}: ${details}`
    };
  } catch (error) {
    console.error('Error generating compliance suggestion:', error);
    return {
      type: 'error',
      suggestion: 'Unable to generate specific suggestions due to an error. Please review the compliance details manually.'
    };
  }
};

module.exports = complianceEngine;
