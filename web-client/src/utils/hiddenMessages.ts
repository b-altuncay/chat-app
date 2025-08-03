// src/utils/hiddenMessages.ts

const STORAGE_KEY = 'hiddenMessages';

export const getHiddenMessages = (chatId: string): string[] => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return all[chatId] || [];
};

export const addHiddenMessage = (chatId: string, messageId: string): void => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (!all[chatId]) {
    all[chatId] = [];
  }
  if (!all[chatId].includes(messageId)) {
    all[chatId].push(messageId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
};
