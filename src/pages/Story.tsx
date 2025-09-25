import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, User, Calendar, Tag, Play, BookmarkPlus, BookmarkCheck, Share2, Home, Plus } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Story() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const story = useQuery(api.stories.getStoryById, id ? { storyId: id as any } : "skip");
  const isFollowing = useQuery(api.stories.isFollowing, id ? { storyId: id as any } : "skip");
  const readingProgress = useQuery(api.readingProgress.getProgress, id ? { storyId: id as any } : "skip");
  
  const toggleFollow = useMutation(api.stories.toggleStoryFollow);
  const readingLists = useQuery(api.library.listMyLists, isAuthenticated ? {} : "skip");
  const createList = useMutation(api.library.createList);
  const addToList = useMutation(api.library.addToList);

  const [showAddToList, setShowAddToList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);

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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Header hero */}
      <div className="container mx-auto px-4 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-48 h-64 rounded-xl overflow-hidden shadow-md bg-muted">
            {story.coverImage ? (
              <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{story.title}</h1>

          {/* Author row */}
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={story.author?.image || ""} />
              <AvatarFallback>
                {(story.author?.name?.[0] || "A").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{story.author?.name || "Anonymous"}</span>
          </div>

          {/* Metrics */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-4 h-4" /> {story.totalViews.toLocaleString()} Reads
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-4 h-4" /> {story.totalLikes.toLocaleString()} Votes
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {story.totalChapters} Parts
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleStartReading}
              className="rounded-full px-6 bg-foreground text-background hover:opacity-90"
              disabled={!story.chapters || story.chapters.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {readingProgress ? "Continue" : "Start"}
            </Button>
            <Button
              onClick={handleFollow}
              variant={isFollowing ? "default" : "outline"}
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
              size="icon"
              className="rounded-full"
              onClick={openAddToList}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Status + genre */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
              {story.genre}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                story.isCompleted
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {story.isCompleted ? "Completed" : "Ongoing"}
            </span>
          </div>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {story.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-muted text-foreground/80 text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Description card */}
        <div className="mt-6 rounded-xl border bg-card">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {expandDesc || (story.description?.length || 0) <= 180
                ? story.description
                : `${story.description.slice(0, 180)}...`}
            </p>
            {story.description && story.description.length > 180 && (
              <button
                onClick={() => setExpandDesc((v) => !v)}
                className="mt-2 text-primary text-sm font-semibold"
              >
                {expandDesc ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        </div>

        {/* Parts header */}
        <div className="mt-8 flex items-center justify-between">
          <h3 className="text-base font-semibold">{
            `${story.totalChapters} parts`
          }</h3>
          <button
            className="text-primary text-sm font-medium"
            onClick={() => {
              if (story.chapters?.length) {
                // Scroll to chapters list
                const el = document.getElementById("chapters-list");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          >
            See all
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-28">
        {/* Chapters List */}
        <Card className="mt-3" id="chapters-list">
          <div className="px-6 pt-6 pb-0 text-base font-semibold">
            Chapters ({story.chapters?.length || 0})
          </div>
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
                    className="grid grid-cols-[1fr,auto] items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleChapterClick(chapter._id)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{chapter.title}</h3>
                        {readingProgress?.lastChapterId === chapter._id && (
                          <span className="shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">
                            Last Read
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{chapter.wordCount} words</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {chapter.views}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {chapter.likes}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground text-right">
                      {chapter._creationTime ? new Date(chapter._creationTime).toDateString() : ""}
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
                        <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover" />
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

      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Reading List</DialogTitle>
          </DialogHeader>

          {/* Loading state */}
          {readingLists === undefined ? (
            <div className="py-6 text-sm text-muted-foreground">Loading your lists…</div>
          ) : readingLists.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Select a list to add this story:
              </div>
              <div className="max-h-72 overflow-y-auto divide-y rounded-md border">
                {readingLists.map((list) => (
                  <div key={list._id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{list.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {list.storyCount} {list.storyCount === 1 ? "story" : "stories"} · {list.isPublic ? "Public" : "Private"}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddToExisting(list._id as any)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="text-sm font-medium">Or create a new list</div>
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
            </div>
          ) : (
            // No lists yet
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