import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Heart, MessageCircle, Share2, Flag, Settings, ChevronLeft, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Add: guard to avoid repeatedly incrementing views on reactive re-renders
  const incrementedForChapterRef = useRef<string | null>(null);

  const chapter = useQuery(api.chapters.getChapterById, id ? { chapterId: id as Id<"chapters"> } : "skip");
  const adjacent = useQuery(api.chapters.getAdjacent, id ? { chapterId: id as Id<"chapters"> } : "skip");
  const hasLiked = useQuery(api.chapters.hasUserLikedChapter, id ? { chapterId: id as Id<"chapters"> } : "skip");
  const readingProgress = useQuery(api.readingProgress.getProgress, 
    chapter ? { storyId: chapter.story._id } : "skip"
  );
  const storyChapters = useQuery(api.chapters.getChaptersByStory, 
    chapter ? { storyId: chapter.story._id } : "skip"
  );

  const incrementViews = useMutation(api.chapters.incrementChapterViews);
  const toggleLike = useMutation(api.chapters.toggleChapterLike);
  const setProgress = useMutation(api.readingProgress.setProgress);
  const createReport = useMutation(api.reports.createReport);
  const comments = useQuery(
    api.comments.getCommentsByChapter,
    id ? { chapterId: id as Id<"chapters">, sortBy: "recent" } : "skip"
  );
  const createComment = useMutation(api.comments.createComment);
  const reactToComment = useMutation(api.comments.reactToComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Replace the effect that increments views and sets progress to be idempotent per chapter
  useEffect(() => {
    if (!id || !chapter) return;

    if (incrementedForChapterRef.current !== id) {
      incrementedForChapterRef.current = id;
      incrementViews({ chapterId: id as Id<"chapters"> });
      
      if (isAuthenticated) {
        setProgress({
          storyId: chapter.story._id,
          chapterId: id as Id<"chapters">,
        });
      }
    }
  }, [id, chapter?._id, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to like chapters");
      return;
    }
    
    try {
      const liked = await toggleLike({ chapterId: id as Id<"chapters"> });
      toast.success(liked ? "Chapter liked!" : "Like removed");
    } catch (error) {
      toast.error("Failed to update like");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Chapter link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to report content");
      return;
    }

    if (!reportReason.trim()) {
      toast.error("Please select a reason for reporting");
      return;
    }

    try {
      await createReport({
        targetType: "chapter",
        targetId: id!,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      toast.success("Report submitted successfully");
      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      toast.error("Failed to submit report");
    }
  };

  const handlePostComment = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to comment");
      return;
    }
    const text = newComment.trim();
    if (!text) {
      toast.error("Write something first");
      return;
    }
    try {
      await createComment({ chapterId: id as Id<"chapters">, content: text });
      setNewComment("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to reply");
      return;
    }
    const text = replyText.trim();
    if (!text) {
      toast.error("Write something first");
      return;
    }
    try {
      await createComment({
        chapterId: id as Id<"chapters">,
        content: text,
        parentCommentId: parentId as Id<"comments">,
      });
      setReplyText("");
      setReplyToId(null);
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const handleReact = async (commentId: string, isLike: boolean) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to react");
      return;
    }
    try {
      await reactToComment({ commentId: commentId as Id<"comments">, isLike });
    } catch {
      toast.error("Failed to react");
    }
  };

  const fontSizeClasses = {
    small: "text-sm leading-relaxed",
    medium: "text-base leading-relaxed",
    large: "text-lg leading-relaxed",
  };

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading chapter...</p>
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/story/${chapter.story._id}`, { replace: true })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Story
          </Button>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Chapters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{chapter.story.title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {storyChapters?.map((ch) => (
                    <Button
                      key={ch._id}
                      variant={ch._id === id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => navigate(`/read/${ch._id}`)}
                    >
                      <span className="font-medium">Ch. {ch.chapterNumber}</span>
                      <span className="ml-2 truncate">{ch.title}</span>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Reading Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Font Size</label>
                    <Select value={fontSize} onValueChange={(value: any) => setFontSize(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{chapter.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Chapter {chapter.chapterNumber}</span>
            <span>{chapter.wordCount} words</span>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {chapter.views}
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4 md:p-8">
            <div 
              className={`prose prose-gray dark:prose-invert max-w-none ${fontSizeClasses[fontSize]}`}
              dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n/g, '<br>') }}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={hasLiked ? "default" : "outline"}
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
              {chapter.likes}
            </Button>

            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>

            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Chapter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Reason</label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="copyright">Copyright Violation</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Additional Details (Optional)</label>
                    <Textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Provide additional context..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleReport}>Submit Report</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-2 md:justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={!adjacent?.prevId}
              className="min-w-[120px]"
              onClick={() => adjacent?.prevId && navigate(`/read/${adjacent.prevId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!adjacent?.nextId}
              className="min-w-[120px]"
              onClick={() => adjacent?.nextId && navigate(`/read/${adjacent.nextId}`)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments ({chapter.comments})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Composer */}
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handlePostComment}>
                  Post
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-5">
              {(comments ?? []).map((c: any) => (
                <div key={c._id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {c.author?.name || "Anonymous"}
                      </div>
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                        {c.content}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <button
                          onClick={() => handleReact(c._id, true)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <ThumbsUp className="h-4 w-4" /> {c.likes}
                        </button>
                        <button
                          onClick={() => handleReact(c._id, false)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <ThumbsDown className="h-4 w-4" /> {c.dislikes}
                        </button>
                        <button
                          onClick={() =>
                            setReplyToId((prev) => (prev === c._id ? null : c._id))
                          }
                          className="hover:text-foreground"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reply composer */}
                  {replyToId === c._id && (
                    <div className="pl-4 border-l space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyToId(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handlePostReply(c._id)}>
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {Array.isArray(c.replies) && c.replies.length > 0 && (
                    <div className="pl-4 border-l space-y-3">
                      {c.replies.map((r: any) => (
                        <div key={r._id}>
                          <div className="text-sm font-medium">
                            {r.author?.name || "Anonymous"}
                          </div>
                          <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                            {r.content}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <button
                              onClick={() => handleReact(r._id, true)}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                              <ThumbsUp className="h-4 w-4" /> {r.likes}
                            </button>
                            <button
                              onClick={() => handleReact(r._id, false)}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                              <ThumbsDown className="h-4 w-4" /> {r.dislikes}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}