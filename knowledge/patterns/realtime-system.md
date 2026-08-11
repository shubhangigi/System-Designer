# Real-time System Architecture

## Technologies
- WebSockets: Bidirectional real-time communication
- Server-Sent Events (SSE): Server → client streaming
- Long polling: Simple fallback
- Socket.io: WebSocket with fallbacks

## When to use real-time
- Live chat
- Collaborative editing
- Live notifications
- Real-time dashboards
- Multiplayer features
- Location tracking

## Scaling real-time
- WebSocket connections are stateful → need sticky sessions or Redis pub/sub
- Socket.io Redis adapter for multi-instance deployments
- Connection limits per instance (~10k-100k WebSockets per Node.js)
- Consider managed services (Pusher, Ably) for very high scale

## Architecture pattern
- REST API for CRUD operations
- WebSocket/SSE for real-time updates
- Redis pub/sub for broadcasting events across instances
- Event queue for reliable message delivery
