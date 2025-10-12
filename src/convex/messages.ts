import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

// Send a message
export const sendMessage = mutation({
  args: {
    recipientId: v.id("users"),
    body: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    return await ctx.db.insert("messages", {
      senderId: user._id,
      recipientId: args.recipientId,
      body: args.body,
      isRead: false,
      imageStorageId: args.imageStorageId,
    });
  },
});

// List conversations
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const allMessages = [...sentMessages, ...receivedMessages];

    const conversationMap: Map<
      Id<"users">,
      {
        partnerId: Id<"users">;
        lastMessage: string;
        lastMessageTime: number;
        isLastMessageFromMe: boolean;
        hasUnread: boolean;
      }
    > = new Map();

    for (const message of allMessages) {
      const partnerId =
        message.senderId === user._id ? message.recipientId : message.senderId;

      const preview =
        (message.body && message.body.trim().length > 0)
          ? message.body
          : "[Image]";

      const existing = conversationMap.get(partnerId);
      if (!existing || message._creationTime > existing.lastMessageTime) {
        // Check if there are any unread messages from this partner
        const unreadFromPartner = receivedMessages.some(
          m => m.senderId === partnerId && !m.isRead
        );
        
        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: preview,
          lastMessageTime: message._creationTime,
          isLastMessageFromMe: message.senderId === user._id,
          hasUnread: unreadFromPartner,
        });
      }
    }

    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const partner = await ctx.db.get(conv.partnerId);
        return {
          ...conv,
          partner: partner
            ? {
                _id: partner._id,
                name: partner.name,
                image: partner.image,
                avatarImage: (partner as any).avatarImage,
              }
            : null,
        };
      })
    );

    return conversations
      .filter((conv) => conv.partner)
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

    const allMessages = await ctx.db.query("messages").collect();

    const threadMessages = allMessages.filter(
      (msg) =>
        (msg.senderId === user._id && msg.recipientId === args.partnerId) ||
        (msg.senderId === args.partnerId && msg.recipientId === user._id)
    );

    threadMessages.sort((a, b) => b._creationTime - a._creationTime);

    const startIndex = args.paginationOpts.cursor
      ? parseInt(args.paginationOpts.cursor)
      : 0;
    const endIndex = startIndex + args.paginationOpts.numItems;

    const page = threadMessages.slice(startIndex, endIndex);
    const isDone = endIndex >= threadMessages.length;
    const continueCursor = isDone ? null : endIndex.toString();

    const messagesWithSender = await Promise.all(
      page.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        const imageUrl = message.imageStorageId
          ? await ctx.storage.getUrl(message.imageStorageId)
          : null;

        return {
          ...message,
          imageUrl,
          sender: sender
            ? {
                _id: sender._id,
                name: sender.name,
                image: sender.image,
              }
            : null,
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

// Delete a message (sender-only)
export const deleteMessage = mutation({
  args: { _id: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const msg = await ctx.db.get(args._id);
    if (!msg) throw new Error("Message not found");

    // Only the sender can delete their message
    if (msg.senderId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args._id);
    return null;
  },
});