# OpsVision Upload Service

A Google Cloud Run service that handles secure image uploads from cameras and other devices.

## Features

- Secure API key validation
- Path-based storage organization
- Support for image uploads
- Automatic metadata tracking

## API Endpoints

### GET /

Health check endpoint that returns a 200 OK status.

### POST /

Upload endpoint for images. Requires API key validation.

#### Request Parameters

- `key` (query parameter): The API key for authentication

#### Headers

- `Content-Type`: Must start with `image/`
- `Content-Disposition`: Must be in format `attachment; filename="your-filename.jpg"`

#### Example Request

```bash
curl -X POST "https://opsvision-upload-35142894488.us-central1.run.app/secureUpload?key=33ca4c06-0ab5-442c-bd8c-31e0d653b114" \
  -H "Content-Type: image/jpeg" \
  -H "Content-Disposition: attachment; filename=&quot;test.jpg&quot;" \
  --data-binary "@test.jpg"
```

#### Response

```json
{
  "success": true,
  "file": {
    "name": "test.jpg",
    "size": 12345,
    "type": "image/jpeg",
    "path": "applications/app-id/path/test.jpg",
    "downloadUrl": "https://storage.googleapis.com/..."
  },
  "message": "File uploaded successfully"
}
```

## API Key Validation

The service validates API keys against the external validation service:
`http://us-central1-opsvision-1527e.cloudfunctions.net/secureUploadApi/secureUpload`

Valid API keys provide:
- Application ID
- Optional storage path

## Storage Structure

Files are stored in Google Cloud Storage with the following path structure:
`applications/{applicationId}/{path}/{filename}`

If no path is specified in the API key, files are stored at:
`applications/{applicationId}/{filename}`

## Environment Variables

- `BUCKET_NAME`: The Google Cloud Storage bucket name (required)
- `PORT`: The port to listen on (defaults to 8080)

## Development

### Prerequisites

- Node.js 14+
- Google Cloud SDK

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

### Deployment

```bash
gcloud run deploy
```

## License

ISC