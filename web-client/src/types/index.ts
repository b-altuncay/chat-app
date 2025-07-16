// src/types/index.ts

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  chat: string;
  messageType: 'text' | 'image' | 'file' | 'voice' | 'video';
  status?: 'sent' | 'delivered' | 'read';
  deliveredAt?: Date | string;
  readAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: string;
}

export interface Chat {
  _id: string;
  isGroup: boolean;
  name?: string;
  participants: User[];
  lastMessage?: {
    _id?: string;
    content: string;
    sender?: string;
    createdAt?: Date | string;
  };
  lastActivity?: Date | string;
  unreadCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  token: string;
  isOnline?: boolean;
  lastSeen?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Type guards for type safety
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj._id === 'string' && typeof obj.username === 'string';
};

export const isMessage = (obj: any): obj is Message => {
  return obj && typeof obj._id === 'string' && typeof obj.content === 'string';
};

export const isChat = (obj: any): obj is Chat => {
  return obj && typeof obj._id === 'string' && typeof obj.isGroup === 'boolean';
};