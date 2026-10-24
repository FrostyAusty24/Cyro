# Cyro fallback certificate helper

Optional standalone Node 22+ process for the browser-trusted certificate on `backup.cyrobot.ca`. It is separate from the bot and must not delay bot startup. It issues only through Let's Encrypt production and Cloudflare DNS-01. No provider operation runs until `--once` or `--watch` is invoked with a valid approved configuration.

## Install and configure

From this directory on Prism:

```sh
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
```

If npm is unavailable, the prepared runtime dependency archive may provide the same pinned pure-JavaScript modules. `acme-client` is pinned to 5.4.0; package-lock.json pins its transitive dependencies. None of its runtime packages have install scripts or native binaries. Never ship the development `.bootstrap` or `.test-temp` directories.

Put a filled copy of `renewal.example.json` at `/home/container/private/fallback/renewal.json`. All three configured paths resolve relative to that JSON and must remain under its directory. Use the exact approved subscriber agreement URL and set `termsAgreed` only after approval. Use a token restricted to DNS Edit for the cyrobot.ca zone; a global Cloudflare key is not needed. The configured zone ID avoids requiring Zone Read permission. An IP-restricted token must be used from its approved Prism IP.

Set the private directory and state directory to mode 0700 and the JSON/key files to 0600. The helper refuses group/world-readable private files on Linux. Files it creates use these restrictive modes. Keep this entire private directory out of source archives, Git, public HTTP directories, diagnostic bundles, and release backups.

```sh
node certificate-tools/cli.mjs --config private/fallback/renewal.json --check-config
node certificate-tools/cli.mjs --config private/fallback/renewal.json --dry-run
node certificate-tools/cli.mjs --config private/fallback/renewal.json --once
node certificate-tools/cli.mjs --config private/fallback/renewal.json --watch
```

Run those commands from the application root. `--check-config` and `--dry-run` do not contact either provider, create accounts, write files, or change DNS. A dry run reports local expiry and whether renewal is due; it does not prove provider credentials work. `--once` exits 0 for success/not-due, 2 for an occupied lock, and 1 for failure. `--watch` checks immediately, then every 12 hours; failed checks retry hourly and reread the configuration. SIGINT/SIGTERM aborts the active request and allows exact-record cleanup before exit.

## Renewal and integration

Renewal starts at two-thirds of the certificate's actual lifetime, supporting current 90-day certificates and shorter future lifetimes. The account key and certificate private key are stored privately and reused. Only the validated certificate is atomically replaced, so there is no certificate/key mismatch window. Validation requires a matching SAN, matching private key, current validity for new certificates, and a non-self-signed leaf.

The Cyro HTTPS listener must reload the replaced certificate, or restart after successful renewal. The helper does not control the bot, listener, Cloudflare tunnel, DNS A record, or OAuth callback registration. A separate supervisor can start `--watch` and reload when `fullchain.pem` changes. Renewal failure leaves the prior certificate untouched.

`<stateDir>/status.json` contains only the hostname, state, check timestamp, most recent successful check in this process, certificate expiry, and a fixed error code. stdout is also restricted to fixed event names and these nonsecret fields. Provider response/error objects and credentials are never logged. Supervisors may suppress stdout/stderr and inspect this status file.

Mutual exclusion uses an exclusive localhost-only socket on a deterministic port in 41000–50999 derived from the hostname. No external interface is bound. The OS releases it if the helper crashes; another occupant yields `LOCK_BUSY`. Permit outbound HTTPS to Let's Encrypt and Cloudflare and DNS queries to public resolvers 1.1.1.1 and 8.8.8.8. TXT propagation requires two successive successful checks at both resolvers, with a three-minute bound. The overall run aborts after twelve minutes. Normal network requests time out after fifteen seconds; cleanup requests have independent five-second timeouts so stopping the main request does not prevent cleanup. One challenge normally needs at most ten seconds for GET+DELETE, up to twenty seconds with the final retry. Allow at least thirty seconds before forcibly killing the helper.

## Recovery

Before a POST, the helper journals the exact challenge name/value. After success it records the returned ID, and deletes only that ID after checking its type, name, and content still match. Existing TXT records are never enumerated or removed. An interrupted operation with a known ID is cleaned on the next run. Failed cleanup remains journaled for retry.

`DNS_CREATE_UNCERTAIN` means the provider may have created a record but no ID was received. Further creation stops: inspect Cloudflare manually and resolve that single journal entry. Do not clear the whole journal or delete unrelated records. A definite rejected POST (for example invalid credentials) clears its uncreated intent, allowing a corrected token to retry. A changed record yields `DNS_RECORD_CHANGED` and requires review. If the CA advertises a different terms URL, issuance stops with `TERMS_APPROVAL_REQUIRED` until that new agreement is approved and the configuration is updated.

## Local validation

With development dependencies installed:

```sh
npm test
npm run check
```

Tests use fake ACME and Cloudflare calls and temporary local files. No production issuance or live DNS changes are part of the test suite. In the Windows Codex sandbox, point TEMP and TMP at `.test-temp` inside this folder before testing to avoid the sandbox temporary-directory rename restriction.

Official references: [ACME client](https://github.com/publishlab/node-acme-client), [DNS-01](https://letsencrypt.org/docs/challenge-types/), [certificate lifetimes](https://letsencrypt.org/2026/10/07/64-day-certs), [scoped Cloudflare tokens](https://certbot-dns-cloudflare.readthedocs.io/en/stable/).
