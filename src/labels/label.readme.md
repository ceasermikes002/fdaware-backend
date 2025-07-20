# FDAware Label Module API & Frontend Integration Guide

## Overview
This module handles all label upload, analysis, versioning, and retrieval for the FDAware platform. It supports versioned analysis, compliance scoring, and detailed violation/compliance reporting for each label in a workspace.

**Authentication & Authorization:** All endpoints require JWT authentication and workspace role-based access control.

---

## Endpoints

### 1. Upload & Analyze Label
- **POST** `/labels/upload`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Body:** `multipart/form-data`
    - `file`: PDF file to upload
    - `name`: Label name (string)
    - `workspaceId`: Workspace ID (string)
  - **Roles:** `admin`, `member`
  - **Returns:**
    ```json
    {
      "label": {
        "id": "uuid",
        "name": "Label Name",
        "fileUrl": "https://s3-url.com/file.pdf",
        "workspaceId": "workspace-uuid"
      },
      "version": {
        "id": "uuid",
        "labelId": "uuid",
        "status": "SCANNED",
        "extraction": {},
        "analyzedAt": "2025-07-05T01:02:08.592989Z"
      },
      "analysis": {
        "overallScore": 90,
        "compliantItems": [
          "Supplement Facts panel properly formatted",
          "Serving size declaration present and clear",
          "Disclaimer wording is correct"
        ],
        "analyzedAt": "2025-07-05T01:02:08.592989Z",
        "nextSteps": [
          "Address high-priority issues first",
          "Review FDA regulations for detailed requirements",
          "Re-upload corrected label for verification",
          "Schedule follow-up review with regulatory team"
        ]
      },
      "violations": [
        {
          "id": "uuid",
          "versionId": "uuid",
          "type": "Disclaimer Placement",
          "message": "The disclaimer is not placed immediately adjacent to the structure/function claims...",
          "suggestion": "Relocate the disclaimer to be adjacent to any structure/function claims...",
          "citation": "21 CFR 101.93(d)",
          "severity": "medium",
          "category": "Layout",
          "location": "Page 1, Bottom"
        }
      ],
      "ocr": {
        "claims": "No explicit health claims found",
        "ingredients": ["Vitamin D3", "Zinc", "Elderberry Extract"],
        "nutrition": {
          "calories": "Not specified",
          "fat": "Not specified"
        },
        "text": "Serving Size: 2 Capsules\nSupplement Facts\n..."
      }
    }
    ```

### 2. Upload New Version of Existing Label
- **POST** `/labels/:id/upload-version`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Body:** `multipart/form-data`
    - `file`: PDF file to upload
  - **Roles:** `admin`, `member`
  - **Returns:** Same format as upload endpoint

### 3. Get All Labels (Latest Analysis)
- **GET** `/labels?workspaceId=workspace-uuid`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:** Array of:
    ```json
    [
      {
        "label": {
          "id": "uuid",
          "name": "Label Name",
          "fileUrl": "https://s3-url.com/file.pdf",
          "workspaceId": "workspace-uuid"
        },
        "version": {
          "id": "uuid",
          "labelId": "uuid",
          "status": "SCANNED",
          "extraction": {},
          "analyzedAt": "2025-07-05T01:02:08.592989Z"
        },
        "analysis": {
          "overallScore": 90,
          "compliantItems": [
            "Supplement Facts panel properly formatted",
            "Serving size declaration present and clear"
          ],
          "analyzedAt": "2025-07-05T01:02:08.592989Z",
          "nextSteps": [
            "Address high-priority issues first",
            "Review FDA regulations for detailed requirements"
          ]
        },
        "violations": [
          {
            "id": "uuid",
            "versionId": "uuid",
            "type": "Disclaimer Placement",
            "message": "The disclaimer is not placed immediately adjacent...",
            "suggestion": "Relocate the disclaimer to be adjacent...",
            "citation": "21 CFR 101.93(d)",
            "severity": "medium",
            "category": "Layout",
            "location": "Page 1, Bottom"
          }
        ]
      }
    ]
    ```

