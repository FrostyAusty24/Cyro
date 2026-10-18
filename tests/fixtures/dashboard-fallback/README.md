# Local TLS test fixtures

These certificates and the matching private key are deliberately public test data.
They were generated only for automated localhost/127.0.0.1 HTTPS tests. They do not
identify Cyro, its public domains, or any real service, and must never be deployed.

The test client explicitly trusts `test-ca.pem`; certificate validation remains
enabled. The production listener never disables certificate verification or asks
users to trust this CA. Tests also exercise an expired certificate, a self-signed
certificate, hostname mismatch, and a mismatched private key.
