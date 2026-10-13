# Reporting a security issue

Please do not publish an exploit, credentials, private user records or detailed vulnerability steps in a public issue, pull request or Discord channel.

If this GitHub repository has **Security → Report a vulnerability** available, use that private reporting form. Otherwise join the [Headache Development Discord](https://discord.gg/dAZheerkkD) and ask Headache Development for a private security-reporting conversation. Keep the initial public request brief and free of sensitive details.

Include the affected version, feature, a minimal reproduction using a test application/server, the expected security boundary and the observed impact. Provide redacted logs only when needed. Do not send passwords, bot tokens, OAuth secrets, session cookies or another person's private data.

Only test systems and accounts you own or are authorized to assess. Avoid interrupting the hosted service or changing other communities' data. This document does not authorize testing third-party infrastructure and does not promise a bounty or response deadline.

If you accidentally disclose a credential, revoke or rotate it immediately through the relevant provider. Removing it from a file or Git history does not make the exposed credential safe to reuse.

Review fixes against the latest source release. Self-hosted operators are responsible for applying updates, protecting their environment and backups, and configuring Discord permissions and HTTPS correctly.
