import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts ALL CAPS or mixed case text to Title Case.
 * Handles names, addresses, and other text that may come from APIs in uppercase.
 * Examples:
 *   "JOHN SMITH" -> "John Smith"
 *   "RAHUL KUMAR S" -> "Rahul Kumar S"
 *   "NEW DELHI" -> "New Delhi"
 */
export function toTitleCase(text: string | null | undefined): string | null {
  if (!text) return null;
  
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      // Keep single letter initials uppercase
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
