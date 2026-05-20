import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AnimalStatus, Gender } from "@prisma/client";

function generateRegistrationNo(farmSlug: string): string {
  const prefix = farmSlug.toUpperCase().slice(0, 3).replace(/-/g, "");
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 900000 + 100000).toString();
  return `${prefix}${year}-${random}`;
}

// GET /api/v1/animals — list animals for current farm
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;

    if (!farmId) {
      return NextResponse.json({ error: "No farm associated with account" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where = {
      deletedAt: null,
      ownerships: {
        some: {
          farmId,
          endDate: null,
        },
      },
      ...(search
        ? {
            OR: [
              { registrationNo: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { rfidTag: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status && Object.values(AnimalStatus).includes(status as AnimalStatus)
        ? { status: status as AnimalStatus }
        : {}),
    };

    const [animals, total] = await Promise.all([
      db.animal.findMany({
        where,
        include: {
          breed: { select: { id: true, name: true } },
          ownerships: {
            where: { farmId, endDate: null },
            select: { id: true, ownershipType: true, startDate: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.animal.count({ where }),
    ]);

    return NextResponse.json({
      data: animals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/v1/animals]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/animals — create new animal
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
    const farmSlug = (session as unknown as Record<string, unknown>).farmSlug as string | undefined;

    if (!farmId || !farmSlug) {
      return NextResponse.json({ error: "No farm associated with account" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      gender,
      breedId,
      dob,
      color,
      rfidTag,
      motherId,
      fatherId,
      status = "ACTIVE",
      ownershipType = "OWNER",
      notes,
    } = body;

    // Validate required fields
    if (!gender || !Object.values(Gender).includes(gender)) {
      return NextResponse.json(
        { error: "Valid gender (MALE or FEMALE) is required" },
        { status: 400 }
      );
    }

    // Generate a unique registration number
    let registrationNo: string;
    let attempts = 0;
    do {
      registrationNo = generateRegistrationNo(farmSlug);
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: "Failed to generate unique registration number" },
          { status: 500 }
        );
      }
    } while (await db.animal.findUnique({ where: { registrationNo } }));

    // Create animal + ownership + timeline event atomically
    const animal = await db.$transaction(async (tx) => {
      const newAnimal = await tx.animal.create({
        data: {
          registrationNo,
          name: name?.trim() || null,
          gender,
          breedId: breedId || null,
          dob: dob ? new Date(dob) : null,
          color: color?.trim() || null,
          rfidTag: rfidTag?.trim() || null,
          motherId: motherId || null,
          fatherId: fatherId || null,
          status: status as AnimalStatus,
          birthFarmId: farmId,
        },
        include: {
          breed: { select: { id: true, name: true } },
        },
      });

      // Create ownership record
      await tx.animalOwnership.create({
        data: {
          animalId: newAnimal.id,
          farmId,
          ownershipType,
          startDate: new Date(),
          notes: notes || null,
        },
      });

      // Create initial timeline event
      await tx.animalTimelineEvent.create({
        data: {
          animalId: newAnimal.id,
          farmId,
          eventType: "PURCHASED",
          eventData: {
            registrationNo,
            gender,
            breed: null,
            notes: notes || null,
          },
          occurredAt: new Date(),
          recordedBy: session.user!.id,
        },
      });

      return newAnimal;
    });

    return NextResponse.json({ data: animal }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/animals]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
