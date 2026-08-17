// Registers jest-dom's custom matchers (toBeInTheDocument, toHaveTextContent,
// ...) on Vitest's expect, and unmounts React trees between tests so state
// never leaks from one test into the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
