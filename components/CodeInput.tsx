"use client";

import React, { useRef } from "react";

interface CodeInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  length?: number;
  label?: string;
}

export default function CodeInput({
  value,
  onChange,
  length = 6,
  label = "Code",
}: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const slots = Array.from({ length }, (_, i) => value[i] ?? "");

  const setAt = (index: number, digit: string) => {
    const next = [...slots];
    next[index] = digit;
    onChange(next);
  };

  const fillFrom = (start: number, text: string) => {
    const next = [...slots];
    let i = start;
    for (const ch of text) {
      if (i >= length) break;
      next[i++] = ch;
    }
    onChange(next);
    refs.current[Math.min(i, length - 1)]?.focus();
  };

  const handleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const typed = e.target.value.replace(/\D/g, "");
    if (!typed) {
      setAt(index, "");
      return;
    }
    if (typed.length > 1) {
      fillFrom(index, typed);
      return;
    }
    setAt(index, typed);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (slots[index]) {
        setAt(index, "");
        return;
      }
      if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, "");
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (text) {
      e.preventDefault();
      fillFrom(index, text);
    }
  };

  return (
    <div className="code-row">
      {slots.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="code-box"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={d}
          aria-label={`${label} digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
