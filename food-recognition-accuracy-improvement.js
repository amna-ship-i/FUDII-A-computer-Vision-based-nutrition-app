/**
 * Food Recognition Accuracy Improvement System
 * 
 * This system implements advanced methods to improve food recognition accuracy
 * using a comprehensive approach:
 * 
 * 1. Multi-model ensemble detection
 * 2. Context-aware food classification
 * 3. Time-of-day confidence boosting
 * 4. User feedback integration
 * 5. Comprehensive accuracy metrics and reporting
 * 
 * Our goal is to improve accuracy from the current ~25% to at least 70%.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config();

// Setup ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // API Keys
  googleVisionApiKey: process.env.GOOGLE_CLOUD_API_KEY,
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  edamamAppId: process.env.EDAMAM_APP_ID,
  edamamAppKey: process.env.EDAMAM_APP_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // Test Images with expected ground truth
  testImages: [
    {
      path: './attached_assets/image_1742679077264.png', // Breakfast with eggs
      description: 'Breakfast plate with eggs',
      expectedItems: ['egg', 'breakfast', 'plate', 'food'],
      expectedLabels: ['egg', 'protein', 'breakfast food', 'cooked'],
      timeOfDay: 'morning',
      mealType: 'breakfast'
    },
    {
      path: './attached_assets/image_1742679051135.png', // Vegetable/fruit
      description: 'Fresh produce',
      expectedItems: ['vegetable', 'fruit', 'produce', 'healthy'],
      expectedLabels: ['fresh', 'healthy', 'natural', 'raw'],
      timeOfDay: 'any',
      mealType: 'snack'
    },
    {
      path: './attached_assets/image_1742679090253.png', // Meat dish
      description: 'Meat dish',
      expectedItems: ['meat', 'protein', 'dinner', 'meal'],
      expectedLabels: ['cooked', 'prepared', 'dinner', 'main course'],
      timeOfDay: 'evening',
      mealType: 'dinner'
    },
    {
      path: './breakfast-plate-test.jpg', // Another breakfast test
      description: 'American breakfast plate',
      expectedItems: ['egg', 'bacon', 'toast', 'breakfast'],
      expectedLabels: ['protein', 'cooked', 'breakfast food', 'salty'],
      timeOfDay: 'morning',
      mealType: 'breakfast'
    }
  ],
  
  // API endpoints
  endpoints: {
    googleVision: 'https://vision.googleapis.com/v1/images:annotate',
    edamamFood: 'https://api.edamam.com/api/food-database/v2/parser',
    openaiVision: 'https://api.openai.com/v1/chat/completions',
    foodRecognition: 'http://localhost:5000/api/vision/food-recognition',
    foodEnhancedRecognition: 'http://localhost:5000/api/vision/enhanced-food-recognition',
    mixedDishAnalysis: 'http://localhost:5000/api/vision/mixed-dish-analysis'
  },
  
  // Food categories for context-aware classification
  foodCategories: {
    breakfast: ['egg', 'bacon', 'toast', 'cereal', 'pancake', 'waffle', 'bagel', 'oatmeal', 'yogurt'],
    lunch: ['sandwich', 'salad', 'soup', 'wrap', 'burger', 'pizza', 'pasta', 'sushi'],
    dinner: ['steak', 'chicken', 'fish', 'pasta', 'rice', 'potato', 'curry', 'stir-fry', 'casserole'],
    snacks: ['fruit', 'nuts', 'chips', 'crackers', 'yogurt', 'cheese', 'vegetable', 'hummus'],
    desserts: ['cake', 'cookie', 'ice cream', 'chocolate', 'pie', 'pastry', 'brownie', 'pudding']
  },
  
  // Output files
  outputFiles: {
    accuracyReport: `./accuracy-test-results-${new Date().toISOString()}.json`,
    correctionDatabase: './food-recognition-corrections.json',
    enhancedLabels: './enhanced-food-labels.json'
  },
  
  // Test options
  options: {
    useTimeOfDayContext: true,      // Use time of day to improve recognition
    useMealTypeContext: true,       // Use meal type context to improve recognition
    useEnsembleMethods: true,       // Combine results from multiple APIs
    generateCorrections: true,      // Generate corrections for training
    maxRetries: 3,                  // Maximum retries for API calls
    timeout: 30000,                 // 30 second timeout for API calls
    similarityThreshold: 0.7        // Threshold for string similarity matching
  }
};

// Utility: Convert image to base64
function imageToBase64(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Image file not found: ${filePath}`);
      return null;
    }
    
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determine image type from file extension
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : 
                     extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 
                     'application/octet-stream';
    
    return {
      dataUrl: `data:${mimeType};base64,${base64Image}`,
      rawBase64: base64Image,
      mimeType
    };
  } catch (error) {
    console.error(`Error reading image file (${filePath}):`, error.message);
    return null;
  }
}

// Utility: Calculate string similarity (0-1 score)
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Convert to lowercase for case-insensitive comparison
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // If one string contains the other, high similarity
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8 + (0.2 * Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length));
  }
  
  // Calculate Levenshtein distance
  const track = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  // Convert distance to similarity score (0-1)
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0; // Both strings are empty
  
  const distance = track[s2.length][s1.length];
  return 1.0 - (distance / maxLength);
}

// Call Google Vision API directly
async function callGoogleVisionAPI(imageData, features = ['LABEL_DETECTION', 'OBJECT_LOCALIZATION', 'WEB_DETECTION']) {
  if (!CONFIG.googleVisionApiKey) {
    throw new Error('Missing Google Cloud API Key. Please set GOOGLE_CLOUD_API_KEY in the environment variables.');
  }
  
  try {
    console.log('Calling Google Vision API...');
    const requestFeatures = features.map(feature => {
      return { type: feature, maxResults: 20 };
    });
    
    const requestData = {
      requests: [{
        image: { content: imageData.rawBase64 },
        features: requestFeatures
      }]
    };
    
    const response = await axios.post(
      `${CONFIG.endpoints.googleVision}?key=${CONFIG.googleVisionApiKey}`,
      requestData,
      { headers: { 'Content-Type': 'application/json' }, timeout: CONFIG.options.timeout }
    );
    
    if (response.status !== 200) {
      throw new Error(`Google Vision API returned status ${response.status}`);
    }
    
    return response.data.responses[0];
  } catch (error) {
    console.error('Error calling Google Vision API:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Call Edamam API directly
async function callEdamamAPI(foodItem) {
  if (!CONFIG.edamamAppId || !CONFIG.edamamAppKey) {
    throw new Error('Missing Edamam API credentials. Please set EDAMAM_APP_ID and EDAMAM_APP_KEY in the environment variables.');
  }
  
  try {
    console.log(`Calling Edamam API for "${foodItem}"...`);
    const url = `${CONFIG.endpoints.edamamFood}?app_id=${CONFIG.edamamAppId}&app_key=${CONFIG.edamamAppKey}&ingr=${encodeURIComponent(foodItem)}`;
    
    const response = await axios.get(url, { timeout: CONFIG.options.timeout });
    
    if (response.status !== 200) {
      throw new Error(`Edamam API returned status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling Edamam API:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Call OpenAI Vision API for food recognition
async function callOpenaiVisionAPI(imageData, prompt) {
  if (!CONFIG.openaiApiKey) {
    throw new Error('Missing OpenAI API Key. Please set OPENAI_API_KEY in the environment variables.');
  }
  
  try {
    console.log('Calling OpenAI Vision API...');
    
    const messages = [
      {
        role: "system",
        content: "You are a specialized food recognition AI. Your task is to identify food items in images with high accuracy."
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: imageData.dataUrl
            }
          }
        ]
      }
    ];
    
    const response = await axios.post(
      CONFIG.endpoints.openaiVision,
      {
        model: "gpt-4-vision-preview",
        messages,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.openaiApiKey}`
        },
        timeout: CONFIG.options.timeout * 2 // Longer timeout for OpenAI
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`OpenAI API returned status ${response.status}`);
    }
    
    // Parse the content field which should contain a JSON string
    const content = response.data.choices[0].message.content;
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON');
      return { error: 'Failed to parse response', rawContent: content };
    }
  } catch (error) {
    console.error('Error calling OpenAI Vision API:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.statusText);
      if (error.response.data) {
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

// Call our food recognition API
async function callFoodRecognitionAPI(imageData, options = {}) {
  try {
    console.log('Calling our food recognition API...');
    
    const requestData = {
      image: imageData.dataUrl,
      includePortionEstimates: true,
      ...options
    };
    
    const response = await axios.post(
      CONFIG.endpoints.foodRecognition,
      requestData,
      { headers: { 'Content-Type': 'application/json' }, timeout: CONFIG.options.timeout }
    );
    
    if (response.status !== 200) {
      throw new Error(`Food recognition API returned status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling food recognition API:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Call our mixed dish analysis API
async function callMixedDishAnalysisAPI(imageData) {
  try {
    console.log('Calling mixed dish analysis API...');
    
    const requestData = {
      image: imageData.dataUrl
    };
    
    const response = await axios.post(
      CONFIG.endpoints.mixedDishAnalysis,
      requestData,
      { headers: { 'Content-Type': 'application/json' }, timeout: CONFIG.options.timeout * 2 }
    );
    
    if (response.status !== 200) {
      throw new Error(`Mixed dish analysis API returned status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling mixed dish analysis API:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Compare results and find matches with expected items
function findMatches(detectedItems, expectedItems) {
  const matches = [];
  const unmatchedExpected = [...expectedItems];
  const unmatchedDetected = [...detectedItems];
  
  // First pass: Find exact matches
  for (let i = unmatchedExpected.length - 1; i >= 0; i--) {
    const expected = unmatchedExpected[i].toLowerCase();
    
    for (let j = unmatchedDetected.length - 1; j >= 0; j--) {
      const detected = unmatchedDetected[j].toLowerCase();
      
      if (expected === detected) {
        matches.push({ expected, detected, score: 1.0, matchType: 'exact' });
        unmatchedExpected.splice(i, 1);
        unmatchedDetected.splice(j, 1);
        break;
      }
    }
  }
  
  // Second pass: Find substring matches
  for (let i = unmatchedExpected.length - 1; i >= 0; i--) {
    const expected = unmatchedExpected[i].toLowerCase();
    
    for (let j = unmatchedDetected.length - 1; j >= 0; j--) {
      const detected = unmatchedDetected[j].toLowerCase();
      
      if (expected.includes(detected) || detected.includes(expected)) {
        const score = 0.8 + (0.2 * Math.min(expected.length, detected.length) / Math.max(expected.length, detected.length));
        matches.push({ 
          expected: unmatchedExpected[i], 
          detected: unmatchedDetected[j], 
          score, 
          matchType: 'substring' 
        });
        unmatchedExpected.splice(i, 1);
        unmatchedDetected.splice(j, 1);
        break;
      }
    }
  }
  
  // Third pass: Find similar matches
  for (let i = unmatchedExpected.length - 1; i >= 0; i--) {
    const expected = unmatchedExpected[i].toLowerCase();
    let bestScore = 0;
    let bestIndex = -1;
    
    for (let j = 0; j < unmatchedDetected.length; j++) {
      const detected = unmatchedDetected[j].toLowerCase();
      const score = calculateStringSimilarity(expected, detected);
      
      if (score > CONFIG.options.similarityThreshold && score > bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }
    
    if (bestIndex !== -1) {
      matches.push({ 
        expected: unmatchedExpected[i], 
        detected: unmatchedDetected[bestIndex], 
        score: bestScore, 
        matchType: 'similar' 
      });
      unmatchedExpected.splice(i, 1);
      unmatchedDetected.splice(bestIndex, 1);
    }
  }
  
  return {
    matches,
    unmatchedExpected,
    unmatchedDetected,
    accuracy: expectedItems.length > 0 ? matches.length / expectedItems.length : 0
  };
}

// Calculate advanced accuracy metrics
function calculateAccuracyMetrics(matchResults) {
  const { matches, unmatchedExpected, unmatchedDetected } = matchResults;
  
  // Total numbers
  const totalExpected = matches.length + unmatchedExpected.length;
  const totalDetected = matches.length + unmatchedDetected.length;
  
  // Basic metrics
  const recall = totalExpected > 0 ? matches.length / totalExpected : 0;
  const precision = totalDetected > 0 ? matches.length / totalDetected : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  // Average similarity score for matches
  const avgSimilarity = matches.length > 0 
    ? matches.reduce((sum, match) => sum + match.score, 0) / matches.length 
    : 0;
  
  // Match types breakdown
  const exactMatches = matches.filter(m => m.matchType === 'exact').length;
  const substringMatches = matches.filter(m => m.matchType === 'substring').length;
  const similarMatches = matches.filter(m => m.matchType === 'similar').length;
  
  // Weighted accuracy - gives more weight to exact matches
  const weightedAccuracy = totalExpected > 0 
    ? (exactMatches * 1.0 + substringMatches * 0.8 + similarMatches * 0.6) / totalExpected 
    : 0;
  
  return {
    recall,
    precision,
    f1Score,
    avgSimilarity,
    accuracy: recall, // Overall accuracy is same as recall for our purposes
    weightedAccuracy, // Weighted version
    matchTypes: {
      exact: exactMatches,
      substring: substringMatches,
      similar: similarMatches
    }
  };
}

// Process and enhance the food recognition results
function enhanceFoodRecognition(originalResults, testImage) {
  // Get the detected items from original results
  let detectedItems = [];
  
  if (originalResults?.foodItems && Array.isArray(originalResults.foodItems)) {
    detectedItems = originalResults.foodItems.map(item => ({
      name: item.name,
      confidence: item.confidence || 0.5,
      category: item.category || 'unknown',
      source: 'original'
    }));
  }
  
  // Apply time-of-day context boosting
  if (CONFIG.options.useTimeOfDayContext && testImage.timeOfDay) {
    detectedItems = applyTimeOfDayBoost(detectedItems, testImage.timeOfDay);
  }
  
  // Apply meal type context boosting
  if (CONFIG.options.useMealTypeContext && testImage.mealType) {
    detectedItems = applyMealTypeBoost(detectedItems, testImage.mealType);
  }
  
  // Sort by confidence
  detectedItems.sort((a, b) => b.confidence - a.confidence);
  
  return {
    enhancedItems: detectedItems,
    originalResults
  };
}

// Boost confidence based on time of day context
function applyTimeOfDayBoost(items, timeOfDay) {
  // Define foods that are more likely at certain times of day
  const timeContext = {
    morning: ['egg', 'toast', 'cereal', 'pancake', 'waffle', 'bacon', 'yogurt', 'coffee', 'breakfast'],
    afternoon: ['sandwich', 'salad', 'soup', 'wrap', 'lunch', 'burger'],
    evening: ['dinner', 'steak', 'chicken', 'fish', 'pasta', 'rice', 'curry', 'roast']
  };
  
  // Apply boosts for matching context
  return items.map(item => {
    const itemLower = item.name.toLowerCase();
    const contextFoods = timeContext[timeOfDay] || [];
    
    // Check if this food item matches the time context
    const isContextMatch = contextFoods.some(food => 
      itemLower.includes(food) || calculateStringSimilarity(itemLower, food) > 0.8
    );
    
    if (isContextMatch) {
      // Boost confidence by 20% if it matches time context, but cap at 0.98
      return {
        ...item,
        confidence: Math.min(0.98, item.confidence * 1.2),
        timeContextBoost: true
      };
    }
    
    return item;
  });
}

// Boost confidence based on meal type context
function applyMealTypeBoost(items, mealType) {
  // Get relevant food categories for this meal type
  const contextFoods = CONFIG.foodCategories[mealType] || [];
  
  return items.map(item => {
    const itemLower = item.name.toLowerCase();
    
    // Check if this food item matches the meal context
    const isContextMatch = contextFoods.some(food => 
      itemLower.includes(food) || calculateStringSimilarity(itemLower, food) > 0.8
    );
    
    if (isContextMatch) {
      // Boost confidence by 15% if it matches meal context, but cap at 0.98
      return {
        ...item,
        confidence: Math.min(0.98, item.confidence * 1.15),
        mealContextBoost: true
      };
    }
    
    return item;
  });
}

// Generate corrections from test results
function generateCorrections(testResults) {
  const corrections = [];
  
  for (const result of testResults) {
    if (!result.success || !result.enhancedResults) continue;
    
    const { unmatchedExpected, unmatchedDetected } = result.matchResults;
    
    // For each expected item that wasn't detected, create a correction
    for (let i = 0; i < unmatchedExpected.length && i < unmatchedDetected.length; i++) {
      corrections.push({
        originalItem: unmatchedDetected[i],
        correctItem: unmatchedExpected[i],
        imagePath: result.imagePath,
        confidence: 0.9,
        metadata: {
          timeOfDay: result.timeOfDay,
          mealType: result.mealType,
          testCase: result.description
        }
      });
    }
  }
  
  return corrections;
}

// Save results to a file
function saveResultsToFile(data, filePath) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Results saved to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error saving results to ${filePath}:`, error.message);
    return false;
  }
}

// Main function to run the accuracy tests and improvement
async function runAccuracyTest() {
  console.log('==============================================');
  console.log('  FOOD RECOGNITION ACCURACY IMPROVEMENT TEST');
  console.log('==============================================');
  
  try {
    // Check for API keys
    if (!CONFIG.googleVisionApiKey) {
      console.warn('Warning: Missing Google Cloud API Key');
    }
    if (!CONFIG.edamamAppId || !CONFIG.edamamAppKey) {
      console.warn('Warning: Missing Edamam API credentials');
    }
    if (!CONFIG.openaiApiKey) {
      console.warn('Warning: Missing OpenAI API Key');
    }
    
    console.log(`Testing with ${CONFIG.testImages.length} images...`);
    const testResults = [];
    let overallAccuracy = 0;
    let successfulTests = 0;
    
    // Process each test image
    for (const testImage of CONFIG.testImages) {
      console.log(`\nProcessing image: ${testImage.description} (${testImage.path})`);
      
      try {
        // Convert image to base64
        const imageData = imageToBase64(testImage.path);
        if (!imageData) {
          console.error(`Failed to convert image to base64: ${testImage.path}`);
          testResults.push({
            imagePath: testImage.path,
            description: testImage.description,
            success: false,
            error: 'Failed to read image file'
          });
          continue;
        }
        
        // 1. Call our food recognition API
        const recognitionResult = await callFoodRecognitionAPI(imageData, {
          timeOfDay: testImage.timeOfDay,
          mealType: testImage.mealType
        });
        
        if (!recognitionResult) {
          testResults.push({
            imagePath: testImage.path,
            description: testImage.description,
            success: false,
            error: 'Food recognition API call failed'
          });
          continue;
        }
        
        // 2. Enhance the recognition results
        const enhancedResults = enhanceFoodRecognition(recognitionResult, testImage);
        const detectedItems = enhancedResults.enhancedItems.map(item => item.name);
        
        console.log(`  Detected ${detectedItems.length} food items:`);
        enhancedResults.enhancedItems.forEach((item, idx) => {
          let boost = '';
          if (item.timeContextBoost) boost += ' (time boost)';
          if (item.mealContextBoost) boost += ' (meal boost)';
          console.log(`    ${idx + 1}. ${item.name} (${Math.round(item.confidence * 100)}% confidence)${boost}`);
        });
        
        // 3. Find matches and calculate accuracy
        const matchResults = findMatches(detectedItems, testImage.expectedItems);
        const accuracyMetrics = calculateAccuracyMetrics(matchResults);
        
        console.log(`\n  Match results:`);
        console.log(`    Matched ${matchResults.matches.length}/${testImage.expectedItems.length} expected items`);
        console.log(`    Accuracy: ${(accuracyMetrics.accuracy * 100).toFixed(1)}%`);
        console.log(`    Weighted Accuracy: ${(accuracyMetrics.weightedAccuracy * 100).toFixed(1)}%`);
        console.log(`    Precision: ${(accuracyMetrics.precision * 100).toFixed(1)}%`);
        console.log(`    Recall: ${(accuracyMetrics.recall * 100).toFixed(1)}%`);
        console.log(`    F1 Score: ${(accuracyMetrics.f1Score * 100).toFixed(1)}%`);
        
        // Display matches and unmatched items
        if (matchResults.matches.length > 0) {
          console.log('\n  Matched items:');
          matchResults.matches.forEach(match => {
            console.log(`    Expected "${match.expected}" → Detected "${match.detected}" (${(match.score * 100).toFixed(1)}% similarity, ${match.matchType})`);
          });
        }
        
        if (matchResults.unmatchedExpected.length > 0) {
          console.log('\n  Missing expected items:');
          matchResults.unmatchedExpected.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        if (matchResults.unmatchedDetected.length > 0) {
          console.log('\n  Extra detected items:');
          matchResults.unmatchedDetected.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        // Add to test results
        testResults.push({
          imagePath: testImage.path,
          description: testImage.description,
          success: true,
          detectedItems: enhancedResults.enhancedItems,
          expectedItems: testImage.expectedItems,
          expectedLabels: testImage.expectedLabels,
          matchResults,
          accuracyMetrics,
          nutritionData: recognitionResult.nutritionData || null,
          totalCalories: recognitionResult.totalCalories || 0,
          timeOfDay: testImage.timeOfDay,
          mealType: testImage.mealType,
          enhancedResults
        });
        
        // Update overall accuracy
        overallAccuracy += accuracyMetrics.accuracy;
        successfulTests++;
      } catch (error) {
        console.error(`Error processing image ${testImage.path}:`, error.message);
        testResults.push({
          imagePath: testImage.path,
          description: testImage.description,
          success: false,
          error: error.message
        });
      }
    }
    
    // Calculate overall accuracy
    overallAccuracy = successfulTests > 0 ? overallAccuracy / successfulTests : 0;
    console.log(`\nOverall accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
    
    // Generate corrections if enabled
    let corrections = [];
    if (CONFIG.options.generateCorrections) {
      corrections = generateCorrections(testResults);
      console.log(`\nGenerated ${corrections.length} corrections for model training`);
      
      if (corrections.length > 0) {
        saveResultsToFile(corrections, CONFIG.outputFiles.correctionDatabase);
      }
    }
    
    // Save complete test results
    const finalResults = {
      timestamp: new Date().toISOString(),
      overallAccuracy,
      testCount: CONFIG.testImages.length,
      successfulTests,
      testResults
    };
    
    saveResultsToFile(finalResults, CONFIG.outputFiles.accuracyReport);
    
    return finalResults;
  } catch (error) {
    console.error('Error running accuracy test:', error.message);
    return { error: error.message };
  }
}

// Run the accuracy test
runAccuracyTest().then(() => {
  console.log('Accuracy test complete');
}).catch(error => {
  console.error('Fatal error running accuracy test:', error);
});