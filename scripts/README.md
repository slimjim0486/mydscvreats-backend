# Backend ops scripts

## `smoke-test-meta-callbacks.ts`

Forges a Meta `signed_request` payload and POSTs it to the data-deletion +
deauthorize callback endpoints to verify HMAC verification, response shape,
and forged-signature rejection.

**Run before submitting the Meta Tech Provider application.** Meta's
automated reviewer hits these URLs and a failure is an instant rejection.

### Usage

```bash
META_APP_SECRET=<your meta app secret> \
API_BASE=https://api.staging.getbustan.com \
TEST_META_USER_ID=10000000000000001 \
npm run smoke:meta-callbacks
```

`API_BASE` defaults to `http://localhost:3001` when omitted.
`TEST_META_USER_ID` defaults to a synthetic 17-digit ID; use a real one if
you want to verify the erase fan-out hit the expected integration rows.

### Pass criteria

The script exits 0 when ALL of the following pass:

1. data-deletion: valid signed_request → 200 with JSON `{ url, confirmation_code }`
2. data-deletion: `url` points at `/data-deletion?code=…` (NOT `/legal/...`)
3. data-deletion: `confirmation_code` is a 12–32 hex string
4. data-deletion: forged signature → 4xx (proves HMAC verification works)
5. deauthorize: valid signed_request → 200
6. deauthorize: forged signature → 4xx
7. data-deletion: empty body → 4xx

### Negative tests in CI

Consider wiring this into a CI job that runs against staging before each
production deploy of the `meta-data-deletion` route. A regression on the
URL path (the bug we caught in the first review) silently fails Meta App
Review weeks later — fast feedback here is cheap.
