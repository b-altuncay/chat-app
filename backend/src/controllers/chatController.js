// src/controllers/chatController.js
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

class ChatController {
  // Get all chats for the authenticated user
  async getUserChats(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 50 } = req.query;

      const chats = await Chat.findUserChats(userId)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Add unread count for each chat
      const chatsWithUnreadCount = await Promise.all(
        chats.map(async (chat) => {
          const unreadCount = await Message.getUnreadCount(chat._id, userId);
          return {
            ...chat.toObject(),
            unreadCount
          };
        })
      );

      res.status(200).json({
        success: true,
        message: 'Chats retrieved successfully',
        data: chatsWithUnreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: chatsWithUnreadCount.length
        }
      });

    } catch (error) {
      console.error('Get user chats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving chats'
      });
    }
  }

  // Create a new chat (private or group)
  async createChat(req, res) {
    try {
      const { participants, isGroup = false, name } = req.body;
      const userId = req.user.userId;

      // Add current user to participants if not already included
      const allParticipants = [...new Set([userId, ...participants])];

      // For private chat, check if it already exists
      if (!isGroup && allParticipants.length === 2) {
        const existingChat = await Chat.findOrCreatePrivateChat(
          allParticipants[0],
          allParticipants[1]
        );

        return res.status(200).json({
          success: true,
          message: 'Private chat retrieved/created successfully',
          data: existingChat
        });
      }

      // Validate participants exist
      const validParticipants = await User.find({
        _id: { $in: allParticipants }
      });

      if (validParticipants.length !== allParticipants.length) {
        return res.status(400).json({
          success: false,
          message: 'Some participants do not exist'
        });
      }

      // Create new chat
      const chatData = {
        participants: allParticipants,
        isGroup,
        admin: isGroup ? userId : undefined,
        name: isGroup ? name : undefined
      };

      const chat = new Chat(chatData);
      await chat.save();

      // Populate the chat
      await chat.populate('participants', 'username email avatar isOnline lastSeen');
      if (chat.admin) {
        await chat.populate('admin', 'username email avatar');
      }

      res.status(201).json({
        success: true,
        message: `${isGroup ? 'Group' : 'Private'} chat created successfully`,
        data: chat
      });

    } catch (error) {
      console.error('Create chat error:', error);
      
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
        message: 'Internal server error while creating chat'
      });
    }
  }

  // Get a specific chat
  async getChat(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;

      const chat = await Chat.findById(chatId)
        .populate('participants', 'username email avatar isOnline lastSeen')
        .populate('admin', 'username email avatar')
        .populate('lastMessage');

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Check if user is a participant
      const isParticipant = chat.participants.some(participant => 
        participant._id.toString() === userId
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not a participant in this chat'
        });
      }

      // Add unread count
      const unreadCount = await Message.getUnreadCount(chatId, userId);
      const chatWithUnreadCount = {
        ...chat.toObject(),
        unreadCount
      };

      res.status(200).json({
        success: true,
        message: 'Chat retrieved successfully',
        data: chatWithUnreadCount
      });

    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving chat'
      });
    }
  }

  // Get messages for a chat
  async getChatMessages(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;
      const { page = 1, limit = 50 } = req.query;

      // Check if user is participant (middleware should handle this)
      const messages = await Message.getChatMessages(chatId, page, limit);

      // Calculate total count for pagination
      const totalMessages = await Message.countDocuments({
        chat: chatId,
        isDeleted: false
      });

      const totalPages = Math.ceil(totalMessages / limit);

      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving messages'
      });
    }
  }

  // Send a message to a chat
  async sendMessage(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;
      const { content, messageType = 'text', replyTo } = req.body;

      // Create new message
      const messageData = {
        content,
        sender: userId,
        chat: chatId,
        messageType,
        replyTo: replyTo || undefined
      };

      const message = new Message(messageData);
      await message.save();

      // Populate message
      await message.populate('sender', 'username avatar');
      if (replyTo) {
        await message.populate('replyTo', 'content sender');
      }

      // Update chat's last activity
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastActivity: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });

    } catch (error) {
      console.error('Send message error:', error);
      
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
        message: 'Internal server error while sending message'
      });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;

      const markedCount = await Message.markChatMessagesAsRead(chatId, userId);

      res.status(200).json({
        success: true,
        message: `${markedCount} messages marked as read`,
        data: { markedCount }
      });

    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while marking messages as read'
      });
    }
  }

  // Add participant to group chat
  async addParticipant(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;
      const { participantId } = req.body;

      const chat = await Chat.findById(chatId);

      if (!chat || !chat.isGroup) {
        return res.status(400).json({
          success: false,
          message: 'Invalid group chat'
        });
      }

      // Check if user is admin
      if (!chat.admin.equals(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can add participants'
        });
      }

      // Check if participant exists
      const participant = await User.findById(participantId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Add participant
      await chat.addParticipant(participantId);
      await chat.populate('participants', 'username email avatar isOnline lastSeen');

      res.status(200).json({
        success: true,
        message: 'Participant added successfully',
        data: chat
      });

    } catch (error) {
      console.error('Add participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while adding participant'
      });
    }
  }

  // Remove participant from group chat
  async removeParticipant(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;
      const { participantId } = req.body;

      const chat = await Chat.findById(chatId);

      if (!chat || !chat.isGroup) {
        return res.status(400).json({
          success: false,
          message: 'Invalid group chat'
        });
      }

      // Check if user is admin or removing themselves
      if (!chat.admin.equals(userId) && participantId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Remove participant
      await chat.removeParticipant(participantId);
      await chat.populate('participants', 'username email avatar isOnline lastSeen');

      res.status(200).json({
        success: true,
        message: 'Participant removed successfully',
        data: chat
      });

    } catch (error) {
      console.error('Remove participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while removing participant'
      });
    }
  }

  // Delete a chat
  async deleteChat(req, res) {
    try {
      const chatId = req.params.id;
      const userId = req.user.userId;

      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }

      // Check permissions
      if (chat.isGroup && !chat.admin.equals(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can delete group chat'
        });
      }

      if (!chat.isGroup && !chat.participants.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete all messages in the chat
      await Message.deleteMany({ chat: chatId });

      // Delete the chat
      await Chat.findByIdAndDelete(chatId);

      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully'
      });

    } catch (error) {
      console.error('Delete chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting chat'
      });
    }
  }
}

module.exports = new ChatController();