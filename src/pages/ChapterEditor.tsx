import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function ChapterEditor() {
  const { storyId, chapterId } = useParams();
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill | null>(null);

  const createChapter = useMutation(api.chapters.createChapter);
  const updateChapter = useMutation(api.chapters.updateChapter);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);

  const existing = useQuery(
    api.chapters.getChapterById,
    chapterId ? { chapterId: chapterId as Id<"chapters"> } : "skip"
  );

  const story = useQuery(
    api.stories.getStoryById,
    storyId ? { storyId: storyId as Id<"stories"> } : "skip"
  );

  const canPublish = story?.isPublished ?? false;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content || "");
    }
  }, [existing]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'align',
    'list', 'bullet',
    'link', 'image'
  ];

  const save = async (publish: boolean) => {
    if (!storyId) {
      toast.error("Missing story");
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error("Please add a title and content");
      return;
    }
    if (publish && !canPublish) {
      toast.error("Publish the story first to publish chapters.");
      return;
    }
    setIsSaving(true);
    try {
      if (chapterId) {
        await updateChapter({
          chapterId: chapterId as Id<"chapters">,
          title: title.trim(),
          content,
          isDraft: !publish,
          isPublished: publish,
        });
        toast.success(publish ? "Chapter updated & published!" : "Draft updated!");
      } else {
        await createChapter({
          storyId: storyId as Id<"stories">,
          title: title.trim(),
          content,
          isDraft: !publish,
        });
        toast.success(publish ? "Chapter published!" : "Draft saved!");
      }
      navigate(`/write/${storyId}/manage`);
    } catch {
      toast.error("Failed to save chapter");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold"> {chapterId ? "Edit Chapter" : "New Chapter"} </h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => save(false)} disabled={isSaving} className="h-8 px-3">
              <Save className="h-4 w-4 mr-1" /> Draft
            </Button>
            <Button onClick={() => save(true)} disabled={isSaving || !canPublish} className="h-8 px-3">
              <Save className="h-4 w-4 mr-1" /> Publish
            </Button>
          </div>
        </div>

        {!canPublish && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Publish the story first to publish chapters. You can still save as draft.
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-3 space-y-4">
        <Input
          placeholder="Title your Story Part"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-0 border-b rounded-none text-center text-2xl sm:text-3xl font-semibold focus-visible:ring-0 focus:outline-none"
        />

        <div className="min-h-[60vh]">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            placeholder="Start writing your chapter..."
            className="h-full"
          />
        </div>
      </div>
    </motion.div>
  );
}