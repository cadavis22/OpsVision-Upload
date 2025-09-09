/**
 * Firestore configuration and utility functions
 */

"use strict";

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// This will use the default credentials provided by Google Cloud Run
// or the GOOGLE_APPLICATION_CREDENTIALS environment variable
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

/**
 * Validates an API key by checking it directly in Firestore
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<Object>} - Validation result with valid flag, applicationId and path
 */
async function validateApiKey(apiKey) {
  try {
    console.log(`Validating API key: ${apiKey}`);
    
    // Query the apiKeys collection in Firestore
    const apiKeyDoc = await db.collection('apiKeys').doc(apiKey).get();
    
    if (!apiKeyDoc.exists) {
      console.log('API key not found in Firestore');
      return { valid: false };
    }
    
    const apiKeyData = apiKeyDoc.data();
    
    // Check if the API key is valid (not expired, not disabled, etc.)
    if (apiKeyData.disabled) {
      console.log('API key is disabled');
      return { valid: false };
    }
    
    // If there's an expiration date, check if it's still valid
    if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
      console.log('API key has expired');
      return { valid: false };
    }
    
    console.log(`API key validation successful: ${JSON.stringify({
      valid: true,
      applicationId: apiKeyData.applicationId,
      path: apiKeyData.path || ''
    })}`);
    
    return {
      valid: true,
      applicationId: apiKeyData.applicationId,
      path: apiKeyData.path || ''
    };
  } catch (error) {
    console.error("Error validating API key:", error.message);
    return { valid: false };
  }
}

module.exports = {
  db,
  validateApiKey
};