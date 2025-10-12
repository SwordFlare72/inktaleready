import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

// Create a new group chat
export const createGroupChat = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    // Validate minimum members (3 including creator)
    if (args.memberIds.length < 2) {
      throw new Error("Group chat requires at least 3 members including yourself");
    }

    // Ensure creator is in the member list
    const allMembers = [user._id, ...args.memberIds.filter(id => id !== user._id)];

    const groupId = await ctx.db.insert("groupChats", {
      name: args.name.trim(),
      creatorId: user._id,
      memberIds: allMembers,
    });

    return groupId;
  },
});

// Add member to group (creator only)
export const addGroupMember = mutation({
  args: {
    groupChatId: v.id("groupChats"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const group = await ctx.db.get(args.groupChatId);
    if (!group) throw new Error("Group not found");

    // Only creator can add members
    if (group.creatorId !== user._id) {
      throw new Error("Only the group creator can add members");
    }

    // Check if user is already a member
    if (group.memberIds.includes(args.userId)) {
      throw new Error("User is already a member");
    }

    await ctx.db.patch(args.groupChatId, {
      memberIds: [...group.memberIds, args.userId],
    });

    return null;
  },
});

// Remove member from group (creator only)
export const removeGroupMember = mutation({
  args: {
    groupChatId: v.id("groupChats"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const group = await ctx.db.get(args.groupChatId);
    if (!group) throw new Error("Group not found");

    // Only creator can remove members
    if (group.creatorId !== user._id) {
      throw new Error("Only the group creator can remove members");
    }

    // Creator cannot remove themselves
    if (args.userId === user._id) {
      throw new Error("Creator cannot remove themselves. Use leave group instead.");
    }

    const newMemberIds = group.memberIds.filter(id => id !== args.userId);
    
    await ctx.db.patch(args.groupChatId, {
      memberIds: newMemberIds,
    });

    return null;
  },
});

// Leave group chat
export const leaveGroupChat = mutation({
  args: {
    groupChatId: v.id("groupChats"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const group = await ctx.db.get(args.groupChatId);
    if (!group) throw new Error("Group not found");

    if (!group.memberIds.includes(user._id)) {
      throw new Error("You are not a member of this group");
    }

    const newMemberIds = group.memberIds.filter(id => id !== user._id);

    // If last member or creator leaves, delete the group
    if (newMemberIds.length === 0 || user._id === group.creatorId) {
      await ctx.db.delete(args.groupChatId);
      // Also delete all group messages
      const messages = await ctx.db
        .query("groupMessages")
        .withIndex("by_group", (q) => q.eq("groupChatId", args.groupChatId))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
    } else {
      await ctx.db.patch(args.groupChatId, {
        memberIds: newMemberIds,
      });
    }

    return null;
  },
});

// Send message to group
export const sendGroupMessage = mutation({
  args: {
    groupChatId: v.id("groupChats"),
    body: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    const group = await ctx.db.get(args.groupChatId);
    if (!group) throw new Error("Group not found");

    if (!group.memberIds.includes(user._id)) {
      throw new Error("You are not a member of this group");
    }

    return await ctx.db.insert("groupMessages", {
      groupChatId: args.groupChatId,
      senderId: user._id,
      body: args.body,
      imageStorageId: args.imageStorageId,
    });
  },
});

// List user's group chats
export const listUserGroupChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allGroups = await ctx.db.query("groupChats").collect();
    
    // Filter groups where user is a member
    const userGroups = allGroups.filter(group => 
      group.memberIds.includes(user._id)
    );

    // Get last message for each group
    const groupsWithDetails = await Promise.all(
      userGroups.map(async (group) => {
        const messages = await ctx.db
          .query("groupMessages")
          .withIndex("by_group", (q) => q.eq("groupChatId", group._id))
          .collect();

        const sortedMessages = messages.sort((a, b) => b._creationTime - a._creationTime);
        const lastMessage = sortedMessages[0];

        const lastMessagePreview = lastMessage
          ? lastMessage.body && lastMessage.body.trim().length > 0
            ? lastMessage.body
            : "[Image]"
          : "No messages yet";

        return {
          ...group,
          memberCount: group.memberIds.length,
          lastMessage: lastMessagePreview,
          lastMessageTime: lastMessage?._creationTime || group._creationTime,
        };
      })
    );

    return groupsWithDetails.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

// Get group chat by ID with member details
export const getGroupChatById = query({
  args: {
    groupChatId: v.id("groupChats"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const group = await ctx.db.get(args.groupChatId);
    if (!group) return null;

    if (!group.memberIds.includes(user._id)) {
      return null;
    }

    const members = await Promise.all(
      group.memberIds.map(async (memberId) => {
        const member = await ctx.db.get(memberId);
        return member
          ? {
              _id: member._id,
              name: member.name,
              image: member.image,
              avatarImage: member.avatarImage,
            }
          : null;
      })
    );

    return {
      ...group,
      members: members.filter(m => m !== null),
    };
  },
});

// List group messages with pagination
export const listGroupMessages = query({
  args: {
    groupChatId: v.id("groupChats"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: null };

    const group = await ctx.db.get(args.groupChatId);
    if (!group || !group.memberIds.includes(user._id)) {
      return { page: [], isDone: true, continueCursor: null };
    }

    const allMessages = await ctx.db
      .query("groupMessages")
      .withIndex("by_group", (q) => q.eq("groupChatId", args.groupChatId))
      .collect();

    allMessages.sort((a, b) => b._creationTime - a._creationTime);

    const startIndex = args.paginationOpts.cursor
      ? parseInt(args.paginationOpts.cursor)
      : 0;
    const endIndex = startIndex + args.paginationOpts.numItems;

    const page = allMessages.slice(startIndex, endIndex);
    const isDone = endIndex >= allMessages.length;
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
                avatarImage: sender.avatarImage,
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

// Get group members
export const getGroupMembers = query({
  args: {
    groupChatId: v.id("groupChats"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const group = await ctx.db.get(args.groupChatId);
    if (!group || !group.memberIds.includes(user._id)) {
      return [];
    }

    const members = await Promise.all(
      group.memberIds.map(async (memberId) => {
        const member = await ctx.db.get(memberId);
        return member
          ? {
              _id: member._id,
              name: member.name,
              image: member.image,
              avatarImage: member.avatarImage,
              bio: member.bio,
              isCreator: memberId === group.creatorId,
            }
          : null;
      })
    );

    return members.filter(m => m !== null);
  },
});
