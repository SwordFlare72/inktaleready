import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Danger: This permanently deletes ALL application data, including user docs.
// After running, all sessions will be broken and sign-ins will fail until new accounts are created.
export const wipeAll = mutation({
  args: {
    confirm: v.literal("CONFIRM"),
  },
  handler: async (ctx) => {
    // Order matters slightly so we remove child rows first where possible.
    const tables: Array<keyof typeof ctx.db> = [
      // leaf/relationship tables
      "chapterLikes" as any,
      "commentReactions" as any,
      "readingProgress" as any,
      "readingLists" as any,
      "storyFollows" as any,
      "notifications" as any,
      "comments" as any,
      "messages" as any,
      "reports" as any,
      // content tables
      "chapters" as any,
      "stories" as any,
      // finally users
      "users" as any,
    ];

    for (const table of tables) {
      // Use async iteration to avoid loading all into memory at once.
      const q = ctx.db.query(table as any);
      // eslint-disable-next-line no-restricted-syntax
      for await (const row of q) {
        await ctx.db.delete(row._id);
      }
    }

    return { ok: true };
  },
});
