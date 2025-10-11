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

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);

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

  const canPublish = (() => {
    if (chapterId && existing) return !!existing.story?.isPublished;
    if (!chapterId && storyForNew) return !!storyForNew.isPublished;
    return false;
  })();

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content || "");
    }
  }, [existing]);

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
      
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection();
        quill.insertEmbed(range?.index || 0, "image", url);
      }
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
    const trimmedContent = content.trim();
    if (!title.trim() || !trimmedContent || trimmedContent === "<p><br></p>") {
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
          content: trimmedContent,
          isDraft: !publish,
          isPublished: publish,
        });
        toast.success(publish ? "Chapter updated & published!" : "Draft updated!");
      } else {
        await createChapter({
          storyId: storyId as Id<"stories">,
          title: title.trim(),
          content: trimmedContent,
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

  const modules = {
    toolbar: false,
  };

  const formats = [
    "bold",
    "italic",
    "underline",
    "align",
    "image",
  ];

  const handleFormat = (format: string, value?: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    if (format === "align") {
      quill.format("align", value || false);
    } else {
      const currentFormat = quill.getFormat();
      quill.format(format, !currentFormat[format]);
    }
  };

  const getActiveFormats = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return {};
    return quill.getFormat();
  };

  const [activeFormats, setActiveFormats] = useState<any>({});

  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const updateFormats = () => {
      setActiveFormats(quill.getFormat());
    };

    quill.on("selection-change", updateFormats);
    quill.on("text-change", updateFormats);

    return () => {
      quill.off("selection-change", updateFormats);
      quill.off("text-change", updateFormats);
    };
  }, []);

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
          onFocus={() => setIsFocused(false)}
        />

        <div className="relative">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            placeholder="Tap here to start writing"
            className="min-h-[55vh] rounded-md bg-transparent [&_.ql-editor]:min-h-[55vh] [&_.ql-editor]:p-3 [&_.ql-editor]:text-base [&_.ql-editor]:leading-7 [&_.ql-container]:border-0"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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
                variant={activeFormats.bold ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("bold");
                }}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.italic ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("italic");
                }}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.underline ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("underline");
                }}
              >
                <Underline className="h-4 w-4" />
              </Button>

              <span className="w-px h-6 bg-border" />

              <Button
                variant={activeFormats.align === "left" || !activeFormats.align ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("align", "left");
                }}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.align === "center" ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("align", "center");
                }}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={activeFormats.align === "right" ? "default" : "outline"}
                size="sm"
                onMouseDown={(e) => { 
                  e.preventDefault();
                  handleFormat("align", "right");
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
                <ImageIcon className="h-4 w-4 mr-2" /> Image
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}