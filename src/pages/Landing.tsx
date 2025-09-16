import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Heart, 
  MessageCircle, 
  Star, 
  TrendingUp, 
  Users, 
  Zap,
  ArrowRight,
  Sparkles,
  PenTool,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Get some featured stories for the homepage
  const featuredStories = useQuery(api.stories.getPublishedStories, {
    paginationOpts: { numItems: 6, cursor: null },
    sortBy: "popular"
  });

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900"
    >
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="./logo.svg" alt="FanFic" width={32} height={32} className="rounded-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                FanFic
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <Button variant="ghost" onClick={() => navigate("/explore")}>
                Explore
              </Button>
              <Button variant="ghost" onClick={() => navigate("/search")}>
                Search
              </Button>
              {isAuthenticated && (
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Welcome, {user?.name || "Writer"}!
                  </span>
                  <Button onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                  <Button onClick={handleGetStarted}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              The ultimate platform for storytellers
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Write, Read, and Share
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Amazing Stories
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join millions of readers and writers in the world's largest community for 
              fanfiction, original stories, and creative writing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
              >
                {isAuthenticated ? "Go to Dashboard" : "Start Writing"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/explore")}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Explore Stories
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to create
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools for writers and an amazing reading experience for everyone
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: PenTool,
                title: "Rich Writing Tools",
                description: "Advanced editor with formatting, image support, and draft management"
              },
              {
                icon: Users,
                title: "Engaged Community",
                description: "Connect with readers, get feedback, and build your following"
              },
              {
                icon: Heart,
                title: "Reader Engagement",
                description: "Likes, comments, and follows to grow your audience"
              },
              {
                icon: TrendingUp,
                title: "Analytics & Insights",
                description: "Track your story performance and reader engagement"
              },
              {
                icon: Zap,
                title: "Real-time Updates",
                description: "Instant notifications for new chapters and interactions"
              },
              {
                icon: Star,
                title: "Discover & Explore",
                description: "Find amazing stories by genre, tags, and popularity"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Stories */}
      {featuredStories && featuredStories.page.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trending Stories
              </h2>
              <p className="text-xl text-muted-foreground">
                Discover what the community is reading right now
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredStories.page.slice(0, 6).map((story, index) => (
                <motion.div
                  key={story._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/story/${story._id}`)}
                  >
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
                        <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full capitalize">
                          {story.genre}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{story.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        By {story.author?.name || "Anonymous"}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {story.totalViews}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {story.totalLikes}
                          </div>
                        </div>
                        <span>{story.totalChapters} chapters</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/explore")}
              >
                View All Stories
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to start your story?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join thousands of writers sharing their creativity with the world. 
              Your next favorite story could be just a click away.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleGetStarted}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              {isAuthenticated ? "Go to Dashboard" : "Join FanFic Today"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <img src="./logo.svg" alt="FanFic" width={24} height={24} className="rounded" />
              <span className="text-lg font-bold">FanFic</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© 2024 FanFic. All rights reserved.</span>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}