# PostgreSQL

## What is it?
An open-source, enterprise-grade relational database management system.

## Best for
- Transactional applications (ACID compliance)
- Relational data with foreign keys
- Complex queries and joins
- Financial data
- User data and authentication
- JSON/JSONB for semi-structured data
- Full-text search
- Geospatial data (PostGIS)

## Key features
- ACID transactions
- Foreign key constraints
- Rich SQL dialect
- JSONB for document storage
- Row-level security
- Partitioning for large tables
- Read replicas for scaling
- pgvector for vector embeddings

## Scaling patterns
- Connection pooling: PgBouncer
- Read replicas for read-heavy workloads
- Partitioning for tables > 100M rows
- Caching layer (Redis) for hot data
- EXPLAIN ANALYZE for query optimization

## When NOT to use
- Extreme write throughput (consider Cassandra)
- Graph-heavy queries (consider Neo4j)
- Very loose schema requirements (consider MongoDB)
- Time-series data at scale (consider TimescaleDB)
