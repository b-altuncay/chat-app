// src/server.js
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const database = require('./config/database');
const { connectRabbitMQ } = require('./services/rabbitmq');

// Create HTTP server
const server = http.createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5000"],
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['polling', 'websocket']
});
app.set('io', io);
// Socket.io handler
const SocketHandler = require('./socket/socketHandler');
const socketHandler = new SocketHandler(io);

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Graceful shutdown
const gracefulShutdown = (signal) => {
  
  server.close(async () => {
    
    try {
      await database.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Start HTTP server
    server.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`Socket.io server ready`);
      
      // Log server info
      const serverInfo = {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        host: HOST,
        database: database.getConnectionStatus(),
        cors: process.env.CORS_ORIGIN || 'http://localhost:3000'
      };
      
      console.log('Server Configuration:', JSON.stringify(serverInfo, null, 2));
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
connectRabbitMQ();

// Export for testing
module.exports = { app, server, io };