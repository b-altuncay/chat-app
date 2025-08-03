// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, LoginData, RegisterData } from '../types';
import apiService from '../services/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      login: async (credentials: LoginData) => {
        try {
          set({ isLoading: true, error: null });
          
          
          const response = await apiService.login(credentials);
          
          if (response.success && response.data) {
            const { token, ...userData } = response.data;
            
            // Store in state
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          console.error('Login error:', error);
          set({ 
            error: error.message || 'Login failed', 
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          
          
          const response = await apiService.register(userData);
          
          if (response.success && response.data) {
            const { token, ...userInfo } = response.data;
            
            // Store in state
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userInfo));

          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ 
            error: error.message || 'Registration failed', 
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null
          });
          throw error;
        }
      },

      logout: () => {
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });

        // Call logout API (don't wait for response)
        apiService.logout().catch(console.error);
      },

      clearError: () => {
        set({ error: null });
      },

      initializeAuth: () => {
        try {
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          
          if (token && userStr) {
            const userData = JSON.parse(userStr);
            
            set({
              user: { ...userData, token },
              token,
              isAuthenticated: true,
            });
            
          } else {
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },
    }),
    {
      name: 'chat-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);