"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * localStorage key the clinic logo data URL is persisted under. Frontend-only
 * persistence — there is intentionally no DB column or API field for this.
 */
export const CLINIC_LOGO_KEY = "oviz:clinicLogo";

// Longest-edge target after downscaling, in CSS pixels.
const MAX_EDGE = 512;

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

// Downscale the longest edge to ~MAX_EDGE on a canvas and return a PNG data URL.
function downscaleToPngDataUrl(img: HTMLImageElement): string {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const longest = Math.max(w, h) || 1;
  const scale = Math.min(1, MAX_EDGE / longest);
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas.toDataURL("image/png");
}

export function LogoAssetField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // On mount, hydrate from the persisted logo if present. The ref guard keeps
  // this a one-time hydration even if `onChange` changes identity.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const stored = window.localStorage.getItem(CLINIC_LOGO_KEY);
      if (stored) onChange(stored);
    } catch {
      /* Reading localStorage can throw (privacy mode); the field still works. */
    }
  }, [onChange]);

  const persist = (dataUrl: string) => {
    try {
      window.localStorage.setItem(CLINIC_LOGO_KEY, dataUrl);
      onChange(dataUrl);
      setMessage(null);
    } catch {
      // Most likely a quota error — keep it usable this session via onChange,
      // it just won't survive a reload.
      onChange(dataUrl);
      setMessage(
        "Saved for now, but your browser couldn't store it for next time (storage may be full).",
      );
    } finally {
      setBusy(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("That file isn't an image. Please choose a PNG or JPG.");
      return;
    }
    setBusy(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setBusy(false);
      setMessage("We couldn't read that file. Please try another.");
    };
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => {
        setBusy(false);
        setMessage("That image couldn't be loaded. Please try another.");
      };
      img.onload = () => {
        try {
          persist(downscaleToPngDataUrl(img));
        } catch {
          setBusy(false);
          setMessage("We couldn't process that image. Please try another.");
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const openPicker = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const remove = () => {
    try {
      window.localStorage.removeItem(CLINIC_LOGO_KEY);
    } catch {
      /* ignore removal errors */
    }
    onChange(null);
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleInputChange}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-2xl border border-brand-line bg-brand-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Clinic logo preview"
            className="h-16 w-28 shrink-0 rounded-lg object-contain"
          />
          <p className="flex-1 text-sm leading-relaxed text-brand-muted">
            Logo ready — it will appear on your kiosk welcome screen.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={remove}
            className="shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add a clinic logo. Click to choose a file, drag and drop an image, or paste one from your clipboard."
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-brand-teal bg-brand-tint"
              : "border-brand-line-strong bg-brand-mist/40 hover:border-brand-teal"
          }`}
        >
          <ImagePlus className="h-8 w-8 text-brand-teal-700" aria-hidden="true" />
          <p className="text-base font-medium text-brand-navy">
            {busy ? "Processing…" : "Add your clinic logo"}
          </p>
          <p className="text-sm leading-relaxed text-brand-muted">
            Click to choose a file, drag an image here, or paste from your
            clipboard.
          </p>
        </div>
      )}

      {message ? (
        <p role="status" className="text-sm leading-relaxed text-brand-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
