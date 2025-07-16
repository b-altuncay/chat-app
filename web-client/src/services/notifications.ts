// src/services/notifications.ts
class NotificationService {
  private permission: NotificationPermission = 'default';
  private isPageVisible = true;
  private unreadCount = 0;
  private originalTitle = '';

  constructor() {
    this.originalTitle = document.title;
    this.setupVisibilityListener();
    this.requestPermission();
  }

  // İzin alma
  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return false;
  }

  // Sayfa görünürlük kontrolü
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      
      if (this.isPageVisible) {
        // Sayfa açıldığında unread count'u temizle
        this.clearUnreadCount();
      }
    });
  }

  // Yeni mesaj bildirimi
  showMessageNotification(message: {
    senderName: string;
    content: string;
    chatId: string;
    avatar?: string;
  }): void {
    // Sadece sayfa görünür değilse bildirim göster
    if (this.isPageVisible) return;

    this.incrementUnreadCount();

    if (this.permission === 'granted') {
      const notification = new Notification(`${message.senderName}`, {
        body: message.content,
        icon: message.avatar || '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${message.chatId}`, // Aynı chat'ten gelenleri grupla
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Chat'e yönlendir
        window.location.hash = `#chat/${message.chatId}`;
      };

      // 5 saniye sonra otomatik kapat
      setTimeout(() => notification.close(), 5000);
    }

    // Ses çal
    this.playNotificationSound();
  }

  // Unread count yönetimi
  private incrementUnreadCount(): void {
    this.unreadCount++;
    this.updateTitle();
  }

  clearUnreadCount(): void {
    this.unreadCount = 0;
    this.updateTitle();
  }

  private updateTitle(): void {
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ${this.originalTitle}`;
    } else {
      document.title = this.originalTitle;
    }
  }

  // Bildirim sesi
  private playNotificationSound(): void {
    try {
      // WhatsApp benzeri bildirim sesi
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTKG0/LFdyYFKIHO8diJOQgZZLvt559NEAxPqOPwtmQcBjiR1/LNeS0GJHXI8N2QQAoUXrTp66hWFAlFnuDyvmwhBTKG0/LFdyYGKYDN8tiIOQgZZbrt559NEAxPpOLwtmUcBjiP1/LNeSsGJXXI8N2QQAoUXrPp66hWFAlFnuDyv2wiBDGH0/LGeCYGKYDN8tiIOQgZZrvt559OEAxOpOLwtmUdBjiP1/LNeSsGJXXI8N+QQAoUXrPp66hWFAlFnuDyv2wiBDGH0/LGeCYGKYDN8tiIOQgZZrvt559OEA');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ses çalınamazsa sessizce devam et
      });
    } catch (error) {
      // Ses hatası varsa ignore et
    }
  }

  // Typing bildirimi (daha hafif)
  showTypingNotification(senderName: string, chatId: string): void {
    if (this.isPageVisible) return;

    if (this.permission === 'granted') {
      const notification = new Notification(`${senderName}`, {
        body: 'typing...',
        icon: '/favicon.ico',
        tag: `typing-${chatId}`,
        requireInteraction: false,
        silent: true // Typing için ses yok
      });

      // 2 saniye sonra kapat
      setTimeout(() => notification.close(), 2000);
    }
  }

  // Bildirim durumu
  isEnabled(): boolean {
    return this.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

const notificationService = new NotificationService();
export default notificationService;