# NeonStore Frontend

React + Vite storefront for Printify-powered products.

## Production requirements

- VITE_API_BASE_URL must point to the production backend.
- Do not store backend secrets in VITE_* variables.
- Payment totals are calculated by backend.
- Razorpay is used for India checkout.
- PayPal is used for international checkout.

## Commands

npm ci
npm run build
npm run preview