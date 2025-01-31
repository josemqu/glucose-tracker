// app/api/glucose/route.ts
import { NextResponse } from "next/server";
import { findLocalMaxima, findLocalMinima } from "@/lib/utils";

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
      isMin: false,
    };

    let readings = data.data.graphData.map(
      (item: { Timestamp: string; Value: number }) => ({
        date: item.Timestamp,
        value: item.Value,
        isMax: false,
        isMin: false,
      })
    );

    readings.push(lastReading);
    readings = findLocalMaxima(readings);
    readings = findLocalMinima(readings);

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
