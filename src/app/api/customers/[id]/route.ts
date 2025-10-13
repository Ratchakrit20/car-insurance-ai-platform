import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(
  req: NextRequest,
  { params }: any // ✅ ไม่ระบุ type ตรงนี้
) {
  try {
    const id = params.id;
    const res = await fetch(`${BACKEND_URL}/api/customers/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json(
        { message: "Backend did not return JSON", raw: text },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: any // ✅ ใช้ any เหมือนกัน
) {
  try {
    const id = params.id;
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json(
        { message: "Backend did not return JSON", raw: text },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
