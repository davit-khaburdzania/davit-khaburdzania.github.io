# davit.cc auth.md

You are an agent. davit.cc is Davit Khaburdzania's personal site. Everything on it is public and read-only, so **you don't need to authenticate**: call the API at `https://davit.cc/api` with no token.

If your client insists on OAuth, it works too. A token gives exactly the same read access as no token. There are no user accounts, no write actions and nothing to claim.

## Step 1: Discover

- Protected Resource Metadata: `https://davit.cc/.well-known/oauth-protected-resource`
- Authorization Server Metadata: `https://davit.cc/.well-known/oauth-authorization-server` (issuer `https://davit.cc`)

The `agent_auth` block in the Authorization Server Metadata lists the registration endpoint and the supported method.

## Step 2: Pick a method

Only `anonymous` is supported. `identity_assertion` and `service_auth` return `identity_assertion_not_enabled` and `service_auth_not_enabled`.

## Step 3: Register

```http
POST https://davit.cc/agent/identity
Content-Type: application/json

{ "type": "anonymous" }
```

Response:

```json
{
  "registration_id": "reg_...",
  "registration_type": "anonymous",
  "identity_assertion": "<signed JWT>",
  "assertion_expires": "2026-11-01T09:00:00.000Z",
  "pre_claim_scopes": ["read"],
  "post_claim_scopes": ["read"]
}
```

## Step 4: Claim

Skip it. There are no accounts to claim, so `POST /agent/identity/claim` always answers `claim_not_supported`.

## Step 5: Exchange the assertion for an access token

```http
POST https://davit.cc/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>
```

Response:

```json
{ "access_token": "<token>", "token_type": "Bearer", "expires_in": 3600, "scope": "read" }
```

The identity assertion lasts 24 hours. Use it again to get a new access token.

## Step 6: Call the API

```http
GET https://davit.cc/api/profile
Authorization: Bearer <access_token>
```

An invalid or expired token gets `401` with `WWW-Authenticate: Bearer error="invalid_token"`. Drop the header or get a new token. Tokens can also stop working early when the site is redeployed.

## Other clients

Apps that use the authorization code flow can register at `POST /oauth/register` and use `/oauth/authorize` with PKCE (S256). Redirect URIs must be loopback addresses (`http://127.0.0.1:PORT/...` or `http://localhost:PORT/...`). There's no sign-in screen: the request is approved straight away.

## More

- API guide: https://davit.cc/api/docs.md
- OpenAPI: https://davit.cc/api/openapi.json
- Overview for language models: https://davit.cc/llms.txt
- Contact: davit.khaburdzania@gmail.com
