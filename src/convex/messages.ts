import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

// Send a message
export const sendMessage = mutation({
  args: {
    recipientId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    return await ctx.db.insert("messages", {
      senderId: user._id,
      recipientId: args.recipientId,
      body: args.body,
      isRead: false,
    });
  },
});

// List conversations
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get all messages where user is sender or recipient
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const allMessages = [...sentMessages, ...receivedMessages];
    
    // Group by conversation partner
    const conversationMap: Map<
      Id<"users">,
      {
        partnerId: Id<"users">;
        lastMessage: string;
        lastMessageTime: number;
        isLastMessageFromMe: boolean;
      }
    > = new Map();
    
    for (const message of allMessages) {
      const partnerId = message.senderId === user._id ? message.recipientId : message.senderId;
      
      // Fix: guard against undefined when reading from the map
      const existing = conversationMap.get(partnerId);
      if (!existing || message._creationTime > existing.lastMessageTime) {
        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: message.body,
          lastMessageTime: message._creationTime,
          isLastMessageFromMe: message.senderId === user._id,
        });
      }
    }

    // Get partner details
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const partner = await ctx.db.get(conv.partnerId);
        return {
          ...conv,
          partner: partner ? {
            _id: partner._id,
            name: partner.name,
            image: partner.image,
          } : null,
        };
      })
    );

    return conversations
      .filter(conv => conv.partner)
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

// Get messages in a thread
export const listThread = query({
  args: {
    partnerId: v.id("users"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: null };

    // Get messages between user and partner
    const allMessages = await ctx.db.query("messages").collect();
    
    const threadMessages = allMessages.filter(msg => 
      (msg.senderId === user._id && msg.recipientId === args.partnerId) ||
      (msg.senderId === args.partnerId && msg.recipientId === user._id)
    );

    threadMessages.sort((a, b) => b._creationTime - a._creationTime);

    // Simple pagination
    const startIndex = args.paginationOpts.cursor ? 
      parseInt(args.paginationOpts.cursor) : 0;
    const endIndex = startIndex + args.paginationOpts.numItems;
    
    const page = threadMessages.slice(startIndex, endIndex);
    const isDone = endIndex >= threadMessages.length;
    const continueCursor = isDone ? null : endIndex.toString();

    const messagesWithSender = await Promise.all(
      page.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender ? {
            _id: sender._id,
            name: sender.name,
            image: sender.image,
          } : null,
        };
      })
    );

    return {
      page: messagesWithSender,
      isDone,
      continueCursor,
    };
  },
});