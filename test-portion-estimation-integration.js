/**
 * Advanced Portion Estimation Integration Test
 * 
 * This file tests the integration of the advanced portion estimation with different
 * meal scenarios, food combinations, and contextual adjustments.
 */

// Import our standalone portion estimation implementation
import * as portionEstimation from './test-portion-estimation.js';

/**
 * Test different meal scenarios with various food combinations
 */
function testMealScenarios() {
  console.log("\n=== Testing Meal Scenarios ===\n");
  
  // Breakfast scenario
  const breakfastItems = [
    {
      name: "scrambled eggs",
      confidence: 0.95,
      calories: 140,
      protein: 12,
      carbs: 2,
      fat: 10,
      category: "protein",
      visualCharacteristics: {
        area: 22,
        relativeSize: 0.6,
        estimatedDensity: 0.9,
        isPrimaryDish: true
      }
    },
    {
      name: "toast",
      confidence: 0.94,
      calories: 80,
      protein: 2,
      carbs: 15,
      fat: 1,
      category: "grain",
      visualCharacteristics: {
        area: 15,
        relativeSize: 0.4,
        estimatedDensity: 0.6,
        isPrimaryDish: false
      }
    },
    {
      name: "orange juice",
      confidence: 0.93,
      calories: 110,
      protein: 1,
      carbs: 26,
      fat: 0,
      category: "beverage", 
      visualCharacteristics: {
        area: 12,
        relativeSize: 0.3,
        estimatedDensity: 1.0,
        isPrimaryDish: false
      }
    }
  ];
  
  // Dinner scenario
  const dinnerItems = [
    {
      name: "steak",
      confidence: 0.94,
      calories: 300,
      protein: 30,
      carbs: 0,
      fat: 15,
      category: "protein",
      visualCharacteristics: {
        area: 30,
        relativeSize: 0.5,
        estimatedDensity: 1.1,
        isPrimaryDish: true
      }
    },
    {
      name: "mashed potatoes",
      confidence: 0.92,
      calories: 150,
      protein: 3,
      carbs: 30,
      fat: 3,
      category: "vegetable",
      visualCharacteristics: {
        area: 20,
        relativeSize: 0.35,
        estimatedDensity: 0.8,
        isPrimaryDish: false
      }
    },
    {
      name: "green beans",
      confidence: 0.90,
      calories: 30,
      protein: 2,
      carbs: 7,
      fat: 0,
      category: "vegetable",
      visualCharacteristics: {
        area: 15,
        relativeSize: 0.25,
        estimatedDensity: 0.5,
        isPrimaryDish: false
      }
    }
  ];
  
  // Mixed plate scenario
  const mixedItems = [
    {
      name: "pasta",
      confidence: 0.93,
      calories: 200,
      protein: 7,
      carbs: 40,
      fat: 1,
      category: "grain",
      visualCharacteristics: {
        area: 40,
        relativeSize: 0.6,
        estimatedDensity: 0.7,
        isPrimaryDish: true
      }
    },
    {
      name: "chicken alfredo",
      confidence: 0.91,
      calories: 350,
      protein: 25,
      carbs: 15,
      fat: 20,
      category: "mixed",
      visualCharacteristics: {
        area: 30,
        relativeSize: 0.4,
        estimatedDensity: 0.9,
        isPrimaryDish: true
      }
    }
  ];
  
  // Test with different meal contexts
  const mealContexts = [
    { mealType: 'breakfast', plateDetected: true, plateSize: 'standard' },
    { mealType: 'lunch', plateDetected: true, plateSize: 'standard' },
    { mealType: 'dinner', plateDetected: true, plateSize: 'standard' },
    { mealType: 'dinner', plateDetected: true, plateSize: 'large' },
    { mealType: 'snack', plateDetected: true, plateSize: 'small' }
  ];
  
  // Process breakfast items with different contexts
  console.log("\n--- Breakfast Items ---");
  mealContexts.forEach(context => {
    console.log(`\nContext: ${context.mealType}, Plate size: ${context.plateSize}`);
    
    const enhancedItems = enhanceFoodItemsWithPortionEstimates(
      breakfastItems,
      context
    );
    
    let totalCalories = 0;
    enhancedItems.forEach(item => {
      console.log(`${item.name}: ${item.portionSize} ${item.portionUnit} (${item.calories} calories)`);
      totalCalories += item.calories;
    });
    
    console.log(`Total calories: ${totalCalories}`);
  });
  
  // Process dinner items with different contexts
  console.log("\n--- Dinner Items ---");
  mealContexts.forEach(context => {
    console.log(`\nContext: ${context.mealType}, Plate size: ${context.plateSize}`);
    
    const enhancedItems = enhanceFoodItemsWithPortionEstimates(
      dinnerItems,
      context
    );
    
    let totalCalories = 0;
    enhancedItems.forEach(item => {
      console.log(`${item.name}: ${item.portionSize} ${item.portionUnit} (${item.calories} calories)`);
      totalCalories += item.calories;
    });
    
    console.log(`Total calories: ${totalCalories}`);
  });
  
  // Process mixed items with different contexts
  console.log("\n--- Mixed Items ---");
  mealContexts.forEach(context => {
    console.log(`\nContext: ${context.mealType}, Plate size: ${context.plateSize}`);
    
    const enhancedItems = enhanceFoodItemsWithPortionEstimates(
      mixedItems,
      context
    );
    
    let totalCalories = 0;
    enhancedItems.forEach(item => {
      console.log(`${item.name}: ${item.portionSize} ${item.portionUnit} (${item.calories} calories)`);
      totalCalories += item.calories;
    });
    
    console.log(`Total calories: ${totalCalories}`);
  });
}

