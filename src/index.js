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

const app = express();
const storage = new Storage();

// Parse raw body for image uploads
app.use(express.raw({ type: 'image/*', limit: '10mb' }));

const getHandler = async (req, res) => {
  res.sendStatus(200);
};

const postHandler = async (req, res) => {
  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.startsWith("image/")) {
    console.log('Image Uplad detected');
    return res.sendStatus(415);
  }

  const contentDisposition = req.headers["content-disposition"];
  if (!contentDisposition) {
    return res.sendStatus(400);
  }

  const filename = contentDisposition.match(
    /^attachment;\s*filename="(?<filename>.*)"$/
  )?.groups?.filename;

  if (!filename) {
    return res.sendStatus(400);
  }

  try {
    const body = req.body; // Already a Buffer from express.raw middleware
    await storage.bucket(env.bucketName).file(filename).save(body);
    return res.sendStatus(200);
  } catch (err) {
    console.error("Error saving file to storage:", err);
    return res.sendStatus(500);
  }
};

// Handle both GET and POST requests
app.get("/", getHandler);
app.post("/", postHandler);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Using bucket: ${env.bucketName}`);
});