// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }
    
    this.socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Message events
  sendMessage(data: { chatId: string; content: string; messageType?: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('send_message', data);
    }
  }

  onMessageReceived(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.on('message_received', callback);
    }
  }

  offMessageReceived(): void {
    if (this.socket) {
      this.socket.off('message_received');
    }
  }

  // Room management
  joinRoom(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_room', chatId);
    }
  }

  leaveRoom(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', chatId);
    }
  }

  // Typing events
  sendTyping(data: { chatId: string; isTyping: boolean }): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', data);
    }
  }

  onUserTyping(callback: (data: { userId: string; username: string; isTyping: boolean; chatId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  offUserTyping(): void {
    if (this.socket) {
      this.socket.off('user_typing');
    }
  }

  // User status events
  onUserOnline(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  // Mark read
  markRead(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { chatId });
    }
  }

  // Generic event listener method
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove specific event listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Get raw socket for direct access
  getSocket(): Socket | null {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;