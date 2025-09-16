import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, MessageCircle, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const myStories = useQuery(api.stories.getMyStories);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name || "Writer"}! 📚
            </h1>
            <p className="text-muted-foreground mt-2">
              {user.isWriter ? "Manage your stories and track your progress" : "Start your writing journey today"}
            </p>
          </div>
          <Button 
            onClick={() => navigate("/write")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Story
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stories">My Stories</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Stories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{myStories?.length || 0}</div>
                    <BookOpen className="w-5 h-5 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {myStories?.reduce((sum, story) => sum + story.totalViews, 0) || 0}
                    </div>
                    <Eye className="w-5 h-5 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Likes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {myStories?.reduce((sum, story) => sum + story.totalLikes, 0) || 0}
                    </div>
                    <Heart className="w-5 h-5 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {myStories?.reduce((sum, story) => sum + story.totalComments, 0) || 0}
                    </div>
                    <MessageCircle className="w-5 h-5 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest stories and their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myStories && myStories.length > 0 ? (
                  <div className="space-y-4">
                    {myStories.slice(0, 5).map((story) => (
                      <div
                        key={story._id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/story/${story._id}`)}
                      >
                        <div className="flex items-center gap-4">
                          {story.coverImage ? (
                            <img
                              src={story.coverImage}
                              alt={story.title}
                              className="w-12 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{story.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {story.totalChapters} chapters • {story.genre}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {story.totalViews}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {story.totalLikes}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your writing journey by creating your first story
                    </p>
                    <Button onClick={() => navigate("/write")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Story
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories">
            <Card>
              <CardHeader>
                <CardTitle>My Stories</CardTitle>
                <CardDescription>
                  Manage and edit your published and draft stories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myStories && myStories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myStories.map((story) => (
                      <Card key={story._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-[3/4] relative">
                          {story.coverImage ? (
                            <img
                              src={story.coverImage}
                              alt={story.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                              <BookOpen className="w-12 h-12 text-white" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              story.isPublished 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}>
                              {story.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2 line-clamp-2">{story.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {story.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                            <span>{story.totalChapters} chapters</span>
                            <span className="capitalize">{story.genre}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {story.totalViews}
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                {story.totalLikes}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/write/${story._id}`)}
                            >
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your writing journey by creating your first story
                    </p>
                    <Button onClick={() => navigate("/write")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Story
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library">
            <Card>
              <CardHeader>
                <CardTitle>My Library</CardTitle>
                <CardDescription>
                  Stories you're following and reading lists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Library coming soon</h3>
                  <p className="text-muted-foreground">
                    Follow stories and create reading lists to see them here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Detailed insights about your stories' performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics coming soon</h3>
                  <p className="text-muted-foreground">
                    Detailed analytics and insights will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
