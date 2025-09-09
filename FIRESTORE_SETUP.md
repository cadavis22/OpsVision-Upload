# Firestore Setup for OpsVision Upload Service

This document explains how to set up Firestore for the OpsVision Upload Service.

## Overview

The OpsVision Upload Service now uses Firestore directly for API key validation instead of calling an external API. This provides several benefits:

1. Reduced latency - direct database access is faster than API calls
2. Improved reliability - fewer points of failure
3. Better security - no need to expose validation logic through an API
4. Enhanced logging - uploads are now logged to Firestore

## Firestore Collections

### apiKeys Collection

This collection stores API keys and their associated data:

```
apiKeys (collection)
  |- {apiKey} (document ID - the actual API key string)
      |- applicationId: string (required) - The ID of the application this key belongs to
      |- path: string (optional) - The storage path for uploads using this key
      |- disabled: boolean (optional) - If true, the key is disabled
      |- expiresAt: timestamp (optional) - When the key expires
      |- createdAt: timestamp - When the key was created
      |- description: string (optional) - Description of what this key is used for
```

### uploads Collection

This collection logs all successful uploads:

```
uploads (collection)
  |- {auto-generated ID}
      |- applicationId: string - The application ID from the API key
      |- filename: string - The original filename
      |- path: string - The full storage path
      |- size: number - File size in bytes
      |- contentType: string - The MIME type
      |- uploadedAt: timestamp - When the upload occurred
      |- apiKey: string - The API key used for the upload
```

## Setup Instructions

1. **Create a Firestore Database**

   If you don't already have a Firestore database, create one in your Google Cloud project:

   ```bash
   gcloud firestore databases create --region=us-central1
   ```

2. **Deploy Firestore Security Rules**

   Deploy the included security rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Create Initial API Keys**

   You can create API keys using the Firebase Console or programmatically:

   ```javascript
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();

   // Example: Create a new API key
   const apiKey = "your-api-key-here"; // Generate a secure random string
   await db.collection('apiKeys').doc(apiKey).set({
     applicationId: "app-123",
     path: "uploads/images",
     createdAt: admin.firestore.FieldValue.serverTimestamp(),
     expiresAt: admin.firestore.Timestamp.fromDate(
       new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
     ),
     description: "Camera upload key for Building A"
   });
   ```

4. **Update Service Account Permissions**

   Ensure the service account used by your Cloud Run service has the following IAM roles:
   
   - `roles/datastore.user` - For Firestore access
   - `roles/storage.objectAdmin` - For Cloud Storage access

   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member=serviceAccount:YOUR_SERVICE_ACCOUNT \
     --role=roles/datastore.user
   ```

## Migration from API Validation

If you were previously using the API validation endpoint, you'll need to migrate your API keys to Firestore. You can do this by:

1. Retrieving all valid API keys from your previous system
2. Creating corresponding documents in the Firestore `apiKeys` collection
3. Testing each key to ensure it works with the new validation system

## Monitoring and Management

You can manage API keys through:

1. Firebase Console - Direct access to the Firestore collections
2. Custom Admin UI - Build a simple admin interface to manage keys
3. Scripts - Use the Firebase Admin SDK to programmatically manage keys

## Troubleshooting

If you encounter issues with API key validation:

1. Check Firestore permissions for your service account
2. Verify the API key exists in the `apiKeys` collection
3. Check for typos in the API key
4. Ensure the key is not disabled or expired
5. Review Cloud Run logs for detailed error messages