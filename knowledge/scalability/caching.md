# Caching Architecture

## When to add caching
- Database queries taking > 100ms
- Same data requested by many users
- Data changes infrequently
- Read-to-write ratio > 10:1
- External API calls you want to minimize

## Cache strategies
- Cache-aside (lazy loading): Best for read-heavy
- Write-through: Consistent but adds write latency
- Write-behind: Fast writes but risk of data loss
- Read-through: Transparent caching layer

## What to cache
- User session data
- Product catalogs
- Search results
- Computed aggregations
- Third-party API responses
- Database query results

## Cache invalidation strategies
- TTL (time-to-live): Simple, eventual consistency
- Event-based: Invalidate on data change
- Version keys: Append version to cache key

## Redis for caching
- Use EXPIRE for automatic TTL
- Use HSET for structured data
- Monitor hit rate (target > 80%)
- Set maxmemory-policy: allkeys-lru
