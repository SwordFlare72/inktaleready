import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Clock, Plus, List } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// Add: Minimal, borderless row component like Search list
function StoryRow({
  story,
  onClick,
  relTimeFn,
}: {
  story: any;
  onClick: (id: string) => void;
  relTimeFn: (ts?: number) => string;
}) {
  return (
    <div
      className="w-full cursor-pointer py-4 hover:bg-muted/40 transition-colors"
      onClick={() => onClick(story._id)}
    >
      <div className="flex items-start gap-4">
        <div className="h-20 w-16 overflow-hidden rounded-md bg-muted flex-shrink-0">
          {story.coverImage ? (
            <img
              src={story.coverImage}
              alt={story.title}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          ) : (
            <div className="h-full w-full grid place-items-center bg-gradient-to-br from-purple-400 to-pink-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-snug line-clamp-1">
              {story.title}
            </h3>
            {story.genre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 capitalize whitespace-nowrap">
                {story.genre}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            by {story.author?.name || "Anonymous"}
          </p>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {story.description}
          </p>

          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {story.totalChapters} chapter{story.totalChapters === 1 ? "" : "s"}
            </span>
            <span>•</span>
            <span>Uploaded {relTimeFn(story.lastUpdated)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 5c-7.633 0-10 7-10 7s2.367 7 10 7 10-7 10-7-2.367-7-10-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
              {story.totalViews}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {story.totalLikes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [followsSort, setFollowsSort] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);

  const follows = useQuery(api.library.listFollows, 
    isAuthenticated ? {
      paginationOpts: { numItems: 20, cursor: null },
      sortBy: followsSort,
    } : "skip"
  );

  const history = useQuery(api.library.listHistory,
    isAuthenticated ? {
      paginationOpts: { numItems: 20, cursor: null },
    } : "skip"
  );

  const readingLists = useQuery(api.library.listMyLists, isAuthenticated ? {} : "skip");

  const createList = useMutation(api.library.createList);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    try {
      await createList({
        name: newListName.trim(),
        isPublic: newListPublic,
      });
      toast.success("Reading list created!");
      setNewListName("");
      setNewListPublic(false);
      setShowCreateList(false);
    } catch (error) {
      toast.error("Failed to create reading list");
    }
  };

  // Add: relative time formatter (same as Search)
  const relTime = (ts?: number) => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your library
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">
            Your followed stories, reading history, and custom lists
          </p>
        </div>

        <Tabs defaultValue="follows" className="space-y-6">
          <TabsList>
            <TabsTrigger value="follows">Following</TabsTrigger>
            <TabsTrigger value="history">Reading History</TabsTrigger>
            <TabsTrigger value="lists">Reading Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="follows" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Followed Stories</h2>
              <Select value={followsSort} onValueChange={(value: any) => setFollowsSort(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Followed</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y divide-border">
              {follows?.page.map((story) => {
                if (!story) return null;
                return (
                  <StoryRow
                    key={story._id}
                    story={story}
                    onClick={(id) => navigate(`/story/${id}`)}
                    relTimeFn={relTime}
                  />
                );
              })}
            </div>

            {follows?.page.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No followed stories yet</p>
                <Button className="mt-4" onClick={() => navigate("/explore")}>
                  Explore Stories
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h2 className="text-xl font-semibold">Reading History</h2>

            <div className="divide-y divide-border">
              {history?.page.map((story) => {
                if (!story) return null;
                return (
                  <StoryRow
                    key={story._id}
                    story={story}
                    onClick={(id) => navigate(`/story/${id}`)}
                    relTimeFn={relTime}
                  />
                );
              })}
            </div>

            {history?.page.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reading history yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lists" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reading Lists</h2>
              <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Reading List</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">List Name</label>
                      <Input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Enter list name..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="public"
                        checked={newListPublic}
                        onChange={(e) => setNewListPublic(e.target.checked)}
                      />
                      <label htmlFor="public" className="text-sm">Make this list public</label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateList(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateList}>Create List</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readingLists?.map((list) => (
                <Card key={list._id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      {list.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {list.storyCount} {list.storyCount === 1 ? 'story' : 'stories'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {list.isPublic ? 'Public' : 'Private'} list
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {readingLists?.length === 0 && (
              <div className="text-center py-12">
                <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reading lists yet</p>
                <Button className="mt-4" onClick={() => setShowCreateList(true)}>
                  Create Your First List
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}