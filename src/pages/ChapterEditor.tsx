import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ChapterEditor() {
  const { storyId, chapterId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const createChapter = useMutation(api.chapters.createChapter);
  const updateChapter = useMutation(api.chapters.updateChapter);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const [contentEmpty, setContentEmpty] = useState(true);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const updateKB = () => {
      const vv = (window as any).visualViewport as VisualViewport | undefined;
      if (!vv) {
        setKbOffset(0);
        return;
      }
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbOffset(overlap);
    };
    updateKB();
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (vv) {
      vv.addEventListener("resize", updateKB);
      vv.addEventListener("scroll", updateKB);
    }
    window.addEventListener("resize", updateKB);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateKB);
        vv.removeEventListener("scroll", updateKB);
      }
      window.removeEventListener("resize", updateKB);
    };
  }, []);

  const existing = useQuery(
    api.chapters.getChapterById,
    chapterId ? { chapterId: chapterId as Id<"chapters"> } : "skip"
  );

  const storyForNew = useQuery(
    api.stories.getStoryById,
    !chapterId && storyId ? { storyId: storyId as Id<"stories"> } : "skip"
  );

  // Check if this is the first chapter of an unpublished story
  const isFirstChapterOfUnpublishedStory = (() => {
    if (chapterId && existing) {
      return !existing.story?.isPublished && existing.chapterNumber === 1;
    }
    if (!chapterId && storyForNew) {
      return !storyForNew.isPublished && storyForNew.totalChapters === 0;
    }
    return false;
  })();

  const canPublish = (() => {
    if (chapterId && existing) return !!existing.story?.isPublished || isFirstChapterOfUnpublishedStory;
    if (!chapterId && storyForNew) return !!storyForNew.isPublished || isFirstChapterOfUnpublishedStory;
    return false;
  })();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = existing.content || "";
        const txt = editorRef.current.textContent || "";
        setContentEmpty(txt.trim().length === 0);
        updateWordCount();
      }
    }
  }, [existing]);

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || "";
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
    setActiveFormats(formats);
  };

  const insertImageFromFile = async (file: File) => {
    try {
      const uploadUrl = await getUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const storageId = json.storageId as string;
      const url = await getFileUrl({ storageId: storageId as any });
      if (!url) throw new Error("Could not resolve image URL");
      exec("insertImage", url);
      toast.success("Image inserted");
    } catch (e) {
      toast.error("Failed to insert image");
    }
  };

  const handlePickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = (input.files && input.files[0]) || null;
      if (file) insertImageFromFile(file);
    };
    input.click();
  };

  const save = async (publish: boolean) => {
    if (!storyId) {
      toast.error("Missing story");
      return;
    }
    const content = editorRef.current?.innerHTML?.trim() || "";
    if (!title.trim() || !content) {
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
          publishStoryToo: publish && isFirstChapterOfUnpublishedStory,
        });
        toast.success(
          publish && isFirstChapterOfUnpublishedStory
            ? "Story & Chapter published!"
            : publish
            ? "Chapter updated & published!"
            : "Draft updated!"
        );
      } else {
        await createChapter({
          storyId: storyId as Id<"stories">,
          title: title.trim(),
          content,
          isDraft: !publish,
          publishStoryToo: publish && isFirstChapterOfUnpublishedStory,
        });
        toast.success(
          publish && isFirstChapterOfUnpublishedStory
            ? "Story & Chapter published!"
            : publish
            ? "Chapter published!"
            : "Draft saved!"
        );
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
              <Save className="h-4 w-4 mr-1" /> 
              {isFirstChapterOfUnpublishedStory ? "Publish Story" : "Publish"}
            </Button>
          </div>
        </div>

        {!canPublish && !isFirstChapterOfUnpublishedStory && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Publish the story first to publish chapters. You can still save as draft.
          </p>
        )}
        {isFirstChapterOfUnpublishedStory && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Publishing will make both your story and first chapter live.
          </p>
        )}

        {wordCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Word count: {wordCount}
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

        <div className="relative">
          {contentEmpty && (
            <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground/70 select-none">
              Tap here to start writing
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[55vh] rounded-md bg-transparent p-3 focus:outline-none text-base leading-7"
            suppressContentEditableWarning
            aria-label="Chapter editor"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onInput={() => {
              const txt = editorRef.current?.textContent || "";
              setContentEmpty(txt.trim().length === 0);
              updateWordCount();
            }}
            onMouseUp={updateActiveFormats}
            onKeyUp={updateActiveFormats}
          />
        </div>
      </div>

      {isFocused && (
        <div
          className="fixed left-0 right-0 z-50 transition-opacity pointer-events-none"
          style={{ bottom: `calc(env(safe-area-inset-bottom) + ${Math.max(8, kbOffset + 8)}px)` }}
        >
          <div className="mx-auto max-w-2xl px-3 pointer-events-auto">
            <div
              className="border rounded-xl bg-card/95 backdrop-blur px-2 py-2 shadow-md
                         flex flex-wrap items-center gap-2"
            >
              <Button
                variant={activeFormats.has('bold') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("bold", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.has('italic') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("italic", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.has('underline') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("underline", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <Underline className="h-4 w-4" />
              </Button>

              <span className="w-px h-6 bg-border" />

              <Button
                variant={activeFormats.has('justifyLeft') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("justifyLeft", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.has('justifyCenter') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("justifyCenter", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.has('justifyRight') ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  document.execCommand("justifyRight", false);
                  editorRef.current?.focus();
                  updateActiveFormats();
                }}
              >
                <AlignRight className="h-4 w-4" />
              </Button>

              <span className="w-px h-6 bg-border" />

              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); handlePickImage(); }}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}