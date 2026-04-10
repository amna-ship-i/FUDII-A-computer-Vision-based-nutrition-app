/**
 * Multi-scenario Food Recognition Test Suite
 * 
 * This test checks the enhanced food recognition system against various 
 * commonly misidentified food items to ensure the system is robust.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Endpoint
const API_URL = 'http://localhost:5000/api/food/recognize';

// Test scenarios to run
const TEST_SCENARIOS = [
  {
    name: 'Portion Size Estimation',
    imagePath: 'test-food-image.jpg',
    expectedItems: ['food'],
    description: 'Tests if portion size estimation is working correctly',
    options: {
      includePortionEstimates: true,
      validatePortions: true
    }
  }
  // Temporarily commenting out other tests to focus on portion size functionality
  /* 
  {
    name: 'Breakfast Plate',
    imagePath: 'breakfast-plate-test.jpg',
    expectedItems: ['breakfast plate', 'egg'],
    description: 'Tests identification of breakfast plates often confused with oranges/fruits'
  },
  {
    name: 'Standard Food Image',
    imagePath: 'test-food-image.jpg',
    expectedItems: ['food'],
    description: 'Tests standard food recognition against a known food image'
  },
  {
    name: 'Breakfast Plate with Contextual Analysis',
    imagePath: 'breakfast-plate-test.jpg',
    expectedItems: ['breakfast', 'egg', 'food'],
    description: 'Tests the contextual food categorization with meal type detection',
    options: {
      mealContext: 'breakfast',
      timeOfDay: 'morning'
    }
  }
  */
  // Additional scenarios can be added as new test images become available
];

/**
 * Convert image file to base64 encoding
 */
