import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Eye,
  Heart,
  ArrowRight,
  Sparkles,
  PenTool,
  Star,
  TrendingUp,
  Users,
  Zap,
  Search as SearchIcon,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export default function Landing() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Add: Theme state synced with localStorage and system preference
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      // Fallback to prefers-color-scheme
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        setIsDark(false);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Add: Only query Convex when the URL is configured
  const canQuery = typeof import.meta.env.VITE_CONVEX_URL === "string" && import.meta.env.VITE_CONVEX_URL.length > 0;

  // Get some featured stories for the homepage
  const featuredStories = useQuery(api.stories.getPublishedStories, 
    canQuery
      ? {
          paginationOpts: { numItems: 6, cursor: null },
          sortBy: "popular",
        }
      : "skip"
  );

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
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
      {/* Compact Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="https://harmless-tapir-303.convex.cloud/api/storage/a61232eb-6825-4896-80b3-ce2250d9b937" alt="FanFic" width={28} height={28} className="rounded-md" />
              <span className="text-xl font-black tracking-tight">InkTale</span>
            </div>
            {!isLoading && isAuthenticated && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                Welcome, {user?.name || "Writer"}!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-muted"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Button onClick={() => navigate("/search")} className="gap-2">
              <SearchIcon className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </header>

      {/* Trending Now */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trending Now</h2>
          <Button variant="ghost" onClick={() => navigate("/explore")} className="text-purple-600">
            See All
          </Button>
        </div>

        {featuredStories && featuredStories.page.length > 0 ? (
          <div className="space-y-4">
            {featuredStories.page.slice(0, 6).map((story) => (
              <div
                key={story._id}
                className="rounded-2xl border bg-card hover:shadow-sm transition cursor-pointer p-4"
                onClick={() => navigate(`/story/${story._id}`)}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    {story.coverImage ? (
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{story.title}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {story.author?.name || "Anonymous"}
                    </div>
                    <div className="mb-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 capitalize">
                        {story.genre}
                      </span>
                    </div>
                    {story.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {story.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" /> {story.totalViews}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-4 w-4" /> {story.totalLikes}
                      </span>
                      <span>{story.totalChapters} chapters</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No trending stories yet.
          </div>
        )}
      </section>
    </motion.div>
  );
}