# Direct HTTPS fallback for Cyro

This optional listener lets people open Cyro without the Cloudflare tunnel **while Cyro and its host are still running**. It does not provide a second bot instance, a second host or automatic provider failover. If a provider suspends or stops the container, both dashboard listeners and the Discord bot are unavailable.

Fallback is disabled by default. These instructions describe a deployment to prepare and test; they do not mean a direct Prism address is currently working. The examples use reserved documentation IP `203.0.113.10` and allocation port `1029`; replace the IP with your provider-assigned address. A browser-trusted certificate and provider confirmation of inbound access are still needed. Do not send login credentials over public HTTP or bypass a browser's certificate warning.

## Choose a fallback address

Either option needs its own valid TLS certificate and direct network route:

- **Direct IP:** an address such as `https://203.0.113.10:1029` needs a publicly trusted certificate containing the actual IP address in an IP Subject Alternative Name. A certificate for `cyrobot.ca` does not cover the IP. On a shared hosting IP, the provider usually controls the ports and validation routes needed for issuance. Ask the provider whether it can supply supported HTTPS for the allocated address; do not assume you can obtain an IP certificate independently. The reserved documentation IP shown here cannot be deployed.
- **Backup hostname:** a separate name such as `backup.cyrobot.ca` can use a DNS-only record pointing to the host and a certificate for that hostname. This avoids the Cloudflare HTTP proxy/tunnel, although Cloudflare DNS availability may still matter if it hosts the DNS zone. The provider must allow inbound access to the port. DNS-based certificate validation may be easier than IP validation where ports 80 and 443 are shared; arranging issuance and renewal is still the operator's responsibility.

Use a different hostname from the primary dashboard, even when the port differs. Browser cookies are not isolated by port. Cyro rejects a fallback with the same hostname or a listener port that conflicts with the primary listener.

If your host supplies a supported HTTPS reverse proxy instead, use that provider's documented configuration. This built-in fallback expects to terminate TLS itself and requires the public URL's port to equal its actual listener port. It is not designed for an unknown proxy chain or remapped public/private ports.

## Prepare before enabling

1. Confirm the hosting container is healthy and that the provider permits inbound traffic on the assigned port. A WISP/control-panel outage and a Cloudflare tunnel outage are separate failures; this feature does not fix provider billing or stopped servers.
2. Obtain a browser-trusted certificate and matching private key for the chosen fallback hostname/IP, including the certificate chain. Keep them outside the public source tree, for example in `private/fallback/`, readable only by the Cyro service account. Never commit keys, copy them into release archives or share them in support messages. Keep necessary backups private.
3. Register the **exact** fallback URL plus `/auth/callback` under the existing Cyro application's Discord OAuth2 redirects, preserving the primary redirect. The format for the IP option is `https://203.0.113.10:1029/auth/callback`, with your actual IP substituted. Do this before offering the fallback link to users.
4. Choose different ports for the private primary HTTP listener and public fallback TLS listener. Restrict the primary listener to the trusted local tunnel/proxy. Permit the new TLS port through the host firewall/allocation, and confirm any container network mapping preserves the port.
5. Save a private backup of `.env`, existing data and tunnel configuration. Do not start a second Cyro process with the same bot token or data directory.

## Prism port layout

The Prism launcher previously used the allocated port `1029` for the private HTTP listener behind the tunnel. To reuse `1029` for public TLS, move only the primary HTTP listener to loopback port `3000` and update the existing Cloudflare tunnel route to `http://127.0.0.1:3000`.

Prepare this configuration using your selected address and real private certificate files:

```dotenv
# Existing primary address and credentials stay unchanged.
DASHBOARD_ENABLED=true
DASHBOARD_URL=https://cyrobot.ca
DASHBOARD_HOST=127.0.0.1
DASHBOARD_TRUST_PROXY=true

# Prism launcher overrides child PORT and DASHBOARD_PORT with this value.
CYRO_INTERNAL_DASHBOARD_PORT=3000

# Enable only after TLS, allocation and OAuth redirect are ready.
DASHBOARD_FALLBACK_ENABLED=true
DASHBOARD_FALLBACK_URL=https://203.0.113.10:1029
DASHBOARD_FALLBACK_HOST=0.0.0.0
DASHBOARD_FALLBACK_PORT=1029
DASHBOARD_FALLBACK_CERT_FILE=./private/fallback/fullchain.pem
DASHBOARD_FALLBACK_KEY_FILE=./private/fallback/privkey.pem
```

This is an example, not an active deployment or a promise that the shared IP supports certificate issuance. For a backup hostname, replace the fallback URL with that name and the allocated port and register its matching Discord callback. Ordinary native/Compose hosting uses `PORT` or `DASHBOARD_PORT` for the primary listener instead of the Prism-only `CYRO_INTERNAL_DASHBOARD_PORT` override. The production Compose example does not expose the fallback port automatically; its network configuration must be updated deliberately.

## Start and verify

Run `npm run check-hosting` before restarting one Cyro instance. The preflight checks syntax only; it does not prove certificate trust, domain control, firewall reachability or a saved Discord redirect. Invalid fallback settings fail preflight; during ordinary startup they disable only the fallback and produce a sanitized warning so the bot and primary dashboard can still start. Errors in the required bot or primary dashboard configuration remain startup failures. The fallback also validates its certificate hostname/IP, dates and matching private key. A fallback listener failure is logged without intentionally stopping the working bot or primary dashboard.

Verify from an external network:

1. Open both primary and fallback URLs with no browser certificate warnings. Check `/healthz` and `/readyz` at each origin. A reachable `/healthz` alone does not mean Discord is connected; `/readyz` also checks readiness.
2. Complete Discord sign-in on the fallback, select an authorized server, and verify both a read and an authorized setting change. The fallback has its own browser session; a primary login is not transferred. Test a denied/non-manager account as well.
3. Confirm fallback requests cannot bypass guild membership, dashboard roles, same-origin/CSRF checks or rate limits. The direct listener ignores forwarded client headers and still requires HTTPS.
4. Verify the primary dashboard and creator portal still work. TikTok account linking is intentionally unavailable through fallback; use the primary creator portal for those connections.
5. In a controlled maintenance test, interrupt only the Cloudflare connector and confirm the bot and direct HTTPS listener remain available. The launcher retries the connector with capped exponential backoff. Restore the connector and verify the primary URL recovers. Do not stop the whole host to simulate only a tunnel failure.

Record the verified fallback address privately and bookmark it. During a tunnel outage, the primary website cannot reliably redirect visitors because it is unreachable; users need the alternate URL. Discord's dashboard command can offer the fallback only after the listener has successfully started.

## Renewal, rollback and full outages

Arrange certificate renewal before expiry, preserve private-key permissions, and restart Cyro after replacing certificate files so it loads the new certificate. Review startup output and repeat an external HTTPS check after every rotation. Do not assume a certificate accepted by the runtime is publicly trusted: browser verification is a separate deployment check.

To disable the feature, set `DASHBOARD_FALLBACK_ENABLED=false` and restart. Leave the primary loopback port and tunnel target aligned. If reverting to the old port layout, update the launcher and tunnel route together and ensure no public HTTP backend becomes exposed. Never overwrite `.env` or live data with an example file.

Surviving a full provider outage needs a separately hosted recovery plan and private off-host backups. Cyro currently supports one active bot process and one data directory; do not run competing replicas against copied or shared data. No secondary hosting service, automatic data replication or migration is included in this change.
