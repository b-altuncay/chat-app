import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message"
        style={{
          flex: 1,
          padding: '12px 16px',
          background: '#2a3942',
          border: 'none',
          borderRadius: '21px',
          color: '#e9edef',
          fontSize: '15px',
          outline: 'none',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif'
        }}
      />
      <button
        type="submit"
        disabled={!message.trim()}
        style={{
          padding: '12px',
          background: message.trim() ? '#00a884' : '#8696a0',
          border: 'none',
          borderRadius: '50%',
          color: 'white',
          cursor: message.trim() ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '44px',
          height: '44px',
          transition: 'background-color 0.2s ease'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 21L23 12L2 3v7l15 2-15 2v7z" fill="currentColor"/>
        </svg>
      </button>
    </form>
  );
};

export default MessageInput;