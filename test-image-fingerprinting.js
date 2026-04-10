/**
 * Test Image Fingerprinting
 *
 * This script tests the image fingerprinting functionality to verify 
 * that it can correctly identify similar images, thereby improving 
 * cache hit rates for the food recognition system.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import the image fingerprinting functions for testing
// Note: We're mocking the functions since we can't directly import TypeScript
// In real server code, you would import from '../server/utils/image-fingerprinting'

/**
 * Simplified version of the fingerprinting functions for testing purposes
 */
function generateImageFingerprint(imageData) {
  try {
    // Remove data URL prefix if present
    const data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;
    
    // Create hash from image data
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  } catch (error) {
    console.error('Error generating image fingerprint', error);
    // Return a timestamp-based fallback fingerprint in case of error
    return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Generate a perceptual hash for the image
 */
function generatePerceptualHash(imageData) {
  try {
    // Remove data URL prefix if present
    const data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;
    
    // Divide the image into chunks for a more robust perceptual hash
    const chunks = 8;
    const chunkSize = Math.floor(data.length / chunks);
    
    let chunkHashes = [];
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = data.substring(start, end);
      
      // Simple hash for each chunk
      let chunkHash = 0;
      for (let j = 0; j < chunk.length; j += 100) { // Sample every 100th character
        const char = chunk.charCodeAt(j % chunk.length);
        chunkHash = ((chunkHash << 5) - chunkHash) + char;
        chunkHash = chunkHash & chunkHash;
      }
      
      chunkHashes.push(chunkHash.toString(16).padStart(8, '0'));
    }
    
    // Join chunk hashes
    return chunkHashes.join('');
  } catch (error) {
    console.error('Error generating perceptual hash', error);
    return generateImageFingerprint(imageData); // Fall back to regular fingerprint
  }
}

/**
 * Get perceptual hash similarity
 */
function getPerceptualHashSimilarity(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 0;
  }
  
  // Calculate Hamming distance (number of differing bits)
  let hammingDistance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      hammingDistance++;
    }
  }
  
  // Convert to similarity percentage
  const similarity = 100 - (hammingDistance / hash1.length) * 100;
  return Math.round(similarity);
}

/**
 * Find similar image
 */
function findSimilarImage(
  newFingerprint,
  newPerceptualHash,
  existingFingerprints,
  existingPerceptualHashes,
  similarityThreshold = 85
) {
  // Check for exact fingerprint match first (fastest)
  const exactMatchIndex = existingFingerprints.findIndex(
    fingerprint => fingerprint === newFingerprint
  );
  
  if (exactMatchIndex !== -1) {
    return {
      found: true,
      index: exactMatchIndex,
      similarity: 100,
      exactMatch: true
    };
  }
  
  // If no exact match and perceptual hashing is enabled, check for similar images
  let highestSimilarity = 0;
  let mostSimilarIndex = -1;
  
  // Compare with all existing perceptual hashes
  existingPerceptualHashes.forEach((hash, index) => {
    const similarity = getPerceptualHashSimilarity(newPerceptualHash, hash);
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilarIndex = index;
    }
  });
  
  // Check if the highest similarity exceeds our threshold
  if (
    highestSimilarity >= similarityThreshold &&
    mostSimilarIndex !== -1
  ) {
    return {
      found: true,
      index: mostSimilarIndex,
      similarity: highestSimilarity,
      exactMatch: false
    };
  }
  
  // No similar image found
  return { found: false };
}

/**
 * Generate cache key
 */
function generateCacheKey(imageData) {
  // Generate fingerprints
  const fingerprint = generateImageFingerprint(imageData);
  const perceptualHash = generatePerceptualHash(imageData);
  
  // Create a cache key that combines both
  return `food_recognition_${fingerprint.substring(0, 7)}_${perceptualHash.substring(0, 8)}`;
}

/**
 * Run the fingerprinting test
 */
