"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  colors,
  dateTimeFormatter,
  getColor,
  // getLighterColor,
} from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChartConfig, ChartContainer, ChartStyle } from "@/components/ui/chart";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",
  },
  mobile: {
    label: "Mobile",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

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
  lineColor: "white",
  lineOpacity: 0.9,
};

// Keep your existing custom components
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  value?: number | string;
}) => {
  const { cx, cy, value } = props;
  const color = getColor(typeof value === "number" ? value : undefined);
  const radius =
    window.innerWidth < 500
      ? 0
      : window.innerWidth < 640
      ? 2
      : window.innerWidth < 1024
      ? 3
      : 4;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={color}
      stroke={color}
      strokeWidth={1}
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
    <div className="p-2 rounded-lg shadow-md border bg-zinc-900 border-slate-600">
      <p className="font-bold text-xl text-center" style={{ color }}>
        {`${value.toLocaleString("es-AR", {
          maximumFractionDigits: 0,
        })} mg/dL`}
      </p>
      <p className="font-medium text-slate-500 text-sm text-center">
        {dateTimeFormatter(label)}
      </p>
    </div>
  );
};

// create a type definition to props
type CustomizedLabelProps = {
  viewBox: { x: number; y: number };
  value: number;
};

const CustomizedLabel = (props: CustomizedLabelProps) => {
  const { value } = props;
  const { x, y } = props.viewBox;
  return (
    <text
      x={x}
      y={y}
      fontSize={"1.1rem"}
      // use className to style the text
      className="font-semibold text-xs sm:text-sm md:text-base md:font-bold lg:text-lg"
      textAnchor="middle"
      fill={getColor(value)}
    >
      {value.toLocaleString("es-AR", {
        maximumFractionDigits: 0,
      })}
    </text>
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
  const yAxisTicks = [0, 70, 180, 250, 320];
  const xAxisMin = 0;
  const xAxisMax = data?.length - 1;

  const { min, max } = data.reduce(
    (result, dataPoint) => ({
      min:
        dataPoint.value < result.min || result.min === 0
          ? dataPoint.value
          : result.min,
      max:
        dataPoint.value > result.max || result.max === 0
          ? dataPoint.value
          : result.max,
    }),
    { min: 0, max: 0 }
  );

  const breakPointPercentage = (value: number) => {
    return `${((value - min) / (max - min)) * 100}%`;
  };

  return (
    <Card className="w-full h-full border-zinc-700 p-0 sm:p-1 md:p-2 lg:p-4 bg-zinc-900">
      <CardHeader className="p-4">
        <CardTitle className="flex justify-between items-center sm:flex-row flex-col mx-1 sm:mx-2">
          <div className="flex items-center justify-center text-slate-300">
            <h4 className="text-base md:text-lg font-bold  text-nowrap">
              Glucose Readings with Local Maxima
            </h4>
          </div>
          <div className="text-xs font-normal text-nowrap text-slate-400">
            <span>{isLoading || error ? "🔴" : "🟢"}</span>
            <span>
              {` Last updated: ${dateTimeFormatter(lastUpdated.toISOString(), {
                seconds: true,
              })}`}
            </span>
          </div>
        </CardTitle>
        {error && (
          <Alert variant="destructive" className="mb-4 h-full">
            <AlertCircle />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      {/* h-[20rem] w-full sm:h-[30rem] md:h-[35rem] lg:h-full */}
      <CardContent className="">
        <ChartContainer
          config={chartConfig}
          className="w-full max-h-[78vh]" //w-full h-[20rem] sm:h-[30rem] md:h-[35rem] lg:h-[45rem]
        >
          <LineChart data={data} style={ChartStyle}>
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
            <ReferenceLine
              y={250}
              stroke={colors.veryHigh}
              strokeDasharray="3 3"
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
              fillOpacity={OPTIONS.fillOpacity}
            />
            <ReferenceLine y={180} stroke={colors.high} strokeDasharray="3 3" />
            <ReferenceArea
              y1={180}
              y2={250}
              fill={colors.high}
              fillOpacity={OPTIONS.fillOpacity}
            />
            <ReferenceArea
              y1={250}
              y2={320}
              fill={colors.veryHigh}
              fillOpacity={OPTIONS.fillOpacity}
            />
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
            />
            <XAxis
              dataKey="date"
              tick={{
                stroke: "hsl(var(--chart-grid))",
                fontWeight: 100,
              }}
              tickFormatter={(date: string) =>
                dateTimeFormatter(date).split(" ")[1]
              }
              label={{
                value: "Time",
                position: "insideBottomRight",
                offset: -5,
              }}
              domain={[xAxisMin, xAxisMax]}
              height={40}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              tick={{
                stroke: "hsl(var(--chart-grid))",
                fontWeight: 100,
              }}
              ticks={yAxisTicks}
              tickFormatter={(value: number) => `${value}`}
              label={{
                value: "mg/dL",
                position: "insideTopRight",
                viewBox: { x: 45, y: 28, width: 50, height: 50 },
              }}
              width={30}
              stroke="hsl(var(--chart-grid))"
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            {/* <ChartTooltip content={<ChartTooltipContent />} /> */}
            <defs>
              <linearGradient id="colorUv" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop
                  offset={"0.1%"}
                  stopColor={colors.low}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(70)}
                  stopColor={colors.low}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(70)}
                  stopColor={colors.normal}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(180)}
                  stopColor={colors.normal}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(180)}
                  stopColor={colors.high}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(250)}
                  stopColor={colors.high}
                  stopOpacity={0.9}
                />
                <stop
                  offset={breakPointPercentage(250)}
                  stopColor={colors.veryHigh}
                  stopOpacity={0.9}
                />
                <stop
                  offset={"100%"}
                  stopColor={colors.veryHigh}
                  stopOpacity={0.9}
                />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="value"
              dot={<CustomDot />}
              // dot={false}
              activeDot={{
                fill: "transparent",
                r: 4,
                stroke: "white",
                strokeWidth: 2,
              }}
              // stroke={OPTIONS.lineColor}
              stroke="url(#colorUv)"
              strokeWidth={2}
              strokeOpacity={OPTIONS.lineOpacity}
              connectNulls
              isAnimationActive={true}
            />
            {data?.length &&
              data
                .filter((point) => point.isMax)
                .map((point, index) => (
                  <ReferenceDot
                    key={`${point.date}-${index}`}
                    x={point.date}
                    y={`${point.value + 15}`}
                    r={0}
                    label={
                      <CustomizedLabel
                        value={point.value}
                        viewBox={{
                          x: 0,
                          y: 0,
                        }}
                      />
                    }
                    className="z-10 text-base font-semibold"
                    isFront
                  />
                ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
