import { useEffect, useState } from 'react';
import { getHiddenChats, addHiddenChat } from '../../utils/hiddenChats';
import { NewChatModal } from './NewChatModal';

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
  onSearchUsers: (query: string) => Promise<any[]>;
  onCreateChat: (userId: string) => Promise<void>;
  onLogout: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChat,
  currentUser,
  onSelectChat,
  onlineUsers,
  onSearchUsers,
  onCreateChat,
  onLogout
}) => {
  const [hiddenChats, setHiddenChats] = useState<string[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  useEffect(() => {
    const hidden = getHiddenChats();
    setHiddenChats(hidden);
  }, []);

  const visibleChats = chats.filter(chat => !hiddenChats.includes(chat._id));

  const getChatName = (chat: Chat) => {
    if (chat.isGroup) return chat.name || 'Group Chat';
    const other = chat.participants.find(p => p._id !== currentUser?._id);
    return other?.username || 'Unknown User';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.isGroup) return chat.name?.charAt(0).toUpperCase() || 'G';
    const other = chat.participants.find(p => p._id !== currentUser?._id);
    return other?.username?.charAt(0).toUpperCase() || '?';
  };

  const isUserOnline = (chat: Chat) => {
    if (chat.isGroup) return false;
    const other = chat.participants.find(p => p._id !== currentUser?._id);
    return other?.isOnline || onlineUsers.has(other?._id);
  };

  const getLastMessageText = (chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    const isMine = chat.lastMessage.sender?._id === currentUser?._id;
    return `${isMine ? 'You: ' : ''}${chat.lastMessage.content}`;
  };

  const getLastMessageTime = (chat: Chat) => {
    if (!chat.lastMessage) return '';
    const date = new Date(chat.lastMessage.createdAt || chat.lastActivity);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diff < 1) return 'now';
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msgDate = new Date(date);
    msgDate.setHours(0, 0, 0, 0);
    if (msgDate.getTime() === today.getTime()) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    if (msgDate.getTime() === yest.getTime()) return 'Yesterday';
    if (diff < 7 * 1440) return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const getMessageStatus = (chat: Chat) => {
    if (!chat.lastMessage) return null;
    const isMine = chat.lastMessage.sender?._id === currentUser?._id;
    if (!isMine) return null;
    const status = chat.lastMessage.status || 'sent';
    switch (status) {
      case 'sent':
        return <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginRight: '3px' }}><path d="M9 2.5L3.5 8L1 5.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      case 'delivered':
        return <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#8696a0', marginRight: '3px' }}><path d="M9 2.5L3.5 8L1 5.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 2.5L5.5 8L4.5 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      case 'read':
        return <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: '#53bdeb', marginRight: '3px' }}><path d="M9 2.5L3.5 8L1 5.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 2.5L5.5 8L4.5 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      default:
        return null;
    }
  };

  return (
  <div style={{ height: '100%', background: '#111b21', display: 'flex', flexDirection: 'column' }}>
    {/* Üst bar - ChatApp + Logout + Yeni Sohbet */}
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid #8696a026',
      background: '#202c33',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h1 style={{ margin: 0, color: '#e9edef', fontSize: '21px' }}>ChatApp</h1>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => setShowNewChatModal(true)}
          title="Yeni sohbet başlat"
          style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '20px' }}
        >
          ➕
        </button>
        <button
          onClick={onLogout}
          title="Çıkış yap"
          style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '18px' }}
        >
          🚪
        </button>
      </div>
    </div>

    {/* Sohbet listesi */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {visibleChats.map((chat) => {
        const isActive = activeChat?._id === chat._id;
        return (
          <div
            key={chat._id}
            onClick={() => onSelectChat(chat._id)}
            onContextMenu={(e) => {
              e.preventDefault();
              const confirmed = window.confirm("Bu sohbeti gizlemek istiyor musunuz?");
              if (confirmed) {
                addHiddenChat(chat._id);
                setHiddenChats(prev => [...prev, chat._id]);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              cursor: 'pointer',
              background: isActive ? '#2a3942' : 'transparent',
              borderLeft: isActive ? '4px solid #00a884' : '4px solid transparent'
            }}
          >
            <div style={{
              marginRight: '15px',
              background: '#764ba2',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {getChatAvatar(chat)}
            </div>
            <div>
              <div style={{ color: '#e9edef' }}>{getChatName(chat)}</div>
              <div style={{ color: '#8696a0', fontSize: '13px' }}>{getLastMessageText(chat)}</div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Yeni Sohbet Modalı */}
    <NewChatModal
      show={showNewChatModal}
      onHide={() => setShowNewChatModal(false)}
      onSearchUsers={onSearchUsers}
      onCreateChat={onCreateChat}
      isSearching={false}
    />
  </div>
);
}