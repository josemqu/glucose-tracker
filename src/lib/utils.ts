import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// date time formatter function
export function dateTimeFormatter(date: string) {
  return new Date(date).toLocaleTimeString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    // 24 hs view
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
}
