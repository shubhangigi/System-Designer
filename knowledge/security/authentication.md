# Authentication Architecture

## What is it?
The process of verifying who a user is.

## Recommended approach
- Hash passwords with bcrypt (12+ rounds) or Argon2id
- Use JWT for stateless API authentication
- Store JWTs in HTTP-only cookies (not localStorage)
- Implement refresh tokens for long sessions
- Use HTTPS in production
- Implement rate limiting on auth endpoints

## JWT Best Practices
- Sign with strong secret (256-bit minimum)
- Set appropriate expiry (15min-7d depending on sensitivity)
- Include only necessary claims (sub, email, roles)
- Rotate secrets periodically
- Invalidate on logout (use blocklist or short expiry)

## Security checklist
- Never store plaintext passwords
- Use constant-time comparison for secrets
- Implement account lockout after failed attempts
- Log auth events (login, register, password change)
- Validate email format
- Enforce minimum password strength
- Implement MFA for sensitive applications

## Session vs JWT
- Server sessions: Stateful, easy to invalidate, need shared storage
- JWT: Stateless, scales easily, harder to invalidate immediately
