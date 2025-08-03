import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { ContextMenu } from './ContextMenu';
import { getHiddenMessages, addHiddenMessage } from '../../utils/hiddenMessages';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
  messageType?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
}

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
  typingText?: string;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUser, 
  typingText,
  onDeleteMessage 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = useChatStore(state => state.activeChat);
  const markMessagesAsRead = useChatStore(state => state.markMessagesAsRead);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [hiddenMessages, setHiddenMessages] = useState<string[]>([]);
  const visibleMessages = messages.filter(msg => !hiddenMessages.includes(msg._id));


  useEffect(() => {
    if (activeChat?._id) {
      const hidden = getHiddenMessages(activeChat._id);
      setHiddenMessages(hidden);
    }
  }, [activeChat?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

     if (activeChat?._id && messages.length > 0) {
      markMessagesAsRead(activeChat._id);
    }

  }, [messages, typingText, activeChat?._id, messages.length]);

  // WhatsApp exact status icons
  const renderMessageStatus = (message: Message, isMe: boolean) => {
    if (!isMe) return null;

    const messageStatus = message.status ?? 'sent';

    switch (messageStatus) {
      case 'sent':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginLeft: '3px' }}>
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
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginLeft: '3px' }}>
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
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#53bdeb', marginLeft: '3px' }}>
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

  if (messages.length === 0) {
    return (
      <div style={{
        height: '100%',
        background: '#0b141a',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23000000'/%3E%3Cpath d='M0 0l100 100M100 0L0 100' stroke='%23ffffff' stroke-width='0.2' stroke-opacity='0.03'/%3E%3C/svg%3E")`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8696a0'
      }}>
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>💬</div>
          <div style={{ fontSize: '18px', fontWeight: 400 }}>No messages here yet...</div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>Send a message to start the conversation</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: '#0b141a',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23000000'/%3E%3Cpath d='M0 0l100 100M100 0L0 100' stroke='%23ffffff' stroke-width='0.2' stroke-opacity='0.03'/%3E%3C/svg%3E")`,
      overflowY: 'auto',
      padding: '12px 60px 12px 12px',
      position: 'relative'
    }}>
      
      {visibleMessages.map((message, index) => {
        const isMe = message.sender._id === currentUser?._id;
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        
        const showName = !isMe && (!prevMessage || prevMessage.sender._id !== message.sender._id);
        const isConsecutive = nextMessage && nextMessage.sender._id === message.sender._id;
        
        return (
          <div
            key={message._id}
            style={{
              display: 'flex',
              justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: isConsecutive ? '1px' : '8px',
              paddingLeft: isMe ? '60px' : '0',
              paddingRight: isMe ? '0' : '60px'
            }}
          >
            <div
              style={{
                maxWidth: '460px',
                minWidth: '48px',
                position: 'relative'
              }}
            onContextMenu={(e) => {
                e.preventDefault();
                if (isMe && !message.isDeleted) {
                  setContextMenu({ x: e.clientX, y: e.clientY, messageId: message._id });
                }
              }}
            >
              
              {/* Sender name */}
              {showName && (
                <div style={{
                  fontSize: '12.8px',
                  fontWeight: 500,
                  color: '#8696a0',
                  marginBottom: '2px',
                  paddingLeft: '12px'
                }}>
                  {message.sender.username}
                </div>
              )}
              
              <div style={{
                backgroundColor: isMe ? '#005c4b' : '#202c33',
                color: isMe ? '#e9edef' : '#e9edef',
                padding: '6px 7px 8px 9px',
                borderRadius: isMe 
                  ? (isConsecutive ? '7.5px 7.5px 2.5px 7.5px' : '7.5px 7.5px 2.5px 7.5px')
                  : (isConsecutive ? '7.5px 7.5px 7.5px 2.5px' : '7.5px 7.5px 7.5px 2.5px'),
                fontSize: '14.2px',
                lineHeight: '19px',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif',
                fontWeight: 400,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                opacity: message.isDeleted ? 0.6 : 1,
                fontStyle: message.isDeleted ? 'italic' : 'normal'
              }}>
                
                {/* Message content */}
                <div style={{
                  color: message.isDeleted ? '#8696a0' : 'inherit',
                  marginBottom: '2px'
                }}>
                  {message.content}
                </div>
                
                {/* Time and status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: '2px',
                  fontSize: '11px',
                  color: isMe ? 'rgba(233, 237, 239, 0.6)' : '#8696a0',
                  fontWeight: 400,
                  letterSpacing: '0.3px'
                }}>
                  <span style={{ marginRight: '3px' }}>
                    {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {renderMessageStatus(message, isMe)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {typingText && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: '8px',
          paddingRight: '60px'
        }}>
          <div style={{
            backgroundColor: '#202c33',
            color: '#8696a0',
            padding: '8px 12px',
            borderRadius: '7.5px 7.5px 7.5px 2.5px',
            fontSize: '14.2px',
            fontStyle: 'italic',
            maxWidth: '460px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: '3px',
                    backgroundColor: '#8696a0',
                    borderRadius: '50%',
                    animation: `pulse 1.4s ease-in-out infinite ${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <span>{typingText}</span>
          </div>
        </div>
      )}

            {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onDelete={() => {
              if (onDeleteMessage && activeChat?._id) {
                addHiddenMessage(activeChat._id, contextMenu.messageId); // localStorage’a kaydet
                onDeleteMessage(contextMenu.messageId);                  // mesajı sil
                setHiddenMessages(prev => [...prev, contextMenu.messageId]); // render’dan çıkar
              }
              setContextMenu(null); // Menü kapanır
            }}
            onClose={() => setContextMenu(null)}
          />
        )}

      <div ref={messagesEndRef} />
    </div>
  );
};