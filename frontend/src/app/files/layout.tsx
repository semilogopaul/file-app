import type { ReactNode } from "react";
import { AppShell } from "@/modules/files/components/app-shell";

export default function FilesLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
