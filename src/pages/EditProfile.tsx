import { api } from "@/convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function EditProfile() {
  const me = useQuery(api.users.currentUser, {});
  const updateMe = useMutation(api.users.updateMe);
  const setUsername = useMutation(api.users.setUsername);
  const isUsernameAvailable = useMutation(api.users.isUsernameAvailable);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsernameInput] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");

  const [imageUrl, setImageUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setUsernameInput(me.username ?? "");
      setBio(me.bio ?? "");
      setGender(me.gender ?? "");
      setImageUrl(me.image ?? "");
      setBannerUrl((me as any).bannerImage ?? "");
    }
  }, [me]);

  async function uploadFileAndGetUrl(file: File): Promise<string> {
    const uploadUrl = await getUploadUrl({});
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(uploadUrl, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = await res.json();
    const url = await getFileUrl({ storageId });
    if (!url) throw new Error("Could not get file URL");
    return url;
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
      // Update core profile fields
      await updateMe({
        name: name.trim(),
        bio: bio.trim(),
        gender: gender.trim() || undefined,
        image: imageUrl || undefined,
        bannerImage: bannerUrl || undefined,
      });

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
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setBusy(false);
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
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
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
                  <div className="text-xs text-red-500 mt-1">{usernameError}</div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  3–20 chars. Letters, numbers, underscores only.
                </p>
              </div>
            </div>

            <div>
              <Label className="mb-1 block">Bio</Label>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div>
              <Label className="mb-1 block">Gender (optional)</Label>
              <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Male, Female, Non-binary" />
            </div>

            {/* Profile image upload */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="block">Profile Image</Label>
                {imageUrl && (
                  <img src={imageUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
                )}
                <div className="flex items-center gap-2">
                  <input
                    id="profile-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Max 5MB");
                        return;
                      }
                      try {
                        setBusy(true);
                        const url = await uploadFileAndGetUrl(file);
                        setImageUrl(url);
                        toast.success("Profile image uploaded");
                      } catch {
                        toast.error("Upload failed");
                      } finally {
                        setBusy(false);
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
                  {imageUrl && (
                    <Button variant="ghost" onClick={() => setImageUrl("")} disabled={busy}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Banner upload */}
              <div className="space-y-2">
                <Label className="block">Background Image</Label>
                {bannerUrl && (
                  <img src={bannerUrl} alt="Banner" className="h-24 w-full rounded object-cover" />
                )}
                <div className="flex items-center gap-2">
                  <input
                    id="banner-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 8 * 1024 * 1024) {
                        toast.error("Max 8MB");
                        return;
                      }
                      try {
                        setBusy(true);
                        const url = await uploadFileAndGetUrl(file);
                        setBannerUrl(url);
                        toast.success("Background image uploaded");
                      } catch {
                        toast.error("Upload failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("banner-file")?.click()}
                    disabled={busy}
                  >
                    Choose Image
                  </Button>
                  {bannerUrl && (
                    <Button variant="ghost" onClick={() => setBannerUrl("")} disabled={busy}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
