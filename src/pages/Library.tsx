import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle, DialogTrigger as UIDialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Clock, Plus, List } from "lucide-react";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical, List as ListIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

// Add: Simple grid tile card for stories (cover + title only)
function StoryTile({
  story,
  onClick,
  fetchProgress = true,
}: {
  story: any;
  onClick: (id: string) => void;
  fetchProgress?: boolean; // new: allow per-usage control
}) {
  // Fetch progress per story if requested; safe to skip if unauthenticated or not needed
  const progressData = fetchProgress
    ? useQuery(api.readingProgress.getProgress as any, story?._id ? { storyId: story._id } : "skip" as any)
    : undefined;

  // Compute a progress percentage (0–100)
  let progress = 0;
  if (typeof (story as any)?.progress === "number") {
    progress = Math.max(0, Math.min(100, (story as any).progress));
  } else if (progressData) {
    const pd: any = progressData;
    // Prefer explicit percent if backend provides it
    if (typeof pd.percent === "number") {
      progress = Math.max(0, Math.min(100, pd.percent));
    } else {
      // Fallback: derive from indexes/counts if available
      const lastIndex: number | undefined =
        typeof pd.lastReadIndex === "number" ? pd.lastReadIndex : undefined;
      const total: number | undefined =
        typeof story?.totalChapters === "number" ? story.totalChapters : undefined;

      if (typeof lastIndex === "number" && typeof total === "number" && total > 0) {
        // lastIndex is zero-based; add 1 to represent chapters completed
        progress = Math.max(0, Math.min(100, Math.round(((lastIndex + 1) / total) * 100)));
      }
    }
  }

  return (
    <button
      className="text-left"
      onClick={() => onClick(story._id)}
      aria-label={story.title}
    >
      <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
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

      {/* Progress bar under cover */}
      <div className="mt-2">
        <div className="h-1.5 w-full rounded-full bg-muted/70 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
            aria-label="Reading progress"
          />
        </div>
      </div>

      {/* Title with fixed height to keep rows aligned (2 lines max) */}
      <div className="mt-2 text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
        {story.title}
      </div>
    </button>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [followsSort, setFollowsSort] = useState<"recent" | "oldest" | "alphabetical">("recent");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  const renameList = useMutation(api.library.renameList);
  const deleteList = useMutation(api.library.deleteList);

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

  const selectedList = (readingLists || []).find((l) => l._id === openListId);

  // Add: robust clipboard helper that works even when document isn't focused
  const copyToClipboard = async (text: string) => {
    // Use Clipboard API if available and the document is focused
    if (navigator.clipboard && document.hasFocus()) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback using a hidden textarea and execCommand
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  };

  const handleShareList = async (list: any) => {
    const shareText =
      `Reading List: ${list.name} • ${list.storyCount} ${list.storyCount === 1 ? "story" : "stories"}\n` +
      (list.stories?.slice(0, 10).map((s: any, i: number) => `${i + 1}. ${s.title} — ${s.author?.name ?? "Anonymous"}`).join("\n") || "");
    // Try native share first
    try {
      if (navigator.share) {
        await navigator.share({ title: list.name, text: shareText });
        return;
      }
    } catch {
      // swallow and fall through to clipboard copy
    }
    // Clipboard copy with robust fallback
    try {
      await copyToClipboard(shareText);
      toast.success("Reading list details copied");
    } catch {
      // Last resort: prompt for manual copy
      window.prompt("Copy these reading list details:", shareText);
    }
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
      className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
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
            {/* Header with sort + view toggle */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Followed Stories</h2>
              <div className="flex items-center gap-2">
                <Select value={followsSort} onValueChange={(value: any) => setFollowsSort(value)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently Followed</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="alphabetical">A-Z</SelectItem>
                  </SelectContent>
                </Select>
                {/* List/Grid toggle */}
                <div className="flex rounded-md border overflow-hidden">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9 rounded-none"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9 rounded-none"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content: list or grid */}
            {viewMode === "list" ? (
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
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {follows?.page.map((story) => {
                  if (!story) return null;
                  return (
                    <StoryTile
                      key={story._id}
                      story={story}
                      onClick={(id) => navigate(`/story/${id}`)}
                      fetchProgress={true} // new: ensure progress fetched for grid tiles
                    />
                  );
                })}
              </div>
            )}

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
            {/* Header with view toggle for history */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reading History</h2>
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
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
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {history?.page.map((story) => {
                  if (!story) return null;
                  return (
                    <StoryTile
                      key={story._id}
                      story={story}
                      onClick={(id) => navigate(`/story/${id}`)}
                      fetchProgress={true} // new
                    />
                  );
                })}
              </div>
            )}

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
              <UIDialog open={showCreateList} onOpenChange={setShowCreateList}>
                <UIDialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </UIDialogTrigger>
                <UIDialogContent>
                  <UIDialogHeader>
                    <UIDialogTitle>Create Reading List</UIDialogTitle>
                  </UIDialogHeader>
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
                </UIDialogContent>
              </UIDialog>
            </div>

            {/* Improved list cards with menu and open-on-click */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readingLists?.map((list) => (
                <Card
                  key={list._id}
                  className="group cursor-pointer transition-all border-2 rounded-3xl bg-background/60 dark:bg-background/40 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  onClick={() => navigate(`/library/list/${list._id}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2">
                      <ListIcon className="h-5 w-5" />
                      <span className="truncate">{list.name}</span>
                    </CardTitle>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/library/list/${list._id}`);
                          }}
                        >
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameValue(list.name);
                            setOpenListId(list._id as string);
                            setShowRename(true);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleShareList(list);
                          }}
                        >
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(list._id as string);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                        {list.storyCount} {list.storyCount === 1 ? "story" : "stories"}
                      </Badge>
                      <Badge className={`rounded-full px-2.5 py-1 text-xs ${list.isPublic ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300"}`}>
                        {list.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
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

        {/* View List Dialog */}
        <UIDialog open={!!openListId} onOpenChange={(o) => !o && setOpenListId(null)}>
          <UIDialogContent className="max-w-2xl">
            <UIDialogHeader>
              <UIDialogTitle>{selectedList?.name || "Reading List"}</UIDialogTitle>
            </UIDialogHeader>
            {!selectedList ? (
              <div className="py-6 text-sm text-muted-foreground">Loading list…</div>
            ) : selectedList.stories?.length > 0 ? (
              <div className="divide-y divide-border">
                {selectedList.stories.map((story: any) => (
                  <StoryRow
                    key={story._id}
                    story={story}
                    onClick={(id) => {
                      setOpenListId(null);
                      navigate(`/story/${id}`);
                    }}
                    relTimeFn={relTime}
                  />
                ))}
              </div>
            ) : (
              <div className="py-6 text-sm text-muted-foreground">No stories in this list</div>
            )}
          </UIDialogContent>
        </UIDialog>

        {/* Rename Dialog */}
        <UIDialog open={showRename} onOpenChange={setShowRename}>
          <UIDialogContent className="max-w-sm">
            <UIDialogHeader>
              <UIDialogTitle>Rename Reading List</UIDialogTitle>
            </UIDialogHeader>
            <div className="space-y-3">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="New list name"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRename(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!openListId) return;
                    const name = renameValue.trim();
                    if (!name) {
                      toast.error("Enter a list name");
                      return;
                    }
                    try {
                      await renameList({ listId: openListId as any, name });
                      toast.success("List renamed");
                      setShowRename(false);
                    } catch {
                      toast.error("Failed to rename list");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </UIDialogContent>
        </UIDialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this reading list?</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (!deleteId) return;
                  try {
                    await deleteList({ listId: deleteId as any });
                    toast.success("Reading list deleted");
                  } catch {
                    toast.error("Failed to delete list");
                  } finally {
                    setDeleteId(null);
                    if (openListId === deleteId) setOpenListId(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}