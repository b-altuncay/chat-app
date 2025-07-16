// src/utils/jwt.js
const jwt = require('jsonwebtoken');

class JWTUtils {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  // Generate access token
  generateToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'chat-app',
      audience: 'chat-app-users'
    });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshExpiresIn,
      issuer: 'chat-app',
      audience: 'chat-app-users'
    });
  }

  // Verify token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'chat-app',
        audience: 'chat-app-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Extract token from header
  extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Generate token pair
  generateTokenPair(payload) {
    const accessToken = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken({
      userId: payload.userId,
      type: 'refresh'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.expiresIn
    };
  }

  // Decode token without verification (for expired token info)
  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new JWTUtils();