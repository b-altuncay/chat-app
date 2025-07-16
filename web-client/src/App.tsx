import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm as Login } from './components/Auth/LoginForm';
import {RegisterForm as Register } from './components/Auth/RegisterForm';
import socketService from './services/socket';
import notificationService from './services/notifications';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { ChatList } from './components/Sidebar/ChatList';
import { MessageList } from './components/Chat/MessageList';
import MessageInput from './components/Chat/MessageInput';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';


const App: React.FC = () => {
  const { user, isLoading, login, logout, initializeAuth } = useAuthStore();
  const { 
    chats, 
    activeChat, 
    messages, 
    onlineUsers,
    typingUsers,
    loadChats, 
    selectChat, 
    sendMessage,
    deleteMessage,
    createChat,
    setupSocketListeners, 
    cleanupSocketListeners 
  } = useChatStore();

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // App initialization
  useEffect(() => {
    const initApp = async () => {
      // Request notification permission
      await notificationService.requestPermission();
      
      // Check auth
      await initializeAuth();
    };

    initApp();
  }, [initializeAuth]);

  // Socket and chat setup when user is authenticated
  useEffect(() => {
    if (user?.token) {
      const initChat = async () => {
        // Connect socket
        socketService.connect(user.token);
        
        // Setup socket listeners
        setupSocketListeners();
        
        // Load chats
        await loadChats();
      };

      initChat();

      // Cleanup on unmount
      return () => {
        cleanupSocketListeners();
        socketService.disconnect();
      };
    }
  }, [user?.token, loadChats, setupSocketListeners, cleanupSocketListeners]);

  // Handle user search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      try {
        const { searchUsers } = useChatStore.getState();
        const response = await searchUsers(query);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Handle chat creation
  const handleCreateChat = async (targetUserId: string) => {
    try {
      await createChat(targetUserId);
      setShowNewChatModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

const handleSwitchToRegister = () => {
  window.location.href = '/register';
};

const handleSwitchToLogin = () => {
  window.location.href = '/login';
};

  // Handle message send
  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#111b21',
        color: '#e9edef'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show auth pages
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onSwitchToRegister={handleSwitchToRegister} />} />
          <Route path="/register" element={<Register onSwitchToLogin={handleSwitchToLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  // Main chat interface
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100vh', background: '#111b21' }}>
        {/* Sol taraf - WhatsApp ChatList */}
        <div style={{ 
          width: '400px',
          height: '100vh',
          background: '#111b21',
          borderRight: '1px solid #8696a026',
          flexShrink: 0
        }}>
          <ChatList
            chats={chats}
            activeChat={activeChat}
            currentUser={user}
            onSelectChat={selectChat}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Sağ taraf - WhatsApp Chat Area */}
        <div style={{ 
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#222e35'
        }}>
          {activeChat ? (
            <>
              {/* WhatsApp Chat Header */}
              <div style={{ 
                background: '#202c33',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #8696a026',
                minHeight: '60px',
                flexShrink: 0
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: activeChat.isGroup 
                    ? 'linear-gradient(135deg, #00a884 0%, #008069 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 400,
                  marginRight: '12px'
                }}>
                  {activeChat.isGroup 
                    ? (activeChat.name?.charAt(0).toUpperCase() || 'G')
                    : (activeChat.participants?.find((p: any) => p._id !== user?._id)?.username?.charAt(0).toUpperCase() || '?')
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: '#e9edef', 
                    fontSize: '16px', 
                    fontWeight: 400,
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                  }}>
                    {activeChat.isGroup 
                      ? (activeChat.name || 'Group Chat')
                      : (activeChat.participants?.find((p: any) => p._id !== user?._id)?.username || 'Unknown User')
                    }
                  </div>
                  <div style={{ 
                    color: '#8696a0', 
                    fontSize: '13px',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                  }}>
                    {activeChat.isGroup 
                      ? `${activeChat.participants?.length || 0} participants`
                      : (activeChat.participants?.find((p: any) => p._id !== user?._id)?.isOnline 
                          ? 'online' 
                          : 'last seen recently')
                    }
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0', cursor: 'pointer' }}>
                    <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ 
                flex: 1,
                overflow: 'hidden'
              }}>
                <MessageList
                  messages={messages[activeChat._id] || []}
                  currentUser={user}
                  typingText={typingUsers[activeChat._id]?.length > 0 
                    ? `${typingUsers[activeChat._id].join(', ')} is typing...` 
                    : undefined
                  }
                  onDeleteMessage={deleteMessage}
                />
              </div>

              {/* Message Input */}
              <div style={{ 
                background: '#202c33',
                padding: '5px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '62px',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0' }}>
                  <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v6m0 6v6" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <div style={{ 
                  flex: 1,
                  background: '#2a3942',
                  borderRadius: '21px',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="text"
                    placeholder="Type a message"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e9edef',
                      fontSize: '15px',
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          handleSendMessage(input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0' }}>
                    <path d="M21 12c0 1-.1 2-.3 3l-1.4-.8 1.4.8c-1.1 5.1-5.2 9-10.1 9.3-.6 0-1.2-.1-1.8-.2l-1.1-2.3L9 19.5c-.9-.4-1.7-.9-2.4-1.6-.7-.7-1.2-1.5-1.6-2.4l-2.3 1.1c-.1-.6-.2-1.2-.2-1.8C2.8 10.2 6.7 6.1 11.8 5l.8 1.4L11.8 5c1-.2 2-.3 3-.3z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0' }}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </>
          ) : (
            /* No Chat Selected */
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              background: '#222e35',
              color: '#8696a0'
            }}>
              <div style={{ textAlign: 'center', opacity: 0.6 }}>
                <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: '32px', fontWeight: 300, marginBottom: '10px' }}>WhatsApp Web</div>
                <div style={{ fontSize: '14px', lineHeight: '20px', maxWidth: '360px' }}>
                  Send and receive messages without keeping your phone online.<br/>
                  Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#202c33',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ color: '#e9edef', marginBottom: '16px' }}>New Chat</h3>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a3942',
                border: 'none',
                borderRadius: '8px',
                color: '#e9edef',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleCreateChat(user._id)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    background: 'transparent',
                    color: '#e9edef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a3942';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 400
                  }}>
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 400 }}>{user.username}</div>
                    <div style={{ fontSize: '14px', color: '#8696a0' }}>{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => setShowNewChatModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#2a3942',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#e9edef',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;