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
import { Plus, Edit, Trash2, Eye, BookOpen, FileText, Save } from "lucide-react";
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
  };

  const startEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
    setIsDraft(chapter.isDraft);
    setShowCreateChapter(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Writer Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage your stories and chapters
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stories List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My Stories</h2>
              <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Story
                  </Button>
                </DialogTrigger>
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
            </div>

            <div className="space-y-3">
              {myStories?.map((story) => (
                <Card 
                  key={story._id} 
                  className={`cursor-pointer transition-colors ${
                    selectedStoryId === story._id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedStoryId(story._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{story.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {story.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{story.totalChapters} chapters</span>
                          <span>{story.totalViews} views</span>
                          <span className={story.isPublished ? 'text-green-600' : 'text-orange-600'}>
                            {story.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {myStories?.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No stories yet</p>
                <Button onClick={() => setShowCreateStory(true)}>
                  Create Your First Story
                </Button>
              </div>
            )}
          </div>

          {/* Story Details & Chapters */}
          <div className="lg:col-span-2">
            {selectedStory ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {selectedStory.title}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/story/${selectedStory._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{selectedStory.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Genre: {selectedStory.genre}</span>
                      <span>{selectedStory.totalChapters} chapters</span>
                      <span>{selectedStory.totalViews} views</span>
                      <span>{selectedStory.totalLikes} likes</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Chapters</h3>
                  <Dialog open={showCreateChapter} onOpenChange={(open) => {
                    setShowCreateChapter(open);
                    if (!open) resetChapterForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Chapter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                            <label className="text-sm font-medium mb-2 block">Content *</label>
                            <Textarea
                              value={chapterContent}
                              onChange={(e) => setChapterContent(e.target.value)}
                              placeholder="Write your chapter content here..."
                              rows={20}
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
                            <h2 className="text-2xl font-bold mb-4">{chapterTitle || "Chapter Title"}</h2>
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
                        <Button onClick={handleCreateChapter}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingChapter ? 'Update Chapter' : 'Save Chapter'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {selectedStory.chapters?.map((chapter) => (
                    <Card key={chapter._id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              Chapter {chapter.chapterNumber}: {chapter.title}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{chapter.wordCount} words</span>
                              <span>{chapter.views} views</span>
                              <span>{chapter.likes} likes</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditChapter(chapter)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteChapter(chapter._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedStory.chapters?.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No chapters yet</p>
                    <Button onClick={() => setShowCreateChapter(true)}>
                      Write Your First Chapter
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Select a story to view and manage its chapters
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
