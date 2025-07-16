// src/services/api.ts
import { ApiResponse, LoginData, RegisterData, AuthUser } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  private baseURL = `${API_BASE_URL}/api`;

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      
      const response = await fetch(url, config);
      const data = await response.json();


      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ API Error:`, error);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials: LoginData): Promise<ApiResponse<AuthUser>> {
    return this.makeRequest<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterData): Promise<ApiResponse<AuthUser>> {
    return this.makeRequest<AuthUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/auth/profile');
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.makeRequest<null>('/auth/logout', {
      method: 'POST',
    });
  }

  // User endpoints
  async searchUsers(query: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Chat endpoints
  async getChats(): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>('/chats');
  }

  async createChat(data: { participants: string[]; isGroup?: boolean; name?: string }): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChatMessages(chatId: string, page = 1, limit = 50): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);
  }

  async sendMessage(chatId: string, content: string, messageType = 'text'): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType }),
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Backend server is not reachable');
    }
  }
}

export const apiService = new ApiService();
export default apiService;