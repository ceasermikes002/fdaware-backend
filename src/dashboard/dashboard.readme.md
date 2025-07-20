# Dashboard Module API Documentation

This module provides endpoints for aggregating and displaying FDAware dashboard data for a workspace. All endpoints require authentication and a valid workspaceId.

---

## Endpoints

### 1. Get Dashboard Summary
- **GET** `/dashboard/summary?workspaceId=workspace-uuid`
- **Description:** Returns summary statistics for the selected workspace.
- **Response Example:**
```json
{
  "totalLabels": 24,
  "complianceIssues": 7,
  "approvedLabels": 17,
  "pendingReview": 3
}
```
- **Fields:**
  - `totalLabels`: Number of labels in the workspace
  - `complianceIssues`: Total compliance issues (violations) in the latest version of each label
  - `approvedLabels`: Number of labels with latest version status `APPROVED`
  - `pendingReview`: Number of labels with latest version status `PENDING` or `SCANNED`

---

### 2. Get Compliance Trends
- **GET** `/dashboard/trends?workspaceId=workspace-uuid`
- **Description:** Returns compliance trends for the workspace, comparing this month to last month.
- **Response Example:**
```json
{
  "thisMonth": {
    "passRate": 75,
    "improvement": 15
  },
  "lastMonth": {
    "passRate": 60
  }
}
```
- **Fields:**
  - `thisMonth.passRate`: % of labels analyzed this month with zero compliance issues
  - `thisMonth.improvement`: Change in pass rate compared to last month
  - `lastMonth.passRate`: % of labels analyzed last month with zero compliance issues

---

### 3. Get Recent Activity
- **GET** `/dashboard/activity?workspaceId=workspace-uuid`
- **Description:** Returns up to 10 recent activities (label analysis, approvals, compliance issues) for the workspace.
- **Response Example:**
```json
[
  {
    "labelName": "Protein Powder - Vanilla",
    "type": "compliance_issue",
    "status": "danger",
    "analyzedAt": "2025-07-06T10:00:00.000Z",
    "message": "Compliance Issues Found"
  },
  {
    "labelName": "Multivitamin Gummies",
    "type": "analysis",
    "status": "info",
    "analyzedAt": "2025-07-06T08:00:00.000Z",
    "message": "Analysis Complete"
  },
  {
    "labelName": "Omega-3 Capsules",
    "type": "approved",
    "status": "success",
    "analyzedAt": "2025-07-05T12:00:00.000Z",
    "message": "Approved"
  }
]
```
- **Fields:**
  - `labelName`: Name of the label
  - `type`: One of `analysis`, `approved`, `compliance_issue`
  - `status`: UI status indicator (`info`, `success`, `danger`)
  - `analyzedAt`: Timestamp of the latest analysis
  - `message`: Human-readable activity message

---

## Notes
- All endpoints require authentication (JWT).
- All endpoints require a valid `workspaceId` as a query parameter.
- Data is always based on the latest version of each label in the workspace.
- Extend or customize as needed for additional dashboard metrics. 