/**
 * Test common foods and their portion estimations
 */
function testCommonFoods() {
  console.log("\n=== Testing Common Food Portion Estimates ===\n");
  
  const commonFoods = [
    { name: "apple", category: "fruit", confidence: 0.95 },
    { name: "banana", category: "fruit", confidence: 0.95 },
    { name: "orange", category: "fruit", confidence: 0.95 },
    { name: "bread slice", category: "grain", confidence: 0.95 },
    { name: "cereal", category: "grain", confidence: 0.95 },
    { name: "rice", category: "grain", confidence: 0.95 },
    { name: "chicken breast", category: "protein", confidence: 0.95 },
    { name: "steak", category: "protein", confidence: 0.95 },
    { name: "salmon", category: "protein", confidence: 0.95 },
    { name: "broccoli", category: "vegetable", confidence: 0.95 },
    { name: "carrots", category: "vegetable", confidence: 0.95 },
    { name: "salad", category: "vegetable", confidence: 0.95 },
    { name: "cheese", category: "dairy", confidence: 0.95 },
    { name: "butter", category: "fat", confidence: 0.95 },
    { name: "pizza", category: "mixed", confidence: 0.95 },
    { name: "sandwich", category: "mixed", confidence: 0.95 },
    { name: "soup", category: "mixed", confidence: 0.95 }
  ];
  
  // Add visual characteristics to each food
  commonFoods.forEach(food => {
    food.visualCharacteristics = {
      area: 25,
      relativeSize: 0.5,
      estimatedDensity: 1.0,
      isPrimaryDish: true
    };
  });
  
  // Test each food with dinner context (standard)
  const context = { mealType: 'dinner', plateDetected: true, plateSize: 'standard' };
  const enhancedItems = enhanceFoodItemsWithPortionEstimates(
    commonFoods,
    context
  );
  
  console.log("Standard portions for common foods:");
  enhancedItems.forEach(item => {
    console.log(`${item.name} (${item.category}): ${item.portionSize} ${item.portionUnit} - ${item.weightInGrams}g - ${item.calories} calories`);
  });
}

/**
 * Main test runner
 */
function runTests() {
  console.log("Starting portion estimation integration tests...");
  
  try {
    // Test meal scenarios
    testMealScenarios();
    
    // Test common foods
    testCommonFoods();
    
    console.log("\nAll integration tests completed successfully!");
  } catch (error) {
    console.error("Error running integration tests:", error);
  }
}

// Import necessary functions directly from test-portion-estimation.js
import {
  calculateAdvancedPortionEstimate,
  enhanceFoodItemsWithPortionEstimates
} from './test-portion-estimation.js';

// Run the tests
runTests();