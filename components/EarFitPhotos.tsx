"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MAX_PHOTOS_PER_CONSULT,
  MAX_PHOTO_BYTES,
  PHOTO_MIME,
  compressForUpload,
} from "@/lib/photos/compress";
import { createClient } from "@/lib/supabase/client";

export interface ExistingPhoto {
  id: string;
  upload_status: "pending" | "uploaded" | "failed";
  signedUrl: string | null;
}

interface Props {
  consultId: string;
  photoModuleEnabled: boolean;
  initialConsent: boolean;
  initialPhotos: ExistingPhoto[];
}

export function EarFitPhotos({
  consultId,
  photoModuleEnabled,
  initialConsent,
  initialPhotos,
}: Props) {
  const [consent, setConsent] = useState(initialConsent);
  const [savingConsent, setSavingConsent] = useState(false);
  const [photos, setPhotos] = useState<ExistingPhoto[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!photoModuleEnabled) {
    return null;
  }

  const uploadedCount = photos.filter(
    (p) => p.upload_status === "uploaded",
  ).length;
  const atLimit = uploadedCount >= MAX_PHOTOS_PER_CONSULT;
  const canCapture = consent && !atLimit && !busy;

  const toggleConsent = async (granted: boolean) => {
    setSavingConsent(true);
    setError(null);
    try {
      const res = await fetch("/api/consults/photo-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultId, granted }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? "We could not save the consent. Please try again.",
        );
        return;
      }
      setConsent(granted);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSavingConsent(false);
    }
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (atLimit) {
      setError("This consult has reached its 4-photo limit.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const compressed = await compressForUpload(file);
      if (compressed.size > MAX_PHOTO_BYTES) {
        setError(
          "Photo could not be compressed under 500 KB. Try a different photo.",
        );
        return;
      }

      const signedRes = await fetch("/api/photos/signed-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultId,
          fileSize: compressed.size,
          fileType: PHOTO_MIME,
        }),
      });
      if (!signedRes.ok) {
        const data = await signedRes.json().catch(() => ({}));
        setError(
          data.error ??
            "We could not prepare the upload. Please try again.",
        );
        return;
      }
      const { photoId, path, token } = (await signedRes.json()) as {
        photoId: string;
        path: string;
        token: string;
      };

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("ear-fit-photos")
        .uploadToSignedUrl(path, token, compressed, {
          contentType: PHOTO_MIME,
        });
      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const markRes = await fetch("/api/photos/mark-uploaded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!markRes.ok) {
        const data = await markRes.json().catch(() => ({}));
        setError(
          data.error ??
            "We could not record the photo. Please try again.",
        );
        return;
      }

      // Use the local object URL for instant preview; refresh-load will swap
      // in a server-issued signed URL on next visit.
      const previewUrl = URL.createObjectURL(compressed);
      setPhotos((p) => [
        ...p,
        { id: photoId, upload_status: "uploaded", signedUrl: previewUrl },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-brand-slate/20 bg-brand-white p-6">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-brand-navy">
          Ear Fit Photos
        </h2>
        <p className="mt-1 text-sm text-brand-slate">
          Capture up to {MAX_PHOTOS_PER_CONSULT} photos of the ear to support
          fitting decisions on this consult. Photos are not diagnostic and are
          stored privately.
        </p>
      </header>

      <label className="mb-6 flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => toggleConsent(v === true)}
          disabled={savingConsent}
          data-testid="photo-consent-checkbox"
          className={`mt-1 h-6 w-6 border-2 ${
            consent
              ? "border-brand-teal data-[state=checked]:bg-brand-teal data-[state=checked]:text-brand-white"
              : "border-brand-slate/40"
          }`}
        />
        <span className="flex flex-col gap-1">
          <span
            className={`font-semibold ${
              consent ? "text-brand-teal" : "text-brand-navy"
            }`}
          >
            The patient has given consent to capture and store ear fit photos
          </span>
          <span className="text-sm font-normal text-brand-slate">
            Required before any photo can be taken. Consent can be removed at
            any time.
          </span>
        </span>
      </label>

      {photos.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-brand-slate/30 bg-brand-slate/5"
            >
              {photo.signedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo.signedUrl}
                  alt="Ear fit photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-brand-slate">
                  {photo.upload_status === "uploaded" ? "Saved" : photo.upload_status}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canCapture}
          data-testid="photo-capture-button"
          className="h-12 bg-brand-teal px-6 text-brand-white hover:bg-brand-teal/90 disabled:opacity-50"
        >
          <Camera className="mr-2 h-4 w-4" />
          {busy ? "Uploading…" : "Take ear fit photo"}
        </Button>
        <p className="text-sm text-brand-slate">
          {uploadedCount} of {MAX_PHOTOS_PER_CONSULT} · JPEG · max 500 KB after
          compression
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}
