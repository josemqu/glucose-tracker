import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Type definitions
type GlucoseData = {
  data: {
    connection: {
      glucoseMeasurement: {
        Timestamp: string;
        Value: number;
      };
    };
    graphData: {
      Timestamp: string;
      Value: number;
    }[];
  };
};

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
  data: Array<{ date: string; value: number; isMax: boolean; isMin: boolean }>
) {
  // add a decimal value to each reading based on index
  return data.map((reading, i) => ({
    ...reading,
    value: reading.value + i * 0.0001,
  }));
}
export function findLocalMaxima(
  data: Array<{
    date: string;
    value: number;
    isMax: boolean;
    isMin: boolean;
  }>
) {
  // add decimal values to the readings
  const dataWithDecimals = addDecimalValues(data);

  return dataWithDecimals.map((reading, index, array) => {
    const currentValue = reading.value;
    const prev2Value = index >= 2 ? array[index - 2].value : -Infinity;
    const prev1Value = index >= 1 ? array[index - 1].value : -Infinity;
    const next1Value =
      index < array.length - 1 ? array[index + 1].value : -Infinity;
    const next2Value =
      index < array.length - 2 ? array[index + 2].value : -Infinity;

    let isLocalMax = false;
    if (array.length <= 1) {
      isLocalMax = currentValue > next1Value && currentValue > next2Value;
    } else if (index <= 2) {
      isLocalMax =
        currentValue >= prev1Value &&
        currentValue >= next1Value &&
        currentValue >= next2Value;
    } else if (index >= array.length - 3) {
      isLocalMax =
        currentValue >= prev2Value &&
        currentValue >= prev1Value &&
        currentValue >= next1Value;
    } else if (index >= array.length - 2) {
      isLocalMax = currentValue > prev2Value && currentValue > prev1Value;
    } else {
      isLocalMax =
        currentValue >= prev2Value &&
        currentValue >= prev1Value &&
        currentValue >= next1Value &&
        currentValue >= next2Value;
    }

    return {
      ...reading,
      isMax: isLocalMax,
      label: isLocalMax ? currentValue : null,
    };
  });
}

export function findLocalMinima(
  data: Array<{
    date: string;
    value: number;
    isMax: boolean;
    isMin: boolean;
  }>
) {
  // add decimal values to the readings
  const dataWithDecimals = addDecimalValues(data);

  return dataWithDecimals.map((reading, index, array) => {
    const currentValue = reading.value;
    const prev2Value = index >= 2 ? array[index - 2].value : Infinity;
    const prev1Value = index >= 1 ? array[index - 1].value : Infinity;
    const next1Value =
      index < array.length - 1 ? array[index + 1].value : Infinity;
    const next2Value =
      index < array.length - 2 ? array[index + 2].value : Infinity;

    let isLocalMin = false;
    if (array.length <= 1) {
      isLocalMin = currentValue < next1Value && currentValue < next2Value;
    } else if (index <= 2) {
      isLocalMin =
        currentValue <= prev1Value &&
        currentValue <= next1Value &&
        currentValue <= next2Value;
    } else if (index >= array.length - 3) {
      isLocalMin =
        currentValue <= prev2Value &&
        currentValue <= prev1Value &&
        currentValue <= next1Value;
    } else if (index >= array.length - 2) {
      isLocalMin = currentValue < prev2Value && currentValue < prev1Value;
    } else {
      isLocalMin =
        currentValue <= prev2Value &&
        currentValue <= prev1Value &&
        currentValue <= next1Value &&
        currentValue <= next2Value;
    }

    return {
      ...reading,
      isMin: isLocalMin,
      label: isLocalMin ? currentValue : null,
    };
  });
}

export function processReadings(data: GlucoseData) {
  const { glucoseMeasurement } = data.data.connection;
  const lastReading = {
    date: glucoseMeasurement.Timestamp,
    value: glucoseMeasurement.Value,
    isMax: false,
    isMin: false,
  };

  const prevReadings = data.data.graphData.map((item) => ({
    date: item.Timestamp,
    value: item.Value,
    isMax: false,
    isMin: false,
  }));

  prevReadings.push(lastReading);

  const processedData = findLocalMaxima(prevReadings);

  return processedData;
}

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

// Keep your existing utility functions
export const getLighterColor = (color: string) => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const hsl = rgbToHsl(r, g, b);
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2] + 10}%)`;
};

export const colors = {
  low: "#0022ff",
  normal: "#00cc00",
  high: "#fcb813",
  veryHigh: "#b6202e",
};

export const getColor = (value: number | undefined) => {
  if (!value) return "#000";
  if (value < 70) return colors.low;
  if (value <= 180) return colors.normal;
  if (value <= 250) return colors.high;
  return colors.veryHigh;
};
