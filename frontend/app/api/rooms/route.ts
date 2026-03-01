import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL ;

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { message: "Proxy GET /api/rooms failed", error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const playerToken = req.headers.get("x-player-token");

    const headersToForward: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (playerToken) {
      headersToForward["x-player-token"] = playerToken;
    }

    const res = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: "POST",
      headers: headersToForward,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { message: "Proxy POST /api/rooms failed", error: String(err) },
      { status: 500 }
    );
  }
}