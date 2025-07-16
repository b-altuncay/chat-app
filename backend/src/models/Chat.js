// backend/src/models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Chat name cannot exceed 50 characters']
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.isGroup;
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ isGroup: 1 });

// Virtual for unread message count (will be calculated per user)
chatSchema.virtual('unreadCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat',
  count: true,
  match: { isRead: false }
});

// Validation: Group chat must have a name
chatSchema.pre('validate', function(next) {
  if (this.isGroup && !this.name) {
    next(new Error('Group chat must have a name'));
  } else {
    next();
  }
});

// Validation: Minimum 2 participants
chatSchema.pre('validate', function(next) {
  if (this.participants.length < 2) {
    next(new Error('Chat must have at least 2 participants'));
  } else {
    next();
  }
});

// Validation: Admin must be a participant in group chats
chatSchema.pre('validate', function(next) {
  if (this.isGroup && this.admin && !this.participants.includes(this.admin)) {
    next(new Error('Admin must be a participant in the group'));
  } else {
    next();
  }
});

// Method to add participant
chatSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove participant
chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => !id.equals(userId));
  
  // If removing admin, assign new admin (first participant)
  if (this.isGroup && this.admin && this.admin.equals(userId) && this.participants.length > 0) {
    this.admin = this.participants[0];
  }
  
  return this.save();
};

// Method to update last activity
chatSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method to find user's chats
chatSchema.statics.findUserChats = function(userId) {
  return this.find({ participants: userId })
    .populate('participants', 'username email avatar isOnline lastSeen')
    .populate('lastMessage')
    .populate('admin', 'username email avatar')
    .sort({ lastActivity: -1 });
};

// Static method to find or create private chat
chatSchema.statics.findOrCreatePrivateChat = async function(user1Id, user2Id) {
  // Check if private chat already exists
  let chat = await this.findOne({
    isGroup: false,
    participants: { $all: [user1Id, user2Id], $size: 2 }
  }).populate('participants', 'username email avatar isOnline lastSeen');

  if (!chat) {
    // Create new private chat
    chat = new this({
      isGroup: false,
      participants: [user1Id, user2Id]
    });
    await chat.save();
    await chat.populate('participants', 'username email avatar isOnline lastSeen');
  }

  return chat;
};

module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);