// src/components/Sidebar/NewChatModal.tsx
import React, { useState } from 'react';
import { Modal, Form, ListGroup, Spinner, Badge, Button } from 'react-bootstrap';
import { User } from '../../types';

interface NewChatModalProps {
  show: boolean;
  onHide: () => void;
  onSearchUsers: (query: string) => Promise<User[]>;
  onCreateChat: (userId: string) => Promise<void>;
  isSearching: boolean;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  show,
  onHide,
  onSearchUsers,
  onCreateChat,
  isSearching
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await onSearchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleCreateChat = async (userId: string) => {
    try {
      setIsCreating(true);
      await onCreateChat(userId);
      handleClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onHide();
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" size="sm" className="me-2" />
          <span className="text-muted">Searching...</span>
        </div>
      );
    }

    if (searchQuery.length < 2) {
      return (
        <div className="text-center p-4 text-muted">
          <div style={{ fontSize: '2rem' }} className="mb-2">🔍</div>
          <p className="mb-0">Type at least 2 characters to search</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center p-4 text-muted">
          <div style={{ fontSize: '2rem' }} className="mb-2">😞</div>
          <p className="mb-0">No users found</p>
          <small>Try a different search term</small>
        </div>
      );
    }

    return (
      <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {searchResults.map((user) => (
          <ListGroup.Item
            key={user._id}
            action
            onClick={() => handleCreateChat(user._id)}
            disabled={isCreating}
            className="d-flex align-items-center p-3"
            style={{ cursor: isCreating ? 'not-allowed' : 'pointer' }}
          >
            <div className="position-relative me-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)'
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              
              {/* Online indicator */}
              {user.isOnline && (
                <div
                  className="position-absolute rounded-circle border border-2 border-white"
                  style={{
                    width: '12px',
                    height: '12px',
                    background: '#28a745',
                    bottom: '0',
                    right: '0'
                  }}
                />
              )}
            </div>
            
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h6 className="mb-0 fw-semibold">
                  {user.username}
                </h6>
                {user.isOnline && (
                  <Badge bg="success" className="ms-2">
                    Online
                  </Badge>
                )}
              </div>
              <small className="text-muted">
                {user.email}
              </small>
            </div>
            
            {isCreating && (
              <Spinner animation="border" size="sm" className="ms-2" />
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="me-2">💬</span>
          Start New Chat
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-0">
        {/* Search Input */}
        <div className="p-3 border-bottom">
          <Form.Control
            type="text"
            placeholder="Search users by username or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
        </div>
        
        {/* Search Results */}
        <div style={{ minHeight: '200px' }}>
          {renderSearchResults()}
        </div>
      </Modal.Body>
      
      <Modal.Footer className="border-0 pt-0">
        <small className="text-muted">
          💡 Tip: You can search by username or email address
        </small>
      </Modal.Footer>
    </Modal>
  );
};