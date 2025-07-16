import { create } from 'zustand';
import apiService from '../services/api';
import socketService from '../services/socket';
import { useAuthStore } from './authStore';
import notificationService from '../services/notifications';

interface Chat {
  _id: string;
  isGroup: boolean;
  name?: string;
  participants: any[];
  lastMessage?: any;
  lastActivity: string;
  unreadCount?: number;
}

interface Message {
  _id: string;
  content: string;
  sender: any;
  chat: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
  deliveredAt?: Date;
  readAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

interface ChatState {
  // State
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  onlineUsers: Set<string>;
  typingUsers: { [chatId: string]: string[] };
  isLoading: boolean;
  error: string | null;

  // Actions
  loadChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, messageType?: string) => Promise<void>;
  markMessagesAsRead: (chatId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any>;
  createChat: (participantId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
  handleNewMessage: (message: any) => void;
  handleUserTyping: (data: { userId: string; username: string; isTyping: boolean; chatId: string }) => void;
  handleUserOnline: (data: { userId: string; username: string }) => void;
  handleUserOffline: (data: { userId: string; username: string; lastSeen: Date }) => void;
  handleMessageStatusUpdate: (data: { messageId: string; status: string; deliveredAt?: Date; readAt?: Date }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  activeChat: null,
  messages: {},
  onlineUsers: new Set<string>(),
  typingUsers: {},
  isLoading: false,
  error: null,

  // Load chats
  loadChats: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiService.getChats();
      
      if (response.success) {
        const chats = response.data || [];
        set({ chats, isLoading: false });
      } else {
        set({ error: response.message || 'Failed to load chats', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to load chats', isLoading: false });
    }
  },

  // Select chat
  selectChat: async (chatId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { chats } = get();
      const chat = chats.find(c => c._id === chatId);
      
      if (!chat) {
        set({ error: 'Chat not found', isLoading: false });
        return;
      }

      // Join room first
      socketService.joinRoom(chatId);
      
      // Load messages
      const response = await apiService.getChatMessages(chatId, 1, 50);
      
      if (response.success) {
        const messages = response.data || [];
        
        set(state => ({
          activeChat: chat,
          messages: {
            ...state.messages,
            [chatId]: messages
          },
          isLoading: false
        }));

        // Mark messages as read
        get().markMessagesAsRead(chatId);
        
      } else {
        set({ error: response.message || 'Failed to load messages', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to select chat', isLoading: false });
    }
  },

  // Send message
  sendMessage: async (content: string, messageType = 'text') => {
    try {
      const { activeChat } = get();
      const authStore = useAuthStore.getState();
      
      if (!activeChat || !authStore.user) {
        throw new Error('No active chat or user');
      }

      // Create temp message
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content,
        sender: authStore.user,
        chat: activeChat._id,
        createdAt: new Date().toISOString(),
        status: 'sent' as const
      };

      // Add temp message to UI immediately
      set(state => ({
        messages: {
          ...state.messages,
          [activeChat._id]: [...(state.messages[activeChat._id] || []), tempMessage]
        }
      }));

      // Send via socket
      socketService.sendMessage({
        chatId: activeChat._id,
        content,
        messageType
      });

    } catch (error: any) {
      set({ error: error.message || 'Failed to send message' });
    }
  },

  // Search users
  searchUsers: async (query: string) => {
    try {
      const response = await apiService.searchUsers(query);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search users');
    }
  },

  // Create chat
  createChat: async (participantId: string) => {
    try {
      const response = await apiService.createChat({ 
        participants: [participantId], 
        isGroup: false 
      });
      
      if (response.success) {
        // Reload chats
        await get().loadChats();
        
        // Select the new chat
        const newChat = response.data;
        if (newChat) {
          await get().selectChat(newChat._id);
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create chat');
    }
  },

  // Delete message
  deleteMessage: async (messageId: string) => {
    try {
      const authStore = useAuthStore.getState();
      if (!authStore.user) return;

      // Confirm deletion
      if (!window.confirm('Are you sure you want to delete this message?')) {
        return;
      }

      // Visual delete (mark as deleted locally)
      set(state => {
        const updatedMessages = { ...state.messages };
        
        Object.keys(updatedMessages).forEach(chatId => {
          const chatMessages = updatedMessages[chatId];
          const messageIndex = chatMessages.findIndex(m => m._id === messageId);
          
          if (messageIndex !== -1) {
            const updatedChatMessages = [...chatMessages];
            updatedChatMessages[messageIndex] = {
              ...updatedChatMessages[messageIndex],
              isDeleted: true,
              deletedAt: new Date(),
              content: 'This message was deleted'
            };
            updatedMessages[chatId] = updatedChatMessages;
          }
        });
        
        return { messages: updatedMessages };
      });

      // Optional: Send to backend
      socketService.getSocket()?.emit('mark_message_deleted', {
        messageId,
        userId: authStore.user._id
      });

    } catch (error: any) {
      console.error('Failed to delete message:', error);
      set({ error: error.message || 'Failed to delete message' });
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (chatId: string) => {
    try {
      if (!socketService.isConnected()) {
        return;
      }

      // Clear unread count for this chat
      set(state => ({
        chats: state.chats.map(chat => 
          chat._id === chatId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      }));

      // Clear browser notifications
      notificationService.clearUnreadCount();

      // Send mark read via socket
      socketService.markRead(chatId);
      
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  // Handle new message
  handleNewMessage: (message: any) => {
    const { activeChat } = get();
    const authStore = useAuthStore.getState();
    const isMyMessage = message.sender._id === authStore.user?._id;
    
    // Show notification for received messages (not in active chat)
    if (!isMyMessage && activeChat?._id !== message.chat) {
      notificationService.showMessageNotification({
        senderName: message.sender.username,
        content: message.content,
        chatId: message.chat,
        avatar: message.sender.avatar
      });
    }
    
    set(state => {
      const chatId = message.chat;
      const existingMessages = state.messages[chatId] || [];
      
      // Check if this is a real message replacing a temp message
      const tempMessageIndex = existingMessages.findIndex(m => 
        m._id.startsWith('temp-') && 
        m.content === message.content &&
        m.sender._id === message.sender._id
      );
      
      if (tempMessageIndex !== -1) {
        // Replace temp message with real message
        const updatedMessages = [...existingMessages];
        const tempMessage = updatedMessages[tempMessageIndex];
        
        updatedMessages[tempMessageIndex] = {
          ...message,
          status: tempMessage.status === 'delivered' || tempMessage.status === 'read' 
            ? tempMessage.status 
            : message.status,
          deliveredAt: tempMessage.deliveredAt || message.deliveredAt,
          readAt: tempMessage.readAt || message.readAt
        };
        
        return { 
          messages: {
            ...state.messages,
            [chatId]: updatedMessages
          }
        };
      }
      
      // Check if message already exists (prevent duplicates)
      const messageExists = existingMessages.some(m => m._id === message._id);
      if (messageExists) {
        return state;
      }
      
      // Add new message and update chat
      const updatedMessages = {
        ...state.messages,
        [chatId]: [...existingMessages, message]
      };
      
      // Update chats with last message and unread count
      const updatedChats = state.chats.map(chat => {
        if (chat._id === chatId) {
          const currentUnread = chat.unreadCount || 0;
          return {
            ...chat,
            lastMessage: message,
            lastActivity: message.createdAt,
            unreadCount: !isMyMessage && activeChat?._id !== chatId 
              ? currentUnread + 1 
              : currentUnread
          };
        }
        return chat;
      });
      
      return { 
        messages: updatedMessages,
        chats: updatedChats
      };
    });
  },

  // Handle user typing
  handleUserTyping: (data: { userId: string; username: string; isTyping: boolean; chatId: string }) => {
    const { activeChat } = get();
    
    // Typing notification (only if not in active chat)
    if (data.isTyping && activeChat?._id !== data.chatId) {
      notificationService.showTypingNotification(data.username, data.chatId);
    }
    
    set(state => {
      const updatedTypingUsers = { ...state.typingUsers };
      
      if (!updatedTypingUsers[data.chatId]) {
        updatedTypingUsers[data.chatId] = [];
      }
      
      if (data.isTyping) {
        if (!updatedTypingUsers[data.chatId].includes(data.username)) {
          updatedTypingUsers[data.chatId] = [...updatedTypingUsers[data.chatId], data.username];
        }
      } else {
        updatedTypingUsers[data.chatId] = updatedTypingUsers[data.chatId].filter(name => name !== data.username);
      }
      
      return { typingUsers: updatedTypingUsers };
    });
  },

  // Handle user online
  handleUserOnline: (data: { userId: string; username: string }) => {
  set(state => {
    const updatedOnlineUsers = new Set(state.onlineUsers);
    updatedOnlineUsers.add(data.userId);

    const updateParticipant = (participant: any) =>
      participant._id === data.userId
        ? { ...participant, isOnline: true, lastSeen: new Date() }
        : participant;

    return {
      onlineUsers: updatedOnlineUsers,
      chats: state.chats.map(chat => ({
        ...chat,
        participants: chat.participants?.map(updateParticipant)
      })),
      activeChat: state.activeChat
        ? {
            ...state.activeChat,
            participants: state.activeChat.participants?.map(updateParticipant)
          }
        : state.activeChat
    };
  });
},

  // Handle user offline
 handleUserOffline: (data: { userId: string; username: string; lastSeen: Date }) => {
  set(state => {
    const updatedOnlineUsers = new Set(state.onlineUsers);
    updatedOnlineUsers.delete(data.userId);

    const updateParticipant = (participant: any) =>
      participant._id === data.userId
        ? { ...participant, isOnline: false, lastSeen: data.lastSeen }
        : participant;

    return {
      onlineUsers: updatedOnlineUsers,
      chats: state.chats.map(chat => ({
        ...chat,
        participants: chat.participants?.map(updateParticipant)
      })),
      activeChat: state.activeChat
        ? {
            ...state.activeChat,
            participants: state.activeChat.participants?.map(updateParticipant)
          }
        : state.activeChat
    };
  });
},

  // Handle message status update
  handleMessageStatusUpdate: (data: { messageId: string; status: string; deliveredAt?: Date; readAt?: Date }) => {
    console.log('[STATUS UPDATE RECEIVED]', data); // 👈 test log
    set(state => {
      const updatedMessages = { ...state.messages };
      let messageFound = false;
      
      // Find and update message in all chats
      Object.keys(updatedMessages).forEach(chatId => {
        const chatMessages = updatedMessages[chatId];
        const messageIndex = chatMessages.findIndex(m => m._id === data.messageId);
        
        if (messageIndex !== -1) {
          const updatedChatMessages = [...chatMessages];
          updatedChatMessages[messageIndex] = {
            ...updatedChatMessages[messageIndex],
            status: data.status as any,
            deliveredAt: data.deliveredAt,
            readAt: data.readAt
          };
          updatedMessages[chatId] = updatedChatMessages;
          messageFound = true;
        }
      });
      
      return messageFound ? { messages: updatedMessages } : state;
    });
  },

  // Setup socket event listeners
  setupSocketListeners: () => {
    // Clean previous listeners first
    get().cleanupSocketListeners();
    
    const { 
      handleNewMessage, 
      handleUserTyping, 
      handleUserOnline, 
      handleUserOffline, 
      handleMessageStatusUpdate
    } = get();
    
    // Setup all listeners
    socketService.onMessageReceived(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);
    
    // Message status updates
    socketService.on('message_status_updated', handleMessageStatusUpdate);
    
    // Online users list
    socketService.on('online_users', (users: any[]) => {
      set(state => {
        const onlineUserIds = new Set(users.map(u => u.userId));
        return { onlineUsers: onlineUserIds };
      });
    });
  },

  // Cleanup socket listeners
  cleanupSocketListeners: () => {
    socketService.offMessageReceived();
    socketService.offUserTyping();
    socketService.off('user_online');
    socketService.off('user_offline');
    socketService.off('message_status_updated');
    socketService.off('online_users');
  }
}));