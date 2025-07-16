// backend/src/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message sender is required']
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Message chat is required']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // MESSAGE STATUS FIELDS - YENİ EKLENEN
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  // FILE FIELDS
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ status: 1 }); // YENİ INDEX

// Virtual for checking if message is read by specific user
messageSchema.virtual('isReadBy').get(function() {
  return (userId) => {
    return this.readBy.some(read => read.user.equals(userId));
  };
});

// YENİ METHODS - Message Status Management
messageSchema.methods.markAsDelivered = function() {
  if (this.status === 'sent') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  }
  return this.save();
};

messageSchema.methods.markAsRead = function(userId) {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
  }
  
  // Also add to readBy array if not already there
  const alreadyRead = this.readBy.some(read => read.user.equals(userId));
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

// Method to mark message as read by user (UPDATED)
messageSchema.methods.markAsReadBy = function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.equals(userId));
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // Also update status if needed
    if (this.status !== 'read') {
      this.status = 'read';
      this.readAt = new Date();
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to edit message
messageSchema.methods.editContent = function(newContent) {
  // Save current content to history
  if (this.content && this.content !== newContent) {
    this.editHistory.push({
      content: this.content,
      editedAt: new Date()
    });
    this.isEdited = true;
  }
  
  this.content = newContent;
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return this.save();
};

// Static method to get chat messages with pagination
messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    chat: chatId, 
    isDeleted: false 
  })
    .populate('sender', 'username avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to mark multiple messages as read (UPDATED)
messageSchema.statics.markChatMessagesAsRead = async function(chatId, userId) {
  const unreadMessages = await this.find({
    chat: chatId,
    sender: { $ne: userId }, // Don't mark own messages as read
    status: { $in: ['sent', 'delivered'] }, // Only unread messages
    isDeleted: false
  });

  const bulkOps = unreadMessages.map(message => ({
    updateOne: {
      filter: { _id: message._id },
      update: {
        $set: {
          status: 'read',
          readAt: new Date()
        },
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    }
  }));

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return bulkOps.length;
};

// Static method to get unread message count for user (UPDATED)
messageSchema.statics.getUnreadCount = function(chatId, userId) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    status: { $in: ['sent', 'delivered'] }, // Use status instead of readBy
    isDeleted: false
  });
};

// Pre-save middleware to update chat's last activity
messageSchema.post('save', async function(doc) {
  try {
    await mongoose.model('Chat').findByIdAndUpdate(
      doc.chat,
      { 
        lastMessage: doc._id,
        lastActivity: new Date()
      }
    );
  } catch (error) {
    console.error('Error updating chat last activity:', error);
  }
});

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);