import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface AvatarUploadSectionProps {
  avatarStorageId: Id<"_storage"> | undefined;
  busy: boolean;
  onOpenCropper: (file: File) => void;
  onClear: () => void;
}

function validateFile(file: File, opts: { maxMB: number }) {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/jpg",
  ];
  if (!allowed.includes(file.type)) {
    toast.error("Invalid file type. Use PNG, JPG, JPEG, WEBP, or GIF.");
    return false;
  }
  const maxBytes = opts.maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    toast.error(`Max ${opts.maxMB}MB`);
    return false;
  }
  return true;
}

export function AvatarUploadSection({
  avatarStorageId,
  busy,
  onOpenCropper,
  onClear,
}: AvatarUploadSectionProps) {
  const avatarUrl = useQuery(
    api.fileQueries.getFileUrlQuery,
    avatarStorageId ? { storageId: avatarStorageId } : "skip"
  );

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-xs text-muted-foreground">No image</div>
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium">Profile picture</div>
        <div className="text-xs text-muted-foreground">Tap to change</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="profile-file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              try {
                (e.target as HTMLInputElement).value = "";
              } catch {}
              if (!file) return;
              if (!validateFile(file, { maxMB: 5 })) return;

              try {
                onOpenCropper(file);
              } catch {
                toast.error("Could not open image");
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("profile-file")?.click()}
            disabled={busy}
          >
            Choose Image
          </Button>
          {avatarStorageId && (
            <Button variant="ghost" onClick={onClear} disabled={busy}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
