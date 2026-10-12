import type { SVGProps } from "react";

type IconName = "plus" | "calendar" | "table" | "left" | "right" | "check" | "close" | "edit" | "trash" | "refresh" | "print";

const paths: Record<IconName, string> = {
  plus: "M12 5v14M5 12h14",
  calendar: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
  table: "M4 4h16v16H4V4Zm0 5h16M9 9v11",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  edit: "m15 5 4 4M4 20l4-1L20 7l-4-4L4 15v5Z",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  refresh: "M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3",
  print: "M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7Zm11-2h1",
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
