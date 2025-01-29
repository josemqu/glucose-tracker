// app/page.tsx
import { Suspense } from "react";
import { GlucoseChart } from "@/components/GlucoseChart";
import { processReadings } from "@/lib/utils";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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

// Data fetching functions
async function getToken() {
  try {
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
  } catch (error) {
    console.error("Error fetching token:", error);
    return "";
  }
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

async function getGlucoseData() {
  try {
    const token = await getToken();
    const data = await fetchGlucoseReadings(token);
    const processedData = processReadings(data);
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
    <main className="bg-zinc-950 min-h-screen max-w-screen flex justify-center items-start w-full p-4">
      <Suspense fallback={<LoadingState />}>
        <div className="min-w-full min-h-full gap-2 flex flex-col items-end">
          <div className="flex justify-end items-center gap-2 w-full ">
            <Button variant="outline" size="icon">
              <User />
            </Button>
            <ModeToggle />
          </div>
          <GlucoseChart initialData={initialData} />
        </div>
      </Suspense>
    </main>
  );
}
