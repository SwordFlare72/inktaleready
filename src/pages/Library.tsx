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
import { BookOpen, Heart, Clock, Plus, List, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {follows?.page.map((story) => {
                if (!story) return null;
                return (
                  <Card key={story._id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <div onClick={() => navigate(`/story/${story._id}`)}>
                      {story.coverImage && (
                        <div className="aspect-[3/4] overflow-hidden rounded-t-lg">
                          <img
                            src={story.coverImage}
                            alt={story.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{story.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {story.author?.name || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {story.totalViews}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {story.totalLikes}
                          </div>
                          {story.isFavorite && (
                            <Heart className="h-3 w-3 fill-current text-red-500" />
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
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

            <div className="space-y-4">
              {history?.page.map((story) => {
                if (!story) return null;
                return (
                  <Card key={story._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {story.coverImage && (
                          <img
                            src={story.coverImage}
                            alt={story.title}
                            className="w-16 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{story.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {story.author?.name || "Anonymous"}
                          </p>
                          {story.lastChapter && (
                            <p className="text-sm mb-2">
                              Last read: Chapter {story.lastChapter.chapterNumber} - {story.lastChapter.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => story.lastChapter && navigate(`/read/${story.lastChapter._id}`)}
                            >
                              Continue Reading
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/story/${story._id}`)}
                            >
                              Story Details
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(story.lastReadAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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