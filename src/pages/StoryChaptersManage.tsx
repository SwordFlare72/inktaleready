import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, FilePlus2, Pencil, Rows, UploadCloud, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function StoryChaptersManage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<Id<"chapters"> | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  const chapters = useQuery(
    api.chapters.listForManage,
    storyId ? { storyId: storyId as Id<"stories"> } : "skip"
  );

  const deleteChapter = useMutation(api.chapters.deleteChapter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/write")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-extrabold">Manage Chapters</h1>
          </div>
          <Button onClick={() => navigate(`/write/${storyId}/chapter/new`)} className="bg-purple-600 hover:bg-purple-700">
            <FilePlus2 className="h-4 w-4 mr-2" /> New Chapter
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">All Chapters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {chapters === undefined ? (
              <div className="p-4 text-sm text-muted-foreground">Loading chapters...</div>
            ) : chapters.length === 0 ? (
              <div className="p-6 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No chapters yet</p>
                <Button className="mt-3" onClick={() => navigate(`/write/${storyId}/chapter/new`)}>
                  <FilePlus2 className="h-4 w-4 mr-2" /> Create First Chapter
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {chapters.map((ch) => (
                  <li key={ch._id} className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{ch.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ch.isPublished
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {ch.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ch.wordCount} words • {ch.views} views • {ch.likes} likes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/write/${storyId}/chapter/${ch._id}/edit`)}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDeleteChapterId(ch._id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmDeleteChapterId} onOpenChange={(open) => { if (!open) setConfirmDeleteChapterId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chapter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteChapterId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeletingChapter}
              onClick={async () => {
                if (!confirmDeleteChapterId || isDeletingChapter) return;
                setIsDeletingChapter(true);
                try {
                  await deleteChapter({ chapterId: confirmDeleteChapterId });
                  toast.success("Chapter deleted");
                  setConfirmDeleteChapterId(null);
                } catch (err: any) {
                  const msg = typeof err?.message === "string" ? err.message : "Failed to delete chapter";
                  toast.error(msg);
                } finally {
                  setIsDeletingChapter(false);
                }
              }}
            >
              {isDeletingChapter ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}