/**
 * Copyright (C) 2021 Axis Communications AB, Lund, Sweden
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const express = require("express");
const { Storage } = require("@google-cloud/storage");
const env = require("./env");
const { validateApiKey } = require("./firestore");

const app = express();
const storage = new Storage();

// Parse raw body for image uploads
app.use(express.raw({ type: 'image/*', limit: '10mb' }));

const getHandler = async (req, res) => {
  res.sendStatus(200);
};

const postHandler = async (req, res) => {
  console.log("Received POST request");
  
  // Extract API key from query parameters
  const apiKey = req.query.key;
  if (!apiKey) {
    console.log("No API key provided");
    return res.status(401).json({ error: "API key is required" });
  }
  
  // Validate content type
  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.startsWith("image/")) {
    console.log(`Invalid content type: ${contentType}`);
    return res.status(415).json({ error: "Unsupported media type. Only images are accepted." });
  }

  // Validate content disposition
  const contentDisposition = req.headers["content-disposition"];
  if (!contentDisposition) {
    console.log("Missing content-disposition header");
    return res.status(400).json({ error: "Content-Disposition header is required" });
  }

  // Extract filename from content disposition
  const filename = contentDisposition.match(
    /^attachment;\s*filename="(?<filename>.*)"$/
  )?.groups?.filename;

  if (!filename) {
    console.log("Could not extract filename from content-disposition header");
    return res.status(400).json({ error: "Invalid Content-Disposition format" });
  }

  try {
    // Validate API key directly with Firestore instead of API call
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      console.log("Invalid API key");
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    // Determine storage path based on validation response
    let storagePath;
    if (validation.path) {
      storagePath = `applications/${validation.applicationId}/${validation.path}/${filename}`;
    } else {
      storagePath = `applications/${validation.applicationId}/${filename}`;
    }
    
    console.log(`Storing file at path: ${storagePath}`);
    
    // Save the file to the determined path
    const body = req.body; // Already a Buffer from express.raw middleware
    await storage.bucket(env.bucketName).file(storagePath).save(body, {
      contentType: contentType,
      metadata: {
        uploadedVia: 'secureUpload-binary',
        originalName: filename,
        size: body.length,
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log("File uploaded successfully");
    
    // Generate a download URL
    const [downloadUrl] = await storage.bucket(env.bucketName).file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log upload to Firestore (optional enhancement)
    try {
      const { db } = require('./firestore');
      await db.collection('uploads').add({
        applicationId: validation.applicationId,
        filename: filename,
        path: storagePath,
        size: body.length,
        contentType: contentType,
        uploadedAt: new Date(),
        apiKey: apiKey
      });
      console.log("Upload logged to Firestore");
    } catch (logError) {
      console.error("Error logging upload to Firestore:", logError);
      // Continue even if logging fails
    }
    
    return res.status(200).json({
      success: true,
      file: {
        name: filename,
        size: body.length,
        type: contentType,
        path: storagePath,
        downloadUrl
      },
      message: "File uploaded successfully"
    });
  } catch (err) {
    console.error("Error saving file to storage:", err);
    return res.status(500).json({ error: "Failed to upload file", message: err.message });
  }
};

// Handle both GET and POST requests
app.get("/", getHandler);
app.post("/", postHandler);
app.get("/secureUpload", getHandler);
app.post("/secureUpload", postHandler);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Using bucket: ${env.bucketName}`);
});