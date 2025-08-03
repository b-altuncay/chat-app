import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onClose }) => {
  return (
    <ul
      style={{
        position: 'fixed',
        top: y,
        left: x,
        backgroundColor: '#2A3942',
        borderRadius: '6px',
        padding: '4px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 1000,
        listStyle: 'none',
        margin: 0,
        minWidth: '160px',
        color: '#e9edef'
      }}
      onMouseLeave={onClose}
    >
      <li
        onClick={onDelete}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Delete this message for me.
      </li>
    </ul>
  );
};
