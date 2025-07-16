# Chat App - Real-time Messaging Application

Modern, scalable chat application with Node.js, React, and Flutter.

## Tech Stack

### Backend
- Node.js + Express.js
- Socket.io (Real-time communication)
- MongoDB (Database)
- Redis (Cache & Sessions)
- RabbitMQ (Message Queue)
- JWT (Authentication)

### Frontend
- **Web**: React + TypeScript
- **Mobile**: Flutter

## Project Structure

```
chat-app/
├── backend/          # Node.js backend API
├── web-client/       # React web application
├── mobile-client/    # Flutter mobile app
└── shared/          # Shared types and configs
```

## Getting Started

1. Clone the repository
2. Install dependencies for each service
3. Set up environment variables
4. Start services with Docker Compose

## Development

```bash
# Start all services
docker-compose up -d

# Start backend only
cd backend && npm run dev

# Start web client
cd web-client && npm start

# Start mobile client
cd mobile-client && flutter run
```
