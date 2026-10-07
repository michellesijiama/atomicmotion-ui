# Security policy

AtomicMotion is a design library with a server-hosted Next.js gallery,
Stripe/PayPal checkout, and purchase-gated source delivery. The public
`atomicmotion-free` repository contains only free components and their
verification environment. The complete application repository is private.

## Reporting a vulnerability

Please **do not** open a public issue for a suspected vulnerability. Instead,
use GitHub's private reporting:

[github.com/michellesijiama/atomicmotion-ui/security/advisories/new](https://github.com/michellesijiama/atomicmotion-ui/security/advisories/new)

This opens a private channel visible only to the maintainer until a fix is
ready, and lets GitHub coordinate a CVE/advisory if warranted.

## Scope

In scope: component source under `components/`, application source under
`src/` (including checkout verification, purchase cookies and source access),
the publication boundary between free and paid code, and build/CI
configuration. Do not include payment credentials or customer data in a report.
Issues in upstream dependencies belong upstream; infrastructure issues in
the hosting platform belong to its provider. Application issues on
atomicmotion.dev are in scope.
