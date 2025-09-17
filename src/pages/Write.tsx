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
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Eye, BookOpen, FileText, Save, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<Id<"stories"> | null>(null);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  
  // Story form state
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDescription, setStoryDescription] = useState("");
  const [storyGenre, setStoryGenre] = useState("");
  const [storyTags, setStoryTags] = useState("");
  const [storyCover, setStoryCover] = useState("");
  
  // Chapter form state
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [chapterCover, setChapterCover] = useState("");

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

    try {
      const storyId = await createStory({
        title: storyTitle.trim(),
        description: storyDescription.trim(),
        genre: storyGenre,
        tags: storyTags.split(",").map(tag => tag.trim()).filter(Boolean),
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

  const saveChapter = async (publish: boolean) => {
    if (!selectedStoryId || !chapterTitle.trim() || !chapterContent.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      if (editingChapter) {
        await updateChapter({
          chapterId: editingChapter._id,
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
          isDraft: !publish,
          isPublished: publish,
          coverImage: chapterCover.trim() || undefined,
        });
        toast.success(publish ? "Chapter published!" : "Draft saved!");
      } else {
        await createChapter({
          storyId: selectedStoryId,
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
          isDraft: !publish,
          coverImage: chapterCover.trim() || undefined,
        });
        toast.success(publish ? "Chapter published!" : "Draft saved!");
      }
      setShowCreateChapter(false);
      resetChapterForm();
    } catch (error) {
      toast.error("Failed to save chapter");
    }
  };

  const handleCreateChapter = async () => {
    if (!selectedStoryId || !chapterTitle.trim() || !chapterContent.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingChapter) {
        await updateChapter({
          chapterId: editingChapter._id,
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
          isDraft,
          isPublished: !isDraft,
        });
        toast.success("Chapter updated successfully!");
      } else {
        await createChapter({
          storyId: selectedStoryId,
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
          isDraft,
        });
        toast.success("Chapter created successfully!");
      }
      
      setShowCreateChapter(false);
      resetChapterForm();
    } catch (error) {
      toast.error("Failed to save chapter");
    }
  };

  const handleDeleteStory = async (storyId: Id<"stories">) => {
    if (!confirm("Are you sure you want to delete this story? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteStory({ storyId });
      toast.success("Story deleted successfully");
      if (selectedStoryId === storyId) {
        setSelectedStoryId(null);
      }
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleDeleteChapter = async (chapterId: Id<"chapters">) => {
    if (!confirm("Are you sure you want to delete this chapter?")) {
      return;
    }

    try {
      await deleteChapter({ chapterId });
      toast.success("Chapter deleted successfully");
    } catch (error) {
      toast.error("Failed to delete chapter");
    }
  };

  const resetStoryForm = () => {
    setStoryTitle("");
    setStoryDescription("");
    setStoryGenre("");
    setStoryTags("");
    setStoryCover("");
  };

  const resetChapterForm = () => {
    setChapterTitle("");
    setChapterContent("");
    setIsDraft(true);
    setEditingChapter(null);
    setShowPreview(false);
    setChapterCover("");
  };

  const startEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
    setIsDraft(chapter.isDraft);
    setChapterCover(chapter.coverImage || "");
    setShowCreateChapter(true);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-2xl mx-auto px-3 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Writer Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage your stories and connect with readers</p>
          </div>
          <Button
            onClick={() => setShowCreateStory(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Story
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card className="p-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Stories</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold">{totalStories}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Views</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold">{totalViews}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Likes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold">{totalLikes}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Chapters</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold">{totalChapters}</div>
            </CardContent>
          </Card>
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
                      setSelectedStoryId(story._id);
                      setEditingChapter(null);
                      setShowCreateChapter(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Chapter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStoryId(story._id)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Manage ({story.totalChapters})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Analytics
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
          <DialogContent className="max-w-2xl">
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
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <Input
                  value={storyTags}
                  onChange={(e) => setStoryTags(e.target.value)}
                  placeholder="Enter tags separated by commas..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cover Image URL</label>
                <Input
                  value={storyCover}
                  onChange={(e) => setStoryCover(e.target.value)}
                  placeholder="Enter image URL..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateStory(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStory}>Create Story</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Chapter Dialog (controlled) */}
        <Dialog open={showCreateChapter} onOpenChange={(open) => {
          setShowCreateChapter(open);
          if (!open) resetChapterForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingChapter ? 'Edit Chapter' : 'Create New Chapter'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={showPreview ? "preview" : "edit"} onValueChange={(v) => setShowPreview(v === "preview")}>
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Chapter Title *</label>
                  <Input
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Enter chapter title..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Cover Image URL</label>
                  <Input
                    value={chapterCover}
                    onChange={(e) => setChapterCover(e.target.value)}
                    placeholder="Enter image URL..."
                  />
                  {chapterCover && (
                    <div className="mt-2">
                      <img src={chapterCover} alt="Chapter cover preview" className="h-28 w-auto rounded-md border object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content *</label>
                  <Textarea
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    placeholder="Write your chapter content here..."
                    rows={16}
                    className="font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="draft"
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                  />
                  <label htmlFor="draft" className="text-sm">Save as draft</label>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-2">{chapterTitle || "Chapter Title"}</h2>
                  {chapterCover && (
                    <img src={chapterCover} alt="Chapter cover" className="h-40 w-full object-cover rounded mb-4" />
                  )}
                  <div
                    className="prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: chapterContent.replace(/\n/g, '<br>') || "Chapter content will appear here..."
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateChapter(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => saveChapter(false)}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={() => saveChapter(true)}>
                <Save className="h-4 w-4 mr-2" />
                {editingChapter ? 'Publish Changes' : 'Publish'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}