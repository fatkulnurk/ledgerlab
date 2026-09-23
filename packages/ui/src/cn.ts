import { clsx, type ClassValue } from "clsx";

/** Merge conditional class names. Kept dependency-light on purpose. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
