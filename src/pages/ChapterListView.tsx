import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Eye, Heart, ChevronLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router";

export default function ChapterListView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const story = useQuery(api.stories.getStoryById, id ? { storyId: id as any } : "skip");
  const readingProgress = useQuery(api.readingProgress.getProgress, id ? { storyId: id as any } : "skip");

  const handleBack = () => {
    navigate(`/story/${id}`);
  };

  const handleChapterClick = (chapterId: string) => {
    navigate(`/read/${chapterId}`);
  };

  if (story === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Story not found</h2>
          <Button onClick={() => navigate("/explore")}>Browse Stories</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{story.title}</h1>
            <p className="text-sm text-muted-foreground">
              {story.chapters?.length || 0} Chapters
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-8">
        <div className="space-y-3">
          {!story.chapters || story.chapters.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <p className="text-muted-foreground">No chapters available yet</p>
            </div>
          ) : (
            <>
              {story.chapters.map((chapter) => (
                <motion.div
                  key={chapter._id}
                  whileHover={{ scale: 1.005 }}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all border border-border/40"
                  onClick={() => handleChapterClick(chapter._id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-base truncate">{chapter.title}</h4>
                        {readingProgress?.lastChapterId === chapter._id && (
                          <span className="shrink-0 px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full font-medium">
                            Last Read
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{chapter.wordCount} words</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {chapter.views}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {chapter.likes}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {chapter._creationTime ? new Date(chapter._creationTime).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
