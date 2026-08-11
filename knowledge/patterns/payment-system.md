# Payment System Architecture

## Key requirements
- PCI DSS compliance considerations
- Never store raw card data
- Use a payment processor (Stripe, PayPal, Braintree)
- Idempotent payment requests
- Webhook handling for async events
- Refund and dispute handling
- Audit logging for all transactions

## Recommended architecture
- Use Stripe or similar (never build raw card processing)
- Store payment intents, not card details
- Webhook endpoint for payment events
- Database transaction for order + payment atomicity
- Background job for order fulfillment after payment

## Key patterns
- Payment intent creation → client-side confirmation → webhook confirmation
- Idempotency keys to prevent duplicate charges
- Retry with exponential backoff for transient failures
- Separate payment service from order service

## Security
- HTTPS required
- Webhook signature verification
- Payment amount validation server-side
- Never trust client-submitted amounts
- PCI SAQ-A compliance with hosted fields
