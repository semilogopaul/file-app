import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, with later Tailwind utilities winning over earlier
 * ones of the same kind. Without twMerge, a `className` prop passed into a
 * component could not override the component's own defaults - the two would
 * both land in the class list and CSS source order would decide.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
