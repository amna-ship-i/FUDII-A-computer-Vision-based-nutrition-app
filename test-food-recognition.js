// Simple test script to check food recognition functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the function directly from our server code - using dynamic import
const { analyzeFoodImage } = await import('./server/specialized-food-recognition.js');

// Test with a sample image
async function testFoodRecognition() {
  try {
    // Read image file
    const imagePath = path.join(__dirname, 'attached_assets/image_1742935930493.png');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('Running food recognition test with image...');
    
    // Set a fake userId for testing
    const userId = 1;
    const includePortionEstimates = true;

    // Call the analyzeFoodImage function directly
    const result = await analyzeFoodImage(base64Image, includePortionEstimates, userId);
    
    console.log('Food recognition result:', JSON.stringify(result, null, 2));
    
    // Check if the result contains food items
    if (result.foodItems && result.foodItems.length > 0) {
      console.log(`Successfully identified ${result.foodItems.length} food items:`);
      result.foodItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.calories} calories`);
      });
    } else {
      console.log('No food items identified in the image.');
    }

    return result;
  } catch (error) {
    console.error('Error in food recognition test:', error);
  }
}

// Run the test
testFoodRecognition();