# Notifications API - Postman Guide

## Base URL

`http://localhost:8080/api`

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
`Authorization: Bearer <jwt_token>`

## Endpoints

### 1. Create Notification
**POST** `/api/notifications`

**Required Roles:** admin, reviewer

**Request Body:**
```json
{
  "userId": "string",
  "workspaceId": "string" (optional),
  "type": "LABEL_ANALYZED | LABEL_APPROVED | LABEL_REJECTED | COMPLIANCE_ISSUE | WORKSPACE_INVITE | INVITE_ACCEPTED | REPORT_GENERATED | REPORT_FAILED | SYSTEM_UPDATE | WORKSPACE_ACTIVITY",
  "title": "string",
  "message": "string",
  "data": {} (optional),
  "expiresAt": "2024-12-31T23:59:59.000Z" (optional)
}
```

**Example Request:**
```json
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "type": "LABEL_ANALYZED",
  "title": "Label Analysis Complete",
  "message": "Your label has been successfully analyzed",
  "data": {
    "labelId": "label789",
    "labelName": "Product Label"
  }
}
```

**Response:**
```json
{
  "id": "notification123",
  "userId": "user123",
  "workspaceId": "workspace456",
  "type": "LABEL_ANALYZED",
  "title": "Label Analysis Complete",
  "message": "Your label has been successfully analyzed",
  "data": {
    "labelId": "label789",
    "labelName": "Product Label"
  },
  "read": false,
  "readAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "expiresAt": null
}
```

### 2. Create Bulk Notifications
**POST** `/api/notifications/bulk`

**Required Roles:** admin

**Request Body:**
```json
{
  "userIds": ["string"],
  "workspaceId": "string" (optional),
  "type": "NotificationType",
  "title": "string",
  "message": "string",
  "data": {} (optional),
  "expiresAt": "2024-12-31T23:59:59.000Z" (optional)
}
```

**Example Request:**
```json
{
  "userIds": ["user123", "user456", "user789"],
  "workspaceId": "workspace456",
  "type": "SYSTEM_UPDATE",
  "title": "System Maintenance",
  "message": "Scheduled maintenance will occur tonight",
  "data": {
    "maintenanceTime": "2024-01-16T02:00:00.000Z"
  }
}
```

### 3. Get User Notifications
**GET** `/api/notifications`

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace
- `type` (optional): Filter by notification type
- `read` (optional): Filter by read status (true/false)
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (createdAt/readAt, default: createdAt)
- `sortOrder` (optional): Sort order (asc/desc, default: desc)

**Example Request:**