### 4. Get Single Label (Latest Analysis)
- **GET** `/labels/:id`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:**
    ```json
    {
      "label": {
        "id": "uuid",
        "name": "Label Name",
        "fileUrl": "https://s3-url.com/file.pdf",
        "workspaceId": "workspace-uuid"
      },
      "version": {
        "id": "uuid",
        "labelId": "uuid",
        "status": "SCANNED",
        "extraction": {},
        "analyzedAt": "2025-07-05T01:02:08.592989Z"
      },
      "analysis": {
        "overallScore": 90,
        "compliantItems": [
          "Supplement Facts panel properly formatted",
          "Serving size declaration present and clear"
        ],
        "analyzedAt": "2025-07-05T01:02:08.592989Z",
        "nextSteps": [
          "Address high-priority issues first",
          "Review FDA regulations for detailed requirements"
        ]
      },
      "violations": [
        {
          "id": "uuid",
          "versionId": "uuid",
          "type": "Disclaimer Placement",
          "message": "The disclaimer is not placed immediately adjacent...",
          "suggestion": "Relocate the disclaimer to be adjacent...",
          "citation": "21 CFR 101.93(d)",
          "severity": "medium",
          "category": "Layout",
          "location": "Page 1, Bottom"
        }
      ]
    }
    ```

### 5. Get All Analyses (Versions) for a Label
- **GET** `/labels/:id/versions`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:** Array of:
    ```json
    [
      {
        "version": {
          "id": "uuid",
          "labelId": "uuid",
          "status": "SCANNED",
          "extraction": {},
          "analyzedAt": "2025-07-05T01:02:08.592989Z"
        },
        "analysis": {
          "overallScore": 90,
          "compliantItems": [
            "Supplement Facts panel properly formatted",
            "Serving size declaration present and clear"
          ],
          "analyzedAt": "2025-07-05T01:02:08.592989Z",
          "nextSteps": [
            "Address high-priority issues first",
            "Review FDA regulations for detailed requirements"
          ]
        },
        "violations": [
          {
            "id": "uuid",
            "versionId": "uuid",
            "type": "Disclaimer Placement",
            "message": "The disclaimer is not placed immediately adjacent...",
            "suggestion": "Relocate the disclaimer to be adjacent...",
            "citation": "21 CFR 101.93(d)",
            "severity": "medium",
            "category": "Layout",
            "location": "Page 1, Bottom"
          }
        ]
      }
    ]
    ```

### 6. Get Specific Analysis Version
- **GET** `/labels/:id/versions/:versionId`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:**
    ```json
    {
      "version": {
        "id": "uuid",
        "labelId": "uuid",
        "status": "SCANNED",
        "extraction": {},
        "analyzedAt": "2025-07-05T01:02:08.592989Z"
      },
      "analysis": {
        "overallScore": 90,
        "compliantItems": [
          "Supplement Facts panel properly formatted",
          "Serving size declaration present and clear"
        ],
        "analyzedAt": "2025-07-05T01:02:08.592989Z",
        "nextSteps": [
          "Address high-priority issues first",
          "Review FDA regulations for detailed requirements"
        ]
      },
      "violations": [
        {
          "id": "uuid",
          "versionId": "uuid",
          "type": "Disclaimer Placement",
          "message": "The disclaimer is not placed immediately adjacent...",
          "suggestion": "Relocate the disclaimer to be adjacent...",
          "citation": "21 CFR 101.93(d)",
          "severity": "medium",
          "category": "Layout",
          "location": "Page 1, Bottom"
        }
      ]
    }
    ```

### 7. Approve Label Version
- **PUT** `/labels/:labelId/versions/:versionId/approve`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Body:** `{ "reviewComment": "Optional review comment" }` (optional)
  - **Roles:** `admin`, `member`
  - **Returns:**
    ```json
    {
      "version": {
        "id": "uuid",
        "labelId": "uuid",
        "status": "APPROVED",
        "extraction": {},
        "analyzedAt": "2025-07-05T01:02:08.592989Z"
      },
      "analysis": {
        "overallScore": 90,
        "compliantItems": [
          "Supplement Facts panel properly formatted",
          "Serving size declaration present and clear"
        ],
        "analyzedAt": "2025-07-05T01:02:08.592989Z",
        "nextSteps": [
          "Address high-priority issues first",
          "Review FDA regulations for detailed requirements"
        ]
      },
      "violations": [
        {
          "id": "uuid",
          "versionId": "uuid",
          "type": "Disclaimer Placement",
          "message": "The disclaimer is not placed immediately adjacent...",
          "suggestion": "Relocate the disclaimer to be adjacent...",
          "citation": "21 CFR 101.93(d)",
          "severity": "medium",
          "category": "Layout",
          "location": "Page 1, Bottom"
        }
      ],
      "reviewComment": "Optional review comment",
      "approvedBy": "user-uuid",
      "rejectedBy": null,
      "approvedAt": "2025-07-05T01:02:08.592989Z",
      "rejectedAt": null
    }
    ```

