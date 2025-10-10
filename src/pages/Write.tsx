import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useAction } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Eye, BookOpen, FileText, Save, Heart, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const GENRES = [
  { value: "romance", label: "Romance" },
  { value: "fantasy", label: "Fantasy" },
  { value: "mystery", label: "Mystery" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "horror", label: "Horror" },
  { value: "adventure", label: "Adventure" },
  { value: "drama", label: "Drama" },
  { value: "comedy", label: "Comedy" },
  { value: "thriller", label: "Thriller" },
  { value: "fanfiction", label: "Fanfiction" },
];

export default function Write() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<Id<"stories"> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  
  // Story form state
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDescription, setStoryDescription] = useState("");
  const [storyGenre, setStoryGenre] = useState("");
  const [storyTags, setStoryTags] = useState("");
  const [storyCover, setStoryCover] = useState("");
  
  const myStories = useQuery(api.stories.getMyStories, isAuthenticated ? {} : "skip");
  const selectedStory = useQuery(api.stories.getStoryById, 
    selectedStoryId ? { storyId: selectedStoryId } : "skip"
  );

  const createStory = useMutation(api.stories.createStory);
  const updateStory = useMutation(api.stories.updateStory);
  const deleteStory = useMutation(api.stories.deleteStory);
  const createChapter = useMutation(api.chapters.createChapter);
  const updateChapter = useMutation(api.chapters.updateChapter);
  const deleteChapter = useMutation(api.chapters.deleteChapter);

  const [showEditStory, setShowEditStory] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<Id<"stories"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editIsCompleted, setEditIsCompleted] = useState(false);

  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  // Better file-picker UX state
  const [createCoverName, setCreateCoverName] = useState("");
  const [editCoverName, setEditCoverName] = useState("");
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadCoverAndGetUrl = async (file: File): Promise<string | null> => {
    try {
      setUploadingCover(true);
      const uploadUrl = await getUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      const publicUrl = await getFileUrl({ storageId });
      return publicUrl ?? null;
    } catch (e) {
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Edit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access writer tools
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !storyDescription.trim() || !storyGenre) {
      toast.error("Please fill in all required fields");
      return;
    }
    // Enforce up to 20 tags
    const tagsArr = storyTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    if (tagsArr.length > 20) {
      toast.error("You can add up to 20 tags");
      return;
    }

    try {
      const storyId = await createStory({
        title: storyTitle.trim(),
        description: storyDescription.trim(),
        genre: storyGenre,
        tags: tagsArr,
        coverImage: storyCover.trim() || undefined,
      });
      toast.success("Story created successfully!");
      setShowCreateStory(false);
      resetStoryForm();
      setSelectedStoryId(storyId);
    } catch (error) {
      toast.error("Failed to create story");
    }
  };

  async function handleDeleteStory(storyId: string) {
    if (isDeletingStory) return;
    setIsDeletingStory(true);
    try {
      await deleteStory({ storyId: storyId as Id<"stories"> });
      toast.success("Story deleted");
      setConfirmDeleteId(null);
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "Failed to delete story";
      toast.error(msg);
    } finally {
      setIsDeletingStory(false);
    }
  }

  const resetStoryForm = () => {
    setStoryTitle("");
    setStoryDescription("");
    setStoryGenre("");
    setStoryTags("");
    setStoryCover("");
  };

  // Add: simple time-ago helper
  const timeAgo = (ms: number) => {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  // Aggregate stats
  const totalStories = myStories?.length || 0;
  const totalViews = myStories?.reduce((sum, s) => sum + s.totalViews, 0) || 0;
  const totalLikes = myStories?.reduce((sum, s) => sum + s.totalLikes, 0) || 0;
  const totalChapters = myStories?.reduce((sum, s) => sum + s.totalChapters, 0) || 0;

  // Add: compact config for nicer analytics cards
  const statCards = [
    {
      key: "stories",
      label: "Stories",
      value: totalStories,
      color: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-300",
      icon: BookOpen,
    },
    {
      key: "views",
      label: "Views",
      value: totalViews,
      color: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-300",
      icon: Eye,
    },
    {
      key: "likes",
      label: "Likes",
      value: totalLikes,
      color: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-300",
      icon: Heart,
    },
    {
      key: "chapters",
      label: "Chapters",
      value: totalChapters,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
      icon: FileText,
    },
  ] as const;

  const openEditStory = (story: any) => {
    setEditingStoryId(story._id);
    setEditTitle(story.title || "");
    setEditDescription(story.description || "");
    setEditGenre(story.genre || "");
    setEditTags((story.tags || []).join(", "));
    setEditCover(story.coverImage || "");
    setEditIsCompleted(!!story.isCompleted);
    setShowEditStory(true);
  };

  const handleSaveEditStory = async () => {
    if (!editingStoryId) return;
    if (!editTitle.trim() || !editDescription.trim() || !editGenre) {
      toast.error("Please fill in all required fields");
      return;
    }
    const tagsArr = editTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    if (tagsArr.length > 20) {
      toast.error("You can add up to 20 tags");
      return;
    }

    try {
      await updateStory({
        storyId: editingStoryId,
        title: editTitle.trim(),
        description: editDescription.trim(),
        genre: editGenre,
        tags: tagsArr,
        coverImage: editCover.trim() || undefined,
        isCompleted: editIsCompleted,
      });
      toast.success("Story updated");
      setShowEditStory(false);
    } catch {
      toast.error("Failed to update story");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-3 py-6 pb-28">
        {/* Header */}
        <div className="mb-4 flex items-center justify-start">
          <div>
            <h1 className="text-2xl font-extrabold">Writer Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage your stories and connect with readers</p>
          </div>
        </div>

        {/* Stats - revamped visual cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                whileHover={{ scale: 1.015 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="relative overflow-hidden h-[82px]">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.color}`} />
                  <CardHeader className="pb-0 pt-2 px-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[11px] text-muted-foreground">{item.label}</CardTitle>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/70 border">
                        <Icon className="h-3 w-3" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-2 relative z-10">
                    {/* Move number to bottom-left with strong visibility */}
                    <div className="absolute bottom-2 left-3 text-2xl font-extrabold tracking-tight text-white drop-shadow-md tabular-nums">
                      {Math.max(0, Number(item.value ?? 0)).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateStory(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> New Story
            </Button>
          </div>
        </div>

        {/* My Stories */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Stories ({totalStories})</h2>
        </div>

        <div className="space-y-4">
          {myStories?.map((story) => (
            <Card key={story._id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{story.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          story.isCompleted
                            ? "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                        }`}
                      >
                        {story.isCompleted ? "Completed" : "Ongoing"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 capitalize">
                        {story.genre}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          story.isPublished
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {story.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {story.description}
                    </p>
                    <p className="text-xs text-muted-foreground">Last updated {timeAgo(story.lastUpdated)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      navigate(`/write/${story._id}/chapter/new`);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Chapter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/write/${story._id}/manage`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Manage ({story.totalChapters})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditStory(story)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant={story.isPublished ? "outline" : "default"}
                    size="sm"
                    className={story.isPublished ? "" : "bg-green-600 hover:bg-green-700"}
                    onClick={async () => {
                      try {
                        await updateStory({ storyId: story._id, isPublished: !story.isPublished });
                        toast.success(story.isPublished ? "Story unpublished" : "Story published");
                      } catch {
                        toast.error("Failed to update publish status");
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {story.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteId(story._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-4 h-4" /> {story.totalViews}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-4 h-4" /> {story.totalLikes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {story.totalComments}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {myStories?.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No stories yet</p>
              <Button onClick={() => setShowCreateStory(true)}>
                Create Your First Story
              </Button>
            </div>
          )}
        </div>

        {/* Create Story Dialog (controlled) */}
        <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto pb-2">
            <DialogHeader>
              <DialogTitle>Create New Story</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Enter story title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description *</label>
                <Textarea
                  value={storyDescription}
                  onChange={(e) => setStoryDescription(e.target.value)}
                  placeholder="Enter story description..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Genre *</label>
                <Select value={storyGenre} onValueChange={setStoryGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre.value} value={genre.value}>
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* removed duplicate simple Tags field to avoid two inputs */}
              <div>
                <label className="text-sm font-medium mb-2 block">Cover Image</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Basic validation
                      if (!file.type.startsWith("image/")) {
                        toast.error("Please select an image file");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Image must be 5MB or less");
                        return;
                      }
                      setCreateCoverName(file.name);
                      const url = await uploadCoverAndGetUrl(file);
                      if (url) setStoryCover(url);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => createFileInputRef.current?.click()}
                  >
                    Choose Image
                  </Button>
                  {createCoverName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[10rem]">
                      {createCoverName}
                    </span>
                  )}
                  {storyCover && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStoryCover("");
                        setCreateCoverName("");
                        createFileInputRef.current && (createFileInputRef.current.value = "");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {uploadingCover && <p className="text-xs mt-1 text-muted-foreground">Uploading image…</p>}
                {storyCover && (
                  <div className="mt-2 w-24 h-32 overflow-hidden rounded border">
                    <img src={storyCover} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated, up to 20)</label>
                <Input
                  value={storyTags}
                  onChange={(e) => setStoryTags(e.target.value)}
                  placeholder="Enter tags separated by comma"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {storyTags
                    .split(",")
                    .map(t => t.trim())
                    .filter(Boolean)
                    .slice(0, 20)
                    .map(tag => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-muted text-xs">
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateStory(false)} disabled={uploadingCover}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStory} disabled={uploadingCover}>
                  {uploadingCover ? "Uploading..." : "Create Story"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditStory} onOpenChange={setShowEditStory}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto pb-2">
            <DialogHeader>
              <DialogTitle>Edit Story</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description *</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Genre *</label>
                <Select value={editGenre} onValueChange={setEditGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre.value} value={genre.value}>
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mark As Completed</label>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm">Completed Story</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle on to mark this story as completed
                    </p>
                  </div>
                  <Switch checked={editIsCompleted} onCheckedChange={setEditIsCompleted} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cover Image</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        toast.error("Please select an image file");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Image must be 5MB or less");
                        return;
                      }
                      setEditCoverName(file.name);
                      const url = await uploadCoverAndGetUrl(file);
                      if (url) setEditCover(url);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    Choose Image
                  </Button>
                  {editCoverName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[10rem]">
                      {editCoverName}
                    </span>
                  )}
                  {editCover && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditCover("");
                        setEditCoverName("");
                        editFileInputRef.current && (editFileInputRef.current.value = "");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {uploadingCover && <p className="text-xs mt-1 text-muted-foreground">Uploading image…</p>}
                {editCover && (
                  <div className="mt-2 w-24 h-32 overflow-hidden rounded border">
                    <img src={editCover} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated, up to 20)</label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Enter tags separated by comma"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {editTags
                    .split(",")
                    .map(t => t.trim())
                    .filter(Boolean)
                    .slice(0, 20)
                    .map(tag => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-muted text-xs">
                        {tag}
                      </span>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditStory(false)} disabled={uploadingCover}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditStory} disabled={uploadingCover}>
                  {uploadingCover ? "Uploading..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete story</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this story? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={isDeletingStory}
                onClick={async () => {
                  if (!confirmDeleteId || isDeletingStory) return;
                  await handleDeleteStory(confirmDeleteId);
                }}
              >
                {isDeletingStory ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}