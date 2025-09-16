import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// Seed demo data for testing
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be authenticated");

    // Check if stories already exist
    const existingStories = await ctx.db.query("stories").take(1);
    if (existingStories.length > 0) {
      return "Demo data already exists";
    }

    // Create demo stories
    const story1Id = await ctx.db.insert("stories", {
      title: "The Dragon's Heart",
      description: "A young mage discovers an ancient dragon's heart that holds the power to save her kingdom from eternal darkness.",
      authorId: user._id,
      genre: "fantasy" as any,
      tags: ["magic", "dragons", "adventure"],
      isCompleted: false,
      totalChapters: 3,
      totalViews: 1250,
      totalLikes: 89,
      totalComments: 23,
      lastUpdated: Date.now() - 86400000, // 1 day ago
      isPublished: true,
      coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    });

    const story2Id = await ctx.db.insert("stories", {
      title: "Stellar Romance",
      description: "Two space explorers from rival colonies find love among the stars while searching for a new home for humanity.",
      authorId: user._id,
      genre: "romance" as any,
      tags: ["space", "love", "sci-fi"],
      isCompleted: true,
      totalChapters: 5,
      totalViews: 2100,
      totalLikes: 156,
      totalComments: 45,
      lastUpdated: Date.now() - 172800000, // 2 days ago
      isPublished: true,
      coverImage: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=600&fit=crop",
    });

    // Create chapters for story 1
    await ctx.db.insert("chapters", {
      storyId: story1Id,
      title: "The Discovery",
      content: "Lyra had always been different from the other apprentices at the Academy of Mystic Arts. While they struggled with simple levitation spells, she could bend light itself to her will. But nothing had prepared her for what she would find in the ancient ruins beneath the academy.\n\nThe dragon's heart pulsed with an otherworldly light, its crimson surface warm to the touch despite being buried for centuries. As her fingers made contact with the artifact, visions flooded her mind—images of a great war, of dragons falling from the sky, and of a darkness that threatened to consume everything she held dear.\n\n'You have been chosen,' a voice whispered in her mind, ancient and powerful. 'The fate of all realms rests in your hands now.'",
      chapterNumber: 1,
      wordCount: 145,
      views: 450,
      likes: 32,
      comments: 8,
      isPublished: true,
      isDraft: false,
    });

    await ctx.db.insert("chapters", {
      storyId: story1Id,
      title: "The Awakening",
      content: "The power coursing through Lyra was unlike anything she had ever experienced. The dragon's heart had bonded with her very soul, and with it came knowledge—terrible, wonderful knowledge of magic beyond mortal comprehension.\n\nBut power always came with a price. As she emerged from the ruins, she found the academy under attack by shadow creatures, their forms writhing like living darkness against the morning sky. The other students were fleeing in terror, their simple protective wards useless against such ancient evil.\n\nLyra raised her hand, and for the first time, she truly understood what it meant to wield the power of dragons. Light erupted from her fingertips, not the pale glow of academy magic, but the brilliant, searing radiance of dragonfire itself.",
      chapterNumber: 2,
      wordCount: 167,
      views: 380,
      likes: 28,
      comments: 6,
      isPublished: true,
      isDraft: false,
    });

    await ctx.db.insert("chapters", {
      storyId: story1Id,
      title: "The Choice",
      content: "The shadow creatures retreated, but Lyra knew this was only the beginning. The dragon's heart showed her visions of what was to come—armies of darkness marching across the land, ancient seals breaking, and the return of the Shadow King who had been banished a thousand years ago.\n\nShe had a choice to make. She could hide, use her newfound power to protect herself and those closest to her. Or she could embrace her destiny and stand against the coming darkness, knowing that the path ahead would cost her everything she had ever known.\n\nAs she looked at her fellow students, their faces filled with hope and fear in equal measure, Lyra made her decision. The dragon's heart pulsed in response, and she felt the weight of destiny settle upon her shoulders like a mantle of stars.",
      chapterNumber: 3,
      wordCount: 178,
      views: 320,
      likes: 25,
      comments: 9,
      isPublished: true,
      isDraft: false,
    });

    // Create chapters for story 2
    await ctx.db.insert("chapters", {
      storyId: story2Id,
      title: "First Contact",
      content: "Captain Elena Vasquez had seen many worlds in her fifteen years as an explorer for the Terran Coalition, but none quite like Kepler-442b. The planet hung before her ship like a blue-green jewel, its twin moons casting silver light across vast oceans and mysterious continents.\n\nWhat she hadn't expected was to find another ship already in orbit—sleek, elegant, and bearing the distinctive markings of the Centauri Republic. Her sworn enemies, according to the politicians back home. But out here, millions of light-years from Earth, such distinctions seemed suddenly meaningless.\n\n'Unknown vessel, this is Captain Marcus Chen of the CRS Horizon,' came the transmission. 'I believe we're both here for the same reason.'",
      chapterNumber: 1,
      wordCount: 156,
      views: 520,
      likes: 41,
      comments: 12,
      isPublished: true,
      isDraft: false,
    });

    return "Demo data created successfully!";
  },
});
