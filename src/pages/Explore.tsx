import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router";

const GENRES = [
  { value: "all", label: "All Genres" },
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

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated" },
  { value: "popular", label: "Most Popular" },
  { value: "views", label: "Most Viewed" },
];

export default function Explore() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Initialize from URL params once
  const initialParams = (() => {
    const sp = new URLSearchParams(location.search);
    const g = sp.get("genre") || "all";
    const s = sp.get("sort") || "recent";
    return { g, s };
  })();

  const [genre, setGenre] = useState(initialParams.g);
  const [sortBy, setSortBy] = useState(initialParams.s);
  const [cursor, setCursor] = useState<string | null>(null);

  const stories = useQuery(api.stories.listExplore, {
    paginationOpts: { numItems: 12, cursor },
    genre: genre !== "all" ? genre : undefined,
    sortBy: sortBy as any,
  });

  const handleStoryClick = (storyId: string) => {
    navigate(`/story/${storyId}`);
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Explore Stories 📖</h1>
            <p className="text-muted-foreground mt-2">
              Discover amazing stories from writers around the world
            </p>
          </div>
          <Button onClick={() => navigate("/search")} variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stories Grid */}
        {stories === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded mb-3" />
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stories.page.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No stories found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later for new stories
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stories.page.map((story) => (
                <motion.div
                  key={story._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleStoryClick(story._id)}
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
                      <h3 className="font-semibold mb-1 line-clamp-2">{story.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {story.author?.name || "Anonymous"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {story.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
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
                        <span className="text-muted-foreground">
                          {story.totalChapters} ch
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {!stories.isDone && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setCursor(stories.continueCursor)}
                  variant="outline"
                >
                  Load More Stories
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}