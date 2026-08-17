"use client";

import { use } from "react";
import { FileBrowser } from "@/modules/files/components/file-browser";

/**
 * A folder's contents. The id lives in the URL rather than component state,
 * so the browser back button and a pasted link both work - which the brief
 * calls out explicitly.
 */
export default function FolderPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FileBrowser folderId={id} />;
}
