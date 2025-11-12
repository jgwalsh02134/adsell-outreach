import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_FUNCTIONS_BASE;

export async function POST(request: Request) {
  if (!BASE) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_FUNCTIONS_BASE env var" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const res = await fetch(`${BASE}/importCsv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}


