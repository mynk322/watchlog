"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { User, Camera, Loader2 } from "lucide-react";

// Downscale to a small square before upload so the stored image stays tiny (a 256px JPEG is a few
// KB) and loads fast everywhere it's shown.
const AVATAR_SIZE = 256;

async function downscaleToSquare(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  // Cover-crop: scale so the shorter side fills the square, then center.
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
  );
}

/**
 * Round avatar that, for the profile owner, doubles as an uploader: pick an image, it's cropped and
 * shrunk in the browser, then stored via Clerk (which resolveAvatars already surfaces app-wide).
 */
export function AvatarUploader({ avatarUrl, editable }: { avatarUrl: string | null; editable: boolean }) {
  const { user } = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await downscaleToSquare(file, AVATAR_SIZE);
      await user.setProfileImage({ file: new File([blob], "avatar.jpg", { type: "image/jpeg" }) });
      router.refresh();
    } catch {
      setError("Couldn't update your photo. Try another image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-surface-elevated sm:h-20 sm:w-20">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from Clerk, not worth the Image optimizer overhead
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User size={28} className="text-muted" />
          </div>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:opacity-100 cursor-pointer"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </button>
        )}
      </div>
      {editable && <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />}
      {error && <p className="mt-1 max-w-24 text-[11px] text-accent">{error}</p>}
    </div>
  );
}
