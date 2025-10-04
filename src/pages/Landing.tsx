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
import { useEffect, useState, useMemo } from "react";

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

  // New: homepage data sources (10 each)
  const history = useQuery(api.library.listHistory, canQuery ? { paginationOpts: { numItems: 10, cursor: null } } : "skip");
  const trending = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 10, cursor: null }, sortBy: "views" } : "skip");
  const mostPopular = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 10, cursor: null }, sortBy: "popular" } : "skip");
  const recent = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 10, cursor: null }, sortBy: "recent" } : "skip");

  // Pick a few common genres to showcase
  const GENRES = useMemo(() => (["romance","fantasy","mystery","sci-fi","horror","adventure"] as const), []);
  const genrePages = GENRES.map((g) => ({
    genre: g,
    data: useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 10, cursor: null }, genre: g, sortBy: "recent" } : "skip")
  }));

  const handleViewAllExplore = (params: Record<string,string | undefined>) => {
    const search = new URLSearchParams();
    if (params.genre) search.set("genre", params.genre);
    if (params.sort) search.set("sort", params.sort);
    // Provide a readable title for the new page
    if (params.genre) {
      search.set("title", `${params.genre.charAt(0).toUpperCase() + params.genre.slice(1)} Stories`);
    } else if (params.sort === "popular") {
      search.set("title", "Most Popular");
    } else if (params.sort === "views") {
      search.set("title", "Trending Now");
    } else if (params.sort === "recent") {
      search.set("title", "Recently Added");
    }
    navigate(`/category?${search.toString()}`);
  };

  const handleViewAllHistory = () => {
    navigate("/library");
  };

  // Small, reusable horizontal scroller section
  const Section = ({
    title,
    items,
    onViewAll,
    showViewAll = true,
  }: {
    title: string;
    items: Array<any> | undefined | null;
    onViewAll: () => void;
    showViewAll?: boolean;
  }) => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {showViewAll && (items && (items as any[]).length >= 10) && (
            <Button variant="outline" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
        {items === undefined ? (
          <div className="h-40 flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-32 flex-shrink-0">
                <div className="aspect-[3/4] rounded-md bg-muted animate-pulse" />
                <div className="h-3 mt-2 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground">Nothing here yet.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {(items as any[]).map((story, idx) => (
              <button
                key={story._id ?? idx}
                onClick={() => navigate(`/story/${story._id}`)}
                className="w-32 flex-shrink-0 snap-start text-left"
              >
                <div className="relative">
                  <div className="aspect-[3/4] w/full overflow-hidden rounded-lg bg-muted">
                    {story.coverImage ? (
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Redesigned rank badge */}
                  <div className="absolute top-2 left-2">
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md ring-1 ring-white/30 dark:ring-black/30 bg-gradient-to-br from-violet-600 to-fuchsia-500">
                      {idx + 1}
                    </div>
                  </div>
                </div>
                {/* Fixed-height title block for perfect row alignment, keep bigger */}
                <div className="mt-2">
                  <div className="text-base font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                    {story.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              <img src="https://harmless-tapir-303.convex.cloud/api/storage/a61232eb-6825-4896-80b3-ce2250d9b937" alt="FanFic" width={36} height={36} className="rounded-md" />
              <span className="text-2xl font-black tracking-tight">InkTale</span>
            </div>
            {!isLoading && isAuthenticated && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                Welcome, {user?.name || user?.username || "Writer"}!
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

      {/* Sections */}
      <section className="container mx-auto px-4 py-6">
        {/* Reading History */}
        <Section
          title="Reading History"
          items={history?.page}
          onViewAll={handleViewAllHistory}
        />

        {/* Trending Now */}
        <Section
          title="Trending Now"
          items={trending?.page}
          onViewAll={() => handleViewAllExplore({ sort: "views" })}
        />

        {/* Most Popular */}
        <Section
          title="Most Popular"
          items={mostPopular?.page}
          onViewAll={() => handleViewAllExplore({ sort: "popular" })}
        />

        {/* Recently Added */}
        <Section
          title="Recently Added"
          items={recent?.page}
          onViewAll={() => handleViewAllExplore({ sort: "recent" })}
        />

        {/* Genre rows */}
        {genrePages.map(({ genre, data }) => (
          <Section
            key={genre}
            title={genre.charAt(0).toUpperCase() + genre.slice(1)}
            items={data?.page}
            onViewAll={() => handleViewAllExplore({ genre, sort: "recent" })}
          />
        ))}
      </section>
    </motion.div>
  );
}