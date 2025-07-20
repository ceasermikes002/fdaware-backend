# FDAware Backend

## Label Upload & ML Scan API

This backend allows users to upload label files, which are stored in S3 and analyzed by an ML service for OCR and FDA violation detection. Results are stored and returned in a single API call.

---

## 🚀 Quickstart

1. **Start the Flask ML Service**
   - Should be running at the URL in `.env` (default: `http://localhost:8080/analyze`).

2. **Start the NestJS Backend**
   - Ensure your `.env` is configured (see below).
   - Run: `npm run start:dev`

3. **Upload a Label (from Frontend or Postman)**
   - **Endpoint:** `POST /labels/upload`
   - **Auth:** Bearer JWT required (see Auth docs or login endpoint)
   - **Content-Type:** `multipart/form-data`
   - **Fields:**
     - `file`: (attach your label image file)
     - `name`: (string, e.g. "Test Label")
     - `workspaceId`: (string, valid workspace ID)

   **Example (using fetch in frontend):**
   ```js
   const formData = new FormData();
   formData.append('file', fileInput.files[0]);
   formData.append('name', 'My Label');
   formData.append('workspaceId', 'your-workspace-id');

   fetch('http://localhost:5000/labels/upload', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer <your-jwt-token>'
     },
     body: formData
   })
     .then(res => res.json())
     .then(console.log);
   ```

   **Example (Postman):**
   - Set method to POST
   - URL: `http://localhost:3000/labels/upload`
   - Authorization: Bearer Token
   - Body: form-data (add file, name, workspaceId)

---

## 🔄 What Happens

1. File is uploaded to S3.
2. Label is created in the database.
3. File URL is sent to the ML service for OCR/violation detection.
4. Extraction and violations are stored in the DB (as LabelVersion and Violation).
5. Response includes label, version, and violations.

**Sample Response:**
```json
{
  "label": { "id": "...", "name": "...", "fileUrl": "...", "workspaceId": "..." },
  "version": { "id": "...", "labelId": "...", "status": "SCANNED", "extraction": { /* OCR data */ } },
  "violations": [
    {
      "type": "Claim Violation",
      "message": "The word 'cures' is not FDA-compliant.",
      "suggestion": "Use 'supports energy levels'",
      "citation": "21 CFR 101.93"
    }
  ]
}
```

---

## ⚙️ .env Example
```
ML_API_URL=http://localhost:8080/analyze
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_BUCKET=...
JWT_SECRET=changeme
DATABASE_URL=postgresql://...
```

---

## 🛠️ Tech Stack
- NestJS (TypeScript)
- Prisma (PostgreSQL)
- AWS S3
- Flask (ML Service)

---

## 📚 More
- For authentication, see `/auth` endpoints.
- For workspace and user management, see `/workspaces` and `/users` endpoints.
- For ML service, see Flask repo/docs.

