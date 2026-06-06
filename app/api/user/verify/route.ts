import { NextResponse } from "next/server";
import { getProvider } from "@/lib/contest/providers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oj = searchParams.get("oj");
  const handle = searchParams.get("handle");

  if (!oj || !handle) {
    return NextResponse.json({ error: "Missing oj or handle parameter" }, { status: 400 });
  }

  if (oj !== "codeforces" && oj !== "atcoder") {
    return NextResponse.json({ error: "Invalid online judge" }, { status: 400 });
  }

  try {
    const provider = getProvider(oj as any);
    const exists = await provider.verifyHandle(handle);
    return NextResponse.json({ exists });
  } catch (error: any) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
