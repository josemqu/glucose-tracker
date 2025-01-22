// page.tsx
import { GlucoseChart } from "@/components/GlucoseChart";

// Move API constants to a separate file
const API_CONFIG = {
  loginUrl: "https://api-la.libreview.io/llu/auth/login",
  graphUrl:
    "https://api-la.libreview.io/llu/connections/46c16886-c96e-e911-813f-02d09c370615/graph",
  headers: {
    product: "llu.android",
    version: "4.9.0",
  },
};

// Create a separate data fetching function
async function getGlucoseData() {
  // Add error handling
  try {
    const token = await getToken();
    const data = await fetchGlucoseReadings(token);
    return processReadings(data);
  } catch (error) {
    console.error("Error fetching glucose data:", error);
    return [];
  }
}

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
    cache: "no-store", // Prevent caching of authentication requests
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
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error("Failed to fetch glucose data");
  }

  return response.json();
}

/**
 * 
 * "glucoseMeasurement": {
                "FactoryTimestamp": "1/22/2025 1:29:12 AM",
                "Timestamp": "1/21/2025 10:29:12 PM",
                "type": 1,
                "ValueInMgPerDl": 190,
                "TrendArrow": 3,
                "TrendMessage": null,
                "MeasurementColor": 2,
                "GlucoseUnits": 1,
                "Value": 190,
                "isHigh": false,
                "isLow": false
            },

 * @param data 
 * @returns 
 */

// type definition for the data object
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

function processReadings(data: GlucoseData) {
  const { glucoseMeasurement } = data.data.connection;
  const lastReading = {
    date: glucoseMeasurement.Timestamp,
    value: glucoseMeasurement.Value,
    isMax: false,
  };

  const readings = data.data.graphData.map(
    (item: { Timestamp: string; Value: number }) => ({
      date: item.Timestamp,
      value: item.Value,
      isMax: false,
    })
  );

  readings.push(lastReading);
  return findLocalMaxima(readings);
}

function findLocalMaxima(
  data: Array<{ date: string; value: number; isMax: boolean }>
) {
  return data.map((reading, index, array) => {
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

// Create a loading component
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-600">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
    </div>
  );
}

// Modify the page component to use Suspense
import { Suspense } from "react";

export default async function Home() {
  const readings = await getGlucoseData();

  return (
    <main className="bg-slate-600 min-h-screen p-8 flex justify-center items-center w-full">
      <Suspense fallback={<LoadingState />}>
        <GlucoseChart data={readings} />
      </Suspense>
    </main>
  );
}
