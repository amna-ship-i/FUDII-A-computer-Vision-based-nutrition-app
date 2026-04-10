/**
 * Test script for the enhanced food recognition service with a real food image
 * 
 * This script tests the Google Cloud Vision-based food recognition service
 * using a real food image to verify it detects food items correctly.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Function to convert an image file to base64
 */
function imageToBase64(filePath) {
  const imageData = fs.readFileSync(filePath);
  return imageData.toString('base64');
}

async function testRealFoodRecognition() {
  try {
    console.log('========== REAL FOOD RECOGNITION TEST ==========');
    
    // Load the food image
    const imagePath = path.join(__dirname, 'test-food-image.jpg');
    const base64Image = imageToBase64(imagePath);
    console.log(`Image loaded successfully. Base64 length: ${base64Image.length}`);
    
    // Prepare the request to the food recognition endpoint
    const endpoint = 'http://localhost:5000/api/vision/food-recognition';
    console.log(`Sending request to endpoint: ${endpoint}`);
    
    // Make the API call
    const startTime = Date.now();
    const response = await axios.post(endpoint, {
      image: base64Image,
      includePortionEstimates: true
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    const endTime = Date.now();
    
    // Process the response
    console.log(`Response received in ${endTime - startTime}ms`);
    console.log(`Response status: ${response.status}`);
    
    if (response.status === 200) {
      const result = response.data;
      console.log('========== FOOD DETECTION RESULTS ==========');
      console.log(`Detected ${result.foodItems?.length || 0} food items:`);
      
      if (result.foodItems && result.foodItems.length > 0) {
        result.foodItems.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} (${item.confidence ? Math.round(item.confidence * 100) + '%' : 'N/A'})`);
          console.log(`   - Calories: ${item.calories || 'N/A'}`);
          console.log(`   - Protein: ${item.protein || 'N/A'}g`);
          console.log(`   - Carbs: ${item.carbs || 'N/A'}g`);
          console.log(`   - Fat: ${item.fat || 'N/A'}g`);
        });
        
        console.log('\n========== NUTRITIONAL SUMMARY ==========');
        console.log(`Total Calories: ${result.totalCalories || 'N/A'}`);
        if (result.analysis) {
          console.log(`Health Score: ${result.analysis.healthScore || 'N/A'}/100`);
          if (result.analysis.recommendations && result.analysis.recommendations.length > 0) {
            console.log('\nRecommendations:');
            result.analysis.recommendations.forEach(rec => {
              console.log(`- ${rec.message}`);
            });
          }
        }
        
        console.log('\nTest Result: SUCCESS - Food items detected correctly');
      } else {
        console.log('No food items detected in the response.');
        console.log('\nTest Result: FAILED - No food items in response');
      }
    } else {
      console.log('Test Result: FAILED - Unexpected response status');
    }
  } catch (error) {
    console.error('Error testing food recognition:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
    }
    console.log('\nTest Result: FAILED - Error occurred during test');
  }
}

// Run the test
testRealFoodRecognition().catch(console.error);