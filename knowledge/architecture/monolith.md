# Monolithic Architecture

## What is it?
A monolithic architecture packages all application functionality (UI, business logic, data access) into a single deployable unit.

## When to use
- Small to medium teams (< 10 engineers)
- Early-stage startups or prototypes
- Simple CRUD applications
- When deployment simplicity is important
- When you want to iterate quickly

## When NOT to use
- Teams > 20 engineers working on the same codebase
- Different components have drastically different scaling needs
- Independent deployment of features is required
- When one component failure should not bring down the entire system

## Characteristics
- Single process
- Shared memory space
- Simpler debugging
- Easier local development
- Single deployment unit
- Can become a "big ball of mud" without discipline

## Recommended stack
- Backend: Node.js/Express, Django, Rails, Spring Boot
- Database: PostgreSQL
- Deployment: Single VM, Heroku, Railway

## Scalability patterns
- Vertical scaling (bigger machine)
- Horizontal scaling with load balancer (stateless apps)
- Database connection pooling
- Read replicas for query-heavy workloads
