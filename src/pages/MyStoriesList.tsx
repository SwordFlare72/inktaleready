import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Eye, Star, List as ListIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

function StoryRow({ story, onOpen }: { story: any; onOpen: (id: string) => void }) {
  return (
    <div className="w-full cursor-pointer py-4 hover:bg-muted/40 transition-colors" onClick={() => onOpen(story._id)}>
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
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-full w-full grid place-items-center bg-gradient-to-br from-purple-400 to-pink-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base leading-snug line-clamp-1">{story.title}</h3>
          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{story.totalViews ?? 0}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />{story.totalLikes ?? 0}</span>
            <span className="inline-flex items-center gap-1"><ListIcon className="h-3.5 w-3.5" />{story.totalChapters ?? 0}</span>
          </div>
          <p className="font-semibold text-base leading-snug mt-2 line-clamp-2">{story.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MyStoriesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stories = useQuery(
    api.users.listUserStories,
    user?._id ? { userId: user._id, paginationOpts: { numItems: 50, cursor: null } } : "skip"
  );

  const handleOpen = (id: string) => navigate(`/story/${id}`);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="ml-2 font-semibold">My Stories</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-28">
        {stories === undefined ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
        ) : (stories.page?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No stories yet</div>
        ) : (
          <div className="divide-y divide-border">
            {stories.page.map((s: any) => (
              <StoryRow key={s._id} story={s} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
