// src/components/Chat/ChatHeader.tsx
import React from 'react';
import { Navbar, Nav, Badge, Button } from 'react-bootstrap';

interface ChatHeaderProps {
  chat: any;
  currentUser: any;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chat, currentUser }) => {
  const otherParticipant = chat.participants?.find((p: any) => p._id !== currentUser?._id);
  const chatName = chat.isGroup 
    ? (chat.name || 'Group Chat') 
    : (otherParticipant?.username || 'Loading...');

  const getStatusText = () => {
    if (chat.isGroup) {
      return 'Group Chat';
    }
    
    if (otherParticipant?.isOnline) {
      return 'Online';
    }
    
    const lastSeen = otherParticipant?.lastSeen;
    if (lastSeen) {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
      
      return date.toLocaleString('tr-TR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return 'Last seen recently';
  };

  const getStatusVariant = () => {
    if (chat.isGroup) return 'success';
    return otherParticipant?.isOnline ? 'success' : 'secondary';
  };

  return (
    <Navbar className="border-bottom px-4 py-3" style={{ background: '#f8f9fa' }}>
      <div className="d-flex align-items-center">
        <div 
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3 position-relative"
          style={{
            width: '45px',
            height: '45px',
            background: chat.isGroup 
              ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          {chat.isGroup ? 'G' : chatName.charAt(0).toUpperCase()}
          
          {/* Online indicator */}
          {!chat.isGroup && otherParticipant?.isOnline && (
            <div
              className="position-absolute rounded-circle border border-2 border-white"
              style={{
                width: '14px',
                height: '14px',
                background: '#28a745',
                bottom: '0',
                right: '0'
              }}
            />
          )}
        </div>
        
        <div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '16px' }}>
            {chatName}
          </div>
          <div className="d-flex align-items-center">
            <small 
              className={`${
                chat.isGroup ? 'text-success' : 
                otherParticipant?.isOnline ? 'text-success' : 'text-muted'
              }`}
              style={{ fontSize: '12px' }}
            >
              {otherParticipant?.isOnline && !chat.isGroup && (
                <span className="me-1">●</span>
              )}
              {getStatusText()}
            </small>
          </div>
        </div>
      </div>
      
      <Nav className="ms-auto">
        <Button variant="outline-secondary" size="sm" className="me-2 rounded-circle" style={{ width: '36px', height: '36px' }}>
          📞
        </Button>
        <Button variant="outline-secondary" size="sm" className="me-2 rounded-circle" style={{ width: '36px', height: '36px' }}>
          📹
        </Button>
        <Button variant="outline-secondary" size="sm" className="rounded-circle" style={{ width: '36px', height: '36px' }}>
          ⋮
        </Button>
      </Nav>
    </Navbar>
  );
};