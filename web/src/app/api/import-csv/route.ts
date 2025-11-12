import { NextResponse } from "next/server";

const FUNCTIONS_BASE_URL = process.env.FUNCTIONS_BASE_URL;

export async function POST(request: Request) {
  if (!FUNCTIONS_BASE_URL) {
    return NextResponse.json(
      { error: "Missing FUNCTIONS_BASE_URL env var" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const appCheckToken = request.headers.get("x-firebase-appcheck") || "";
    const res = await fetch(`${FUNCTIONS_BASE_URL}/importCsv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}


