import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AnimalStatus } from "@prisma/client";

// Verify farm has access to this animal
async function verifyFarmAccess(animalId: string, farmId: string) {
  const ownership = await db.animalOwnership.findFirst({
    where: {
      animalId,
      farmId,
      endDate: null,
    },
  });
  return !!ownership;
}

// GET /api/v1/animals/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
    if (!farmId) {
      return NextResponse.json({ error: "No farm associated with account" }, { status: 403 });
    }

    const { id } = await params;

    const hasAccess = await verifyFarmAccess(id, farmId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const animal = await db.animal.findUnique({
      where: { id, deletedAt: null },
      include: {
        breed: true,
        mother: {
          select: { id: true, name: true, registrationNo: true },
        },
        father: {
          select: { id: true, name: true, registrationNo: true },
        },
        ownerships: {
          where: { farmId },
          orderBy: { startDate: "desc" },
        },
        timeline: {
          orderBy: { occurredAt: "desc" },
          take: 50,
        },
        treatments: {
          where: { farmId },
          orderBy: { treatmentDate: "desc" },
          take: 20,
          include: {
            medicines: {
              include: { medicine: { select: { name: true, type: true } } },
            },
          },
        },
        vaccinations: {
          where: { farmId },
          orderBy: { administeredAt: "desc" },
          take: 20,
          include: {
            vaccine: { select: { name: true, type: true } },
          },
        },
        weights: {
          where: { farmId },
          orderBy: { capturedAt: "desc" },
          take: 20,
        },
        breedingAsDam: {
          where: { farmId },
          orderBy: { eventDate: "desc" },
          take: 10,
          include: {
            sire: { select: { id: true, name: true, registrationNo: true } },
            calvingRecord: true,
          },
        },
        breedingAsSire: {
          where: { farmId },
          orderBy: { eventDate: "desc" },
          take: 10,
          include: {
            dam: { select: { id: true, name: true, registrationNo: true } },
            calvingRecord: true,
          },
        },
        movements: {
          where: { farmId },
          orderBy: { movedAt: "desc" },
          take: 20,
          include: {
            fromCamp: { select: { name: true } },
            toCamp: { select: { name: true } },
          },
        },
      },
    });

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: animal });
  } catch (error) {
    console.error("[GET /api/v1/animals/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/v1/animals/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
    if (!farmId) {
      return NextResponse.json({ error: "No farm associated with account" }, { status: 403 });
    }

    const { id } = await params;

    const hasAccess = await verifyFarmAccess(id, farmId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      color,
      rfidTag,
      breedId,
      dob,
      status,
      motherId,
      fatherId,
      photos,
    } = body;

    // Validate status if provided
    if (status && !Object.values(AnimalStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid values: ${Object.values(AnimalStatus).join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await db.animal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(color !== undefined && { color: color?.trim() || null }),
        ...(rfidTag !== undefined && { rfidTag: rfidTag?.trim() || null }),
        ...(breedId !== undefined && { breedId: breedId || null }),
        ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
        ...(status !== undefined && { status }),
        ...(motherId !== undefined && { motherId: motherId || null }),
        ...(fatherId !== undefined && { fatherId: fatherId || null }),
        ...(photos !== undefined && { photos }),
      },
      include: {
        breed: { select: { id: true, name: true } },
      },
    });

    // Log timeline event for status changes
    if (status && status !== (await db.animal.findUnique({ where: { id } }))?.status) {
      await db.animalTimelineEvent.create({
        data: {
          animalId: id,
          farmId,
          eventType: status,
          eventData: { previousStatus: body.previousStatus, notes: body.notes },
          occurredAt: new Date(),
          recordedBy: session.user!.id,
        },
      });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/v1/animals/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/v1/animals/:id — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
    if (!farmId) {
      return NextResponse.json({ error: "No farm associated with account" }, { status: 403 });
    }

    const { id } = await params;

    const hasAccess = await verifyFarmAccess(id, farmId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Soft delete — set deletedAt
    await db.$transaction([
      db.animal.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      // End ownership
      db.animalOwnership.updateMany({
        where: { animalId: id, farmId, endDate: null },
        data: { endDate: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/v1/animals/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
