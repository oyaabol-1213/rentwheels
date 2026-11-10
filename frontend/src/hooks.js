import { useEffect } from "react";

// Small React hooks shared by website pages.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
