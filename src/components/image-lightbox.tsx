"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const LIGHTBOX_HISTORY_STATE = { lightbox: true };

export function ImageLightbox({ src, alt = "", onClose }: ImageLightboxProps) {
  const onCloseRef = useRef(onClose);
  const pushedHistoryRef = useRef(false);

  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    if (pushedHistoryRef.current) {
      history.back();
      return;
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!src) {
      pushedHistoryRef.current = false;
      return;
    }

    history.pushState(LIGHTBOX_HISTORY_STATE, "");
    pushedHistoryRef.current = true;

    const onPopState = () => {
      pushedHistoryRef.current = false;
      onCloseRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [src, handleClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        aria-label="Stäng"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
