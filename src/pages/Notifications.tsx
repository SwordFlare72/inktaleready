import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

export default function Notifications() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [openCompose, setOpenCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ _id: string; name?: string | null; image?: string | null } | null>(null);
  const [messageBody, setMessageBody] = useState("");

  const notifications = useQuery(api.notifications.listForUser,
    isAuthenticated ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const searchResults = useQuery(api.users.searchUsers, isAuthenticated && search.trim().length >= 2 ? { q: search.trim() } : "skip");
  const sendMessage = useMutation(api.messages.sendMessage);
  const conversations = useQuery(api.messages.listConversations, isAuthenticated ? {} : "skip");

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

  const openNotification = async (n: any) => {
    try {
      if (!n.isRead) {
        await markRead({ notificationId: n._id as any });
      }
    } catch {
      // non-blocking
    }
    // Route by type
    switch (n.type) {
      case "new_chapter":
      case "comment_reply":
      case "comment_like":
        if (n.relatedId) navigate(`/read/${n.relatedId}`);
        break;
      case "new_story":
        if (n.relatedId) navigate(`/story/${n.relatedId}`);
        break;
      case "new_follower":
        if (n.relatedId) navigate(`/profile/${n.relatedId}`);
        break;
      // Add: announcements deep link handling
      case "announcement":
      case "announcement_reply": {
        try {
          if (n.relatedId) {
            const payload = JSON.parse(n.relatedId);
            if (payload?.authorId && payload?.announcementId) {
              navigate(`/profile/${payload.authorId}?tab=announcements&aid=${payload.announcementId}`);
              break;
            }
          }
        } catch {
          // Fallback: no-op if older notifications without payload
        }
        break;
      }
      default:
        break;
    }
  };

  const handleSendDirect = async () => {
    if (!selectedUser || !messageBody.trim()) return;
    try {
      await sendMessage({ recipientId: selectedUser._id as any, body: messageBody.trim() });
      toast.success("Message sent");
      setOpenCompose(false);
      setSearch("");
      setSelectedUser(null);
      setMessageBody("");
    } catch {
      toast.error("Failed to send message");
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Updates</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllRead} variant="outline">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button onClick={() => setOpenCompose(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-6">
            <div className="space-y-4">
              {notifications?.page.map((notification) => (
                <Card
                  key={notification._id}
                  className={`cursor-pointer transition-colors ${!notification.isRead ? "bg-muted/50" : ""}`}
                  onClick={() => openNotification(notification)}
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
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <div className="space-y-2">
              {(conversations || []).map((c: any) => (
                <Card
                  key={c.partnerId}
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => navigate("/messages", { state: { partnerId: c.partnerId } })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c.partner?.image || undefined} />
                        <AvatarFallback>{c.partner?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold truncate">
                            {c.partner?.name || "Anonymous"}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(c.lastMessageTime).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.isLastMessageFromMe ? "You: " : ""}
                          {c.lastMessage}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {conversations && conversations.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openCompose} onOpenChange={setOpenCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Direct Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search user</label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="Type at least 2 characters..."
              />
              {search.trim().length >= 2 && (
                <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                  {searchResults?.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => setSelectedUser(u as any)}
                      className={`w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-2 ${selectedUser?._id === (u as any)._id ? "bg-muted" : ""}`}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={(u as any).image || undefined} />
                        <AvatarFallback>{(u as any).name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{(u as any).name || "Anonymous"}</div>
                        {(u as any).bio && <div className="text-xs text-muted-foreground line-clamp-1">{(u as any).bio}</div>}
                      </div>
                    </button>
                  ))}
                  {searchResults && searchResults.length === 0 && (
                    <div className="text-sm text-muted-foreground p-2">No users found</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <div className="flex items-center gap-2">
                {selectedUser ? (
                  <>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={selectedUser.image || undefined} />
                      <AvatarFallback>{selectedUser.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedUser.name || "Anonymous"}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Change</Button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Select a user from search</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Input
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && messageBody.trim() && selectedUser) {
                    handleSendDirect();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCompose(false)}>Cancel</Button>
              <Button onClick={handleSendDirect} disabled={!selectedUser || !messageBody.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}