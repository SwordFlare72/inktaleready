import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Eye,
  ArrowRight,
  Search as SearchIcon,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState, useMemo, useRef } from "react";

export default function Landing() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
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

  const canQuery = typeof import.meta.env.VITE_CONVEX_URL === "string" && import.meta.env.VITE_CONVEX_URL.length > 0;

  const history = useQuery(api.library.listHistory, canQuery ? { paginationOpts: { numItems: 30, cursor: null } } : "skip");
  const trending = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 30, cursor: null }, sortBy: "views" } : "skip");
  const mostPopular = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 30, cursor: null }, sortBy: "popular" } : "skip");
  const recent = useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 30, cursor: null }, sortBy: "recent" } : "skip");

  const GENRES = useMemo(() => (["romance","fantasy","mystery","sci-fi","horror","adventure"] as const), []);
  const genrePages = GENRES.map((g) => ({
    genre: g,
    data: useQuery(api.stories.listExplore, canQuery ? { paginationOpts: { numItems: 30, cursor: null }, genre: g, sortBy: "recent" } : "skip")
  }));

  const handleViewAllExplore = (params: Record<string,string | undefined>) => {
    const search = new URLSearchParams();
    if (params.genre) search.set("genre", params.genre);
    if (params.sort) search.set("sort", params.sort);
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const isDraggingRef = useRef<boolean>(false);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef<number>(0);
    const startScrollLeftRef = useRef<number>(0);
    const clickBlockedRef = useRef<boolean>(false);

    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    };

    useEffect(() => {
      checkScroll();
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
          container.removeEventListener('scroll', checkScroll);
          window.removeEventListener('resize', checkScroll);
        };
      }
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    };

    const onMouseDown = (e: React.MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      startXRef.current = e.clientX;
      startScrollLeftRef.current = container.scrollLeft;
      clickBlockedRef.current = false;
    };

    const onMouseMove = (e: React.MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container || !isDraggingRef.current) return;
      e.preventDefault();
      const dx = e.clientX - startXRef.current;
      if (Math.abs(dx) > 5) clickBlockedRef.current = true;
      container.scrollLeft = startScrollLeftRef.current - dx;
      checkScroll();
    };

    const endDrag = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      setTimeout(() => { clickBlockedRef.current = false; }, 0);
    };

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 px-4">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {showViewAll && (
            <Button 
              onClick={onViewAll}
              className="bg-[oklch(0.75_0.15_85)] hover:bg-[oklch(0.70_0.15_85)] text-[oklch(0.15_0.01_240)] font-semibold rounded-full px-6"
            >
              View All
            </Button>
          )}
        </div>
        {items === undefined ? (
          <div className="h-64 flex gap-4 overflow-hidden px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 flex-shrink-0">
                <div className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
                <div className="h-3 mt-3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground px-4">Nothing here yet.</div>
        ) : (
          <div className="relative group">
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                aria-label="Scroll left"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                aria-label="Scroll right"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}

            <div 
              ref={scrollContainerRef}
              className={`flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide select-none px-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              {(items as any[]).map((story, idx) => (
                <button
                  key={story._id ?? idx}
                  onClick={() => {
                    if (clickBlockedRef.current) return;
                    navigate(`/story/${story._id}`);
                  }}
                  className="w-40 flex-shrink-0 snap-start text-left group/card"
                >
                  <div className="relative overflow-hidden rounded-xl">
                    <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
                      {story.coverImage ? (
                        <img
                          src={story.coverImage}
                          alt={story.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-gradient-to-br from-muted to-muted/50">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {story.totalViews > 0 && (
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <Eye className="h-3 w-3 text-white" />
                        <span className="text-xs font-medium text-white">
                          {story.totalViews >= 1000 
                            ? `${(story.totalViews / 1000).toFixed(1)}K` 
                            : story.totalViews}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="text-base font-bold leading-tight line-clamp-2 text-[oklch(0.75_0.15_85)] mb-1">
                      {story.title}
                    </div>
                    {story.author?.name && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {story.author.name}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background pb-24"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight">
                <span className="text-[oklch(0.75_0.15_85)]">Ink</span>
                <span className="text-foreground">Tale</span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/search")}
              className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            {isAuthenticated && user?.image && (
              <button
                onClick={() => navigate("/profile")}
                className="h-10 w-10 rounded-full overflow-hidden border-2 border-[oklch(0.75_0.15_85)]"
              >
                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sections */}
      <section className="container mx-auto py-6">
        <Section
          title="Reading History"
          items={history?.page}
          onViewAll={handleViewAllHistory}
        />

        <Section
          title="Trending Now"
          items={trending?.page}
          onViewAll={() => handleViewAllExplore({ sort: "views" })}
        />

        <Section
          title="Most Popular"
          items={mostPopular?.page}
          onViewAll={() => handleViewAllExplore({ sort: "popular" })}
        />

        <Section
          title="Recently Added"
          items={recent?.page}
          onViewAll={() => handleViewAllExplore({ sort: "recent" })}
        />

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