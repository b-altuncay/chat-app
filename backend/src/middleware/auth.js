// src/middleware/auth.js
const jwtUtils = require('../utils/jwt');
const User = require('../models/User');

// Authenticate token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtUtils.extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwtUtils.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtUtils.extractToken(authHeader);

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwtUtils.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          iat: decoded.iat,
          exp: decoded.exp
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

// Check if user is admin (for future admin features)
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin verification'
    });
  }
};

// Rate limiting for auth endpoints
const authRateLimit = (req, res, next) => {
  // This can be expanded with Redis-based rate limiting
  // For now, we'll use the global rate limiter from app.js
  next();
};

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwtUtils.verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Add user info to socket
      socket.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        userData: user
      };

      // Set user online and store socket ID
      await user.setOnlineStatus(true, socket.id);

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Middleware to check if user owns a resource
const checkResourceOwnership = (resourceModel, resourceParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceParam];
      const userId = req.user.userId;

      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check ownership (this might vary based on the resource)
      if (resource.userId && !resource.userId.equals(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during ownership verification'
      });
    }
  };
};

// Middleware to check if user is participant in a chat
const checkChatParticipant = async (req, res, next) => {
  try {
    const chatId = req.params.chatId || req.params.id;
    const userId = req.user.userId;

    const Chat = require('../models/Chat');
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(participant => 
      participant.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this chat'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat participant check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during chat access verification'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  authRateLimit,
  authenticateSocket,
  checkResourceOwnership,
  checkChatParticipant
};