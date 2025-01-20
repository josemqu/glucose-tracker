import { GlucoseChart } from "@/components/GlucoseChart";
import { Nav, NavLink } from "@/components/Nav";

type GlucoseDataProps = {
  data: {
    date: string;
    value: number;
    isMax: boolean;
  }[];
};

const loginUrl = "https://api-la.libreview.io/llu/auth/login";
const graphUrl =
  "https://api-la.libreview.io/llu/connections/46c16886-c96e-e911-813f-02d09c370615/graph";

const headers = {
  product: "llu.android",
  version: "4.9.0",
};

const body = {
  email: process.env.EMAIL,
  password: process.env.PASSWORD,
};

async function getGlucoseData() {
  const getToken = async () => {
    const { data } = await fetch(loginUrl, {
      body: JSON.stringify(body),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }).then((res) => res.json());

    return data.authTicket;
  };

  const { token } = await getToken();

  const getGlucoseData = await fetch(graphUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  }).then((res) => res.json());

  const { glucoseMeasurement } = getGlucoseData.data.connection;

  const lastReading = {
    date: glucoseMeasurement.Timestamp,
    value: glucoseMeasurement.Value,
    isMax: false,
  };

  let readings = getGlucoseData.data.graphData.map(
    (item: { Timestamp: string; Value: number }) => ({
      date: item.Timestamp,
      value: item.Value,
      isMax: false,
    })
  );

  // add last reading to the end of the data array
  readings.push(lastReading);

  // given an array of glucose readings, identify the local maximums
  const findLocalMaxima = (data: GlucoseDataProps["data"]) => {
    return data.map((reading, index, array) => {
      const currentValue = reading.value;

      // Get available previous and next values
      const prev2Value = index >= 2 ? array[index - 2].value : -Infinity;
      const prev1Value = index >= 1 ? array[index - 1].value : -Infinity;
      const next1Value =
        index < array.length - 1 ? array[index + 1].value : -Infinity;
      const next2Value =
        index < array.length - 2 ? array[index + 2].value : -Infinity;

      // For edge points (first two or last two), check only available neighbors
      let isLocalMax = false;

      if (array.length <= 1) {
        // If there are less than 3 points, all points are local maxima
        isLocalMax = currentValue > next1Value && currentValue > next2Value;
      } else if (index <= 2) {
        // First two points: check only available previous and next two points
        isLocalMax =
          currentValue >= prev1Value &&
          currentValue >= next1Value &&
          currentValue >= next2Value;
      } else if (index >= array.length - 3) {
        // Last two points: check only available previous two and next points
        isLocalMax =
          currentValue >= prev2Value &&
          currentValue >= prev1Value &&
          currentValue >= next1Value;
      } else if (index >= array.length - 2) {
        // Last point: check only available previous two points
        isLocalMax = currentValue > prev2Value && currentValue > prev1Value;
      } else {
        // Middle points: check all two points on both sides
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
  };

  readings = findLocalMaxima(readings);
  // console.log({ localMaxs });

  console.log({ readings });
  return readings;
}

export default async function Home({
  dateRangeOption,
}: {
  dateRangeOption?: string;
}) {
  const readings = await getGlucoseData();

  return (
    <main className="bg-slate-600 h-screen p-8 flex justify-center items-center  w-full">
      <GlucoseChart data={readings} />
    </main>
  );
}
