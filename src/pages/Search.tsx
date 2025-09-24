import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, Eye, Heart, Search as SearchIcon, Users as UsersIcon, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Switch } from "@/components/ui/switch";

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

export default function Search() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [genre, setGenre] = useState("all");
  // Add: toggle between stories and users
  const [mode, setMode] = useState<"stories" | "users">("stories");

  // Add: show/hide filters and tags filter
  const [showFilters, setShowFilters] = useState(false);
  const [tagsInput, setTagsInput] = useState<string>("");
  const parsedTags = tagsInput
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  // Add: advanced filter state
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "views">("recent");
  const [hasCover, setHasCover] = useState(false);
  const [minChapters, setMinChapters] = useState<string>("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Rename: stories search results and add users search results
  const searchResultsStories = useQuery(
    api.stories.searchStories,
    mode === "stories" && (debouncedSearchTerm.trim().length > 0 || parsedTags.length > 0)
      ? {
          searchTerm: debouncedSearchTerm.trim(),
          genre: genre !== "all" ? genre : undefined,
          sortBy,
          hasCover: hasCover ? true : undefined,
          minChapters: minChapters.trim() ? Number(minChapters) : undefined,
          // Add: pass tags filter if present
          tagsAny: parsedTags.length > 0 ? parsedTags : undefined,
        }
      : "skip"
  );

  const userResults = useQuery(
    api.users.searchUsers,
    debouncedSearchTerm.trim().length > 0 && mode === "users"
      ? { q: debouncedSearchTerm.trim() }
      : "skip"
  );

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Search Stories 🔍</h1>
          <p className="text-muted-foreground">
            Find your next favorite story by title, description, or tags
          </p>
        </div>

        {/* Search Form */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for stories or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Mode selector (Stories | Users) */}
          <Select value={mode} onValueChange={(v: "stories" | "users") => { setMode(v); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Search type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stories">Stories</SelectItem>
              <SelectItem value="users">Users</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters toggle - only meaningful for Stories */}
          {mode === "stories" && (
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters((s) => !s)}
              className="w-full sm:w-32"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>

        {/* Advanced Filters - only for Stories and when toggled */}
        {mode === "stories" && showFilters && (
          <div className="mb-6 space-y-4">
            <div>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Sort By</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={sortBy === "recent" ? "default" : "outline"}
                  onClick={() => setSortBy("recent")}
                  className={sortBy === "recent" ? "bg-purple-600 text-white" : ""}
                  size="sm"
                >
                  Recently Updated
                </Button>
                <Button
                  variant={sortBy === "popular" ? "default" : "outline"}
                  onClick={() => setSortBy("popular")}
                  className={sortBy === "popular" ? "bg-purple-600 text-white" : ""}
                  size="sm"
                >
                  Most Popular
                </Button>
                <Button
                  variant={sortBy === "views" ? "default" : "outline"}
                  onClick={() => setSortBy("views")}
                  className={sortBy === "views" ? "bg-purple-600 text-white" : ""}
                  size="sm"
                >
                  Most Views
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="flex items-center justify-between sm:justify-start sm:gap-3 border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium block">With Cover Only</label>
                  <p className="text-xs text-muted-foreground">Hide stories without a cover</p>
                </div>
                <Switch checked={hasCover} onCheckedChange={setHasCover} />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Chapters</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 5"
                  value={minChapters}
                  onChange={(e) => setMinChapters(e.target.value)}
                />
              </div>

              <div className="hidden sm:block" />
            </div>

            {/* Tags filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags (comma separated, up to 5)</label>
              <Input
                placeholder="e.g. romance, fantasy, villain"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {parsedTags.map((t) => (
                  <span key={t} className="px-2 py-1 text-xs rounded-full bg-muted">
                    #{t}
                  </span>
                ))}
                {parsedTags.length >= 5 && (
                  <span className="text-xs text-muted-foreground">Max 5 tags</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {debouncedSearchTerm.trim().length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start searching</h3>
            <p className="text-muted-foreground">
              Enter a search term to find {mode === "stories" ? "stories by title, description, or tags" : "users by name"}
            </p>
          </div>
        ) : (
          <>
            {/* Branch by mode to determine loading/empty/results */}
            {mode === "stories" ? (
              <>
                {searchResultsStories === undefined ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
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
                ) : searchResultsStories.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No stories found</h3>
                    <p className="text-muted-foreground">
                      Try different keywords or check your spelling
                    </p>
                    <Button
                      onClick={() => navigate("/explore")}
                      className="mt-4"
                      variant="outline"
                    >
                      Browse All Stories
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-muted-foreground">
                        Found {searchResultsStories.length} result{searchResultsStories.length !== 1 ? "s" : ""} for "{debouncedSearchTerm}"
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResultsStories.map((story) => (
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
                  </>
                )}
              </>
            ) : (
              // Users mode
              <>
                {userResults === undefined ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden animate-pulse">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-muted" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-2 w-1/2" />
                            <div className="h-3 bg-muted rounded w-3/4" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : userResults.length === 0 ? (
                  <div className="text-center py-12">
                    <UsersIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground">
                      Try a different name
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-muted-foreground">
                        Found {userResults.length} user{userResults.length !== 1 ? "s" : ""} for "{debouncedSearchTerm}"
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userResults.map((u) => (
                        <motion.div
                          key={u._id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => navigate(`/profile/${u._id}`)}
                          >
                            <CardContent className="p-4 flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={u.image || ""} />
                                <AvatarFallback>
                                  {(u.name?.[0] || "U").toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <h3 className="font-semibold truncate">{u.name || "Anonymous"}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {u.bio || "—"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}