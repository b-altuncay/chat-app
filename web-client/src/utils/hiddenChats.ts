// src/utils/hiddenChats.ts

const CHAT_STORAGE_KEY = 'hiddenChats';

export const getHiddenChats = (): string[] => {
  return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
};

export const addHiddenChat = (chatId: string): void => {
  const hidden = getHiddenChats();
  if (!hidden.includes(chatId)) {
    const updated = [...hidden, chatId];
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  }
};
