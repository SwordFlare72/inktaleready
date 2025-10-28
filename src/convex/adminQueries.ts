import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Helper to check if user is admin
async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

// Get admin dashboard stats
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const stories = await ctx.db.query("stories").collect();
    const chapters = await ctx.db.query("chapters").collect();
    const comments = await ctx.db.query("comments").collect();
    const reports = await ctx.db.query("reports").collect();

    const publishedStories = stories.filter(s => s.isPublished);
    const pendingReports = reports.filter(r => r.status === "pending");
    const totalViews = stories.reduce((sum, s) => sum + s.totalViews, 0);

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => !u.isAnonymous).length,
      totalStories: stories.length,
      publishedStories: publishedStories.length,
      totalChapters: chapters.length,
      totalComments: comments.length,
      totalReports: reports.length,
      pendingReports: pendingReports.length,
      totalViews,
    };
  },
});

// Get all users
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").order("desc").collect();
    
    return users.map(u => ({
      _id: u._id,
      name: u.name,
      username: (u as any).username,
      email: u.email,
      image: u.image,
      avatarImage: (u as any).avatarImage,
      role: u.role,
      isWriter: (u as any).isWriter,
      totalFollowers: (u as any).totalFollowers || 0,
      _creationTime: u._creationTime,
    }));
  },
});

// Get all stories with author info
export const getAllStories = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const stories = await ctx.db.query("stories").order("desc").collect();
    
    const storiesWithAuthors = await Promise.all(
      stories.map(async (story) => {
        const author = await ctx.db.get(story.authorId);
        return {
          ...story,
          authorName: author?.name || "Unknown",
        };
      })
    );

    return storiesWithAuthors;
  },
});

// Get all reports with reporter info
export const getAllReports = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const reports = await ctx.db.query("reports").order("desc").collect();
    
    const reportsWithInfo = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db.get(report.userId);
        return {
          ...report,
          reporterName: reporter?.name || "Unknown",
        };
      })
    );

    return reportsWithInfo;
  },
});
