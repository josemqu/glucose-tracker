"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateTimeFormatter } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Keep your existing types and constants
type GlucoseDataProps = {
  initialData: {
    date: string;
    value: number;
    isMax: boolean;
  }[];
};

const OPTIONS = {
  fillOpacity: 0.05,
  lineColor: "#333",
  lineOpacity: 0.5,
  labelColor: "#aaa",
};

const colors = {
  low: "#0022ff",
  normal: "#00cc00",
  high: "#fcb813",
  veryHigh: "#b6202e",
};

// Keep your existing utility functions
const getLighterColor = (color: string) => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const hsl = rgbToHsl(r, g, b);
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2] + 10}%)`;
};

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

const getColor = (value: number | undefined) => {
  if (!value) return "#000";
  if (value < 70) return colors.low;
  if (value <= 180) return colors.normal;
  if (value <= 250) return colors.high;
  return colors.veryHigh;
};

// Keep your existing custom components
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  value?: number | string;
}) => {
  const { cx, cy, value } = props;
  const color = getColor(typeof value === "number" ? value : undefined);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={getLighterColor(color)}
      stroke={color}
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || !payload?.length) {
    return null;
  }

  const value = payload[0].value as number;
  const color = getColor(value);

  return (
    <div className="bg-white p-2 rounded-lg shadow-md border border-gray-200">
      <p className="font-bold text-xl text-center" style={{ color }}>
        {value} mg/dL
      </p>
      <p className="font-medium text-slate-500 text-sm text-center">
        {dateTimeFormatter(label)}
      </p>
    </div>
  );
};

// Updated main component with auto-refresh
export function GlucoseChart({ initialData }: GlucoseDataProps) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/glucose");
        if (!response.ok) throw new Error("Failed to fetch data");
        const newData = await response.json();
        setData(newData);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError("Failed to update data");
        console.error("Error fetching glucose data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up polling every 2 minutes
    const intervalId = setInterval(fetchData, 1 * 5 * 1000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, []);

  const yAxisMin = 0;
  const yAxisMax = 320;
  const yAxisTicks = [0, 70, 180, 250, 300];
  const xAxisMin = 0;
  const xAxisMax = data?.length - 1;

  return (
    <Card className="w-full h-full bg-slate-400 border-slate-600">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Glucose Readings with Local Maxima</span>
          <span className="text-sm font-normal">
            {isLoading
              ? "Updating..."
              : `Last updated: ${dateTimeFormatter(lastUpdated.toISOString(), {
                  seconds: true,
                })}`}
          </span>
        </CardTitle>
      </CardHeader>
      {error && (
        <Alert variant="destructive" className="mx-4 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer className="bg-white shadow-lg rounded-lg p-4">
            <LineChart data={data}>
              <ReferenceArea
                y1={0}
                y2={70}
                fill={colors.low}
                fillOpacity={OPTIONS.fillOpacity}
              />
              <ReferenceLine
                y={70}
                stroke={colors.normal}
                strokeDasharray="3 3"
              />
              <ReferenceArea
                y1={70}
                y2={180}
                fill={colors.normal}
                fillOpacity={0.1}
              />
              <ReferenceLine
                y={180}
                stroke={colors.normal}
                strokeDasharray="3 3"
              />
              <ReferenceArea
                y1={180}
                y2={250}
                fill={colors.high}
                fillOpacity={OPTIONS.fillOpacity}
              />
              <ReferenceArea
                y1={250}
                y2={yAxisMax}
                fill={colors.veryHigh}
                fillOpacity={OPTIONS.fillOpacity}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) =>
                  dateTimeFormatter(date).split(" ")[1]
                }
                label={{ value: "Time", position: "insideBottomRight" }}
                domain={[xAxisMin, xAxisMax]}
              />
              <YAxis
                domain={[yAxisMin, yAxisMax]}
                ticks={yAxisTicks}
                tickFormatter={(value: number) => `${value}`}
                label={{ value: "mg/dL", angle: -90, position: "insideLeft" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                dot={<CustomDot />}
                stroke={OPTIONS.lineColor}
                strokeWidth={2}
                strokeOpacity={OPTIONS.lineOpacity}
                connectNulls
                isAnimationActive={false}
              />
              {data?.length &&
                data
                  .filter((point) => point.isMax)
                  .map((point, index) => (
                    <ReferenceDot
                      key={`${point.date}-${index}`}
                      x={point.date}
                      y={point.value + 12}
                      r={0}
                      fill="red"
                      stroke="none"
                      label={point.value}
                      className="z-10 font-medium text-black"
                      isFront
                    />
                  ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
