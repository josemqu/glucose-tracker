// app/page.tsx
import { Suspense } from "react";
import { GlucoseChart } from "@/components/GlucoseChart";
import { addDecimalValues } from "@/lib/utils";

// API configuration
const API_CONFIG = {
  loginUrl: "https://api-la.libreview.io/llu/auth/login",
  graphUrl:
    "https://api-la.libreview.io/llu/connections/46c16886-c96e-e911-813f-02d09c370615/graph",
  headers: {
    product: "llu.android",
    version: "4.9.0",
  },
};

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

// Data fetching functions
async function getToken() {
  const response = await fetch(API_CONFIG.loginUrl, {
    body: JSON.stringify({
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...API_CONFIG.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate");
  }

  const { data } = await response.json();
  return data.authTicket.token;
}

async function fetchGlucoseReadings(token: string) {
  const response = await fetch(API_CONFIG.graphUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...API_CONFIG.headers,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch glucose data");
  }

  return response.json();
}

function findLocalMaxima(
  data: Array<{ date: string; value: number; isMax: boolean }>
) {
  console.log("findLocalMAx");

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

function processReadings(data: GlucoseData) {
  const { glucoseMeasurement } = data.data.connection;
  const lastReading = {
    date: glucoseMeasurement.Timestamp,
    value: glucoseMeasurement.Value,
    isMax: false,
  };

  const prevReadings = data.data.graphData.map((item) => ({
    date: item.Timestamp,
    value: item.Value,
    isMax: false,
  }));

  prevReadings.push(lastReading);

  const processedData = findLocalMaxima(prevReadings);

  return processedData;
}

async function getGlucoseData() {
  try {
    const token = await getToken();
    const data = await fetchGlucoseReadings(token);
    const processedData = processReadings(data);
    // console.log("Processed data:", processedData);
    return processedData;
  } catch (error) {
    console.error("Error fetching glucose data:", error);
    return [];
  }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-600">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
    </div>
  );
}

export default async function Home() {
  const initialData = await getGlucoseData();

  return (
    <main className="bg-slate-600 min-h-screen p-8 flex justify-center items-start w-full">
      <Suspense fallback={<LoadingState />}>
        <GlucoseChart initialData={initialData} />
      </Suspense>
    </main>
  );
}
