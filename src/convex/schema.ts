import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// Story genres
export const GENRES = {
  ROMANCE: "romance",
  FANTASY: "fantasy",
  MYSTERY: "mystery",
  SCIFI: "sci-fi",
  HORROR: "horror",
  ADVENTURE: "adventure",
  DRAMA: "drama",
  COMEDY: "comedy",
  THRILLER: "thriller",
  FANFICTION: "fanfiction",
} as const;

export const genreValidator = v.union(
  v.literal(GENRES.ROMANCE),
  v.literal(GENRES.FANTASY),
  v.literal(GENRES.MYSTERY),
  v.literal(GENRES.SCIFI),
  v.literal(GENRES.HORROR),
  v.literal(GENRES.ADVENTURE),
  v.literal(GENRES.DRAMA),
  v.literal(GENRES.COMEDY),
  v.literal(GENRES.THRILLER),
  v.literal(GENRES.FANFICTION),
);

export type Genre = Infer<typeof genreValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      
      // Additional user fields
      bio: v.optional(v.string()),
      isWriter: v.optional(v.boolean()),
      writerLevel: v.optional(v.number()),
      totalFollowers: v.optional(v.number()),
      totalFollowing: v.optional(v.number()),
      isPremium: v.optional(v.boolean()),

      // Add: username (unique via index + check) and optional gender
      username: v.optional(v.string()),
      gender: v.optional(v.string()),
      // Add: banner image for profile header
      bannerImage: v.optional(v.string()),
      // Add: authEmail used by the Password provider for actual authentication
      authEmail: v.optional(v.string()),
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      // Add: index for username uniqueness lookups
      .index("by_username", ["username"])
      // Add: index for provider auth email lookups
      .index("by_auth_email", ["authEmail"]),

    // Stories table
    stories: defineTable({
      title: v.string(),
      description: v.string(),
      authorId: v.id("users"),
      coverImage: v.optional(v.string()),
      genre: genreValidator,
      tags: v.array(v.string()),
      isCompleted: v.boolean(),
      totalChapters: v.number(),
      totalViews: v.number(),
      totalLikes: v.number(),
      totalComments: v.number(),
      lastUpdated: v.number(),
      isPublished: v.boolean(),
    })
      .index("by_author", ["authorId"])
      .index("by_genre", ["genre"])
      .index("by_published", ["isPublished"])
      .index("by_last_updated", ["lastUpdated"])
      .index("by_published_and_genre", ["isPublished", "genre"])
      .index("by_published_and_last_updated", ["isPublished", "lastUpdated"]),

    // Chapters table
    chapters: defineTable({
      storyId: v.id("stories"),
      title: v.string(),
      content: v.string(),
      chapterNumber: v.number(),
      wordCount: v.number(),
      views: v.number(),
      likes: v.number(),
      comments: v.number(),
      isPublished: v.boolean(),
      isDraft: v.boolean(),
      // Add: optional cover image for chapters
      coverImage: v.optional(v.string()),
    })
      .index("by_story", ["storyId"])
      .index("by_story_and_number", ["storyId", "chapterNumber"]),

    // Comments table
    comments: defineTable({
      chapterId: v.id("chapters"),
      authorId: v.id("users"),
      content: v.string(),
      likes: v.number(),
      dislikes: v.number(),
      isHidden: v.boolean(),
      parentCommentId: v.optional(v.id("comments")), // for threaded replies
    })
      .index("by_chapter", ["chapterId"])
      .index("by_author", ["authorId"])
      .index("by_parent", ["parentCommentId"]),

    // Follows table (users following other users)
    follows: defineTable({
      followerId: v.id("users"),
      followingId: v.id("users"),
    })
      .index("by_follower", ["followerId"])
      .index("by_following", ["followingId"]),

    // Story follows/favorites
    storyFollows: defineTable({
      userId: v.id("users"),
      storyId: v.id("stories"),
      isFavorite: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_story", ["storyId"])
      .index("by_user_and_story", ["userId", "storyId"]),

    // Reading progress
    readingProgress: defineTable({
      userId: v.id("users"),
      storyId: v.id("stories"),
      lastChapterId: v.id("chapters"),
      lastReadAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_story", ["userId", "storyId"]),

    // Custom reading lists
    readingLists: defineTable({
      userId: v.id("users"),
      name: v.string(),
      description: v.optional(v.string()),
      isPublic: v.boolean(),
      storyIds: v.array(v.id("stories")),
    }).index("by_user", ["userId"]),

    // Notifications
    notifications: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("new_chapter"),
        v.literal("new_story"),
        v.literal("comment_reply"),
        v.literal("comment_like"),
        v.literal("new_follower")
      ),
      title: v.string(),
      message: v.string(),
      isRead: v.boolean(),
      relatedId: v.optional(v.string()), // story/chapter/comment ID
    }).index("by_user", ["userId"]),

    // Chapter likes
    chapterLikes: defineTable({
      userId: v.id("users"),
      chapterId: v.id("chapters"),
    })
      .index("by_user", ["userId"])
      .index("by_chapter", ["chapterId"])
      .index("by_user_and_chapter", ["userId", "chapterId"]),

    // Add: Chapter views (unique per user per chapter)
    chapterViews: defineTable({
      userId: v.id("users"),
      chapterId: v.id("chapters"),
    })
      .index("by_user", ["userId"])
      .index("by_chapter", ["chapterId"])
      .index("by_user_and_chapter", ["userId", "chapterId"]),

    // Comment likes/dislikes
    commentReactions: defineTable({
      userId: v.id("users"),
      commentId: v.id("comments"),
      isLike: v.boolean(), // true for like, false for dislike
    })
      .index("by_user", ["userId"])
      .index("by_comment", ["commentId"])
      .index("by_user_and_comment", ["userId", "commentId"]),

    // Reports table
    reports: defineTable({
      userId: v.id("users"),
      targetType: v.union(v.literal("story"), v.literal("chapter")),
      targetId: v.string(),
      reason: v.string(),
      details: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
    })
      .index("by_user", ["userId"])
      .index("by_target", ["targetType", "targetId"])
      .index("by_status", ["status"]),

    // Messages table
    messages: defineTable({
      senderId: v.id("users"),
      recipientId: v.id("users"),
      body: v.string(),
      isRead: v.boolean(),
    })
      .index("by_sender", ["senderId"])
      .index("by_recipient", ["recipientId"])
      .index("by_user_pair", ["senderId", "recipientId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;