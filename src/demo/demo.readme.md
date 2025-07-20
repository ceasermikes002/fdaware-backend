# FDAware Demo Module

## Overview
This module provides a public, rate-limited endpoint for demoing FDAware's label scan engine. It allows anonymous users to upload a label and receive a partial scan result (teaser), without creating an account or workspace. This is designed for the marketing/demo flow and is not linked to any real user or workspace.

---

## Endpoints

### 1. Upload & Analyze Demo Label
- **POST** `/demo/scan`
  - **Auth:** None (public)
  - **Rate Limit:** 5 requests per IP per hour
  - **Body:** `multipart/form-data`
    - `file`: PDF or image file to upload (required)
  - **Returns:**
    ```json
    {
      "partial": true,
      "violations": [
        {
          "type": "Claim",
          "message": "Immune support claim needs scientific backup",
          "suggestion": "",
          "citation": "",
          "severity": "medium",
          "category": "Claims",
          "location": ""
        },
        {
          "type": "Layout",
          "message": "Nutrition Facts layout not bolded",
          "suggestion": "",
          "citation": "",
          "severity": "low",
          "category": "Layout",
          "location": ""
        },
        {
          "type": "Allergen",
          "message": "Allergen info missing",
          "suggestion": "",
          "citation": "",
          "severity": "high",
          "category": "Allergens",
          "location": ""
        }
      ],
      "message": "Sign up to view the full FDA audit report and unlock all features.",
      "analysis": {
        "overallScore": 70,
        "compliantItems": ["Serving size declaration present"],
        "nextSteps": ["Review FDA guidelines"]
      },
      "ocr": {}
    }
    ```
  - **Notes:**
    - Only the first 3 violations are returned (teaser/partial result).
    - No full report or download is available in demo mode.
    - After the rate limit is exceeded, a 429 error is returned.
    - Intended for frontend demo/marketing flows.

---

## Usage Notes
- This endpoint is public and should be used only for demo/marketing flows.
- For full scan/report features, users must sign up and use the authenticated `/labels/upload` endpoint.
- The demo scan is not linked to any user or workspace and is not persisted for later retrieval.
- Rate limiting is enforced to prevent abuse.

---

## Example cURL
```sh
curl -X POST http://localhost:3000/demo/scan \
  -F "file=@/path/to/label.pdf"
```

---

## Contact
For questions about the demo API, contact the backend team. 