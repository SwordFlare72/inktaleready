import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Plus, ArrowLeft, MoreVertical, Trash, Users } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocation } from "react-router";
import { useAction } from "convex/react";
import { api as convexApi } from "@/convex/_generated/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Messages() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation() as { state?: { partnerId?: Id<"users">; groupChatId?: Id<"groupChats"> } };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<Id<"users"> | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groupChats"> | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"messages"> | Id<"groupMessages"> | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // New Message dialog states
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [messageType, setMessageType] = useState<"direct" | "group" | null>(null);
  
  // Group chat creation states
  const [groupName, setGroupName] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Array<{ _id: string; name?: string | null; image?: string | null; avatarImage?: string | null }>>([]);
  
  // Group members sheet
  const [showMembersSheet, setShowMembersSheet] = useState(false);

  // Initialize from navigation state
  useState(() => {
    if (location?.state?.partnerId) {
      setSelectedPartnerId(location.state.partnerId);
      setSelectedGroupId(null);
    } else if (location?.state?.groupChatId) {
      setSelectedGroupId(location.state.groupChatId);
      setSelectedPartnerId(null);
    }
    return null;
  });

  const getUploadUrl = useAction(convexApi.files.getUploadUrl);

  const conversations = useQuery(api.messages.listConversations, isAuthenticated ? {} : "skip");
  const groupChats = useQuery(convexApi.groupChats.listUserGroupChats, isAuthenticated ? {} : "skip");
  const thread = useQuery(api.messages.listThread,
    selectedPartnerId ? {
      partnerId: selectedPartnerId,
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );
  const groupThread = useQuery(convexApi.groupChats.listGroupMessages,
    selectedGroupId ? {
      groupChatId: selectedGroupId,
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );
  const groupDetails = useQuery(convexApi.groupChats.getGroupChatById,
    selectedGroupId ? { groupChatId: selectedGroupId } : "skip"
  );
  const groupMembers = useQuery(convexApi.groupChats.getGroupMembers,
    selectedGroupId ? { groupChatId: selectedGroupId } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const sendGroupMessage = useMutation(convexApi.groupChats.sendGroupMessage);
  const deleteMessageMut = useMutation(api.messages.deleteMessage);
  const createGroupChat = useMutation(convexApi.groupChats.createGroupChat);
  const removeGroupMember = useMutation(convexApi.groupChats.removeGroupMember);
  const leaveGroupChat = useMutation(convexApi.groupChats.leaveGroupChat);
  
  const searchResults = useQuery(api.users.searchUsers, 
    isAuthenticated && groupMemberSearch.trim().length >= 2 ? { q: groupMemberSearch.trim() } : "skip"
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your messages
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive selected conversation/group display
  const selectedConversation = conversations?.find(c => c.partnerId === selectedPartnerId);
  const selectedPartnerName = selectedConversation?.partner?.name || "Chat";
  const selectedGroupName = groupDetails?.name || "Group Chat";
  const isGroupChat = !!selectedGroupId;
  const isCreator = groupDetails?.creatorId === user?._id;

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleSendMessage = async () => {
    if (isGroupChat && !selectedGroupId) return;
    if (!isGroupChat && !selectedPartnerId) return;
    if (!messageText.trim() && selectedFiles.length === 0) return;

    try {
      setIsUploading(true);

      // Send all selected images first
      for (const file of selectedFiles) {
        const url = await getUploadUrl({});
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await res.json();

        if (isGroupChat && selectedGroupId) {
          await sendGroupMessage({
            groupChatId: selectedGroupId,
            body: "",
            imageStorageId: storageId,
          });
        } else if (selectedPartnerId) {
          await sendMessage({
            recipientId: selectedPartnerId,
            body: "",
            imageStorageId: storageId,
          });
        }
      }

      // Then send text (if any)
      if (messageText.trim()) {
        if (isGroupChat && selectedGroupId) {
          await sendGroupMessage({
            groupChatId: selectedGroupId,
            body: messageText.trim(),
          });
        } else if (selectedPartnerId) {
          await sendMessage({
            recipientId: selectedPartnerId,
            body: messageText.trim(),
          });
        }
      }

      setMessageText("");
      setSelectedFiles([]);
      toast.success("Sent!");
    } catch (error) {
      toast.error("Failed to send");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedGroupMembers.length < 2) {
      toast.error("Please select at least 2 other members (3 total including you)");
      return;
    }

    try {
      const groupId = await createGroupChat({
        name: groupName.trim(),
        memberIds: selectedGroupMembers.map(m => m._id as Id<"users">),
      });
      toast.success("Group created!");
      setNewMessageOpen(false);
      setMessageType(null);
      setGroupName("");
      setSelectedGroupMembers([]);
      setGroupMemberSearch("");
      // Open the new group
      setSelectedGroupId(groupId);
      setSelectedPartnerId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    }
  };

  const handleRemoveMember = async (memberId: Id<"users">) => {
    if (!selectedGroupId) return;
    try {
      await removeGroupMember({ groupChatId: selectedGroupId, userId: memberId });
      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    try {
      await leaveGroupChat({ groupChatId: selectedGroupId });
      toast.success("Left group");
      setSelectedGroupId(null);
      setShowMembersSheet(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to leave group");
    }
  };

  const currentMessages = isGroupChat ? groupThread?.page : thread?.page;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-3xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
        {/* Header + subtitle only when NOT in a thread */}
        {!selectedPartnerId && !selectedGroupId && (
          <div className="px-4 sm:px-0 mb-4 sm:mb-8 pt-6 sm:pt-0">
            <h1 className="text-3xl font-bold mb-2">Messages</h1>
            <p className="text-muted-foreground">
              Connect with other writers and readers
            </p>
          </div>
        )}

        {/* Thread view (full-screen style) */}
        {(selectedPartnerId || selectedGroupId) ? (
          <Card className="sm:rounded-lg rounded-none border-0 sm:border">
            {/* Compact chat header with Back + partner/group info */}
            <CardHeader className="py-2 px-2 sm:px-4 border-b">
              <div className="flex items-center justify-between gap-0.5">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => navigate("/notifications", { state: { tab: "messages" } })}
                    aria-label="Go back"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full border-[0.5px] border-muted/60 hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-0.5 border-[0.5px] border-muted/60 rounded-full px-2 py-0.5">
                    {isGroupChat ? (
                      <>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-[0.5px] ring-border/70">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="px-2">
                          <CardTitle className="text-lg md:text-xl font-semibold">
                            {selectedGroupName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {groupDetails?.members?.length || 0} members
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-10 w-10 ring-[0.5px] ring-border/70">
                          <AvatarImage src={(selectedConversation?.partner as any)?.avatarImage || selectedConversation?.partner?.image} />
                          <AvatarFallback>
                            {selectedConversation?.partner?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-lg md:text-xl font-semibold px-2">
                          {selectedPartnerName}
                        </CardTitle>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Group members button */}
                {isGroupChat && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMembersSheet(true)}
                    aria-label="View members"
                  >
                    <Users className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[calc(100vh-56px-56px)] sm:h-[600px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {currentMessages?.slice().reverse().map((message) => {
                  const isOwnMessage = message.senderId === user?._id;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {/* Show avatar for group messages from others */}
                        {isGroupChat && !isOwnMessage && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={(message.sender as any)?.avatarImage || message.sender?.image} />
                            <AvatarFallback>
                              {message.sender?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex flex-col">
                          {/* Show sender name for group messages from others */}
                          {isGroupChat && !isOwnMessage && (
                            <p className="text-xs text-muted-foreground mb-1 ml-1">
                              {message.sender?.name || "Anonymous"}
                            </p>
                          )}
                          
                          {/* Bubble */}
                          <div
                            className={`px-3 py-2 rounded-lg ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.body && message.body.trim().length > 0 && (
                              <p className="text-sm">{message.body}</p>
                            )}
                            {message.imageUrl && (
                              <div className="mt-1">
                                <img
                                  src={message.imageUrl}
                                  alt="attachment"
                                  className="rounded-lg max-h-64 w-auto object-cover"
                                />
                              </div>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message._creationTime).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        {/* Actions: three-dot on the right side for own messages */}
                        {isOwnMessage && (
                          <div className="self-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  aria-label="Message options"
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border-[0.5px] border-muted/60 hover:bg-muted"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 cursor-pointer"
                                  onClick={() => {
                                    setDeleteId(message._id as any);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delete confirmation dialog */}
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete message?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={async () => {
                        try {
                          if (deleteId) {
                            await deleteMessageMut({ _id: deleteId as Id<"messages"> });
                          }
                        } catch {
                          // non-blocking
                        } finally {
                          setDeleteOpen(false);
                          setDeleteId(null);
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Composer */}
              <div className="sticky bottom-0 z-10 border-t p-3 sm:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelected}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePickImage}
                    disabled={isUploading}
                    aria-label="Add image"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!messageText.trim() && selectedFiles.length === 0 || isUploading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {isUploading && (
                  <div className="text-xs text-muted-foreground mt-2">Uploading...</div>
                )}
                {!isUploading && selectedFiles.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {selectedFiles.length} {selectedFiles.length === 1 ? "image selected" : "images selected"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Conversations list view
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conversations</CardTitle>
                <Button onClick={() => setNewMessageOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {/* Group chats */}
                {groupChats?.map((group) => (
                  <div
                    key={group._id}
                    className="p-4 cursor-pointer hover:bg-muted transition-colors flex items-center gap-3"
                    onClick={() => {
                      setSelectedGroupId(group._id);
                      setSelectedPartnerId(null);
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold truncate">{group.name}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {group.memberCount} members
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Direct messages */}
                {conversations?.map((conversation) => (
                  <div
                    key={conversation.partnerId}
                    className="p-4 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedPartnerId(conversation.partnerId);
                      setSelectedGroupId(null);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={(conversation.partner as any)?.avatarImage || conversation.partner?.image} />
                        <AvatarFallback>
                          {conversation.partner?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {conversation.partner?.name || "Anonymous"}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.isLastMessageFromMe ? "You: " : ""}
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {conversations?.length === 0 && groupChats?.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No conversations yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog 
        open={newMessageOpen} 
        onOpenChange={(open) => {
          setNewMessageOpen(open);
          if (!open) {
            // Reset all states when dialog closes
            setMessageType(null);
            setGroupName("");
            setSelectedGroupMembers([]);
            setGroupMemberSearch("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {messageType === null ? "New Message" : messageType === "direct" ? "Send Direct Message" : "Create Group Chat"}
            </DialogTitle>
          </DialogHeader>
          
          {/* Initial choice screen */}
          {messageType === null && (
            <div className="space-y-3 py-4">
              <Button
                className="w-full justify-start h-auto py-4"
                variant="outline"
                onClick={() => setMessageType("direct")}
              >
                <MessageCircle className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Direct Message</div>
                  <div className="text-xs text-muted-foreground">Send a message to one person</div>
                </div>
              </Button>
              <Button
                className="w-full justify-start h-auto py-4"
                variant="outline"
                onClick={() => setMessageType("group")}
              >
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Create Group Chat</div>
                  <div className="text-xs text-muted-foreground">Start a conversation with multiple people</div>
                </div>
              </Button>
            </div>
          )}

          {/* Direct message screen */}
          {messageType === "direct" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search User</label>
                <Input
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  placeholder="Search users..."
                />
                
                {/* Search results */}
                {groupMemberSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {searchResults?.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => {
                          setSelectedPartnerId(u._id as Id<"users">);
                          setSelectedGroupId(null);
                          setNewMessageOpen(false);
                          setMessageType(null);
                          setGroupMemberSearch("");
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-2"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={(u as any).avatarImage || (u as any).image || undefined} />
                          <AvatarFallback>{(u as any).name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{(u as any).name || "Anonymous"}</div>
                        </div>
                      </button>
                    ))}
                    {searchResults && searchResults.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No users found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setMessageType(null);
                  setGroupMemberSearch("");
                }}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Group chat creation screen */}
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
                <label className="text-sm font-medium mb-2 block">
                  Add Members (minimum 2 others)
                </label>
                <Input
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  placeholder="Search users..."
                />
                
                {/* Selected members */}
                {selectedGroupMembers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedGroupMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
                      >
                        <span>{member.name || "Anonymous"}</span>
                        <button
                          onClick={() => setSelectedGroupMembers(prev => prev.filter(m => m._id !== member._id))}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search results */}
                {groupMemberSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {searchResults?.map((u) => {
                      const isSelected = selectedGroupMembers.some(m => m._id === (u as any)._id);
                      return (
                        <button
                          key={u._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers(prev => prev.filter(m => m._id !== (u as any)._id));
                            } else {
                              setSelectedGroupMembers(prev => [...prev, u as any]);
                            }
                          }}
                          className={`w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-2 ${isSelected ? "bg-primary/10" : ""}`}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={(u as any).avatarImage || (u as any).image || undefined} />
                            <AvatarFallback>{(u as any).name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{(u as any).name || "Anonymous"}</div>
                          </div>
                          {isSelected && <span className="text-primary">✓</span>}
                        </button>
                      );
                    })}
                    {searchResults && searchResults.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">No users found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setMessageType(null);
                  setGroupName("");
                  setSelectedGroupMembers([]);
                  setGroupMemberSearch("");
                }}>
                  Back
                </Button>
                <Button onClick={handleCreateGroup}>
                  Create Group
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Members Sheet */}
      <Sheet open={showMembersSheet} onOpenChange={setShowMembersSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Group Members</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {groupMembers?.map((member) => (
              <div key={member._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={(member as any).avatarImage || member.image} />
                    <AvatarFallback>{member.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name || "Anonymous"}</p>
                    {(member as any).isCreator && (
                      <p className="text-xs text-muted-foreground">Creator</p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                {isCreator && member._id !== user?._id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member._id as Id<"users">)}
                  >
                    Remove
                  </Button>
                )}
                {member._id === user?._id && !isCreator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveGroup}
                  >
                    Leave
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}