### 8. Reject Label Version
- **PUT** `/labels/:labelId/versions/:versionId/reject`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Body:** `{ "reviewComment": "Optional review comment explaining rejection" }` (optional)
  - **Roles:** `admin`, `member`
  - **Returns:**
    ```json
    {
      "version": {
        "id": "uuid",
        "labelId": "uuid",
        "status": "REJECTED",
        "extraction": {},
        "analyzedAt": "2025-07-05T01:02:08.592989Z"
      },
      "analysis": {
        "overallScore": 90,
        "compliantItems": [
          "Supplement Facts panel properly formatted",
          "Serving size declaration present and clear"
        ],
        "analyzedAt": "2025-07-05T01:02:08.592989Z",
        "nextSteps": [
          "Address high-priority issues first",
          "Review FDA regulations for detailed requirements"
        ]
      },
      "violations": [
        {
          "id": "uuid",
          "versionId": "uuid",
          "type": "Disclaimer Placement",
          "message": "The disclaimer is not placed immediately adjacent...",
          "suggestion": "Relocate the disclaimer to be adjacent...",
          "citation": "21 CFR 101.93(d)",
          "severity": "medium",
          "category": "Layout",
          "location": "Page 1, Bottom"
        }
      ],
      "reviewComment": "Optional review comment explaining rejection",
      "approvedBy": null,
      "rejectedBy": "user-uuid",
      "approvedAt": null,
      "rejectedAt": "2025-07-05T01:02:08.592989Z"
    }
    ```

### 9. Update Label
- **PUT** `/labels/:id`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Body:** `{ "name": "Updated Label Name" }`
  - **Roles:** `admin`, `member`
  - **Returns:**
    ```json
    {
      "id": "uuid",
      "name": "Updated Label Name",
      "fileUrl": "https://s3-url.com/file.pdf",
      "workspaceId": "workspace-uuid"
    }
    ```

