import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { BellRing, Calendar, RefreshCw, Check } from "lucide-react";
import { studentService, Notification } from "../../services/api";
import { format } from "date-fns";

const Notifications = () => {
  const [notifications, setNotifications] = useState<(Notification & { read?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await studentService.getNotifications();
      
      // Check if notifications have been read in localStorage
      const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      
      // Mark notifications as read if they are in localStorage
      const notificationsWithReadStatus = data.map(notification => ({
        ...notification,
        read: readNotifications.includes(notification.id)
      }));
      
      setNotifications(notificationsWithReadStatus);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const markAsRead = (notificationId: string) => {
    // Update local state
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    // Save to localStorage
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
    }
  };
  
  const markAllAsRead = () => {
    // Update all notifications as read
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    // Save all notification IDs to localStorage
    const allNotificationIds = notifications.map(notification => notification.id);
    localStorage.setItem('readNotifications', JSON.stringify(allNotificationIds));
  };
  
  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Update the notification count in localStorage for the badge in the sidebar
  useEffect(() => {
    localStorage.setItem('unreadNotificationsCount', unreadCount.toString());
  }, [unreadCount]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
          
          <Button variant="outline" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <BellRing className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Notifications</h3>
            <p className="text-gray-500">
              You don't have any notifications at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`overflow-hidden transition-all ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <Badge className="bg-blue-500">New</Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mt-1">{notification.description}</p>
                    
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Calendar className="h-4 w-4 mr-1" />
                      {notification.deadline ? (
                        <span>Deadline: {format(new Date(notification.deadline), 'MMM d, yyyy')}</span>
                      ) : (
                        <span>Posted: {format(new Date(notification.createdAt), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3 md:mt-0">
                    {!notification.read && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
