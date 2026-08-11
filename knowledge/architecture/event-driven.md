# Event-Driven Architecture

## What is it?
An architectural pattern where services communicate via events/messages through a message broker.

## When to use
- Real-time data processing
- Notification systems
- Order processing pipelines
- High-throughput scenarios
- When temporal decoupling is needed
- Audit log requirements

## Common technologies
- Message brokers: RabbitMQ, Apache Kafka, AWS SQS/SNS, Redis Streams
- Event stores: EventStoreDB
- Consumer frameworks: Bull (Node.js), Celery (Python)

## Patterns
- Event sourcing: Store events as source of truth
- CQRS: Separate read/write models
- Saga: Manage distributed transactions via events
- Dead letter queue: Handle failed messages

## When to add queues/events
- Email/notification sending
- Payment processing
- Report generation
- Data synchronization
- Any operation > 200ms that can be async
