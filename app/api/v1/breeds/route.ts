import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// POST /api/v1/breeds — upsert a breed by name, return its id
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Breed name required" }, { status: 400 });
    }

    const breed = await db.breed.upsert({
      where: { name: name.trim() },
      update: {},
      create: { name: name.trim(), species: "cattle" },
    });

    return NextResponse.json({ data: breed }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/v1/breeds]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