function imageToBase64(filePath) {
  try {
    const imageData = fs.readFileSync(filePath);
    return imageData.toString('base64');
  } catch (error) {
    console.error(`Error reading image file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Calculate string similarity score (0-1) for fuzzy matching food names
 */
function calculateStringSimilarity(str1, str2) {
  // Normalize strings for comparison
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Check for direct inclusion
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9; // High similarity for substring match
  }
  
  // Simple word intersection for multi-word terms
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const intersection = words1.filter(w => words2.includes(w));
  
  if (intersection.length > 0) {
    return 0.7 * (intersection.length / Math.max(words1.length, words2.length));
  }
  
  return 0; // No match
}

/**
 * Test if detected foods match expected foods
 */
function testFoodItemMatch(detectedItems, expectedItems) {
  const matches = [];
  const misses = [...expectedItems];
  
  // Check each detected item against expected items
  for (const detected of detectedItems) {
    const detectedName = detected.name.toLowerCase();
    
    // Check for matches with any expected item
    const matchIndex = misses.findIndex(expected => 
      calculateStringSimilarity(detectedName, expected) >= 0.7
    );
    
    if (matchIndex >= 0) {
      matches.push({
        expected: misses[matchIndex],
        detected: detectedName,
        confidence: detected.confidence
      });
      misses.splice(matchIndex, 1);
    }
  }
  
  return { matches, misses };
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`\n===== Testing Scenario: ${scenario.name} =====`);
  console.log(`Description: ${scenario.description}`);
  
  try {
    // Read image file
    const imagePath = path.join(__dirname, scenario.imagePath);
    const imageBase64 = imageToBase64(imagePath);
    
    if (!imageBase64) {
      console.error(`❌ FAILED: Could not read image file: ${scenario.imagePath}`);
      return false;
    }
    
    console.log(`Image loaded (${imageBase64.length} characters)`);
    console.log(`Expected items: ${scenario.expectedItems.join(', ')}`);
    
    // Prepare request payload with options
    const requestPayload = {
      imageData: imageBase64,
      includePortionEstimates: true
    };
    
    // Add scenario-specific options if provided
    if (scenario.options) {
      if (scenario.options.mealContext) {
        console.log(`Using meal context: ${scenario.options.mealContext}`);
        requestPayload.mealContext = scenario.options.mealContext;
      }
      
      if (scenario.options.timeOfDay) {
        console.log(`Using time of day: ${scenario.options.timeOfDay}`);
        requestPayload.timeOfDay = scenario.options.timeOfDay;
      }
      
      // Add cache bypass to make sure we get fresh results each time
      requestPayload.bypassCache = true;
      
      if (scenario.options.includePortionEstimates !== undefined) {
        requestPayload.includePortionEstimates = scenario.options.includePortionEstimates;
      }
      
      if (scenario.options.validatePortions) {
        console.log(`Validating portion sizes`);
        requestPayload.validatePortions = true;
      }
    }
    
    console.log(`Sending request to API...`);
    
    // Make API request
    const startTime = Date.now();
    const response = await axios.post(API_URL, requestPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Response received in ${duration.toFixed(2)} seconds`);
    
    // Process results
    if (response.status === 200) {
      const result = response.data;
      
      if (!result.foodItems || result.foodItems.length === 0) {
        console.error(`❌ FAILED: No food items detected in response`);
        return false;
      }
      
      console.log(`\nDetected ${result.foodItems.length} items:`);
      result.foodItems.forEach((item, i) => {
        console.log(`${i+1}. ${item.name} (${(item.confidence * 100).toFixed(1)}%)`);
        
        // Show additional information if available
        if (item.category) {
          console.log(`   Category: ${item.category}`);
        }
        if (item.mealType) {
          console.log(`   Meal Type: ${item.mealType}`);
        }
        if (item.portionSize) {
          console.log(`   Portion Size: ${item.portionSize}`);
        }
      });
      
      // Check if expected items were found
      const { matches, misses } = testFoodItemMatch(result.foodItems, scenario.expectedItems);
      
      console.log(`\nMatched Items: ${matches.length}/${scenario.expectedItems.length}`);
      matches.forEach(match => {
        console.log(`✅ Expected "${match.expected}" -> Found "${match.detected}" (${(match.confidence * 100).toFixed(1)}%)`);
      });
      
      if (misses.length > 0) {
        console.log(`\nMissing Items: ${misses.length}`);
        misses.forEach(miss => {
          console.log(`❌ Expected "${miss}" -> Not found`);
        });
      }
      
      // Check for extra validations based on scenario options
      if (scenario.options && scenario.options.validatePortions) {
        console.log(`\nValidating portion sizes:`);
        const hasPortionSizes = result.foodItems.some(item => item.portionSize);
        console.log(`Portion size information: ${hasPortionSizes ? '✅ Present' : '❌ Missing'}`);
        
        if (hasPortionSizes) {
          // Display portion sizes for the first few items
          console.log(`\nPortion size examples:`);
          result.foodItems.slice(0, 3).forEach((item, i) => {
            console.log(`${i+1}. ${item.name}: ${item.portionSize} ${item.portionUnit} (approx. ${item.portionCalories} calories)`);
          });
        }
        
        if (!hasPortionSizes && scenario.options.validatePortions) {
          console.log(`❌ FAILED: Portion size validation required but not found in results`);
          return false;
        }
      }
      
      // If meal context was provided, verify meal type detection
      if (scenario.options && scenario.options.mealContext) {
        console.log(`\nValidating meal context detection:`);
        const correctMealContext = result.foodItems.some(
          item => item.mealType && item.mealType.toLowerCase().includes(scenario.options.mealContext.toLowerCase())
        );
        console.log(`Expected meal context '${scenario.options.mealContext}': ${correctMealContext ? '✅ Detected' : '❌ Not detected'}`);
      }
      
      // Determine overall result
      let success = misses.length === 0;
      
      // Check additional validations if they failed
      if (scenario.options && scenario.options.validatePortions) {
        const hasPortionSizes = result.foodItems.some(item => item.portionSize);
        success = success && hasPortionSizes;
      }
      
      if (scenario.options && scenario.options.mealContext) {
        const correctMealContext = result.foodItems.some(
          item => item.mealType && item.mealType.toLowerCase().includes(scenario.options.mealContext.toLowerCase())
        );
        success = success && correctMealContext;
      }
      
      console.log(`\nTest Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
      
      return success;
    } else {
      console.error(`❌ FAILED: Unexpected response status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ FAILED: Error running test:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return false;
  }
}

/**
 * Run all test scenarios and report overall results
 */
async function runAllTests() {
  console.log('======= MULTI-SCENARIO FOOD RECOGNITION TEST SUITE =======\n');
  console.log(`Starting test run with ${TEST_SCENARIOS.length} scenarios`);
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    const success = await runTestScenario(scenario);
    results.push({ name: scenario.name, success });
  }
  
  // Output summary
  console.log('\n======= TEST SUMMARY =======');
  const passCount = results.filter(r => r.success).length;
  console.log(`Tests passed: ${passCount}/${results.length} (${(passCount/results.length*100).toFixed(1)}%)`);
  
  // List failures if any
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`❌ ${f.name}`));
  }
  
  console.log('\n======= TEST SUITE COMPLETE =======');
}

// Run all tests
runAllTests().catch(console.error);