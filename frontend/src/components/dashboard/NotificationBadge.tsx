import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "../ui/badge";
import { authService } from "../../services/api";

const NotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id || 'unknown';
  
  // Check localStorage for unread notifications count
  useEffect(() => {
    const checkNotifications = () => {
      const count = parseInt(localStorage.getItem(`unreadNotificationsCount-${userId}`) || '0');
      setUnreadCount(count);
    };
    
    // Check initially
    checkNotifications();
    
    // Set up an interval to check for new notifications
    const interval = setInterval(checkNotifications, 5000);
    
    // Storage event listener for cross-tab updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `unreadNotificationsCount-${userId}`) {
        const count = parseInt(e.newValue || '0');
        setUnreadCount(count);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);
  
  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[1.2rem] bg-red-500 text-white"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  );
};

export default NotificationBadge;
