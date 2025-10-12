import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Plus, ArrowLeft, MoreVertical, Trash } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocation } from "react-router";
import { useAction } from "convex/react";
import { api as convexApi } from "@/convex/_generated/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Messages() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation() as { state?: { partnerId?: Id<"users"> } };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<Id<"users"> | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"messages"> | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Add: initialize selected partner from navigation state
  // This lets Alerts > Messages tab open a specific thread
  // when user taps a conversation item.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    if (location?.state?.partnerId) {
      setSelectedPartnerId(location.state.partnerId);
    }
    return null;
  });

  const getUploadUrl = useAction(convexApi.files.getUploadUrl);

  const conversations = useQuery(api.messages.listConversations, isAuthenticated ? {} : "skip");
  const thread = useQuery(api.messages.listThread,
    selectedPartnerId ? {
      partnerId: selectedPartnerId,
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessageMut = useMutation(api.messages.deleteMessage);

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

  // Derive selected partner display
  const selectedConversation = conversations?.find(c => c.partnerId === selectedPartnerId);
  const selectedPartnerName = selectedConversation?.partner?.name || "Chat";

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
    if (!selectedPartnerId) return;
    if (!messageText.trim() && selectedFiles.length === 0) return;

    try {
      setIsUploading(true);

      // Send all selected images first (each as its own message)
      for (const file of selectedFiles) {
        const url = await getUploadUrl({});
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await res.json();

        await sendMessage({
          recipientId: selectedPartnerId,
          body: "",
          imageStorageId: storageId,
        });
      }

      // Then send text (if any)
      if (messageText.trim()) {
        await sendMessage({
          recipientId: selectedPartnerId,
          body: messageText.trim(),
        });
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-3xl mx-auto px-0 sm:px-4 py-0 sm:py-8">
        {/* Header + subtitle only when NOT in a thread */}
        {!selectedPartnerId && (
          <div className="px-4 sm:px-0 mb-4 sm:mb-8 pt-6 sm:pt-0">
            <h1 className="text-3xl font-bold mb-2">Messages</h1>
            <p className="text-muted-foreground">
              Connect with other writers and readers
            </p>
          </div>
        )}

        {/* Thread view (full-screen style) */}
        {selectedPartnerId ? (
          <Card className="sm:rounded-lg rounded-none border-0 sm:border">
            {/* Compact chat header with Back + partner info */}
            <CardHeader className="py-2 px-2 sm:px-4 border-b">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => navigate("/notifications", { state: { tab: "messages" } })}
                  aria-label="Go back"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border-[0.5px] border-muted/60 hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-0.5 border-[0.5px] border-muted/60 rounded-full px-2 py-0.5">
                  <Avatar className="h-10 w-10 ring-[0.5px] ring-border/70">
                    <AvatarImage src={(selectedConversation?.partner as any)?.avatarImage || selectedConversation?.partner?.image} />
                    <AvatarFallback>
                      {selectedConversation?.partner?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg md:text-xl font-semibold px-2">
                    {selectedPartnerName}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[calc(100vh-56px-56px)] sm:h-[600px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {thread?.page.slice().reverse().map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Bubble */}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg ${
                          message.senderId === user?._id
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

                      {/* Actions: three-dot on the right side for own messages */}
                      {message.senderId === user?._id && (
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
                                  setDeleteId(message._id as Id<"messages">);
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
                ))}
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
                            await deleteMessageMut({ _id: deleteId });
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

              {/* Composer - make it always visible (sticky) */}
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
                    disabled={!selectedPartnerId || isUploading}
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
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {conversations?.map((conversation) => (
                  <div
                    key={conversation.partnerId}
                    className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                      selectedPartnerId === conversation.partnerId ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedPartnerId(conversation.partnerId)}
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

              {conversations?.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No conversations yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}