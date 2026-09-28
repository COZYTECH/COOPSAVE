# Pamoja RBAC Model

## Purpose

Pamoja separates platform authority from group authority. A user can administer a savings group without becoming a platform administrator, and a platform administrator does not inherit a user's group workspace by accident.

## Current model

The existing `users.role` column remains the compatibility source for platform roles:

| Database role | API `platformRole` | Meaning |
| --- | --- | --- |
| `admin` | `PLATFORM_ADMIN` | Platform-level operations such as payment-identity inspection |
| `member` | `USER` | Normal authenticated user |

Group roles are stored in `cooperative_memberships`:

| Group role | Meaning |
| --- | --- |
| `GROUP_ADMIN` | Can manage the cooperative and its member records |
| `GROUP_MEMBER` | Belongs to the group but cannot use management endpoints |

Existing cooperative owners are backfilled as `GROUP_ADMIN` by migration `004_create_cooperative_memberships.js`, preserving current behavior without rewriting existing data.

## Request flow

1. `authMiddleware` verifies the JWT and reloads the active user from MySQL.
2. `toSafeUser` exposes the compatibility `role` plus the additive `platformRole`.
3. Auth responses include `access.groups`, assembled from ownership and membership rows.
4. `requirePlatformAdmin` protects `/api/admin/*` operations.
5. Group services perform ownership or `GROUP_ADMIN` checks before changing group data.

## Route boundaries

| Area | Backend boundary | Frontend boundary |
| --- | --- | --- |
| Platform operations | `authenticate` + `requirePlatformAdmin` | `/admin` via `RoleRoute` |
| Platform reconciliation | `GET /api/admin/reconciliation` with `requirePlatformAdmin` | `/admin/reconciliation` via `RoleRoute` |
| Group administration | Service-level owner/`GROUP_ADMIN` checks | `/groups/:groupId/manage` via `GroupAdminRoute` |
| Member experience | No member-only financial API exists yet | `/dashboard` shows group membership and honest unavailable states |
| No group | Authenticated user with no membership | `/dashboard` shows onboarding |

Invitations are now available through group-admin APIs. Cycle, payout, bank-verification, and member contribution endpoints are not available yet. The UI does not fabricate those workflows.

## Test matrix

| Scenario | Expected result |
| --- | --- |
| `member` calls `GET /api/admin/payment-identities` | `403` |
| Group administrator calls `GET /api/admin/reconciliation` | `403` |
| Group member calls `GET /api/admin/reconciliation` | `403` |
| `admin` calls `GET /api/admin/payment-identities` | Flutterwave test-mode identity directory |
| Group owner reads/updates own cooperative | Allowed |
| Group administrator reads/updates managed cooperative | Allowed |
| Group member calls member-management API | Empty scoped result or not found result; no other group's records are returned |
| User accesses another group's member ID directly | Not found result |
| Unauthenticated request to protected route | `401` |
| Authenticated user types `/admin` without platform-admin role | Redirected away by `RoleRoute` |
| Authenticated user types `/members` without group-admin access | Redirected away by `GroupAdminRoute` |

## Deployment

Run the existing migration runner after deploying:

```bash
npm run migrate
```

The migration is additive, creates the membership table, and backfills owner memberships with `INSERT IGNORE`. Do not edit already-applied migration files; create a later migration for future changes.