**Response:**
```json
{
  "notifications": [
    {
      "id": "notification123",
      "userId": "user123",
      "workspaceId": "workspace456",
      "type": "LABEL_ANALYZED",
      "title": "Label Analysis Complete",
      "message": "Your label has been successfully analyzed",
      "data": {},
      "read": false,
      "readAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": null
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

### 4. Get Notification Summary
**GET** `/api/notifications/summary`

**Query Parameters:**
- `workspaceId` (optional): Workspace ID

**Example Request:**


**Response:**
```json
{
  "total": 50,
  "unread": 12,
  "byType": {
    "LABEL_ANALYZED": 15,
    "COMPLIANCE_ISSUE": 8,
    "REPORT_GENERATED": 5,
    "WORKSPACE_INVITE": 2,
    "SYSTEM_UPDATE": 20
  },
  "recent": [
    {
      "id": "notification123",
      "type": "LABEL_ANALYZED",
      "title": "Label Analysis Complete",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 5. Mark Notification as Read/Unread
**PUT** `/api/notifications/:id/mark`

**Path Parameters:**
- `id`: Notification ID

**Request Body:**
```json
{
  "read": true
}
```

**Example Request:**

### 7. Bulk Mark Notifications
**PUT** `/api/notifications/bulk-mark`

### 6. Mark All Notifications
**PUT** `/api/notifications/mark-all`

**Query Parameters:**
- `workspaceId` (optional): Limit to a workspace

**Request Body:**
```json
{
  "read": true
}
```

**Response:**
```json
{
  "count": 12
}
```

**Request Body:**
```json
{
  "notificationIds": ["notification123", "notification456"],
  "read": true
}
```

### 8. Delete Notification
**DELETE** `/api/notifications/:id`

**Path Parameters:**
- `id`: Notification ID

**Example Request:**


**Response:** 204 No Content

### 9. Cleanup Expired Notifications
**POST** `/api/notifications/cleanup`

**Required Roles:** admin

**Response:**
```json
{
  "count": 15
}
```

## Helper Endpoints for Specific Notification Types

### 10. Create Label Analyzed Notification
**POST** `/api/notifications/label-analyzed`

**Required Roles:** admin, reviewer

**Request Body:**
```json
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "labelName": "Product Label",
  "labelId": "label789"
}
```

### 11. Create Compliance Issue Notification
**POST** `/api/notifications/compliance-issue`

**Required Roles:** admin, reviewer

**Request Body:**
```json
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "labelName": "Product Label",
  "issueCount": 3,
  "labelId": "label789"
}
```

### 12. Create Workspace Invite Notification
**POST** `/api/notifications/workspace-invite`

**Required Roles:** admin

**Request Body:**
```json
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "workspaceName": "My Workspace",
  "inviterName": "John Doe"
}
```

### 13. Create Report Generated Notification
**POST** `/api/notifications/report-generated`

**Required Roles:** admin, reviewer

**Request Body:**
```json
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "reportName": "Compliance Report",
  "reportId": "report789"
}
```

## Notification Types

- `LABEL_ANALYZED`: When a label analysis is completed
- `LABEL_APPROVED`: When a label is approved
- `LABEL_REJECTED`: When a label is rejected
- `COMPLIANCE_ISSUE`: When compliance issues are detected
- `WORKSPACE_INVITE`: When a user is invited to a workspace
- `INVITE_ACCEPTED`: When a workspace invitation is accepted
- `REPORT_GENERATED`: When a report is successfully generated
- `REPORT_FAILED`: When report generation fails
- `SYSTEM_UPDATE`: For system-wide announcements
- `WORKSPACE_ACTIVITY`: For general workspace activities

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Notification not found",
  "error": "Not Found"
}
```

## WebSocket Events

The notifications system also supports real-time updates via WebSocket. Connection includes JWT verification.


**Event Format:**
```json
{
  "type": "notification",
  "action": "created | updated | deleted",
  "data": {
    "id": "notification123",
    "type": "LABEL_ANALYZED",
    "title": "Label Analysis Complete",
    "message": "Your label has been successfully analyzed"
  },
  "userId": "user123",
  "workspaceId": "workspace456"
}
```

## Postman Collection Setup

1. Create a new collection named "Notifications API"
2. Set collection variables:
   - `baseUrl`: `http://localhost:8080/api`
   - `token`: `<your_jwt_token>`
3. Add the Authorization header to the collection:
   - Key: `Authorization`
   - Value: `Bearer {{token}}`
4. Import each endpoint with the request bodies and parameters as documented above

## Testing Tips

1. Always authenticate first to get a valid JWT token
2. Use valid UUIDs for userId, workspaceId, and other ID fields
3. Test pagination with different limit and offset values
4. Test filtering with different query parameters
5. Verify WebSocket connections for real-time notifications
6. Test role-based access control with different user roles

## Notification Settings (Basic)

- Delivery channel: WebSocket only. Email/push are not implemented.
- Enabled types: All `NotificationType` values are enabled by default.
- Workspace scope: Filter in queries using `workspaceId`; no per-workspace preferences.
- Auto mark-as-read: Disabled by default; explicit mark via `PUT /api/notifications/:id/mark`, `mark-all`, or `bulk-mark`.
- Pagination defaults: `limit=20`, `offset=0`, `sortBy=createdAt`, `sortOrder=desc`.
- Expiration: Optional per-notification `expiresAt`. Cleanup via `POST /api/notifications/cleanup`.
- Realtime counters: Unread count sent on WebSocket connect; updated implicitly after mark operations.

These defaults act as the current "settings". There is no persisted user preference model yet; behavior relies on the above conventions.

## Caching

- Cache: Redis-backed, enabled when `REDIS_ENABLED=true`.
- Cached endpoints: `GET /api/notifications` (lists) and `GET /api/notifications/summary`.
- TTL: 30 seconds per cache entry.
- Invalidation: automatic on create, mark, bulk-mark, mark-all, delete, cleanup.
- Key format: `notifications:user:{userId}:{workspaceId|-}:{type|-}:{read|-}:{limit}:{offset}:{sortBy}:{sortOrder}:list` and `notifications:user:{userId}:{workspaceId|-}:summary`.
- Environment variables:
  - `REDIS_ENABLED=true`
  - `REDIS_USERNAME=default`
  - `REDIS_PASSWORD=<set-by-you>`
  - `REDIS_HOST=redis-16818.c274.us-east-1-3.ec2.cloud.redislabs.com`
  - `REDIS_PORT=16818`

Example client initialization (used internally):
```
import { createClient } from 'redis';
const client = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  socket: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
});
await client.connect();
```
