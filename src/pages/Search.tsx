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

// Add: Minimal, borderless row component for stories (no Card wrapper)
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
        {/* Make cover slightly larger for better visibility */}
        <div className="h-24 w-20 overflow-hidden rounded-md bg-muted flex-shrink-0">
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
            {/* Increase title size */}
            <h3 className="font-semibold text-lg leading-snug line-clamp-1">
              {story.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 capitalize whitespace-nowrap">
              {story.genre}
            </span>
          </div>

          {/* Keep author line but slightly larger spacing overall */}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            by {story.author?.name || "Anonymous"}
          </p>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {story.description}
          </p>

          {/* Increase meta size for readability */}
          <div className="mt-2 text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
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

  // Add: simple relative time formatter for "Uploaded X ago"
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
    mode === "stories"
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
      <div className="container mx-auto px-4 py-8 pb-28">
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
        {mode === "users" ? (
          // Users mode keeps existing behavior (requires a query)
          <>
            {debouncedSearchTerm.trim().length === 0 ? (
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Start searching</h3>
                <p className="text-muted-foreground">
                  Enter a search term to find users by name
                </p>
              </div>
            ) : userResults === undefined ? (
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
                <p className="text-muted-foreground">Try a different name</p>
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
                            <AvatarImage src={undefined} />
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
        ) : (
          // Stories mode: ALWAYS show stories according to current filters
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
                  Try different filters
                </p>
                <Button onClick={() => navigate("/explore")} className="mt-4" variant="outline">
                  Browse All Stories
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-muted-foreground">
                    Showing {searchResultsStories.length} stor{searchResultsStories.length !== 1 ? "ies" : "y"} {debouncedSearchTerm ? `for "${debouncedSearchTerm}"` : "(filtered)"}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {searchResultsStories.map((story) => (
                    <motion.div
                      key={story._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <StoryRow story={story} onClick={handleStoryClick} relTimeFn={relTime} />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}