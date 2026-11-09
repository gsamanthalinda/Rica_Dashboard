import React from "react";

export default function Logo({
  height = "64px",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Rica"
      className={className}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
