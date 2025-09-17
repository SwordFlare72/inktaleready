import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, User, Calendar, Tag, Play, BookmarkPlus, BookmarkCheck, ArrowLeft, Share2 } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useState } from "react";

export default function Story() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const story = useQuery(api.stories.getStoryById, id ? { storyId: id as any } : "skip");
  const isFollowing = useQuery(api.stories.isFollowing, id ? { storyId: id as any } : "skip");
  const readingProgress = useQuery(api.readingProgress.getProgress, id ? { storyId: id as any } : "skip");
  
  const toggleFollow = useMutation(api.stories.toggleStoryFollow);

  // Load similar stories by genre (exclude current later in render)
  const similar = useQuery(
    api.stories.listExplore,
    // only run when story is loaded
    story
      ? {
          paginationOpts: { numItems: 6, cursor: null },
          genre: story.genre as any,
          sortBy: "popular",
        }
      : "skip",
  );

  const [expandDesc, setExpandDesc] = useState(false);

  if (!id) {
    navigate("/explore");
    return null;
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to follow stories");
      navigate("/auth");
      return;
    }

    try {
      const followed = await toggleFollow({ storyId: id as any });
      toast.success(followed ? "Story added to library" : "Story removed from library");
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const handleStartReading = () => {
    if (!story?.chapters || story.chapters.length === 0) {
      toast.error("No chapters available");
      return;
    }

    // Start from last read chapter or first chapter
    const chapterToRead = readingProgress?.lastChapterId 
      ? readingProgress.lastChapterId 
      : story.chapters[0]._id;
    
    navigate(`/read/${chapterToRead}`);
  };

  const handleChapterClick = (chapterId: string) => {
    navigate(`/read/${chapterId}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Story link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (story === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Story not found</h2>
          <p className="text-muted-foreground mb-4">
            The story you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/explore")}>
            Browse Stories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen overflow-y-auto bg-background"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 pb-28">
        {/* Story Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden">
              {story.coverImage ? (
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                {story.genre}
              </span>
              {story.isCompleted && (
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium">
                  Completed
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-4">{story.title}</h1>
            
            <div className="flex items-center gap-4 mb-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>by {story.author?.name || "Anonymous"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Updated {new Date(story.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-3 leading-relaxed">
              {expandDesc || (story.description?.length || 0) <= 180
                ? story.description
                : `${story.description.slice(0, 180)}...`}
            </p>
            {story.description && story.description.length > 180 && (
              <button
                onClick={() => setExpandDesc((v) => !v)}
                className="text-primary text-sm font-medium hover:underline mb-6"
              >
                {expandDesc ? "Show less" : "Read more"}
              </button>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
              {story.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{story.totalChapters}</div>
                <div className="text-sm text-muted-foreground">Chapters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{story.totalViews}</div>
                <div className="text-sm text-muted-foreground">Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{story.totalLikes}</div>
                <div className="text-sm text-muted-foreground">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{story.totalComments}</div>
                <div className="text-sm text-muted-foreground">Comments</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleStartReading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={!story.chapters || story.chapters.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                {readingProgress ? "Continue Reading" : "Start Reading"}
              </Button>
              
              <Button
                onClick={handleFollow}
                variant="outline"
                disabled={!isAuthenticated}
              >
                {isFollowing ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Chapters List */}
        <Card>
          <CardHeader>
            <CardTitle>Chapters ({story.chapters?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!story.chapters || story.chapters.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No chapters available yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {story.chapters.map((chapter) => (
                  <motion.div
                    key={chapter._id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleChapterClick(chapter._id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Chapter {chapter.chapterNumber}
                        </span>
                        <h3 className="font-medium">{chapter.title}</h3>
                        {readingProgress?.lastChapterId === chapter._id && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            Last Read
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{chapter.wordCount} words</span>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {chapter.views}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {chapter.likes}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Similar Stories */}
        {similar && similar.page && similar.page.filter(s => s._id !== (story as any)._id).length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Similar Stories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {similar.page
                .filter((s) => s._id !== (story as any)._id)
                .map((s) => (
                  <div
                    key={s._id}
                    onClick={() => navigate(`/story/${s._id}`)}
                    className="cursor-pointer rounded-lg border hover:bg-accent/50 transition-colors overflow-hidden"
                  >
                    <div className="aspect-[3/4] w-full bg-muted">
                      {s.coverImage ? (
                        <img
                          src={s.coverImage}
                          alt={s.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-sm font-medium line-clamp-2">{s.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground capitalize">
                        {s.genre}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}