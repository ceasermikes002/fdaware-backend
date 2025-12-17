# Workspace Module – FDAware Backend

## Overview
The Workspace module manages workspaces, team membership, roles, invitations, and permissions for the FDAware platform. It provides robust APIs for collaborative compliance work, access control, and team management.

---

## Features
- **Workspace CRUD** (basic create/list)
- **Team Management**
  - List all members (active + invited)
  - Invite new members (with email)
  - Resend/cancel invitations
  - Accept invitations (with token)
  - **Validate invitations (public, no auth required)**
  - Remove members (admin only, last-admin protection)
  - Change member roles (admin only, last-admin protection, cannot self-demote)
  - Leave workspace (self, last-admin protection)
- **Role-based access** for all workspace and label actions

---

## API Endpoints

### 1. Create Workspace (Onboarding)
- **POST** `/workspaces`
- **Headers:**
  - `Authorization: Bearer <token>` (user must be authenticated)
- **Body:**
  ```json
  { "name": "Med Care Labs" }
  ```
- **Behavior:**
  - The authenticated user is automatically assigned as **ADMIN** of the new workspace.
- **Returns:**
  ```json
  { "id": "uuid", "name": "Med Care Labs" }
  ```

### 2. List Workspaces
- **GET** `/workspaces`
- **Returns:**
  ```json
  [ { "id": "uuid", "name": "Med Care Labs" }, ... ]
  ```

### 3. List Team Members
- **GET** `/workspaces/:workspaceId/members`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Returns:**
  ```json
  [
    {
      "user": { "id": "uuid", "email": "user@email.com", "name": "Jane Doe" },
      "role": "admin" | "reviewer" | "viewer",
      "status": "active",
      "invitedAt": null
    },
    {
      "user": { "id": null, "email": "invitee@email.com", "name": "invitee@email.com" },
      "role": "reviewer",
      "status": "invited",
      "invitedAt": "2025-07-05T01:02:08.592Z",
      "inviteId": "1234-5678-9012-3456"
    },
    ...
  ]
  ```

### 4. Invite Member
- **POST** `/workspaces/:workspaceId/invite`
- **Headers:**
  - `Authorization: Bearer <token>` (admin only)
- **Body:**
  ```json
  { "email": "invitee@email.com", "role": "reviewer" }
  ```
- **Returns:**
  ```json
  {
    "inviteId": "uuid",
    "email": "invitee@email.com",
    "role": "reviewer",
    "status": "invited",
    "invitedAt": "2025-07-05T01:02:08.592Z"
  }
  ```

### 5. Resend Invitation
- **POST** `/workspaces/:workspaceId/invites/:inviteId/resend`
- **Headers:**
  - `Authorization: Bearer <token>` (admin only)
- **Returns:**
  ```json
  {
    "inviteId": "uuid",
    "email": "invitee@email.com",
    "role": "member",
    "status": "invited",
    "invitedAt": "2025-07-05T01:02:08.592Z",
    "resent": true
  }
  ```

### 6. Cancel Invitation
- **DELETE** `/workspaces/:workspaceId/invites/:inviteId`
- **Headers:**
  - `Authorization: Bearer <token>` (admin only)
- **Returns:**
  ```json
  {
    "inviteId": "uuid",
    "email": "invitee@email.com",
    "role": "member",
    "status": "cancelled",
    "invitedAt": "2025-07-05T01:02:08.592Z",
    "cancelled": true
  }
  ```

### 7. **Validate Invitation** (NEW, PUBLIC)
- **GET** `/workspaces/:workspaceId/invites/:inviteId/validate?token=...`
- **No authentication required!**
- **Returns:**
  ```json
  {
    "valid": true,
    "invite": {
      "id": "uuid",
      "email": "invitee@email.com",
      "role": "reviewer",
      "invitedAt": "2025-07-05T01:02:08.592Z",
      "expiresAt": "2025-07-07T01:02:08.592Z"
    },
    "workspace": {
      "id": "uuid",
      "name": "Med Care Labs"
    }
  }
  ```
- **Purpose:** Allows the frontend to check invite validity and display info before login/signup.

### 8. Accept Invitation
- **POST** `/workspaces/:workspaceId/invites/:inviteId/accept`
- **Headers:**
  - `Authorization: Bearer <token>` (user must be authenticated)
- **Body:**
  ```json
  { "token": "secure-token-from-email" }
  ```
- **Returns:**
  ```json
  {
    "message": "Invitation accepted",
    "workspaceId": "uuid",
    "userId": "uuid",
    "role": "member"
  }
  ```
- **Note:** The backend will only allow acceptance if the authenticated user's email matches the invite email.

### 9. Remove Member
- **DELETE** `/workspaces/:workspaceId/members/:userId`
- **Headers:**
  - `Authorization: Bearer <token>` (admin only)
- **Returns:**
  ```json
  { "message": "Member removed", "userId": "uuid" }
  ```

### 10. Change Member Role
- **PUT** `/workspaces/:workspaceId/members/:userId/role`
- **Headers:**
  - `Authorization: Bearer <token>` (admin only)
- **Body:**
  ```json
  { "role": "admin" | "reviewer" | "viewer" }
  ```
- **Returns:**
  ```json
  { "message": "Role updated", "userId": "uuid", "role": "reviewer" }
  ```

