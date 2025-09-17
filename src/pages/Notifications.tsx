import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Notifications() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const notifications = useQuery(api.notifications.listForUser,
    isAuthenticated ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your notifications
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markRead({ notificationId: notificationId as any });
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({});
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const unreadCount = notifications?.page.filter(n => !n.isRead).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="outline">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {notifications?.page.map((notification) => (
            <Card 
              key={notification._id}
              className={`cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-muted/50' : ''
              }`}
              onClick={() => !notification.isRead && handleMarkRead(notification._id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {notification.type === "new_chapter" && <Bell className="h-5 w-5 text-blue-500" />}
                    {notification.type === "comment_reply" && <Bell className="h-5 w-5 text-green-500" />}
                    {notification.type === "new_follower" && <Bell className="h-5 w-5 text-purple-500" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification._creationTime).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification._id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {notifications?.page.length === 0 && (
          <div className="text-center py-12">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
