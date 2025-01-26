import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// date time formatter function
export function dateTimeFormatter(
  date: string,
  options?: { seconds?: boolean }
) {
  const dateObj = new Date(date);
  const time = options?.seconds
    ? dateObj.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : dateObj.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

  return `${dateObj.toLocaleDateString("es-AR")} ${time}`;
}

export function addDecimalValues(
  data: Array<{ date: string; value: number; isMax: boolean }>
) {
  // add a decimal value to each reading based on index
  return data.map((reading, i) => ({
    ...reading,
    value: reading.value + i * 0.0001,
  }));
}
