# API Security

## Essential protections
- Authentication on all private endpoints
- Authorization checks (ownership, roles)
- Input validation (Zod, Joi, express-validator)
- Rate limiting (express-rate-limit, Redis-backed)
- CORS configured to specific origins
- HTTPS only in production
- Helmet.js for security headers
- Request size limits

## Common vulnerabilities
- SQL Injection: Use parameterized queries
- XSS: Sanitize output, use Content-Security-Policy
- CSRF: Use SameSite cookies, CSRF tokens
- Broken Object Level Authorization: Check ownership on every request
- Mass Assignment: Whitelist allowed fields
- Sensitive Data Exposure: Never return passwords/hashes

## Rate limiting
- Auth endpoints: 5 attempts per minute
- API endpoints: 100-1000 requests per minute
- File uploads: 10 per minute
- Use Redis for distributed rate limiting

## Error handling
- Never expose stack traces in production
- Use generic error messages for security failures
- Log detailed errors server-side only
- Use consistent error format
