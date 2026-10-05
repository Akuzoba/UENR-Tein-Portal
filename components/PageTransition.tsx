import { ViewTransition } from "react";

/** Wrap a page's content so it fades/lifts in and out on navigation. Goes in page.tsx, not layouts. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
