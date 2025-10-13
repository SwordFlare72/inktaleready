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
import { MessageCircle, Send, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Enhanced notification item with professional styling
function NotificationItem({
  n,
  onOpen,
  onMarkRead,
}: {
  n: any;
  onOpen: (n: any) => void;
  onMarkRead: (id: string) => void;
}) {
  // Fetch related data to enrich UI
  const isChapter = n.type === "new_chapter" || n.type === "comment_reply" || n.type === "comment_like";
  const isStory = n.type === "new_story";

  const chapter = useQuery(
    api.chapters.getChapterById,
    isChapter && n.relatedId ? { chapterId: n.relatedId as any } : "skip"
  );
  const story = useQuery(
    api.stories.getStoryById,
    isStory && n.relatedId ? { storyId: n.relatedId as any } : "skip"
  );

  const authorImage =
    (chapter as any)?.story?.author?.avatarImage ||
    (chapter as any)?.story?.author?.image ||
    (story as any)?.author?.avatarImage ||
    (story as any)?.author?.image ||
    undefined;

  const coverImage =
    (chapter as any)?.story?.coverImage ||
    (story as any)?.coverImage ||
    undefined;

  return (
    <div
      className={`cursor-pointer transition-all hover:bg-muted/50 py-4 px-4 relative ${!n.isRead ? "bg-muted/20" : ""}`}
      onClick={() => onOpen(n)}
    >
      {/* Left colored indicator for unread - more subtle */}
      {!n.isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      
      <div className="flex items-start gap-4">
        {/* Left: Author avatar */}
        <div className="flex-shrink-0 pt-1">
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
            <AvatarImage src={authorImage} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {n.type === "new_chapter" ? "C" : n.type === "new_story" ? "S" : "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Middle: Text content */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-semibold text-base leading-snug line-clamp-1">{n.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
          <p className="text-xs text-muted-foreground/80 pt-0.5">
            {new Date(n._creationTime).toLocaleString()}
          </p>
        </div>

        {/* Right: Cover thumbnail if available */}
        {coverImage && (
          <div className="flex-shrink-0">
            <div className="h-16 w-12 overflow-hidden rounded-lg border-2 border-border/50 bg-muted shadow-sm">
              <img
                src={coverImage}
                alt=""
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [openCompose, setOpenCompose] = useState(false);
  const [messageType, setMessageType] = useState<"direct" | "group" | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ _id: string; name?: string | null; image?: string | null } | null>(null);
  const [messageBody, setMessageBody] = useState("");
  
  // Group chat states
  const [groupName, setGroupName] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Array<{ _id: string; name?: string | null; image?: string | null }>>([]);

  const notifications = useQuery(api.notifications.listForUser,
    isAuthenticated ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const searchResults = useQuery(api.users.searchUsers, isAuthenticated && search.trim().length >= 2 ? { q: search.trim() } : "skip");
  const groupSearchResults = useQuery(api.users.searchUsers, isAuthenticated && groupMemberSearch.trim().length >= 2 ? { q: groupMemberSearch.trim() } : "skip");
  const sendMessage = useMutation(api.messages.sendMessage);
  const createGroupChat = useMutation(api.groupChats.createGroupChat);
  const conversations = useQuery(api.messages.listConversations, isAuthenticated ? {} : "skip");
  const groupChats = useQuery(api.groupChats.listUserGroupChats, isAuthenticated ? {} : "skip");

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
      setMessageType(null);
      setSearch("");
      setSelectedUser(null);
      setMessageBody("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length < 2) {
      toast.error("Group name and at least 2 members required");
      return;
    }
    try {
      const groupId = await createGroupChat({
        name: groupName.trim(),
        memberIds: selectedGroupMembers.map((m) => m._id as any),
      });
      toast.success("Group chat created");
      setOpenCompose(false);
      setMessageType(null);
      setGroupName("");
      setGroupMemberSearch("");
      setSelectedGroupMembers([]);
      navigate("/messages", { state: { groupChatId: groupId } });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create group");
    }
  };

  const unreadCount = notifications?.page.filter(n => !n.isRead).length || 0;
  const unreadMessagesCount = conversations?.filter((c: any) => c.hasUnread).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Enhanced header with better spacing */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">Updates</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : "All caught up!"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {unreadCount > 0 && (
                <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="whitespace-nowrap">
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
              <Button onClick={() => {
                setOpenCompose(true);
                setMessageType(null);
              }} size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="notifications" className="relative">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {unreadMessagesCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-0">
            {/* Professional card container with separator lines */}
            <Card className="border-0 shadow-sm">
              <div className="divide-y divide-border">
                {notifications?.page.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    n={notification}
                    onOpen={openNotification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            </Card>

            {notifications?.page.length === 0 && (
              <div className="text-center py-16">
                <BellOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg">No notifications yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <Card className="border-0 shadow-sm">
              <div className="divide-y divide-border">
                {/* Group chats */}
                {(groupChats || []).map((group: any) => (
                  <div
                    key={group._id}
                    className="cursor-pointer hover:bg-muted/50 transition-all py-4 px-4"
                    onClick={() => navigate("/messages", { state: { groupChatId: group._id } })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-background shadow-sm">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate">
                            {group.name}
                          </h4>
                          <span className="text-xs text-muted-foreground/80 whitespace-nowrap">
                            {group.memberCount} members
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate leading-relaxed">
                          {group.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Direct messages */}
                {(conversations || []).map((c: any) => (
                  <div
                    key={c.partnerId}
                    className="cursor-pointer hover:bg-muted/50 transition-all py-4 px-4"
                    onClick={() => navigate("/messages", { state: { partnerId: c.partnerId } })}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                        <AvatarImage src={(c.partner as any)?.avatarImage || c.partner?.image || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {c.partner?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate">
                            {c.partner?.name || "Anonymous"}
                          </h4>
                          <span className="text-xs text-muted-foreground/80 whitespace-nowrap">
                            {new Date(c.lastMessageTime).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate leading-relaxed">
                          {c.isLastMessageFromMe ? "You: " : ""}
                          {c.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {conversations && conversations.length === 0 && (!groupChats || groupChats.length === 0) && (
              <div className="text-center py-16">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg">No messages yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openCompose} onOpenChange={(open) => {
        setOpenCompose(open);
        if (!open) {
          setMessageType(null);
          setSearch("");
          setSelectedUser(null);
          setMessageBody("");
          setGroupName("");
          setGroupMemberSearch("");
          setSelectedGroupMembers([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {messageType === null ? "New Message" : messageType === "direct" ? "Send Direct Message" : "Create Group Chat"}
            </DialogTitle>
          </DialogHeader>

          {/* Initial choice screen */}
          {messageType === null && (
            <div className="space-y-4 py-4">
              <button
                onClick={() => setMessageType("direct")}
                className="w-full p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-muted/50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MessageCircle className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold mb-1">Direct Message</div>
                    <div className="text-sm text-muted-foreground">Send a private message to another user</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMessageType("group")}
                className="w-full p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-muted/50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold mb-1">Create Group Chat</div>
                    <div className="text-sm text-muted-foreground">Start a conversation with multiple users</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Direct Message form */}
          {messageType === "direct" && (
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
                          <AvatarImage src={(u as any).avatarImage || (u as any).image || undefined} />
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
                        <AvatarImage src={(selectedUser as any).avatarImage || selectedUser.image || undefined} />
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
                <Button variant="outline" onClick={() => setMessageType(null)}>Back</Button>
                <Button onClick={handleSendDirect} disabled={!selectedUser || !messageBody.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Group Chat form */}
          {messageType === "group" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Group Name</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Add Members (at least 2)</label>
                <Input
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  placeholder="Search users..."
                />
                {groupMemberSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {groupSearchResults?.map((u) => {
                      const isSelected = selectedGroupMembers.some((m) => m._id === (u as any)._id);
                      return (
                        <button
                          key={u._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers((prev) => prev.filter((m) => m._id !== (u as any)._id));
                            } else {
                              setSelectedGroupMembers((prev) => [...prev, u as any]);
                            }
                          }}
                          className={`w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-2 ${isSelected ? "bg-muted" : ""}`}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={(u as any).avatarImage || (u as any).image || undefined} />
                            <AvatarFallback>{(u as any).name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{(u as any).name || "Anonymous"}</div>
                          </div>
                          {isSelected && <div className="text-primary">✓</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedGroupMembers.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Selected Members ({selectedGroupMembers.length})</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroupMembers.map((m) => (
                      <div key={m._id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <span className="text-sm">{m.name || "Anonymous"}</span>
                        <button
                          onClick={() => setSelectedGroupMembers((prev) => prev.filter((mem) => mem._id !== m._id))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMessageType(null)}>Back</Button>
                <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedGroupMembers.length < 2}>
                  <Users className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}