### 10. Delete Label
- **DELETE** `/labels/:id`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`
  - **Returns:**
    ```json
    {
      "id": "uuid",
      "name": "Label Name",
      "fileUrl": "https://s3-url.com/file.pdf",
      "workspaceId": "workspace-uuid"
    }
    ```

### 11. Download Label File
- **GET** `/labels/:id/download`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:**
    ```json
    {
      "labelId": "uuid",
      "fileName": "sample_supplement_label.pdf",
      "downloadUrl": "https://s3-url.com/file.pdf?X-Amz-Algorithm=...",
      "expiresIn": 3600
    }
    ```

### 12. Preview Label File
- **GET** `/labels/:id/preview`
  - **Headers:** `Authorization: Bearer <jwt_token>`
  - **Roles:** `admin`, `member`, `viewer`
  - **Returns:**
    ```json
    {
      "labelId": "uuid",
      "fileName": "sample_supplement_label.pdf",
      "previewUrl": "https://s3-url.com/file.pdf?X-Amz-Algorithm=...",
      "expiresIn": 900
    }
    ```

---

## Role-Based Access Control

### Admin (`admin`)
- Full access to all endpoints
- Can upload, update, and delete labels
- Can manage all label versions
- Can approve or reject label versions

### Reviewer (`member`)
- Can upload and update labels
- Can view all label versions and analyses
- Can approve or reject label versions
- Cannot delete labels

### Viewer (`viewer`)
- Can view labels and their analyses
- Cannot upload, update, or delete labels
- Cannot approve or reject label versions

---

## Label Status Workflow

### Status Values
- **`SCANNED`**: Automatically set after label upload and analysis
- **`APPROVED`**: Set by reviewer when label version is approved
- **`REJECTED`**: Set by reviewer when label version is rejected

### Workflow Process
1. **Upload**: Label is uploaded and automatically scanned (`SCANNED` status)
2. **Review**: Reviewer examines the analysis and violations
3. **Decision**: Reviewer either approves or rejects the version
4. **User Tracking**: System automatically records who made the decision and when
5. **Feedback**: Optional review comment is stored with the decision
6. **Iteration**: If rejected, user can upload a new version for re-analysis

### User Tracking
- **`approvedBy`**: User ID of the person who approved the version
- **`rejectedBy`**: User ID of the person who rejected the version
- **`approvedAt`**: Timestamp when the version was approved
- **`rejectedAt`**: Timestamp when the version was rejected
- **`reviewComment`**: Optional comment explaining the decision

---

## Data Structures

### Label Object
```json
{
  "id": "uuid",
  "name": "Label Name",
  "fileUrl": "https://s3-url.com/file.pdf",
  "workspaceId": "workspace-uuid"
}
```

### Version Object
```json
{
  "id": "uuid",
  "labelId": "uuid",
  "status": "SCANNED|APPROVED|REJECTED",
  "extraction": {},
  "analyzedAt": "2025-07-05T01:02:08.592989Z",
  "reviewComment": "Optional reviewer comment",
  "approvedBy": "user-uuid",
  "rejectedBy": "user-uuid",
  "approvedAt": "2025-07-05T01:02:08.592989Z",
  "rejectedAt": "2025-07-05T01:02:08.592989Z"
}
```

### Analysis Object
```json
{
  "overallScore": 90,
  "compliantItems": [
    "Supplement Facts panel properly formatted",
    "Serving size declaration present and clear"
  ],
  "analyzedAt": "2025-07-05T01:02:08.592989Z",
  "nextSteps": [
    "Address high-priority issues first",
    "Review FDA regulations for detailed requirements",
    "Re-upload corrected label for verification",
    "Schedule follow-up review with regulatory team"
  ]
}
```

### Violation Object
```json
{
  "id": "uuid",
  "versionId": "uuid",
  "type": "Disclaimer Placement",
  "message": "The disclaimer is not placed immediately adjacent to the structure/function claims...",
  "suggestion": "Relocate the disclaimer to be adjacent to any structure/function claims...",
  "citation": "21 CFR 101.93(d)",
  "severity": "high|medium|low",
  "category": "Layout",
  "location": "Page 1, Bottom"
}
```

### OCR Object
```json
{
  "claims": "No explicit health claims found",
  "ingredients": ["Vitamin D3", "Zinc", "Elderberry Extract"],
  "nutrition": {
    "calories": "Not specified",
    "fat": "Not specified",
    "protein": "Not specified",
    "vitamins": "Not specified"
  },
  "text": "Serving Size: 2 Capsules\nServings Per Container: 30\nSupplement Facts\n..."
}
```

---

## Frontend Integration Patterns

### Upload & Analyze
```js
const formData = new FormData();
formData.append('file', file);
formData.append('name', labelName);
formData.append('workspaceId', workspaceId);
const res = await fetch('/labels/upload', { method: 'POST', body: formData });
const data = await res.json();
// Use data.analysis, data.violations, data.compliantItems, data.nextSteps, etc.
```

### List All Labels (Latest Analysis)
```js
const res = await fetch('/labels?workspaceId=...');
const labels = await res.json();
// Each label object contains latest analysis and violations
```

### List All Analyses for a Label
```js
const res = await fetch(`/labels/${labelId}/versions`);
const versions = await res.json();
// Each version object contains analysis and violations
```

### View a Specific Analysis Version
```js
const res = await fetch(`/labels/${labelId}/versions/${versionId}`);
const version = await res.json();
// Use version.analysis, version.violations, etc.
```

### Approve a Label Version
```js
const res = await fetch(`/labels/${labelId}/versions/${versionId}/approve`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reviewComment: 'Optional comment' })
});
const result = await res.json();
// Version status is now APPROVED with user tracking
```

### Reject a Label Version
```js
const res = await fetch(`/labels/${labelId}/versions/${versionId}/reject`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reviewComment: 'Explains why rejected' })
});
const result = await res.json();
// Version status is now REJECTED with user tracking
```

### UI Suggestion: Analysis Version Selector
For each label, provide a UI element (such as a dropdown, tabs, or timeline) that allows users to view and select different analysis versions. When a version is selected, fetch and display its analysis and violations using `/labels/:id/versions` and `/labels/:id/versions/:versionId`.

### UI Suggestion: Approval Workflow
- Show approval/rejection buttons for versions with `SCANNED` status
- Display review comment input field when approving/rejecting
- Show status badges (SCANNED, APPROVED, REJECTED) for each version
- Display user info and timestamps for approved/rejected versions
- Filter versions by status for easier review
- Show audit trail with who made decisions and when

---

## Best Practices
- Always use the **latest version** for dashboard/summary views.
- Use `/labels/:id/versions` to let users view analysis history.
- Use the `analysis` object for compliance score, compliant items, and next steps.
- Use the `violations` array for compliance issues, grouped by severity/category as needed.
- Use the `analyzedAt` timestamp for "last analyzed" display.
- All endpoints are protected with JWT AuthGuard.
- Implement approval workflow to ensure quality control.
- Store review comments to maintain audit trail.
- Track user decisions for compliance accountability.
- Use approval/rejection timestamps for workflow analytics.

---

## Extending
- Add more fields to `LabelVersion` for additional metadata
- Implement bulk approval/rejection for multiple versions
- Add email notifications for approval/rejection events
- Create approval workflow with multiple reviewers
- Add approval deadline tracking
- Implement approval chain with escalation rules