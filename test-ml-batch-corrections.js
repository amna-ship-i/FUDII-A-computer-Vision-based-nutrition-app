/**
 * Test script for the ML training batch corrections functionality
 * 
 * This script tests the batch correction endpoint which allows submitting multiple
 * food corrections at once, improving efficiency for ML model training.
 */

import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Setup directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert images to base64
function imageToBase64(filePath) {
  try {
    const img = fs.readFileSync(filePath);
    return Buffer.from(img).toString('base64');
  } catch (error) {
    console.error('Error reading image file:', error);
    return null;
  }
}

/**
 * Test function for the batch correction endpoint
 */
async function testBatchCorrections() {
  console.log('\n========== TESTING ML BATCH CORRECTIONS ==========');
  
  try {
    // Use login to get a valid session cookie
    console.log('Logging in to create a valid session...');
    await axios.post('http://localhost:3000/api/auth/login', {
      username: 'test@example.com',
      password: 'testpassword123'
    }, { withCredentials: true });
    
    // Test image paths
    const testImage1 = path.join(__dirname, 'test-food-image.jpg');
    const testImage2 = path.join(__dirname, 'test-image.jpg');
    
    // Create batch correction payload
    const batchCorrections = {
      corrections: [
        {
          originalItem: 'salad',
          correctItem: 'caesar salad with croutons',
          imageData: imageToBase64(testImage1),
          confidence: 0.75
        },
        {
          originalItem: 'burger',
          correctItem: 'beef burger with cheese',
          imageData: imageToBase64(testImage2),
          confidence: 0.82
        },
        {
          originalItem: 'pizza',
          correctItem: 'vegetarian pizza with mushrooms',
          confidence: 0.91
        }
      ],
      sessionId: 'test-batch-session-123',
      deviceInfo: 'Test Device'
    };
    
    console.log('Submitting batch corrections...');
    console.log(`Batch size: ${batchCorrections.corrections.length} corrections`);
    
    // Make the API call
    const startTime = Date.now();
    const response = await axios.post(
      'http://localhost:3000/api/ml-training/batch-corrections',
      batchCorrections,
      { withCredentials: true }
    );
    const endTime = Date.now();
    
    console.log('Batch corrections response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Summary:', response.data.summary);
    console.log('Message:', response.data.message);
    console.log(`Time taken: ${endTime - startTime}ms`);
    
    // Now test the user-model endpoint
    console.log('\nFetching user model information...');
    const userModelResponse = await axios.get(
      'http://localhost:3000/api/ml-training/user-model',
      { withCredentials: true }
    );
    
    console.log('User model response:');
    console.log('Status:', userModelResponse.status);
    console.log('Success:', userModelResponse.data.success);
    console.log('Has model:', userModelResponse.data.hasModel);
    console.log('Contribution stats:', userModelResponse.data.contributionStats);
    
    // Log model details if available
    if (userModelResponse.data.hasModel && userModelResponse.data.model) {
      console.log('Model details:');
      console.log('Accuracy:', userModelResponse.data.model.accuracy);
      console.log('Accuracy improvement:', userModelResponse.data.model.accuracyImprovement);
      console.log('Data points:', userModelResponse.data.model.dataPoints);
      console.log('Version:', userModelResponse.data.model.version);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error testing batch corrections:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Execute the test function
testBatchCorrections();