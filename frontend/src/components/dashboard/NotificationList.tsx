import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Bell, Calendar, Info, CheckCircle, RefreshCw, Eye } from "lucide-react";
import { studentService, Notification, authService } from "../../services/api";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";

const NotificationList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const currentUser = authService.getCurrentUser();
  
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await studentService.getNotifications();
        setNotifications(data);
        
        // Get read notification IDs from localStorage
        if (currentUser?.id) {
          const readIds = JSON.parse(localStorage.getItem(`read-notifications-${currentUser.id}`) || '[]');
          setReadNotifications(readIds);
          
          // Update unread count in localStorage
          const unreadCount = data.filter(n => !readIds.includes(n.id)).length;
          localStorage.setItem(`unreadNotificationsCount-${currentUser.id}`, unreadCount.toString());
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);
  
  const markAsRead = (notificationId: string) => {
    if (currentUser?.id) {
      const updatedReadIds = [...readNotifications, notificationId];
      setReadNotifications(updatedReadIds);
      localStorage.setItem(`read-notifications-${currentUser.id}`, JSON.stringify(updatedReadIds));
      
      // Update unread count
      const unreadCount = notifications.filter(n => !updatedReadIds.includes(n.id)).length;
      localStorage.setItem(`unreadNotificationsCount-${currentUser.id}`, unreadCount.toString());
    }
  };
  
  const isRead = (notificationId: string) => {
    return readNotifications.includes(notificationId);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-8 w-8 text-edu-primary animate-spin" />
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No Notifications</h3>
          <p className="text-gray-500 mt-1">
            You don't have any notifications at this time.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`overflow-hidden ${isRead(notification.id) ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div className={`h-1 ${isRead(notification.id) ? 'bg-gray-300' : 'bg-edu-primary'}`}></div>
          <CardContent className="p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Bell className={`h-5 w-5 mr-2 ${isRead(notification.id) ? 'text-gray-400' : 'text-edu-primary'}`} />
                  <h3 className={`font-medium ${isRead(notification.id) ? 'text-gray-600' : 'text-gray-800'}`}>
                    {notification.title}
                    {!isRead(notification.id) && (
                      <Badge className="ml-2 bg-edu-primary text-xs">New</Badge>
                    )}
                  </h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </Badge>
              </div>
              
              <p className={`text-sm ${isRead(notification.id) ? 'text-gray-500' : 'text-gray-600'}`}>
                {notification.description}
              </p>
              
              <div className="flex items-center justify-between">
                {notification.deadline && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Deadline: {new Date(notification.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                
                {!isRead(notification.id) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto text-xs"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark as Read
                  </Button>
                )}
                
                {isRead(notification.id) && (
                  <span className="ml-auto text-xs text-gray-400 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Read
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NotificationList;
