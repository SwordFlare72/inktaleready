import { api } from "@/convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditProfile() {
  const me = useQuery(api.users.currentUser, {});
  const updateMe = useMutation(api.users.updateMe);
  async function handleImageUpload(url: string) {
    await updateMe({ image: url });
  }
  const setUsername = useMutation(api.users.setUsername);
  const isUsernameAvailable = useMutation(api.users.isUsernameAvailable);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);
  const changeEmail = useMutation(api.users.changeEmail);
  const { signIn, signOut } = useAuth();

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsernameInput] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");

  const [avatarStorageId, setAvatarStorageId] = useState<Id<"_storage"> | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");

  // Add: preview URLs with cache-busting for immediate UI refresh after upload/save
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [previewBannerUrl, setPreviewBannerUrl] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  // Add: helpers
  function normalizeUrl(url: string) {
    // ensure we store a clean URL without transient query params used for cache busting
    try {
      const u = new URL(url);
      u.search = ""; // strip query
      return u.toString();
    } catch {
      return url;
    }
  }

  function withBust(url: string) {
    if (!url) return "";
    try {
      const u = new URL(url);
      u.searchParams.set("v", String(Date.now()));
      return u.toString();
    } catch {
      // if not a valid URL, fallback as-is
      return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    }
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

  // Avatar cropper states
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const cropDragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startOffX: number;
    startOffY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startOffX: 0,
    startOffY: 0,
  });
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setUsernameInput(me.username ?? "");
      setBio(me.bio ?? "");
      setGender(me.gender ?? "");
      setAvatarStorageId(me.avatarStorageId ?? null);
      setBannerUrl((me as any).bannerImage ?? "");
      // Add: keep previews in sync from saved URLs (no bust initially)
      setPreviewImageUrl(me.image ?? "");
      setPreviewBannerUrl((me as any).bannerImage ?? "");
    }
  }, [me]);

  // Fetch avatar URL from storage ID
  const avatarUrl = useQuery(
    api.fileQueries.getFileUrlQuery,
    avatarStorageId ? { storageId: avatarStorageId } : "skip"
  );

  useEffect(() => {
    if (avatarUrl) {
      setPreviewImageUrl(avatarUrl);
    } else if (!avatarStorageId && me?.image) {
      // Fallback to legacy image field if no storage ID
      setPreviewImageUrl(me.image);
    } else if (!avatarStorageId) {
      setPreviewImageUrl("");
    }
  }, [avatarUrl, avatarStorageId, me?.image]);

  async function uploadFileAndGetStorageId(file: File): Promise<Id<"_storage">> {
    // Guard: sanity check
    if (!(file instanceof File)) {
      throw new Error("No file selected");
    }

    let uploadUrl: string;
    try {
      uploadUrl = await getUploadUrl({});
    } catch {
      throw new Error("Upload not authorized. Please sign in again.");
    }

    // Upload with timeout
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 20000); // 20s timeout

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: fd,
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Map common server errors
        if (res.status === 413 || /payload too large/i.test(text)) {
          throw new Error("File too large");
        }
        if (res.status === 415 || /unsupported/i.test(text)) {
          throw new Error("Unsupported file type");
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("Upload not authorized. Please sign in again.");
        }
        throw new Error(text || `Upload failed (HTTP ${res.status})`);
      }

      const json = await res.json().catch(() => ({}) as any);
      // Ensure correct Id<"_storage"> typing
      const storageIdRaw = (json as any)?.storageId;
      if (!storageIdRaw || typeof storageIdRaw !== "string") {
        throw new Error("Upload failed: missing storage id");
      }
      return storageIdRaw as Id<"_storage">;
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error("Upload timed out");
      }
      if (
        String(e?.message || "")
          .toLowerCase()
          .includes("failed to fetch")
      ) {
        throw new Error("Network error. Please try again.");
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handleUsernameBlur() {
    const desired = username.trim();
    if (!desired) {
      setUsernameError(null);
      return;
    }
    const ok = await isUsernameAvailable({ username: desired });
    setUsernameError(ok ? null : "Username is already taken");
  }

  async function handleSave() {
    if (!me) return;
    if (usernameError) {
      toast.error("Fix username before saving");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        name: name.trim(),
        bio: bio.trim(),
        gender: gender.trim() || undefined,
        avatarStorageId: avatarStorageId || undefined,
        bannerImage: bannerUrl || undefined,
      };

      await updateMe(payload);

      // Update username if changed
      const desired = username.trim();
      if (desired && desired !== (me.username ?? "")) {
        try {
          await setUsername({ username: desired });
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (msg.toLowerCase().includes("already taken")) {
            setUsernameError("Username is already taken");
            toast.error("Username is already taken");
            setBusy(false);
            return;
          }
          throw e;
        }
      }

      toast.success("Profile updated");
      navigate(-1);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeEmail() {
    if (!me) return;
    const normalized = newEmail.replace(/\s+/g, "").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      toast.error("Enter a valid email");
      return;
    }
    // Prevent no-op changes (same email)
    const currentEmailNormalized = (((me as any).email || "") as string)
      .replace(/\s+/g, "")
      .toLowerCase();
    if (normalized === currentEmailNormalized) {
      toast.error("New email cannot be the same as your current email");
      return;
    }

    setEmailBusy(true);
    try {
      // Re-authenticate against the provider email (authEmail if present, else email)
      const providerEmail = (
        ((me as any).authEmail || (me as any).email || "") as string
      )
        .replace(/\s+/g, "")
        .toLowerCase();

      const fd = new FormData();
      fd.set("email", providerEmail);
      fd.set("password", confirmPassword.trim());
      fd.set("flow", "signIn");
      await signIn("password", fd);

      // Update visible email only; provider auth email remains unchanged
      await changeEmail({ newEmail: normalized });

      toast.success("Email updated");
      setEmailDialogOpen(false);
      setNewEmail("");
      setConfirmPassword("");
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (
        msg.includes("invalid") ||
        msg.includes("wrong") ||
        msg.includes("password") ||
        msg.includes("credentials")
      ) {
        toast.error("Incorrect password");
      } else if (msg.includes("in use") || msg.includes("already")) {
        toast.error("Email already in use");
      } else if (msg.includes("network") || msg.includes("failed to fetch")) {
        toast.error("Network error. Please try again.");
      } else {
        toast.error("Could not update email");
      }
    } finally {
      setEmailBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Profile & Account Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="text-xl font-semibold">Profile</div>
              <p className="text-sm text-muted-foreground mt-1">
                The information you enter here will be visible to other users.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center relative">
                  {previewImageUrl ? (
                    <img
                      key={previewImageUrl}
                      src={previewImageUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">Profile picture</div>
                  <div className="text-xs text-muted-foreground">
                    Tap to change
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="profile-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        // Reset file input so same file can trigger again
                        try {
                          (e.target as HTMLInputElement).value = "";
                        } catch {}
                        if (!file) return;
                        if (!validateFile(file, { maxMB: 5 })) return;

                        // Open cropper with this selection
                        try {
                          const src = URL.createObjectURL(file);
                          setPendingAvatarFile(file);
                          setCropSrc(src);
                          setCropScale(1);
                          setCropOffset({ x: 0, y: 0 });
                          setCropOpen(true);
                        } catch {
                          toast.error("Could not open image");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById("profile-file")?.click()
                      }
                      disabled={busy}
                    >
                      Choose Image
                    </Button>
                    {avatarStorageId && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAvatarStorageId(null);
                          setPreviewImageUrl("");
                        }}
                        disabled={busy}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-20 w-32 rounded overflow-hidden bg-muted flex items-center justify-center relative">
                  {previewBannerUrl ? (
                    <img
                      key={previewBannerUrl}
                      src={previewBannerUrl}
                      alt="Banner"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No background
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">Background picture</div>
                  <div className="text-xs text-muted-foreground">
                    Tap to change
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="banner-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        // Reset input early
                        try {
                          (e.target as HTMLInputElement).value = "";
                        } catch {}
                        if (!file) return;
                        if (!validateFile(file, { maxMB: 8 })) return;

                        // Upload now; persist on Save
                        try {
                          setBusy(true);
                          const storageId = await uploadFileAndGetStorageId(file);
                          const url = await getFileUrl({ storageId });
                          if (!url) throw new Error("Could not get file URL");
                          setBannerUrl(url); // raw signed URL
                          setPreviewBannerUrl(withBust(url)); // ensure immediate preview
                          toast.success(
                            "Background image selected. Click 'Save Changes' to apply.",
                          );
                        } catch (err: any) {
                          const msg = String(err?.message || "").toLowerCase();
                          if (msg.includes("too large")) {
                            toast.error("File too large. Try a smaller image.");
                          } else if (msg.includes("unsupported")) {
                            toast.error(
                              "Unsupported file type. Use PNG, JPG, JPEG, WEBP, or GIF.",
                            );
                          } else if (
                            msg.includes("not authorized") ||
                            msg.includes("sign in")
                          ) {
                            toast.error(
                              "Upload not authorized. Please sign in again.",
                            );
                          } else if (msg.includes("timed out")) {
                            toast.error("Upload timed out. Please try again.");
                          } else if (
                            msg.includes("network") ||
                            msg.includes("failed to fetch")
                          ) {
                            toast.error("Network error. Please try again.");
                          } else {
                            toast.error("Upload failed");
                          }
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById("banner-file")?.click()
                      }
                      disabled={busy}
                    >
                      Choose Image
                    </Button>
                    {bannerUrl && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBannerUrl("");
                          setPreviewBannerUrl("");
                        }}
                        disabled={busy}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t" />

            <div className="space-y-4">
              <div className="text-xl font-semibold">About</div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (usernameError) setUsernameError(null);
                    }}
                    onBlur={handleUsernameBlur}
                    placeholder="your_username"
                  />
                  {usernameError && (
                    <div className="text-xs text-red-500 mt-1">
                      {usernameError}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    3–20 chars. Letters, numbers, underscores only. Saved in
                    lowercase.
                  </p>
                </div>

                <div>
                  <Label className="mb-1 block">Display Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Shown publicly. Can include spaces and symbols.
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Bio</Label>
                <Textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1 block">Gender (optional)</Label>
                <Input
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="Male, Female, Non-binary"
                />
              </div>
            </div>

            <div className="border-t" />

            <div className="space-y-4">
              <div className="text-xl font-semibold">Account Settings</div>
              <p className="text-sm text-muted-foreground">
                The information you enter here will not be visible to other
                users.
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium break-all">
                      {(me as any).email || "—"}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewEmail("");
                      setConfirmPassword("");
                      setEmailDialogOpen(true);
                    }}
                  >
                    Change
                  </Button>
                </div>

                <div className="border-t" />

                <div>
                  <div className="text-sm text-muted-foreground">
                    Account password
                  </div>
                  <div className="font-medium tracking-widest select-none">
                    ••••••••
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    The dots do not represent your actual password size.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change your email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="mb-1 block">New email</Label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={emailBusy}
            />
            <Label className="mt-3 mb-1 block">Confirm password</Label>
            <Input
              type="password"
              placeholder="Enter your account password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={emailBusy}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
                disabled={emailBusy}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangeEmail}
                disabled={
                  emailBusy || !newEmail.trim() || !confirmPassword.trim()
                }
              >
                {emailBusy ? "Updating..." : "Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Cropper Dialog */}
      <Dialog open={cropOpen} onOpenChange={(o) => setCropOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="mx-auto size-64 rounded-full overflow-hidden bg-muted relative touch-none select-none"
              onMouseDown={(e) => {
                cropDragRef.current.dragging = true;
                cropDragRef.current.startX = e.clientX;
                cropDragRef.current.startY = e.clientY;
                cropDragRef.current.startOffX = cropOffset.x;
                cropDragRef.current.startOffY = cropOffset.y;
              }}
              onMouseMove={(e) => {
                if (!cropDragRef.current.dragging) return;
                const dx = e.clientX - cropDragRef.current.startX;
                const dy = e.clientY - cropDragRef.current.startY;
                setCropOffset({
                  x: cropDragRef.current.startOffX + dx,
                  y: cropDragRef.current.startOffY + dy,
                });
              }}
              onMouseUp={() => (cropDragRef.current.dragging = false)}
              onMouseLeave={() => (cropDragRef.current.dragging = false)}
              onTouchStart={(e) => {
                const t = e.touches[0];
                cropDragRef.current.dragging = true;
                cropDragRef.current.startX = t.clientX;
                cropDragRef.current.startY = t.clientY;
                cropDragRef.current.startOffX = cropOffset.x;
                cropDragRef.current.startOffY = cropOffset.y;
              }}
              onTouchMove={(e) => {
                if (!cropDragRef.current.dragging) return;
                const t = e.touches[0];
                const dx = t.clientX - cropDragRef.current.startX;
                const dy = t.clientY - cropDragRef.current.startY;
                setCropOffset({
                  x: cropDragRef.current.startOffX + dx,
                  y: cropDragRef.current.startOffY + dy,
                });
              }}
              onTouchEnd={() => (cropDragRef.current.dragging = false)}
            >
              {cropSrc ? (
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  alt="Crop source"
                  className="absolute left-1/2 top-1/2 pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                    transformOrigin: "center center",
                  }}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            <div className="px-1">
              <div className="text-xs text-muted-foreground mb-1">Zoom</div>
              <Slider
                value={[cropScale]}
                onValueChange={(v) =>
                  setCropScale(Math.min(5, Math.max(0.5, v[0] ?? 1)))
                }
                min={0.5}
                max={5}
                step={0.01}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCropOpen(false);
                  if (cropSrc) URL.revokeObjectURL(cropSrc);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    if (!cropImgRef.current) throw new Error("Image not ready");
                    setBusy(true);
                    const canvas = document.createElement("canvas");
                    const size = 512;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) throw new Error("Canvas not supported");

                    const img = cropImgRef.current;
                    const iw = img.naturalWidth || img.width;
                    const ih = img.naturalHeight || img.height;

                    const previewBox = 256;
                    const baseScale = Math.max(
                      previewBox / iw,
                      previewBox / ih,
                    );
                    const totalScale = baseScale * cropScale;
                    const dx =
                      previewBox / 2 + cropOffset.x - (iw * totalScale) / 2;
                    const dy =
                      previewBox / 2 + cropOffset.y - (ih * totalScale) / 2;
                    const scaleToCanvas = size / previewBox;

                    ctx.fillStyle = "#000";
                    ctx.fillRect(0, 0, size, size);
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(
                      img,
                      0,
                      0,
                      iw,
                      ih,
                      dx * scaleToCanvas,
                      dy * scaleToCanvas,
                      iw * totalScale * scaleToCanvas,
                      ih * totalScale * scaleToCanvas,
                    );

                    const blob: Blob | null = await new Promise((resolve) =>
                      canvas.toBlob(resolve, "image/jpeg", 0.92),
                    );
                    if (!blob) throw new Error("Could not create image");
                    const file = new File(
                      [blob],
                      (pendingAvatarFile?.name ?? "avatar") + ".jpg",
                      { type: "image/jpeg" },
                    );

                    const storageId = await uploadFileAndGetStorageId(file);
                    const url = await getFileUrl({ storageId });
                    if (!url) throw new Error("Could not get file URL");
                    // Do NOT persist yet; wait for Save Changes
                    setAvatarStorageId(storageId);
                    setPreviewImageUrl(withBust(url));
                    toast.success(
                      "Avatar updated. Click 'Save Changes' to apply.",
                    );
                  } catch (e: any) {
                    const msg = String(e?.message || "").toLowerCase();
                    if (msg.includes("too large")) {
                      toast.error("File too large. Try a smaller image.");
                    } else if (msg.includes("unsupported")) {
                      toast.error(
                        "Unsupported file type. Use PNG, JPG, JPEG, WEBP, or GIF.",
                      );
                    } else if (
                      msg.includes("not authorized") ||
                      msg.includes("sign in")
                    ) {
                      toast.error(
                        "Upload not authorized. Please sign in again.",
                      );
                    } else if (msg.includes("timed out")) {
                      toast.error("Upload timed out. Please try again.");
                    } else if (
                      msg.includes("network") ||
                      msg.includes("failed to fetch")
                    ) {
                      toast.error("Network error. Please try again.");
                    } else if (msg.includes("permission")) {
                      toast.error(
                        "Permission denied. Please allow photo access.",
                      );
                    } else {
                      toast.error("Crop or upload failed");
                    }
                  } finally {
                    setBusy(false);
                    setCropOpen(false);
                    if (cropSrc) URL.revokeObjectURL(cropSrc);
                    setPendingAvatarFile(null);
                  }
                }}
                disabled={busy || !cropSrc}
              >
                {busy ? "Saving..." : "Crop & Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}