import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Calendar, BellRing, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authService, adminService, Notification } from "../../services/api";
import { notificationSchema, NotificationFormData } from "../../lib/validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { format } from "date-fns";

const Events = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = authService.getCurrentUser();
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Get all notifications for this admin's department
      const notifications: Notification[] = JSON.parse(localStorage.getItem('notifications') || '[]');
      const adminNotifications = notifications.filter(n => 
        n.department === currentUser?.department || n.department === 'All'
      );
      setNotifications(adminNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      department: currentUser?.department || ""
    }
  });
  
  const onSubmit = async (data: NotificationFormData) => {
    setIsSubmitting(true);
    try {
      // Force the department to be the admin's department
      const notification = await adminService.createNotification({
        title: data.title,
        description: data.description,
        department: currentUser?.department || "",
        deadline: data.deadline
      });
      
      toast("Notification sent successfully!");
      setSuccess(true);
      form.reset({
        title: "",
        description: "",
        deadline: "",
        department: currentUser?.department || ""
      });
      
      // Add the new notification to the list
      setNotifications(prev => [notification, ...prev]);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast(error.message || "Failed to send notification");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Events & Notifications</h1>
      
      <Tabs defaultValue="create">
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="history">View History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          {success && (
            <Alert className="bg-green-50 border-green-200 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Notification Sent!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your notification has been successfully sent to all students in the {currentUser?.department} department.
              </AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BellRing className="mr-2 h-5 w-5" />
                New Event Notification
              </CardTitle>
              <CardDescription>
                Create a notification that will be sent to all students in your department ({currentUser?.department}).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter event title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide details about the event"
                            className="min-h-32" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" /> Event Deadline (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Hidden field - we'll always use the admin's department */}
                  <input 
                    type="hidden" 
                    {...form.register("department")} 
                    value={currentUser?.department || ""} 
                  />
                  
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> This notification will be sent to all students in the <strong>{currentUser?.department}</strong> department.
                    </p>
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting ? "Sending..." : "Send Notification"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BellRing className="mr-2 h-5 w-5" />
                Notification History
              </CardTitle>
              <CardDescription>
                View all notifications you've sent to students in your department.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={fetchNotifications}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
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
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <BellRing className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Notifications</h3>
                  <p className="text-gray-500">
                    You haven't created any notifications yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card key={notification.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <h3 className="font-medium text-lg">{notification.title}</h3>
                        <p className="text-gray-700 mt-1">{notification.description}</p>
                        
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          {notification.deadline ? (
                            <span>Deadline: {format(new Date(notification.deadline), 'MMM d, yyyy')}</span>
                          ) : (
                            <span>Posted: {format(new Date(notification.createdAt), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Events;
