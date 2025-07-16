// src/controllers/userController.js
const User = require('../models/User');
const Chat = require('../models/Chat');

class UserController {
  // Search users
  async searchUsers(req, res) {
    try {
      const { q: query, page = 1, limit = 20 } = req.query;
      const currentUserId = req.user.userId;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const searchRegex = new RegExp(query.trim(), 'i');
      
      const users = await User.find({
        $and: [
          { _id: { $ne: currentUserId } }, // Exclude current user
          {
            $or: [
              { username: searchRegex },
              { email: searchRegex }
            ]
          }
        ]
      })
      .select('username email avatar isOnline lastSeen createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ username: 1 });

      const totalUsers = await User.countDocuments({
        $and: [
          { _id: { $ne: currentUserId } },
          {
            $or: [
              { username: searchRegex },
              { email: searchRegex }
            ]
          }
        ]
      });

      res.status(200).json({
        success: true,
        message: 'Users found successfully',
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while searching users'
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      const user = await User.findById(id)
        .select('username email avatar isOnline lastSeen createdAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if there's an existing chat between users
      let existingChat = null;
      if (id !== currentUserId) {
        existingChat = await Chat.findOne({
          isGroup: false,
          participants: { $all: [currentUserId, id], $size: 2 }
        });
      }

      const userResponse = {
        ...user.toObject(),
        hasExistingChat: !!existingChat,
        chatId: existingChat?._id
      };

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: userResponse
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving user'
      });
    }
  }

  // Get online users
  async getOnlineUsers(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const currentUserId = req.user.userId;

      const onlineUsers = await User.find({
        _id: { $ne: currentUserId },
        isOnline: true
      })
      .select('username email avatar isOnline lastSeen')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ lastSeen: -1 });

      const totalOnlineUsers = await User.countDocuments({
        _id: { $ne: currentUserId },
        isOnline: true
      });

      res.status(200).json({
        success: true,
        message: 'Online users retrieved successfully',
        data: onlineUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalOnlineUsers,
          totalPages: Math.ceil(totalOnlineUsers / limit)
        }
      });

    } catch (error) {
      console.error('Get online users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving online users'
      });
    }
  }

  // Get user's chat contacts
  async getContacts(req, res) {
    try {
      const currentUserId = req.user.userId;
      const { page = 1, limit = 50 } = req.query;

      // Get all chats the user is part of
      const userChats = await Chat.find({
        participants: currentUserId
      }).populate('participants', 'username email avatar isOnline lastSeen');

      // Extract unique contacts
      const contactsSet = new Set();
      const contacts = [];

      userChats.forEach(chat => {
        chat.participants.forEach(participant => {
          if (participant._id.toString() !== currentUserId && !contactsSet.has(participant._id.toString())) {
            contactsSet.add(participant._id.toString());
            contacts.push({
              ...participant.toObject(),
              lastInteraction: chat.lastActivity
            });
          }
        });
      });

      // Sort by last interaction
      contacts.sort((a, b) => new Date(b.lastInteraction) - new Date(a.lastInteraction));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedContacts = contacts.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        message: 'Contacts retrieved successfully',
        data: paginatedContacts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: contacts.length,
          totalPages: Math.ceil(contacts.length / limit)
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving contacts'
      });
    }
  }

  // Block/Unblock user (placeholder for future implementation)
  async blockUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      if (id === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot block yourself'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // This would be implemented when user blocking feature is needed
      // For now, just return success
      res.status(200).json({
        success: true,
        message: 'User blocking feature (not implemented yet)'
      });

    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while blocking user'
      });
    }
  }

  // Report user (placeholder for future implementation)
  async reportUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const currentUserId = req.user.userId;

      if (id === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot report yourself'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // This would be implemented when user reporting feature is needed
      res.status(200).json({
        success: true,
        message: 'User reporting feature (not implemented yet)'
      });

    } catch (error) {
      console.error('Report user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while reporting user'
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const currentUserId = req.user.userId;

      // Get user's chat count
      const chatCount = await Chat.countDocuments({
        participants: currentUserId
      });

      // Get user's message count
      const Message = require('../models/Message');
      const messageCount = await Message.countDocuments({
        sender: currentUserId,
        isDeleted: false
      });

      // Get contact count
      const userChats = await Chat.find({
        participants: currentUserId
      }).populate('participants');

      const uniqueContacts = new Set();
      userChats.forEach(chat => {
        chat.participants.forEach(participant => {
          if (participant._id.toString() !== currentUserId) {
            uniqueContacts.add(participant._id.toString());
          }
        });
      });

      const stats = {
        chatCount,
        messageCount,
        contactCount: uniqueContacts.size,
        joinDate: (await User.findById(currentUserId)).createdAt
      };

      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving user statistics'
      });
    }
  }
}

module.exports = new UserController();