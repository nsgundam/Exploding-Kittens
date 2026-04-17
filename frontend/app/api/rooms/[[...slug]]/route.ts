import { NextRequest, NextResponse } from "next/server";

// Catch-all API Route for /api/rooms and /api/rooms/*
export async function matchAndProxy(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
    try {
        const slugParams = await params;
        const path = slugParams?.slug ? slugParams.slug.join("/") : "";
        const search = req.nextUrl.search || "";
        // Use 127.0.0.1 for high stability between proxy and backend
        const targetUrl = `http://127.0.0.1:4000/api/rooms${path ? `/${path}` : ""}${search}`;

        const playerToken = req.headers.get("x-player-token");

        const headersToForward: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (playerToken) {
            headersToForward["x-player-token"] = playerToken;
        }

        const fetchOptions: RequestInit = {
            method: req.method,
            headers: headersToForward,
        };

        if (req.method !== "GET" && req.method !== "HEAD") {
            fetchOptions.body = JSON.stringify(await req.json());
        }

        if (req.method === "GET") {
            fetchOptions.cache = "no-store";
        }

        const res = await fetch(targetUrl, fetchOptions);
        const data = await res.json().catch(() => null);

        return NextResponse.json(data || {}, { status: res.status });
    } catch (err) {
        return NextResponse.json(
            { message: `Proxy ${req.method} /api/rooms failed`, error: String(err) },
            { status: 500 }
        );
    }
}

export const GET = matchAndProxy;
export const POST = matchAndProxy;
export const PUT = matchAndProxy;
export const PATCH = matchAndProxy;
export const DELETE = matchAndProxy;
