# Authentication system

## Overview

transi-store uses OAuth2/OIDC for user authentication with multi-provider support. The implementation uses the **Arctic** library and the **PKCE** (Proof Key for Code Exchange) flow to secure exchanges.

## Supported providers

### Google OAuth2

- Standard provider via Arctic
- User info fetched from the Google API
- Scopes: `openid`, `email`, `profile`

### Mapado OAuth2

- Custom provider via Arctic's `OAuth2Client`
- Uses JWT for access tokens
- JWT decoded to extract the user ID

## Full authentication flow

### 1. Initiation (`/auth/{provider}/login`)

1. Generate `code_verifier` + `state` (PKCE)
2. Store in encrypted `oauth_state` cookie (TTL: 10 min)
3. Redirect to provider with PKCE challenge

**File**: `apps/website/app/routes/auth.{provider}.login.tsx`

### 2. Callback (`/auth/{provider}/callback`)

1. Verify `state` matches the cookie
2. Exchange code + code_verifier for an access token
3. Fetch user info:
   - **Google**: API call to `openidconnect.googleapis.com/v1/userinfo`
   - **Mapado**: Decode the JWT access token
4. Upsert user by unique `(oauthProvider, oauthSubject)`
5. Create session (signed cookie)
6. Redirect to `/auth/complete-profile` if no name, otherwise `/`

**Files**:

- `apps/website/app/routes/auth.{provider}.callback.tsx`
- `apps/website/app/lib/auth-providers.server.ts`
- `apps/website/app/lib/auth.server.ts`

### 3. User upsert

**Logic**:

- Look up by `(oauthProvider, oauthSubject)` (unique constraint)
- If exists: update email only (preserve name)
- If new: create user (name can be null)

**File**: `apps/website/app/lib/auth.server.ts` → `upsertUser()`

### 4. Profile completion

If the user has no `name` after upsert:

- Redirect to `/auth/complete-profile`
- Form to enter name
- Update in DB + create session

**File**: `apps/website/app/routes/auth.complete-profile.tsx`

### 5. Session management

**Session cookie**:

- Content: `{ userId, email, name, lastOrganizationId, lastOrganizationSlug }`
- Signed with `SESSION_SECRET`
- `httpOnly`, `sameSite: 'lax'`, `secure` in production
- TTL: 30 days

**Functions**:

- `getUserFromSession(request)`: Retrieves the user from the cookie (returns `null` if not logged in)

**Middleware (see ADR-015)**:

- `sessionAuthMiddleware`: Middleware for app routes, redirects to `/auth/login` if not logged in. Places the user in `userContext`.
- `optionalSessionAuthMiddleware`: Middleware for routes accessible to both authenticated and anonymous users. Places the user (or `null`) in `maybeUserContext`. Used to power the project viewer layout.
- `apiAuthMiddleware`: Middleware for API routes, accepts Bearer API key or session cookie. Places the result in `apiAuthContext`.

**Files**: `apps/website/app/lib/session.server.ts`, `apps/website/app/middleware/auth.server.ts`, `apps/website/app/middleware/api-auth.server.ts`

## Security

### PKCE (Proof Key for Code Exchange)

- **code_verifier**: Random string (43–128 chars)
- **code_challenge**: `BASE64URL(SHA256(code_verifier))`
- Prevents authorization code interception attacks

### Secure cookies

```typescript
{
  httpOnly: true,        // Inaccessible from JS
  secure: true,          // HTTPS only (production)
  sameSite: 'lax',       // CSRF protection
  signed: true           // Signature with SESSION_SECRET
}
```

### State parameter

- Random value stored in the `oauth_state` cookie
- Verified at callback to prevent CSRF attacks
- Short TTL (10 minutes)

### Unique constraint

```sql
CREATE UNIQUE INDEX unique_oauth
ON users (oauth_provider, oauth_subject);
```

Prevents duplicate users for the same OAuth account.

## Organization membership check

All routes under `/orgs/:orgSlug` verify membership via `requireOrganizationMembership()`:

**Logic**:

1. Fetch organization by slug
2. Verify the user is a member (table `organization_members`)
3. Throw 404 if org doesn't exist, 403 if not a member
4. Return the organization if OK

**File**: `apps/website/app/lib/organizations.server.ts`

For project-scoped pages (members-only vs. public-readable), authentication
hooks into a separate access-role layer that computes the role once per
request in middleware. See [routes-access.md](./routes-access.md).

## Logout

Route `/auth/logout`: Destroys the session (cookie `maxAge: 0`) and redirects to `/`

**File**: `apps/website/app/routes/auth.logout.tsx`

## Required environment variables

```bash
# OIDC provider (Google or other)
OIDC_ISSUER="https://accounts.google.com"
OIDC_CLIENT_ID="your-client-id"
OIDC_CLIENT_SECRET="your-client-secret"

# Secret for signing session cookies
SESSION_SECRET="random-secret-min-32-chars"
```

## References

- [Arctic Documentation](https://arctic.js.org/)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
