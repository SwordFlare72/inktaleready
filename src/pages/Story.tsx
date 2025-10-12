import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, User, Calendar, Tag, Play, BookmarkPlus, BookmarkCheck, Share2, ChevronLeft, Plus, Check } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  // Add: robust back handler that preserves list scroll when possible
  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
      }
    } catch {
      navigate("/");
    }
  };
  
  const story = useQuery(api.stories.getStoryById, id ? { storyId: id as any } : "skip");
  const isFollowing = useQuery(api.stories.isFollowing, id ? { storyId: id as any } : "skip");
  const readingProgress = useQuery(api.readingProgress.getProgress, id ? { storyId: id as any } : "skip");
  
  const toggleFollow = useMutation(api.stories.toggleStoryFollow);
  const readingLists = useQuery(api.library.listMyLists, isAuthenticated ? {} : "skip");
  const createList = useMutation(api.library.createList);
  const addToList = useMutation(api.library.addToList);
  const removeFromList = useMutation(api.library.removeFromList);

  const [showAddToList, setShowAddToList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);

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

  const openAddToList = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to manage reading lists");
      navigate("/auth");
      return;
    }
    setShowAddToList(true);
  };

  const handleToggleList = async (list: any) => {
    if (!id) return;
    try {
      const inList = Array.isArray(list.storyIds) && list.storyIds.includes(id as any);
      if (inList) {
        await removeFromList({ listId: list._id as any, storyId: id as any });
        toast.success("Removed from reading list");
      } else {
        await addToList({ listId: list._id as any, storyId: id as any });
        toast.success("Added to reading list");
      }
    } catch {
      toast.error("Failed to update list");
    }
  };

  const handleAddToExisting = async (listId: string) => {
    if (!id) return;
    try {
      await addToList({ listId: listId as any, storyId: id as any });
      toast.success("Added to reading list");
      setShowAddToList(false);
    } catch {
      toast.error("Failed to add to list");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    if (!id) return;
    try {
      const listId = await createList({
        name: newListName.trim(),
        isPublic: newListPublic,
      });
      await addToList({ listId: listId as any, storyId: id as any });
      toast.success("List created and story added");
      setNewListName("");
      setNewListPublic(false);
      setShowAddToList(false);
    } catch {
      toast.error("Failed to create list");
    }
  };

  // Add: navigate to author profile when clicking avatar or author name
  const handleAuthorClick = () => {
    try {
      const id =
        (story as any)?.author?._id ||
        (story as any)?.authorId ||
        (story as any)?.author?.id;
      if (!id) return;
      navigate(`/profile/${id}`);
    } catch {}
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
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-28">
        {/* Hero Section - Centered Layout */}
        <div className="mb-8">
          {/* Cover Image - Centered */}
          <div className="flex justify-center mb-6">
            <div className="w-48 h-64 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50 bg-muted">
              {story.coverImage ? (
                <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Story Info - Centered */}
          <div className="text-center space-y-4">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{story.title}</h1>
            
            {/* Author */}
            <div 
              onClick={handleAuthorClick}
              className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group"
            >
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={(story.author as any)?.avatarImage || story.author?.image || ""} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {(story.author?.name?.[0] || "A").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-lg group-hover:underline">
                {(story as any)?.author?.name || (story as any)?.authorName || "Anonymous"}
              </span>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60">
                <Eye className="w-4 h-4 text-primary" />
                <span className="font-medium">{story.totalViews.toLocaleString()}</span>
                <span className="text-muted-foreground">Reads</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="font-medium">{story.totalLikes.toLocaleString()}</span>
                <span className="text-muted-foreground">Votes</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{story.totalChapters}</span>
                <span className="text-muted-foreground">Parts</span>
              </div>
            </div>

            {/* Action Buttons - Single Line */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={handleStartReading}
                size="lg"
                className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                disabled={!story.chapters || story.chapters.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                {readingProgress ? "Continue Reading" : "Start Reading"}
              </Button>
              <Button
                onClick={handleFollow}
                variant={isFollowing ? "default" : "outline"}
                size="lg"
                className="rounded-full px-6"
                disabled={!isAuthenticated}
              >
                {isFollowing ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                    Library
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    Library
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12 p-0"
                onClick={openAddToList}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Tags & Status */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-semibold capitalize">
                {story.genre}
              </span>
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                  story.isCompleted
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {story.isCompleted ? "Completed" : "Ongoing"}
              </span>
              {story.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">About this story</h3>
          <div className="bg-muted/30 rounded-2xl p-6">
            <p className="text-muted-foreground leading-relaxed">
              {expandDesc || (story.description?.length || 0) <= 200
                ? story.description
                : `${story.description.slice(0, 200)}...`}
            </p>
            {story.description && story.description.length > 200 && (
              <button
                onClick={() => setExpandDesc((v) => !v)}
                className="mt-3 text-primary text-sm font-semibold hover:underline"
              >
                {expandDesc ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        </div>

        {/* Chapters List */}
        <div className="mb-8" id="chapters-list">
          <h3 className="text-xl font-bold mb-4">Chapters ({story.chapters?.length || 0})</h3>
          <div className="space-y-3">
            {!story.chapters || story.chapters.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No chapters available yet</p>
              </div>
            ) : (
              <>
                {story.chapters.map((chapter) => (
                  <motion.div
                    key={chapter._id}
                    whileHover={{ scale: 1.005 }}
                    className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
                    onClick={() => handleChapterClick(chapter._id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate">{chapter.title}</h4>
                          {readingProgress?.lastChapterId === chapter._id && (
                            <span className="shrink-0 px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full font-medium">
                              Last Read
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{chapter.wordCount} words</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {chapter.views}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {chapter.likes}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {chapter._creationTime ? new Date(chapter._creationTime).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Similar Stories - Horizontal Scroll */}
        {similar && similar.page && similar.page.filter(s => s._id !== (story as any)._id).length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Similar Stories</h3>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {similar.page
                  .filter((s) => s._id !== (story as any)._id)
                  .map((s) => (
                    <motion.div
                      key={s._id}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => navigate(`/story/${s._id}`)}
                      className="flex-shrink-0 w-36 cursor-pointer snap-start"
                    >
                      <div className="rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                        <div className="aspect-[3/4] w-full bg-muted">
                          {s.coverImage ? (
                            <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                              <BookOpen className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-card">
                          <div className="text-sm font-semibold line-clamp-2 mb-1">{s.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">{s.genre}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reading List Dialog - Keep existing */}
      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Reading List</DialogTitle>
          </DialogHeader>

          {readingLists === undefined ? (
            <div className="py-6 text-sm text-muted-foreground">Loading your lists…</div>
          ) : readingLists.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Tap a list to add or remove this story:
              </div>
              <div className="max-h-72 overflow-y-auto space-y-3">
                {readingLists.map((list) => {
                  const included =
                    Array.isArray(list.storyIds) && id ? list.storyIds.includes(id as any) : false;
                  return (
                    <button
                      key={list._id}
                      className={`w-full p-4 flex items-center justify-between rounded-xl border-2 transition-all text-left
                        ${included
                          ? "border-emerald-500/70 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-border hover:bg-accent/60"
                        }`}
                      onClick={() => handleToggleList(list)}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">{list.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {list.storyCount} {list.storyCount === 1 ? "story" : "stories"} · {list.isPublic ? "Public" : "Private"}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 h-7 w-7 rounded-full grid place-items-center transition-colors
                          ${included
                            ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md"
                            : "border border-muted-foreground/30 bg-background"
                          }`}
                      >
                        {included && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                  onClick={() => setShowCreateSection((v) => !v)}
                >
                  <Plus className="h-4 w-4" />
                  Create Reading List
                </button>
              </div>

              {showCreateSection && (
                <div className="border-t pt-3 space-y-3">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newListPublic}
                      onChange={(e) => setNewListPublic(e.target.checked)}
                    />
                    Make this list public
                  </label>
                  <div className="flex justify-end">
                    <Button onClick={handleCreateAndAdd}>Create & Add</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">
                You don't have any reading lists yet. Create one to add this story.
              </div>
              <Input
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newListPublic}
                  onChange={(e) => setNewListPublic(e.target.checked)}
                />
                Make this list public
              </label>
              <div className="flex justify-end">
                <Button onClick={handleCreateAndAdd}>Create & Add</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}