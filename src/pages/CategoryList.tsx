import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useEffect } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Eye, Heart, ChevronLeft } from "lucide-react";

export default function CategoryList() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Scroll to top on mount and when params change, but NOT on back navigation
  useEffect(() => {
    if (navType === "POP") return; // preserve scroll when going back
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search, navType]);

  const sort = (params.get("sort") as "recent" | "popular" | "views") ?? "recent";
  const genre = params.get("genre") || undefined;
  const title = params.get("title") || (genre ? `${capitalize(genre)} Stories` : labelForSort(sort));

  const canQuery = typeof import.meta.env.VITE_CONVEX_URL === "string" && import.meta.env.VITE_CONVEX_URL.length > 0;

  const data = useQuery(
    api.stories.listExplore,
    canQuery
      ? {
          paginationOpts: { numItems: 30, cursor: null },
          sortBy: sort,
          genre: genre as any,
        }
      : "skip",
  );

  const items = data?.page || [];

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur pt-2 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        </div>
      </div>

      {/* Results */}
      {data === undefined ? (
        <div className="space-y-3 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-24 w-20 rounded-md bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse mb-2" />
                <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-6">No stories found.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((story: any) => (
            <button
              key={story._id}
              onClick={() => navigate(`/story/${story._id}`)}
              className="w-full text-left group"
            >
              <div className="flex gap-3">
                <div className="h-28 w-24 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                  {story.coverImage ? (
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        try {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        } catch {}
                      }}
                    />
                  ) : (
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold leading-tight line-clamp-2">{story.title}</div>
                  {story.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {story.description}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {story.totalViews ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {story.totalLikes ?? 0}
                    </span>
                    <span>{story.totalChapters ?? 0} ch</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function labelForSort(sort: "recent" | "popular" | "views") {
  if (sort === "popular") return "Most Popular";
  if (sort === "views") return "Trending Now";
  return "Recently Added";
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}