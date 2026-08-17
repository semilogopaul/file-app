"use client";

import { FileBrowser } from "@/modules/files/components/file-browser";

/** Root of the user's storage: everything with no parent folder. */
export default function FilesPage() {
  return <FileBrowser folderId={null} />;
}
