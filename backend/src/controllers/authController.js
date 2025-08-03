// src/controllers/authController.js
const User = require('../models/User');
const jwtUtils = require('../utils/jwt');
const passwordUtils = require('../utils/password');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        return res.status(400).json({
          success: false,
          message: `User with this ${field} already exists`,
          errors: {
            [field]: `This ${field} is already taken`
          }
        });
      }

      // Validate password strength
      const passwordValidation = passwordUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: {
            password: passwordValidation.errors.join(', ')
          }
        });
      }

      // Hash password
      const hashedPassword = await passwordUtils.hashPassword(password);

      // Create new user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        type: 'user'
      });

      await user.save();

      // Generate tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Update user with refresh token
      user.refreshToken = tokenPair.refreshToken;
      await user.save();

      // Set user online
      await user.setOnlineStatus(true);

      // Prepare response (exclude sensitive data)
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        token: tokenPair.accessToken
      };

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: userResponse,
        type: user.type
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log('Login attempt:', { email, password }); // DEBUG

      // Find user with password field
      const user = await User.findOne({ email }).select('+password +refreshToken');

      console.log('User found:', !!user); // DEBUG
      if (user) {
        console.log('User email:', user.email);
        console.log('Has password:', !!user.password);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      console.log('Comparing passwords...'); // DEBUG
      const isPasswordValid = await passwordUtils.comparePassword(password, user.password);
      console.log('Password valid:', isPasswordValid); // DEBUG

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate new tokens
      const tokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Update user with new refresh token and set online
      user.refreshToken = tokenPair.refreshToken;
      await user.setOnlineStatus(true);

      // Prepare response
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: true,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        token: tokenPair.accessToken
      };

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: userResponse,
        type: user.type
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const userId = req.user.userId;

      // Set user offline and clear refresh token
      const user = await User.findById(userId);
      if (user) {
        user.refreshToken = null;
        await user.setOnlineStatus(false);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwtUtils.verifyToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Find user and verify refresh token
      const user = await User.findById(decoded.userId).select('+refreshToken');

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new token pair
      const newTokenPair = jwtUtils.generateTokenPair({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Update refresh token in database
      user.refreshToken = newTokenPair.refreshToken;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newTokenPair.accessToken,
          refreshToken: newTokenPair.refreshToken
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      // If username is being updated, check for uniqueness
      if (updates.username) {
        const existingUser = await User.findOne({
          username: updates.username,
          _id: { $ne: userId }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken',
            errors: {
              username: 'This username is already taken'
            }
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await passwordUtils.comparePassword(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password
      const passwordValidation = passwordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'New password does not meet security requirements',
          errors: {
            newPassword: passwordValidation.errors.join(', ')
          }
        });
      }

      // Hash new password
      const hashedNewPassword = await passwordUtils.hashPassword(newPassword);

      // Update password
      user.password = hashedNewPassword;
      user.refreshToken = null; // Invalidate all sessions
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while changing password'
      });
    }
  }

  // Verify email (placeholder for future implementation)
  async verifyEmail(req, res) {
    try {
      // This would be implemented when email verification is needed
      res.status(200).json({
        success: true,
        message: 'Email verification endpoint (not implemented yet)'
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();