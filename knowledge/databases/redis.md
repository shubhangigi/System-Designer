# Redis

## What is it?
An in-memory data structure store used as a cache, message broker, and database.

## When to use
- Session storage
- API response caching
- Rate limiting counters
- Real-time leaderboards
- Pub/sub messaging
- Temporary data with TTL
- Job queues (Bull/BullMQ)

## Why add Redis
- Reduce PostgreSQL load
- Sub-millisecond response times for cached data
- Rate limiting without database queries
- Session sharing across multiple backend instances

## Common patterns
- Cache-aside: App checks cache, falls back to DB on miss
- Write-through: Write to cache and DB simultaneously
- TTL-based expiry: Automatic cache invalidation
- Pub/sub: Real-time notifications

## When NOT to use
- Primary data store for critical data (data loss risk)
- When memory is severely constrained
- Complex query requirements
