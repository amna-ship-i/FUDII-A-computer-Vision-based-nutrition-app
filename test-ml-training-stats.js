// Test script to verify ML training stats functionality
import { storage } from './server/storage.js';

async function testMlTrainingStats() {
  console.log('Starting ML training stats test...');
  
  try {
    // Get the storage implementation directly
    // storage is already instantiated
    
    // Check the total count of ML training data
    const totalTrainingData = await storage.countFoodMlTrainingData();
    console.log(`Total ML training data: ${totalTrainingData}`);
    
    // Check the count of used ML training data
    const usedTrainingData = await storage.countFoodMlTrainingDataUsed();
    console.log(`Used ML training data: ${usedTrainingData}`);
    
    // Get all user ML models
    const models = await storage.getUserMlModels();
    console.log(`Number of user ML models: ${models.length}`);
    
    console.log('ML training stats test completed successfully');
  } catch (error) {
    console.error('Error in ML training stats test:', error);
  }
}

// Run the test
testMlTrainingStats();