// app/api/glucose/route.ts
import { NextResponse } from "next/server";
import { addDecimalValues } from "@/lib/utils";

// const loginUrl = "https://api-la.libreview.io/llu/auth/login";
const graphUrl =
  "https://api-la.libreview.io/llu/connections/46c16886-c96e-e911-813f-02d09c370615/graph";
const headers = {
  product: "llu.android",
  version: "4.9.0",
};

// async function getToken() {
//   const response = await fetch(loginUrl, {
//     body: JSON.stringify({
//       email: process.env.EMAIL,
//       password: process.env.PASSWORD,
//     }),
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...headers,
//     },
//   });

//   if (!response.ok) {
//     throw new Error("Authentication failed");
//   }

//   const { data } = await response.json();
//   return data.authTicket.token;
// }

async function findLocalMaxima(
  data: {
    date: string;
    value: number;
    isMax: boolean;
  }[]
) {
  // add decimal to the value
  const dataWithDecimal = addDecimalValues(data);

  return dataWithDecimal.map((reading, index, array) => {
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
    };
  });
}

export async function GET() {
  try {
    // const token = await getToken();
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ2YzE2ODg2LWM5NmUtZTkxMS04MTNmLTAyZDA5YzM3MDYxNSIsImZpcnN0TmFtZSI6Im1haWxqbXFAZ21haWwuY29tIiwibGFzdE5hbWUiOiJtYWlsam1xQGdtYWlsLmNvbSIsImNvdW50cnkiOiJBUiIsInJlZ2lvbiI6ImxhIiwicm9sZSI6InBhdGllbnQiLCJ1bml0cyI6MSwicHJhY3RpY2VzIjpbXSwiYyI6MCwicyI6ImxsdS5hbmRyb2lkIiwic2lkIjoiMWQ4ZDA0YTctZDZjOS00ZDgzLThkNjQtMzdkMWIwNmJjMmJmIiwiZXhwIjoxNzUyNzA4NDU2LCJpYXQiOjE3MzcxNTY0NTYsImp0aSI6IjliZWE4NjE3LWVjNGItNDkyNC05NzkxLTZiOThkZTQ1ZDcxOCJ9.Fpx2C9GkwFthkoxRCR3oe64KgfPSIYf4bzGJeulzPGU";
    const response = await fetch(graphUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch glucose data");
    }

    const data = await response.json();
    const { glucoseMeasurement } = data.data.connection;

    const lastReading = {
      date: glucoseMeasurement.Timestamp,
      value: glucoseMeasurement.Value,
      isMax: false,
    };

    let readings = data.data.graphData.map(
      (item: { Timestamp: string; Value: number }) => ({
        date: item.Timestamp,
        value: item.Value,
        isMax: false,
      })
    );

    readings.push(lastReading);
    readings = await findLocalMaxima(readings);

    // Cache headers for 1 minute
    const headers2 = {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
    };

    return NextResponse.json(readings, { headers: headers2 });
  } catch (error) {
    //Error: 'error' is defined but never used.
    console.error("Error fetching glucose data:", error);
    return NextResponse.json(
      { error: `Failed to fetch glucose data` },
      { status: 500 }
    );
  }
}
