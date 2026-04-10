/**
 * Test Integrated Food Recognition Accuracy
 * 
 * This script tests the improved food recognition accuracy by comparing
 * results from the original recognition system vs. the integrated food recognition
 * using our enhanced techniques including:
 * 
 * 1. Food label database and enhanced naming
 * 2. Time-of-day confidence boosting
 * 3. Co-occurrence pattern recognition
 * 4. Context-aware food categorization
 * 5. Multi-model ensemble detection
 * 
 * The test uses real food images and evaluates results against expected foods.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert util.promisify to use fs promises API
const readFile = (path) => fs.promises.readFile(path);
const writeFile = (path, data) => fs.promises.writeFile(path, data);

// Base URL for the API endpoints
const API_BASE_URL = 'http://localhost:5000';

// Test image paths - using real test images available in the project
const TEST_IMAGES = [
  { 
    path: 'test-food-image.jpg',
    expectedFoods: ['eggs', 'bacon', 'toast', 'breakfast'],
    mealType: 'breakfast',
    timeOfDay: 8 // 8 AM
  },
  { 
    path: 'test-image.jpg',
    expectedFoods: ['food', 'meal', 'plate', 'dish'],
    mealType: 'lunch',
    timeOfDay: 12 // 12 PM
  }
];

// Function to convert image to base64
async function imageToBase64(imagePath) {
  try {
    const imageBuffer = await readFile(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error reading image file ${imagePath}:`, error);
    throw error;
  }
}

// Calculate string similarity for fuzzy matching
function calculateStringSimilarity(str1, str2) {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();
  
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.8;
  
  // Implement Levenshtein distance or similar for more sophisticated matching
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (shorter.length === 0) return 0;
  
  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return costs[s2.length];
}

// Test recognition with the original API
async function testOriginalRecognition(imageBase64, userId = 1) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/vision/food-recognition`, {
      image: `data:image/jpeg;base64,${imageBase64}`,
      userId: userId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calling original recognition API:', error.response?.data || error.message);
    throw error;
  }
}

// Test recognition with the integrated API
async function testIntegratedRecognition(imageBase64, userId = 1, timeOfDay = 12, mealType = 'lunch') {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/vision/integrated-food-recognition`, {
      image: `data:image/jpeg;base64,${imageBase64}`,
      userId: userId,
      timeOfDay: timeOfDay,
      mealType: mealType
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calling integrated recognition API:', error.response?.data || error.message);
    throw error;
  }
}

// Evaluate accuracy of recognition results
function evaluateAccuracy(detectedFoods, expectedFoods) {
  const results = {
    expectedFoods: expectedFoods.length,
    detectedFoods: detectedFoods.length,
    correctMatches: 0,
    similarMatches: 0,
    incorrectMatches: 0,
    matchDetails: []
  };
  
  // Track which expected foods were matched
  const matchedExpectedFoods = new Set();
  
  // For each detected food, find the best matching expected food
  for (const detected of detectedFoods) {
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const expected of expectedFoods) {
      if (matchedExpectedFoods.has(expected)) continue; // Skip already matched expected foods
      
      const similarity = calculateStringSimilarity(detected.name || detected, expected);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = expected;
      }
    }
    
    const matchResult = {
      detected: detected.name || detected,
      confidence: detected.confidence || 0,
      bestMatch,
      similarity: bestSimilarity
    };
    
    if (bestSimilarity >= 0.9) {
      matchResult.status = 'correct';
      results.correctMatches++;
      matchedExpectedFoods.add(bestMatch);
    } else if (bestSimilarity >= 0.7) {
      matchResult.status = 'similar';
      results.similarMatches++;
      matchedExpectedFoods.add(bestMatch);
    } else {
      matchResult.status = 'incorrect';
      results.incorrectMatches++;
    }
    
    results.matchDetails.push(matchResult);
  }
  
  // Calculate accuracy scores
  results.exactAccuracy = results.correctMatches / expectedFoods.length;
  results.fuzzyAccuracy = (results.correctMatches + results.similarMatches) / expectedFoods.length;
  
  // Calculate miss rate (expected foods not detected)
  results.missedFoods = expectedFoods.filter(food => !matchedExpectedFoods.has(food));
  results.missRate = results.missedFoods.length / expectedFoods.length;
  
  return results;
}

// Generate accuracy report
function generateAccuracyReport(originalResults, integratedResults) {
  return {
    originalRecognition: {
      exactAccuracy: originalResults.exactAccuracy,
      fuzzyAccuracy: originalResults.fuzzyAccuracy,
      missRate: originalResults.missRate
    },
    integratedRecognition: {
      exactAccuracy: integratedResults.exactAccuracy,
      fuzzyAccuracy: integratedResults.fuzzyAccuracy,
      missRate: integratedResults.missRate
    },
    improvement: {
      exactAccuracy: integratedResults.exactAccuracy - originalResults.exactAccuracy,
      fuzzyAccuracy: integratedResults.fuzzyAccuracy - originalResults.fuzzyAccuracy,
      missRate: originalResults.missRate - integratedResults.missRate
    },
    originalMatchDetails: originalResults.matchDetails,
    integratedMatchDetails: integratedResults.matchDetails
  };
}

// Main test function
async function testFoodRecognitionAccuracy() {
  const results = [];
  
  console.log('Starting food recognition accuracy test...');
  
  for (const testImage of TEST_IMAGES) {
    try {
      console.log(`Testing image: ${testImage.path}`);
      
      // Skip files that don't exist or aren't valid images
      try {
        await fs.promises.access(testImage.path, fs.constants.R_OK);
      } catch (error) {
        console.warn(`Skipping ${testImage.path} - file not found or not readable`);
        continue;
      }
      
      // Convert image to base64
      const imageBase64 = await imageToBase64(testImage.path);
      
      // Get results from both recognition methods
      console.log('Testing original recognition...');
      const originalResult = await testOriginalRecognition(imageBase64);
      
      console.log('Testing integrated recognition...');
      const integratedResult = await testIntegratedRecognition(
        imageBase64, 
        1, // userId
        testImage.timeOfDay, 
        testImage.mealType
      );
      
      // Extract food items from results
      const originalFoods = originalResult.foodItems || [];
      const integratedFoods = integratedResult.foodItems || [];
      
      console.log(`Original detection found ${originalFoods.length} food items`);
      console.log(`Integrated detection found ${integratedFoods.length} food items`);
      
      // Evaluate accuracy against expected foods
      const originalAccuracy = evaluateAccuracy(originalFoods, testImage.expectedFoods);
      const integratedAccuracy = evaluateAccuracy(integratedFoods, testImage.expectedFoods);
      
      // Generate report for this test
      const report = generateAccuracyReport(originalAccuracy, integratedAccuracy);
      
      // Add image info to the report
      report.image = testImage.path;
      report.expectedFoods = testImage.expectedFoods;
      report.mealType = testImage.mealType;
      report.timeOfDay = testImage.timeOfDay;
      
      results.push(report);
      
      // Log improvement summary
      console.log(`Accuracy improvement for ${testImage.path}:`);
      console.log(`  Exact accuracy: ${(report.improvement.exactAccuracy * 100).toFixed(2)}%`);
      console.log(`  Fuzzy accuracy: ${(report.improvement.fuzzyAccuracy * 100).toFixed(2)}%`);
      console.log(`  Miss rate reduction: ${(report.improvement.missRate * 100).toFixed(2)}%`);
    } catch (error) {
      console.error(`Error testing ${testImage.path}:`, error);
    }
  }
  
  // Calculate aggregate results
  const aggregateResults = {
    originalAccuracy: {
      exactAccuracy: results.reduce((sum, r) => sum + r.originalRecognition.exactAccuracy, 0) / results.length,
      fuzzyAccuracy: results.reduce((sum, r) => sum + r.originalRecognition.fuzzyAccuracy, 0) / results.length,
      missRate: results.reduce((sum, r) => sum + r.originalRecognition.missRate, 0) / results.length
    },
    integratedAccuracy: {
      exactAccuracy: results.reduce((sum, r) => sum + r.integratedRecognition.exactAccuracy, 0) / results.length,
      fuzzyAccuracy: results.reduce((sum, r) => sum + r.integratedRecognition.fuzzyAccuracy, 0) / results.length,
      missRate: results.reduce((sum, r) => sum + r.integratedRecognition.missRate, 0) / results.length
    },
    improvement: {
      exactAccuracy: results.reduce((sum, r) => sum + r.improvement.exactAccuracy, 0) / results.length,
      fuzzyAccuracy: results.reduce((sum, r) => sum + r.improvement.fuzzyAccuracy, 0) / results.length,
      missRate: results.reduce((sum, r) => sum + r.improvement.missRate, 0) / results.length
    },
    detailedResults: results
  };
  
  // Log aggregate results
  console.log('\nAggregate Results:');
  console.log('Original Recognition:');
  console.log(`  Exact accuracy: ${(aggregateResults.originalAccuracy.exactAccuracy * 100).toFixed(2)}%`);
  console.log(`  Fuzzy accuracy: ${(aggregateResults.originalAccuracy.fuzzyAccuracy * 100).toFixed(2)}%`);
  console.log(`  Miss rate: ${(aggregateResults.originalAccuracy.missRate * 100).toFixed(2)}%`);
  
  console.log('Integrated Recognition:');
  console.log(`  Exact accuracy: ${(aggregateResults.integratedAccuracy.exactAccuracy * 100).toFixed(2)}%`);
  console.log(`  Fuzzy accuracy: ${(aggregateResults.integratedAccuracy.fuzzyAccuracy * 100).toFixed(2)}%`);
  console.log(`  Miss rate: ${(aggregateResults.integratedAccuracy.missRate * 100).toFixed(2)}%`);
  
  console.log('Improvement:');
  console.log(`  Exact accuracy: ${(aggregateResults.improvement.exactAccuracy * 100).toFixed(2)}%`);
  console.log(`  Fuzzy accuracy: ${(aggregateResults.improvement.fuzzyAccuracy * 100).toFixed(2)}%`);
  console.log(`  Miss rate reduction: ${(aggregateResults.improvement.missRate * 100).toFixed(2)}%`);
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = `accuracy-test-results-${timestamp}.json`;
  
  await writeFile(resultsFile, JSON.stringify(aggregateResults, null, 2), 'utf8');
  console.log(`\nDetailed results saved to ${resultsFile}`);
  
  return aggregateResults;
}

// Run the test
testFoodRecognitionAccuracy()
  .then(() => console.log('Food recognition accuracy test completed'))
  .catch(error => console.error('Error during testing:', error));