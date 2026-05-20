import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { farmName, slug, country } = body;

    if (!farmName || !slug) {
      return NextResponse.json(
        { error: "Farm name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.farm.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "This farm URL is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Create farm and owner relationship atomically
    const farm = await db.$transaction(async (tx) => {
      const newFarm = await tx.farm.create({
        data: {
          name: farmName.trim(),
          slug: slug.trim(),
          country: country || null,
          settings: {},
        },
      });

      await tx.farmUser.create({
        data: {
          farmId: newFarm.id,
          userId: session.user!.id as string,
          role: "FARM_OWNER",
        },
      });

      return newFarm;
    });

    return NextResponse.json(
      { farmId: farm.id, slug: farm.slug, name: farm.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/onboarding]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