async function runTests() {
  // Test with sample images
  console.log('==========================================');
  console.log('Starting image fingerprinting tests...');
  console.log('==========================================');
  
  // Test 1: Same image should have identical fingerprints
  const testImageData = fs.readFileSync('test-image.jpg', { encoding: 'base64' });
  const fingerprint1 = generateImageFingerprint(testImageData);
  const fingerprint2 = generateImageFingerprint(testImageData);
  
  console.log('\nTEST 1: Same image, identical fingerprints');
  console.log(`Fingerprint 1: ${fingerprint1.substring(0, 20)}...`);
  console.log(`Fingerprint 2: ${fingerprint2.substring(0, 20)}...`);
  console.log(`Result: ${fingerprint1 === fingerprint2 ? 'PASS ✓' : 'FAIL ✗'}`);
  
  // Test 2: Similar images should have similar perceptual hashes
  // For this test, we're simulating a slightly modified image
  let modifiedImageData = testImageData;
  // Modify a small portion of the image data to simulate a slightly different image
  const modificationPoint = Math.floor(modifiedImageData.length * 0.7);
  modifiedImageData = 
    modifiedImageData.substring(0, modificationPoint) + 
    'A' + 
    modifiedImageData.substring(modificationPoint + 1);
  
  const phash1 = generatePerceptualHash(testImageData);
  const phash2 = generatePerceptualHash(modifiedImageData);
  const similarity = getPerceptualHashSimilarity(phash1, phash2);
  
  console.log('\nTEST 2: Similar images, similar perceptual hashes');
  console.log(`Perceptual Hash 1: ${phash1.substring(0, 20)}...`);
  console.log(`Perceptual Hash 2: ${phash2.substring(0, 20)}...`);
  console.log(`Similarity: ${similarity}%`);
  console.log(`Result: ${similarity > 85 ? 'PASS ✓' : 'FAIL ✗'} (Threshold: 85%)`);
  
  // Test 3: Verify findSimilarImage function
  console.log('\nTEST 3: Find similar image function');
  
  // Create a database of sample images
  const existingFingerprints = [
    generateImageFingerprint('sample1'),
    generateImageFingerprint('sample2'),
    fingerprint1, // Add our test image
    generateImageFingerprint('sample4')
  ];
  
  const existingPerceptualHashes = [
    generatePerceptualHash('sample1'),
    generatePerceptualHash('sample2'),
    phash1, // Add our test image
    generatePerceptualHash('sample4')
  ];
  
  // Try to find the exact same image
  const exactMatch = findSimilarImage(
    fingerprint1,
    phash1,
    existingFingerprints,
    existingPerceptualHashes
  );
  
  console.log('Finding exact same image:');
  console.log(`Found: ${exactMatch.found}`);
  console.log(`Exact match: ${exactMatch.exactMatch}`);
  console.log(`Similarity: ${exactMatch.similarity}%`);
  console.log(`Result: ${exactMatch.found && exactMatch.exactMatch ? 'PASS ✓' : 'FAIL ✗'}`);
  
  // Try to find a similar image
  const similarMatch = findSimilarImage(
    generateImageFingerprint(modifiedImageData),
    phash2,
    existingFingerprints,
    existingPerceptualHashes
  );
  
  console.log('\nFinding similar image:');
  console.log(`Found: ${similarMatch.found}`);
  console.log(`Exact match: ${similarMatch.exactMatch || false}`);
  console.log(`Similarity: ${similarMatch.similarity || 0}%`);
  console.log(`Result: ${similarMatch.found && !similarMatch.exactMatch ? 'PASS ✓' : 'FAIL ✗'}`);
  
  // Test 4: Cache key generation
  console.log('\nTEST 4: Cache key generation');
  const cacheKey1 = generateCacheKey(testImageData);
  const cacheKey2 = generateCacheKey(testImageData);
  const cacheKey3 = generateCacheKey(modifiedImageData);
  
  console.log(`Cache key 1: ${cacheKey1}`);
  console.log(`Cache key 2: ${cacheKey2}`);
  console.log(`Cache key 3 (modified): ${cacheKey3}`);
  console.log(`Keys 1 & 2 identical: ${cacheKey1 === cacheKey2 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Keys 1 & 3 different: ${cacheKey1 !== cacheKey3 ? 'PASS ✓' : 'FAIL ✗'}`);
  
  console.log('\n==========================================');
  console.log('Image fingerprinting tests completed!');
  console.log('==========================================');
}

// Run the tests
runTests().catch(error => {
  console.error('Error in fingerprinting tests:', error);
});