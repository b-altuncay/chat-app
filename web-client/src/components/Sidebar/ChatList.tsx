import React from 'react';

interface Chat {
  _id: string;
  isGroup: boolean;
  name?: string;
  participants: any[];
  lastMessage?: any;
  lastActivity: string;
  unreadCount?: number;
}

interface ChatListProps {
  chats: Chat[];
  activeChat: Chat | null;
  currentUser: any;
  onSelectChat: (chatId: string) => void;
  onlineUsers: Set<string>;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChat,
  currentUser,
  onSelectChat,
  onlineUsers
}) => {
  const getChatName = (chat: Chat) => {
    if (chat.isGroup) {
      return chat.name || 'Group Chat';
    }
    
    const otherParticipant = chat.participants?.find(p => p._id !== currentUser?._id);
    return otherParticipant?.username || 'Unknown User';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.isGroup) {
      return chat.name?.charAt(0).toUpperCase() || 'G';
    }
    
    const otherParticipant = chat.participants?.find(p => p._id !== currentUser?._id);
    return otherParticipant?.username?.charAt(0).toUpperCase() || '?';
  };

  const isUserOnline = (chat: Chat) => {
    if (chat.isGroup) return false;
    
    const otherParticipant = chat.participants?.find(p => p._id !== currentUser?._id);
    return otherParticipant?.isOnline || onlineUsers.has(otherParticipant?._id);
  };

  const getLastMessageText = (chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    
    const isMyMessage = chat.lastMessage.sender?._id === currentUser?._id;
    const prefix = isMyMessage ? 'You: ' : '';
    
    return `${prefix}${chat.lastMessage.content}`;
  };

  const getLastMessageTime = (chat: Chat) => {
    if (!chat.lastMessage) return '';
    
    const date = new Date(chat.lastMessage.createdAt || chat.lastActivity);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    if (diffInMinutes < 7 * 1440) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    }
    
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const getMessageStatus = (chat: Chat) => {
    if (!chat.lastMessage) return null;
    
    const isMyMessage = chat.lastMessage.sender?._id === currentUser?._id;
    if (!isMyMessage) return null;
    
    const status = chat.lastMessage.status || 'sent';
    
    switch (status) {
      case 'sent':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginRight: '3px' }}>
            <path 
              d="M9 2.5L3.5 8L1 5.5" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'delivered':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginRight: '3px' }}>
            <path 
              d="M9 2.5L3.5 8L1 5.5" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M11 2.5L5.5 8L4.5 7" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'read':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#53bdeb', marginRight: '3px' }}>
            <path 
              d="M9 2.5L3.5 8L1 5.5" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M11 2.5L5.5 8L4.5 7" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (chats.length === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#8696a0',
        background: '#111b21'
      }}>
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>💬</div>
          <div style={{ fontSize: '18px', fontWeight: 400 }}>No conversations yet</div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>Start a new chat to begin messaging</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      background: '#111b21',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #8696a026',
        background: '#202c33'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{ 
            margin: 0, 
            color: '#e9edef', 
            fontSize: '21px', 
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
          }}>
            ChatApp
          </h1>
          <div style={{ display: 'flex', gap: '20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0', cursor: 'pointer' }}>
              <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
              <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
              <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #8696a026',
        background: '#111b21'
      }}>
        <div style={{
          background: '#202c33',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#8696a0' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search or start new chat"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e9edef',
              fontSize: '15px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif',
              flex: 1
            }}
          />
        </div>
      </div>

      {/* Chat List */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto'
      }}>
        {chats.map((chat) => {
          const isActive = activeChat?._id === chat._id;
          const isOnline = isUserOnline(chat);
          const unreadCount = chat.unreadCount || 0;
          
          return (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
                background: isActive ? '#2a3942' : 'transparent',
                borderLeft: isActive ? '4px solid #00a884' : '4px solid transparent',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#202c33';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Avatar */}
              <div style={{ position: 'relative', marginRight: '15px' }}>
                <div style={{
                  width: '49px',
                  height: '49px',
                  borderRadius: '50%',
                  background: chat.isGroup 
                    ? 'linear-gradient(135deg, #00a884 0%, #008069 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '19px',
                  fontWeight: 400,
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                }}>
                  {getChatAvatar(chat)}
                </div>
                
                {/* Online indicator */}
                {isOnline && !chat.isGroup && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    background: '#00a884',
                    border: '2px solid #111b21'
                  }} />
                )}
              </div>

              {/* Chat info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '2px'
                }}>
                  <div style={{
                    fontSize: '17px',
                    fontWeight: 400,
                    color: '#e9edef',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif',
                    flex: 1,
                    paddingRight: '8px'
                  }}>
                    {getChatName(chat)}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#8696a0',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                  }}>
                    {getMessageStatus(chat)}
                    <span>{getLastMessageTime(chat)}</span>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: unreadCount > 0 ? '#d1d7db' : '#8696a0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif',
                    flex: 1,
                    paddingRight: '8px'
                  }}>
                    {getLastMessageText(chat)}
                  </div>
                  
                  {/* Unread count */}
                  {unreadCount > 0 && (
                    <div style={{
                      background: '#00a884',
                      color: '#111b21',
                      borderRadius: '10px',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 500,
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};