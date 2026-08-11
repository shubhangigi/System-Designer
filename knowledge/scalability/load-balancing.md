# Load Balancing and Horizontal Scaling

## When to scale horizontally
- Single instance CPU > 70% sustained
- Response times degrading under load
- Need high availability (zero downtime)
- Traffic spikes require dynamic scaling

## Load balancing strategies
- Round robin: Even distribution
- Least connections: Route to least busy
- IP hash: Same client → same server (sticky sessions)
- Weighted: Different capacity servers

## Stateless application requirements
- No in-memory session state
- External session store (Redis)
- No local file storage (use S3/object storage)
- Database connection pooling

## Technologies
- Nginx: Simple, fast reverse proxy
- HAProxy: High-performance TCP/HTTP LB
- AWS ALB/NLB: Cloud-native, auto-scaling
- Kubernetes Ingress: Container orchestration

## Health checks
- HTTP health endpoint (/api/health)
- Readiness probe: App is ready to serve
- Liveness probe: App is running