### 11. Leave Workspace
- **POST** `/workspaces/:workspaceId/leave`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Returns:**
  ```json
  { "message": "You have left the workspace", "userId": "uuid" }
  ```

---

## Business Logic & Protections
- **Workspace creation (onboarding):** The creator is always assigned as ADMIN.
- **Only admins** can invite, remove, or change roles.
- **Cannot remove/demote/leave as last admin** (system enforces at all relevant endpoints).
- **Invitations** expire after 2 days, are token-protected, and can be resent/cancelled.
- **Role mapping:**
  - `admin` → full access
  - `reviewer` → can view, upload, and update
  - `viewer` → can only view
- **All endpoints require authentication and workspace membership,**
  - **EXCEPT:** `GET /workspaces/:workspaceId/invites/:inviteId/validate` (public)

---

## Onboarding & Invite Acceptance Flow (**Updated**)

> **New: Invite validation endpoint and improved flow!**

1. **User receives invite email** with a link to the frontend:
   ```
   http://localhost:3000/accept-invite?workspaceId=...&inviteId=...&token=...
   ```
2. **Frontend calls** `GET /api/workspaces/:workspaceId/invites/:inviteId/validate?token=...` to check invite validity and display workspace/invite info. (**No login required!**)
3. **If invite is valid:**
   - If user is not logged in, prompt to sign up or log in.
   - After authentication, frontend calls:
     ```
     POST /api/workspaces/:workspaceId/invites/:inviteId/accept
     { "token": "..." }
     ```
   - Backend checks that the authenticated user's email matches the invite email, then adds them to the workspace.
4. **If invite is invalid or expired:**
   - Show error message and do not allow acceptance.

---

## Data Structures

### Team Member Object (as returned by /workspaces/:workspaceId/members)
```json
{
  "user": { "id": "uuid" | null, "email": "user@email.com", "name": "Jane Doe" },
  "role": "admin" | "reviewer" | "viewer",
  "status": "active" | "invited",
  "invitedAt": "2025-07-05T01:02:08.592Z" | null,
  "inviteId": "uuid" // Only present for pending invites
}
```

### Invitation Object (as returned by invite-related endpoints)
```json
{
  "inviteId": "uuid",
  "email": "invitee@email.com",
  "role": "reviewer",
  "status": "invited",
  "invitedAt": "2025-07-05T01:02:08.592Z"
}
```

---

## Role-based Access in Labels
- **Admins:** Full CRUD on labels in their workspace.
- **Reviewers:** Can upload, view, and update labels, but cannot delete.
- **Viewers:** Can only view labels and download/preview files.
- Enforced via `WorkspaceRoleGuard` and `@Roles` decorator in the labels module.

---

## Email Invitations
- Sent via Gmail SMTP using Nodemailer and Handlebars (FDAware blue theme)
- **Accept link now points to the frontend:**
  ```
  http://localhost:3000/accept-invite?workspaceId=...&inviteId=...&token=...
  ```
- The frontend parses these params and makes a POST request to the backend to accept the invite.
- Subject: `You're invited to join [Workspace Name] (invited by [Inviter Name]) on FDAware!`
- Accept link includes secure token and workspace context
- Template is customizable in `/templates/invite.hbs`

---

## Error Handling
- All endpoints return clear errors for unauthorized actions, invalid tokens, expired/cancelled invites, and last-admin protections.
- Errors are thrown as HTTP exceptions with meaningful messages.

---

## Extending
- Add audit logs for team changes
- Support SSO or domain-based invites
- Allow custom roles/permissions in the future

---

## File Structure
- `workspace.controller.ts` – All endpoints
- `workspace.service.ts` – Business logic
- `dto/` – Data transfer objects
- `entities/` – (if present) Entity definitions
- `workspace.readme.md` – This documentation

---

**This module is robust, secure, and ready for production. For questions or to extend functionality, see the code comments or contact the FDAware backend team.** 
# Workspaces
## Invites & Email Delivery
- SMTP env variables required:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- For Gmail:
  - Enable 2FA and create an App Password.
  - Use the 16-character app password without spaces and without quotes: `SMTP_PASS=xxxxxxxxxxxxxxxx`
  - `SMTP_PORT=587` (STARTTLS) or `465` (SSL, set `secure=true`).
  - `SMTP_FROM` should match the authenticated account or a verified alias.
- Strict behavior:
  - If email delivery fails, the API responds with an error and rolls back any membership or invitation created.
  - Resend invite also fails when email delivery fails and does not update `invitedAt`.

## Endpoints Summary
- Adding existing user to workspace:
  - If email fails, the operation fails and membership is rolled back.
- Inviting new user (not yet signed up):
  - If email fails, the operation fails and the invitation is not persisted.
  - On email success, the invitation persists; after signup, the user can accept with `inviteId` + `token`.
- Resend invite:
  - Succeeds only if email delivery succeeds; updates `invitedAt` and returns `resent: true`.

## Post‑Signup Acceptance Flow
- User signs up using the email that was invited.
- Frontend calls `GET /workspaces/:workspaceId/invites/:inviteId/validate?token=...` to validate.
- Authenticated user calls `POST /workspaces/:workspaceId/invites/:inviteId/accept` with the `token` to join.
- Server ensures invite email matches user email; creates `WorkspaceUser`.
