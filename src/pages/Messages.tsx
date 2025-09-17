import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Messages() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<Id<"users"> | null>(null);
  const [messageText, setMessageText] = useState("");

  const conversations = useQuery(api.messages.listConversations, isAuthenticated ? {} : "skip");
  const thread = useQuery(api.messages.listThread,
    selectedPartnerId ? {
      partnerId: selectedPartnerId,
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);

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

  const handleSendMessage = async () => {
    if (!selectedPartnerId || !messageText.trim()) return;

    try {
      await sendMessage({
        recipientId: selectedPartnerId,
        body: messageText.trim(),
      });
      setMessageText("");
      toast.success("Message sent!");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Connect with other writers and readers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
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
                        <AvatarImage src={conversation.partner?.image} />
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

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedPartnerId ? (
              <>
                <CardHeader>
                  <CardTitle>
                    {conversations?.find(c => c.partnerId === selectedPartnerId)?.partner?.name || "Chat"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[500px]">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {thread?.page.slice().reverse().map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user?._id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.body}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message._creationTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
