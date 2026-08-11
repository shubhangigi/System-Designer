# Microservices Architecture

## What is it?
An architectural style that structures an application as a collection of small, independently deployable services.

## When to use
- Large engineering teams (50+ engineers)
- Different services have very different scaling requirements
- Independent deployment cycles per team
- Fault isolation is critical
- When technology diversity is needed (polyglot)

## When NOT to use
- Small teams (adds significant operational overhead)
- Early-stage startups
- Simple CRUD applications
- When team lacks DevOps expertise

## Key considerations
- Service discovery (Consul, Kubernetes DNS)
- Inter-service communication (REST, gRPC, events)
- Distributed tracing (Jaeger, Zipkin)
- API Gateway for client-facing traffic
- Each service owns its own database
- Event-driven communication for loose coupling

## Pitfalls
- Network latency between services
- Distributed transactions are complex (use Saga pattern)
- Harder debugging (need centralized logging)
- More infrastructure to manage
