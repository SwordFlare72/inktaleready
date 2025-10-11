import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Save } from "lucide-react";
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
  // Add: track if content has been modified
  const hasUnsavedChanges = useRef(false);
  const isAutoSaving = useRef(false);

  useEffect(() => {
    const updateKB = () => {
      const vv = (window as any).visualViewport as VisualViewport | undefined;
      if (!vv) {
        setKbOffset(0);
        return;
      }
      // How much of the viewport is covered by the keyboard (approx)
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

  // Load chapter when editing
  const existing = useQuery(
    api.chapters.getChapterById,
    chapterId ? { chapterId: chapterId as Id<"chapters"> } : "skip"
  );

  // When creating a new chapter, fetch the story to know publish status
  const storyForNew = useQuery(
    api.stories.getStoryById,
    !chapterId && storyId ? { storyId: storyId as Id<"stories"> } : "skip"
  );

  // Determine if publish is allowed (parent story must be published)
  const canPublish = (() => {
    if (chapterId && existing) return !!existing.story?.isPublished;
    if (!chapterId && storyForNew) return !!storyForNew.isPublished;
    return false;
  })();

  useEffect(() => {
    // basic editor defaults
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = existing.content || "";
        // Update placeholder state based on loaded content
        const txt = editorRef.current.textContent || "";
        setContentEmpty(txt.trim().length === 0);
      }
      // Reset unsaved changes flag when loading existing content
      hasUnsavedChanges.current = false;
    }
  }, [existing]);

  // Add: auto-save function
  const autoSaveDraft = async () => {
    if (!storyId || isAutoSaving.current || isSaving) return;
    
    const content = editorRef.current?.innerHTML?.trim() || "";
    const currentTitle = title.trim();
    
    // Only auto-save if there's actual content
    if (!currentTitle && !content) return;
    
    isAutoSaving.current = true;
    
    try {
      if (chapterId) {
        // Update existing chapter as draft
        await updateChapter({
          chapterId: chapterId as Id<"chapters">,
          title: currentTitle || "Untitled Chapter",
          content,
          isDraft: true,
          isPublished: false,
        });
      } else {
        // Create new chapter as draft
        await createChapter({
          storyId: storyId as Id<"stories">,
          title: currentTitle || "Untitled Chapter",
          content,
          isDraft: true,
        });
      }
      toast.success("Saved as Draft");
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      isAutoSaving.current = false;
    }
  };

  // Add: cleanup effect for navigation away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges.current) {
        autoSaveDraft();
      }
    };

    const handlePopState = () => {
      if (hasUnsavedChanges.current) {
        autoSaveDraft();
      }
    };

    // Listen for browser back button
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Auto-save on component unmount if there are unsaved changes
      if (hasUnsavedChanges.current) {
        autoSaveDraft();
      }
    };
  }, [storyId, chapterId, title]);

  const exec = (cmd: string, value?: string) => {
    // Ensure the editor keeps focus and the selection is active before executing
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
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
      const url = await getFileUrl({ storageId: storageId as any }); // Id<"_storage">
      if (!url) throw new Error("Could not resolve image URL");
      exec("insertImage", url);
      toast.success("Image inserted");
      hasUnsavedChanges.current = true;
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
    // Prevent publishing if parent story isn't published
    if (publish && !canPublish) {
      toast.error("Publish the story first to publish chapters.");
      return;
    }
    setIsSaving(true);
    try {
      if (chapterId) {
        // Editing existing chapter
        await updateChapter({
          chapterId: chapterId as Id<"chapters">,
          title: title.trim(),
          content,
          isDraft: !publish,
          isPublished: publish,
        });
        toast.success(publish ? "Chapter updated & published!" : "Draft updated!");
      } else {
        // Creating new chapter
        await createChapter({
          storyId: storyId as Id<"stories">,
          title: title.trim(),
          content,
          isDraft: !publish,
        });
        toast.success(publish ? "Chapter published!" : "Draft saved!");
      }
      hasUnsavedChanges.current = false;
      navigate(`/write/${storyId}/manage`);
    } catch {
      toast.error("Failed to save chapter");
    } finally {
      setIsSaving(false);
    }
  };

  // Add: track content changes
  const handleContentChange = () => {
    const txt = editorRef.current?.textContent || "";
    setContentEmpty(txt.trim().length === 0);
    hasUnsavedChanges.current = true;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    hasUnsavedChanges.current = true;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      {/* Slim header row with actions, keep minimal */}
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

      {/* Plain editor surface */}
      <div className="max-w-2xl mx-auto px-3 space-y-4">
        {/* Title input: plain, centered, underline */}
        <Input
          placeholder="Title your Story Part"
          value={title}
          onChange={handleTitleChange}
          className="w-full bg-transparent border-0 border-b rounded-none text-center text-2xl sm:text-3xl font-semibold focus-visible:ring-0 focus:outline-none"
        />

        {/* Content editor: plain surface with lightweight placeholder */}
        <div className="relative">
          {/* Placeholder */}
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
            onInput={handleContentChange}
          />
        </div>
      </div>

      {/* Floating tools: appear above keyboard only when body editor is focused */}
      {isFocused && (
        <div
          // Position the toolbar directly above the keyboard using VisualViewport overlap + safe area inset
          className="fixed left-0 right-0 z-50 transition-opacity pointer-events-none"
          style={{ bottom: `calc(env(safe-area-inset-bottom) + ${Math.max(8, kbOffset + 8)}px)` }}
        >
          <div className="mx-auto max-w-2xl px-3 pointer-events-auto">
            <div
              className="border rounded-xl bg-card/95 backdrop-blur px-2 py-2 shadow-md
                         flex flex-wrap items-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
              >
                <Italic className="h-4 w-4" />
              </Button>

              <span className="w-px h-6 bg-border" />

              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); exec("justifyLeft"); }}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); exec("justifyCenter"); }}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); exec("justifyRight"); }}
              >
                <AlignRight className="h-4 w-4" />
              </Button>

              <span className="w-px h-6 bg-border" />

              <Button
                variant="outline"
                size="sm"
                onMouseDown={(e) => { e.preventDefault(); handlePickImage(); }}
              >
                <ImageIcon className="h-4 w-4 mr-2" /> Image
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}