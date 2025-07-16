// src/socket/socketHandler.js
const { authenticateSocket } = require('../middleware/auth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.typingUsers = new Map(); // chatId -> Set of userIds
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.use(authenticateSocket);

    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);
      console.log(`👤 Authenticated user: ${socket.user.username} (${socket.user.userId})`);
      
      this.handleUserConnection(socket);
      this.setupSocketEvents(socket);
      
      console.log(`✅ Socket ${socket.id} ready for ${socket.user.username}`);
    });

    console.log('🔌 Socket.io handler initialized with AUTHENTICATION');
  }

  async handleUserConnection(socket) {
    const userId = socket.user.userId;
    const username = socket.user.username;

    try {
      this.onlineUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        socketId: socket.id,
        lastSeen: new Date()
      });

      await this.joinUserChats(socket, userId);
      await this.markPendingMessagesAsDelivered(userId);
      await this.broadcastUserStatus(userId, true);
      await this.sendOnlineUsersList(socket);

      console.log(`✅ User ${username} is now online`);
    } catch (error) {
      console.error('Error handling user connection:', error);
    }
  }

  async markPendingMessagesAsDelivered(userId) {
    try {
      const userChats = await Chat.find({ participants: userId });
      
      for (const chat of userChats) {
        const pendingMessages = await Message.find({
          chat: chat._id,
          sender: { $ne: userId },
          status: 'sent'
        });

        for (const message of pendingMessages) {
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();

          this.io.to(chat._id.toString()).emit('message_status_updated', {
            messageId: message._id,
            status: 'delivered',
            deliveredAt: message.deliveredAt
          });

          console.log(`📨 Delivered pending message ${message._id.toString().slice(-6)} to ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error marking pending messages as delivered:', error);
    }
  }

  async joinUserChats(socket, userId) {
    try {
      const userChats = await Chat.find({ participants: userId }).select('_id');
      
      userChats.forEach(chat => {
        socket.join(chat._id.toString());
        console.log(`📱 User ${socket.user.username} joined chat room: ${chat._id}`);
      });
    } catch (error) {
      console.error('Error joining user chats:', error);
    }
  }

  async broadcastUserStatus(userId, isOnline) {
    try {
      const userChats = await Chat.find({ participants: userId }).select('_id participants');
      const allParticipants = new Set();

      userChats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            allParticipants.add(participantId.toString());
          }
        });
      });

      allParticipants.forEach(participantId => {
        const participantSocketId = this.onlineUsers.get(participantId);
        if (participantSocketId) {
          this.io.to(participantSocketId).emit(isOnline ? 'user_online' : 'user_offline', {
            userId,
            username: isOnline ? (this.userSockets.has(participantSocketId) ? this.getUsernameById(userId) : '') : '',
            isOnline
          });
        }
      });
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  async sendOnlineUsersList(socket) {
    try {
      const userId = socket.user.userId;
      const userChats = await Chat.find({ participants: userId })
        .populate('participants', '_id username avatar isOnline');

      const onlineContacts = new Set();
      userChats.forEach(chat => {
        chat.participants.forEach(participant => {
          if (participant._id.toString() !== userId && participant.isOnline) {
            onlineContacts.add({
              userId: participant._id,
              username: participant.username,
              avatar: participant.avatar
            });
          }
        });
      });

      socket.emit('online_users', Array.from(onlineContacts));
    } catch (error) {
      console.error('Error sending online users list:', error);
    }
  }

  setupSocketEvents(socket) {
    const userId = socket.user.userId;

    socket.on('test_message', (data) => {
      console.log(`📧 Test message from ${socket.user.username}:`, data);
      socket.emit('test_response', {
        message: 'Hello from server!',
        timestamp: new Date(),
        receivedData: data
      });
    });

    socket.on('join_room', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.toString() === userId)) {
          socket.join(chatId);
          console.log(`🏠 ${socket.user.username} joined chat room: ${chatId}`);
          socket.emit('joined_room', { chatId, success: true });
        } else {
          console.log(`❌ Access denied for ${socket.user.username} to chat ${chatId}`);
          socket.emit('error', { message: 'Cannot join chat: Access denied' });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Error joining chat room' });
      }
    });

    socket.on('leave_room', (chatId) => {
      socket.leave(chatId);
      console.log(`🚪 ${socket.user.username} left chat room: ${chatId}`);
      socket.emit('left_room', { chatId, success: true });
    });

    // SEND MESSAGE WITH AUTO-DELIVERED
    socket.on('send_message', async (data) => {
      console.log('🔥 SEND_MESSAGE EVENT TRIGGERED!');
      try {
        const { chatId, content, messageType = 'text', replyTo } = data;
        console.log('🔥 Data received:', { chatId, content, messageType });
        
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
          socket.emit('error', { message: 'Cannot send message: Access denied' });
          return;
        }
        
        console.log('🔥 Chat found, creating message...');

        const messageData = {
          content,
          sender: userId,
          chat: chatId,
          messageType,
          replyTo: replyTo || undefined
        };

        const message = new Message(messageData);
        await message.save();
        await message.populate('sender', 'username avatar');
        if (replyTo) {
          await message.populate('replyTo', 'content sender');
        }

        console.log('🔥 Message saved, updating chat...');

        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastActivity: new Date()
        });

        console.log('🔥 Broadcasting message...');

        // Broadcast message to all participants
        console.log(`📡 Broadcasting to room: ${chatId}`);
        console.log(`📡 Room participants: ${chat.participants.length}`);
        
        socket.to(chatId).emit('message_received', {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          chat: chatId,
          messageType: message.messageType,
          status: message.status,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });

        // ALSO broadcast to ALL in room (including sender for debug)
        this.io.to(chatId).emit('message_received', {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          chat: chatId,
          messageType: message.messageType,
          status: message.status,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });

        socket.emit('message_sent', {
          _id: message._id,
          success: true,
          status: message.status
        });

        console.log(`💬 Message sent in chat ${chatId} by ${socket.user.username}`);

        // AUTO-DELIVERED LOGIC
        console.log('🧪 About to set timeout...');
        const messageId = message._id;
        const chatParticipants = chat.participants;
        
        setTimeout(async () => {
          console.log('✅ TIMEOUT TRIGGERED!');
          try {
            const otherParticipants = chatParticipants.filter(p => p.toString() !== userId);
            let hasOnlineRecipient = false;
            
            console.log(`🔍 Checking ${otherParticipants.length} other participants...`);
            
            otherParticipants.forEach(participantId => {
              const isOnline = this.onlineUsers.has(participantId.toString());
              console.log(`👤 Participant ${participantId.toString().slice(-6)}: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
              if (isOnline) {
                hasOnlineRecipient = true;
              }
            });
            
            if (hasOnlineRecipient) {
              const messageToUpdate = await Message.findById(messageId);
              if (messageToUpdate) {
                messageToUpdate.status = 'delivered';
                messageToUpdate.deliveredAt = new Date();
                await messageToUpdate.save();
                
                console.log(`📨 Message ${messageId.toString().slice(-6)} auto-delivered (recipient online)`);
                
                this.io.to(chatId).emit('message_status_updated', {
                  messageId: messageId,
                  status: 'delivered',
                  deliveredAt: messageToUpdate.deliveredAt
                });
                
                console.log(`📡 Broadcasted delivered status to chat ${chatId.slice(-6)}`);
              }
            } else {
              console.log(`⏸️ Message ${messageId.toString().slice(-6)} stays SENT (no online recipients)`);
            }
          } catch (error) {
            console.error('Auto-delivered error:', error);
          }
        }, 2000); // 2 saniye bekle

      } catch (error) {
        console.error('🔥 ERROR IN SEND_MESSAGE:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    socket.on('typing', async (data) => {
      try {
        const { chatId, isTyping } = data;
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) return;

        if (!this.typingUsers.has(chatId)) {
          this.typingUsers.set(chatId, new Set());
        }

        const chatTypingUsers = this.typingUsers.get(chatId);
        if (isTyping) {
          chatTypingUsers.add(userId);
        } else {
          chatTypingUsers.delete(userId);
        }

        socket.to(chatId).emit('user_typing', {
          userId,
          username: socket.user.username,
          isTyping,
          chatId
        });

        if (isTyping) {
          setTimeout(() => {
            if (chatTypingUsers.has(userId)) {
              chatTypingUsers.delete(userId);
              socket.to(chatId).emit('user_typing', {
                userId,
                username: socket.user.username,
                isTyping: false,
                chatId
              });
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    socket.on('mark_read', async (data) => {
      try {
        const { chatId } = data;
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) return;

        // Update all unread messages to read status
        const unreadMessages = await Message.find({
          chat: chatId,
          sender: { $ne: userId },
          status: { $in: ['sent', 'delivered'] }
        });

        let markedCount = 0;
        for (const message of unreadMessages) {
          message.status = 'read';
          message.readAt = new Date();
          await message.save();
          markedCount++;
          
          // Broadcast read status to ALL participants
          this.io.to(chatId).emit('message_status_updated', {
            messageId: message._id,
            status: 'read',
            readAt: message.readAt
          });
          
          console.log(`📖 Message ${message._id.toString().slice(-6)} marked as READ by ${socket.user.username}`);
        }

        console.log(`📖 Marked ${markedCount} messages as read in chat ${chatId}`);
        socket.emit('marked_read', { chatId, markedCount });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', async (reason) => {
      await this.handleUserDisconnection(socket, reason);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error);
    });
  }

  async handleUserDisconnection(socket, reason) {
    const userId = socket.user?.userId;
    const username = socket.user?.username;

    if (!userId) return;

    try {
      console.log(`❌ User disconnected: ${username} (${socket.id}), reason: ${reason}`);

      this.onlineUsers.delete(userId);
      this.userSockets.delete(socket.id);

      this.typingUsers.forEach((typingUsersSet, chatId) => {
        if (typingUsersSet.has(userId)) {
          typingUsersSet.delete(userId);
          socket.to(chatId).emit('user_typing', {
            userId,
            username,
            isTyping: false,
            chatId
          });
        }
      });

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        socketId: null,
        lastSeen: new Date()
      });

      await this.broadcastUserStatus(userId, false);

      console.log(`📴 ${username} is now offline`);
    } catch (error) {
      console.error('Error handling user disconnection:', error);
    }
  }

  getUsernameById(userId) {
    for (const [socketId, uid] of this.userSockets.entries()) {
      if (uid === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        return socket?.user?.username || '';
      }
    }
    return '';
  }

  sendToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToChat(chatId, event, data) {
    this.io.to(chatId).emit(event, data);
  }

  getOnlineUsersCount() {
    return this.onlineUsers.size;
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }

  async forceDisconnectUser(userId) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        return true;
      }
    }
    return false;
  }
}

module.exports = SocketHandler;