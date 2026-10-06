# Component purchases

Every live demo stays free. The initial paid collection is Voice Bloom ($5),
Gradient Event Card ($5), and Stamp Tracker ($8), priced in USD. Other
components keep their existing free Copy for AI and source-link actions.
Prices, dependencies, export names and included features are defined in
`src/lib/component-offers.ts`.

## Payment providers

PayPal Checkout is preferred when its merchant configuration is present.
Stripe remains available when only Stripe is configured. A PayPal.me or
ordinary transfer link cannot automatically prove which component or
browser paid; use the verified Checkout integration below.

## PayPal configuration

Use a PayPal Business account and create an app in the
[PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications).
Configure these server-only variables in the hosting project:

| Variable | Value |
| --- | --- |
| `PAYPAL_CLIENT_ID` | The app's client ID. |
| `PAYPAL_CLIENT_SECRET` | The matching app secret; never paste it in chat or commit it. |
| `PAYPAL_MERCHANT_ID` | The receiving Business account's merchant ID. |
| `PAYPAL_ENVIRONMENT` | `sandbox` for test accounts, then `live` with the matching live credentials. |
| `PURCHASE_COOKIE_SECRET` | Stable independent random secret of at least 32 characters. Shared with the Stripe receipt system. |
| `ATOMICMOTION_APP_URL` | Canonical website origin, `https://atomicmotion.dev` in production. |

The server creates a USD order using its configured price and merchant,
then redirects the buyer to PayPal. A signed receipt ties that order to the
browser, component and original price. PayPal approval alone does not grant
source access. `/api/paypal/return` verifies the signed order, captures an
approved payment with a stable idempotency key, and confirms the current
capture before unlocking source. Repeated returns do not create new orders
or charge twice. Source access also reads the latest capture so pending,
declined and refunded captures stay locked.

Confirm a sandbox purchase, return, refresh, cancellation and refund before
setting live credentials. No real PayPal transaction was made during local
verification. Buyer access remains browser-based; this version has no
account restoration or durable webhook entitlement store. PayPal dispute
events are not reconciled; production dispute-based revocation requires a
verified webhook and durable order records.

References: [PayPal integration](https://developer.paypal.com/studio/checkout/standard/integrate),
[Orders API](https://developer.paypal.com/api/orders/v2),
[Payments API](https://developer.paypal.com/api/payments/v2).

## Optional Stripe configuration

Set these server-only environment variables locally in `.env.local` and in
the hosting environment. Do not commit the file or share its values:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key. Start with a sandbox/test key. |
| `PURCHASE_COOKIE_SECRET` | A stable, independently generated random secret of at least 32 characters. |
| `ATOMICMOTION_APP_URL` | The canonical origin, for example `https://atomicmotion.dev`. Required in production; locally use the exact origin opened in the browser. |

Generate a cookie secret with `openssl rand -hex 32`. Keep it stable between
deployments: rotating it invalidates existing browser purchase receipts.
Stripe-hosted Checkout does not require a publishable key or a client SDK.
Manage enabled payment methods in the Stripe Dashboard. Optionally set
`STRIPE_PAYMENT_METHOD_CONFIGURATION_ID` to use a dedicated configuration.
Without configuration the pricing UI is visible, purchases are unavailable,
and paid source endpoints stay locked. There is no pretend-payment mode.

## Stripe purchase and access flow

1. The purchase dialog explains the component, price, dependencies and license.
2. `POST /api/checkout` validates the same-origin request and looks up the price
   on the server. The browser cannot choose a price or a source path.
3. Stripe creates a one-time Checkout Session. The server sets HTTP-only,
   signed cookies for a random browser buyer ID and that component's receipt.
   Repeated purchases reuse an open checkout or return existing paid access.
4. Checkout returns to the live component with `checkout=success` or
   `checkout=cancelled`. These parameters only control UI feedback; they do
   not grant access.
5. Both the access and source endpoints retrieve the receipt from Stripe. A
   completed, paid session must match the component, browser buyer, currency
   and recorded amount. Refunded or disputed expanded charges are rejected.
6. After verification, the user can copy or view the component, read setup,
   usage and license tabs, and download the TSX file. The MIT copyright and
   license are included in copied/downloaded source.

Source and access responses are private and not cached. Signing keys and
Stripe credentials never reach the browser. The original source of the paid
components and the license are bundled into a server-only generated file by
`generate:purchase-sources`, automatically before development, production
builds, type checks and purchase tests. Run it again after editing a paid component while
the development server is already running. The generated JSON is ignored by
Git and must never be imported by a client component or moved into `public/`.

This first version saves access in the purchasing browser for up to one year.
It does not provide accounts, cross-device restoration or email fulfillment.
Stripe is the durable payment record; the server reconciles the saved
Checkout Session whenever access is requested, including when the browser
missed the success redirect. No webhook is used to grant access, and there is
no separate order database. Future account/email fulfillment should use a
durable entitlement store and a verified, idempotent Stripe webhook.

## Repository distribution and existing licenses

The complete `atomicmotion-ui` repository is now private. The public
[`atomicmotion-free`](https://github.com/michellesijiama/atomicmotion-free)
repository contains the 14 free components and their required assets.
Previously published MIT source can still exist in earlier copies and public
forks, with its original permissions. This implementation gates the site's
source delivery; it does not revoke those rights or hide the compiled live
demos. Do not advertise the existing components as exclusive or retroactively
restrict their MIT permissions. Future exclusive paid originals need an
appropriate license and private distribution. The root LICENSE remains
unchanged.

Use the [GitHub distribution workflow](github-distribution.md) to prepare a
separate public repository containing only free components. The exporter
uses the same offer definitions as checkout, excludes application/payment
code and paid source, and verifies the exact publication contents. The
complete application's repository must be private before future exclusive
paid originals are committed. Deleting a file from a public branch or adding
it to `.gitignore` does not remove it from Git history.

## Verification

Run `npm run test:purchases` for checkout/access/source tests using a mocked
Stripe SDK (no network, payment credentials or charges), then `npm run lint`,
`npm run typecheck`, and `npm run build`.
Run `npm run test:paypal` for the equivalent PayPal order, capture, refund,
receipt and repeated-return checks; its API responses are mocked as well.

Before accepting live payments, configure the chosen provider's sandbox and
verify checkout, cancellation, return, source download and refresh in the
same browser. For PayPal, also verify a refund using sandbox buyer and
merchant accounts. For Stripe, use a test card. Never use real payments to
test the flow.

References: [Stripe Checkout](https://docs.stripe.com/payments/checkout),
[Checkout Session retrieval](https://docs.stripe.com/api/checkout/sessions/retrieve),
[Stripe fulfillment guidance](https://docs.stripe.com/payments/checkout/fulfill-orders).
