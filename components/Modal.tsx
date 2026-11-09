"use client";

import { useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-xl border border-line bg-white p-0 shadow-2xl"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="mb-4 text-xl font-bold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
