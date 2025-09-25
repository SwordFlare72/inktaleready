import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, BookOpen, Eye, Star, List as ListIcon, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate, useParams, useLocation } from "react-router";

// Minimal, borderless row component (same visual as Library/Search)
function StoryRow({
  story,
  onClick,
  relTimeFn,
  onRemove,
}: {
  story: any;
  onClick: (id: string) => void;
  relTimeFn: (ts?: number) => string;
  onRemove: (id: string) => Promise<void>;
}) {
  const maxChips = 3;
  const tags: Array<string> = Array.isArray(story.tags) ? story.tags : [];
  const extraCount = tags.length > maxChips ? tags.length - maxChips : 0;

  return (
    <div
      className="w-full cursor-pointer py-4 hover:bg-muted/40 transition-colors"
      onClick={() => onClick(story._id)}
    >
      <div className="flex items-start gap-4">
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
            <h3 className="font-semibold text-base leading-snug line-clamp-1">
              {story.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 p-2 rounded-md hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Story options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onClick(story._id)}>Open</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={async () => {
                    await onRemove(story._id);
                  }}
                >
                  Remove from list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Removed author line per request */}

          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {story.totalViews?.toLocaleString?.() ?? story.totalViews ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {story.totalLikes?.toLocaleString?.() ?? story.totalLikes ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <ListIcon className="h-3.5 w-3.5" />
              {story.totalChapters ?? 0}
            </span>
          </div>

          <p className="font-semibold text-base leading-snug mt-2 line-clamp-2">
            {story.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {tags.slice(0, maxChips).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-[11px]"
              >
                {t}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-[11px] text-muted-foreground">+{extraCount} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReadingListView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fromProfile = (location.state as any)?.from === "profile";
  const profileId = (location.state as any)?.profileId as string | undefined;

  const list = useQuery(api.library.getListById, id ? { listId: id as any } : "skip");

  const removeFromList = useMutation(api.library.removeFromList);
  const handleBack = () => {
    if (fromProfile) {
      if (profileId) {
        navigate(`/profile/${profileId}`);
      } else {
        navigate("/profile");
      }
    } else {
      navigate("/library");
    }
  };

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

  const handleStoryClick = (storyId: string) => {
    navigate(`/story/${storyId}`);
  };

  const handleRemoveFromThisList = async (storyId: string) => {
    if (!id) return;
    try {
      await removeFromList({ listId: id as any, storyId: storyId as any });
      toast.success("Removed from list");
    } catch {
      toast.error("Failed to remove from list");
    }
  };

  if (list === undefined) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <div className="mb-4 text-muted-foreground">Reading list not found</div>
          <Button onClick={() => navigate("/library")} variant="outline">
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Top bar with back button */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="ml-2 font-semibold">{list.name}</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-28">
        {/* Borderless header + list content (removed Card) */}
        <div className="px-1 pt-1 pb-2 text-base font-semibold">
          {list.storyCount} {list.storyCount === 1 ? "story" : "stories"} · {list.isPublic ? "Public" : "Private"}
        </div>
        {list.stories?.length > 0 ? (
          <div className="divide-y divide-border">
            {list.stories.map((story: any) => (
              <StoryRow
                key={story._id}
                story={story}
                onClick={handleStoryClick}
                relTimeFn={relTime}
                onRemove={handleRemoveFromThisList}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No stories in this list yet
          </div>
        )}
      </div>
    </motion.div>
  );
}