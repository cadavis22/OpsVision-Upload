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
 * Uses the apiKey as the collection name in the database
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<Object>} - Validation result with valid flag, applicationId and path
 */
async function validateApiKey(apiKey) {
  try {
    console.log(`Validating API key: ${apiKey}`);
    
    if (!apiKey) {
      console.log('No API key provided');
      return { valid: false };
    }

    // Use the apiKey as the collection name
    const apiKeyCollection = await db.collection(apiKey).get();
    
    if (apiKeyCollection.empty) {
      console.log(`No documents found in collection: ${apiKey}`);
      return { valid: false };
    }
    
    // Get the first document in the collection
    // This assumes there's at least one document in the collection
    const apiKeyData = apiKeyCollection.docs[0].data();
    
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