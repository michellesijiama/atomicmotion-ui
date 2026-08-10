# Security policy

This repo is a copy-paste component gallery — there's no hosted service or
backend, so the realistic security surface is limited to the source code
itself (e.g. an XSS-shaped bug in a component) and the demo site's build
pipeline.

## Reporting a vulnerability

Please **do not** open a public issue for a suspected vulnerability. Instead,
use GitHub's private reporting:

[github.com/michellesijiama/atomicmotion-ui/security/advisories/new](https://github.com/michellesijiama/atomicmotion-ui/security/advisories/new)

This opens a private channel visible only to the maintainer until a fix is
ready, and lets GitHub coordinate a CVE/advisory if warranted.

## Scope

In scope: vulnerabilities in the component source under `src/`, or in this
repo's build/CI configuration. Out of scope: the hosted demo at
atomicmotion.dev's infrastructure (report those to the hosting provider), and
issues in upstream dependencies (report those upstream).
