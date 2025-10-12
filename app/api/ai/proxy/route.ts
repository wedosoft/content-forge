import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function handleProxy(request: NextRequest) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "openai";
  const targetParam = url.searchParams.get("url");

  if (!targetParam) {
    return NextResponse.json({ error: "Missing target url" }, { status: 400 });
  }

  if (provider !== "openai") {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const targetUrl = decodeURIComponent(targetParam);

  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${OPENAI_API_KEY}`);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
    cache: "no-store",
    // @ts-expect-error duplex is still experimental but required for streaming bodies
    duplex: "half",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  // Ensure we allow the browser to read the stream
  responseHeaders.delete("content-encoding");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}
