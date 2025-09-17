import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ChapterEditor() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const createChapter = useMutation(api.chapters.createChapter);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // basic editor defaults
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
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
    setIsSaving(true);
    try {
      await createChapter({
        storyId: storyId as Id<"stories">,
        title: title.trim(),
        content,
        isDraft: !publish,
      });
      toast.success(publish ? "Chapter published!" : "Draft saved!");
      navigate(`/write`);
    } catch {
      toast.error("Failed to save chapter");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">New Chapter</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => save(false)} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={() => save(true)} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" /> Publish
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Chapter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="flex flex-wrap gap-2 border rounded-md p-2 bg-muted/40">
              <Button variant="outline" size="sm" onClick={() => exec("bold")}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => exec("italic")}>
                <Italic className="h-4 w-4" />
              </Button>
              <span className="w-px h-6 bg-border" />
              <Button variant="outline" size="sm" onClick={() => exec("justifyLeft")}>
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => exec("justifyCenter")}>
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => exec("justifyRight")}>
                <AlignRight className="h-4 w-4" />
              </Button>
              <span className="w-px h-6 bg-border" />
              <Button variant="outline" size="sm" onClick={handlePickImage}>
                <ImageIcon className="h-4 w-4 mr-2" /> Image
              </Button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="min-h-[50vh] rounded-md border p-4 focus:outline-none prose prose-gray dark:prose-invert max-w-none"
              suppressContentEditableWarning
              aria-label="Chapter editor"
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
