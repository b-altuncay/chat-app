import React from 'react';

interface Props {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<Props> = ({ x, y, onDelete, onClose }) => {
  return (
    <ul
      style={{
        position: 'fixed',
        top: y,
        left: x,
        backgroundColor: '#fff',
        boxShadow: '0 0 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        listStyle: 'none',
        padding: '8px',
        margin: 0,
        borderRadius: '5px',
      }}
      onMouseLeave={onClose}
    >
      <li
        onClick={onDelete}
        style={{ padding: '5px 10px', cursor: 'pointer' }}
      >
        Delete Message
      </li>
    </ul>
  );
};
