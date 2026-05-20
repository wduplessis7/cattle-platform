import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { calculateAge, formatDate } from "@/lib/date-utils";

async function getAnimal(id: string, farmId: string) {
  const ownership = await db.animalOwnership.findFirst({
    where: { animalId: id, farmId, endDate: null },
  });

  if (!ownership) return null;

  return db.animal.findUnique({
    where: { id, deletedAt: null },
    include: {
      breed: true,
      mother: { select: { id: true, name: true, registrationNo: true } },
      father: { select: { id: true, name: true, registrationNo: true } },
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
        take: 10,
      },
      breedingAsDam: {
        where: { farmId },
        orderBy: { eventDate: "desc" },
        take: 10,
        include: {
          sire: { select: { id: true, name: true, registrationNo: true } },
          calvingRecord: {
            include: {
              calf: { select: { id: true, name: true, registrationNo: true, gender: true } },
            },
          },
        },
      },
      breedingAsSire: {
        where: { farmId },
        orderBy: { eventDate: "desc" },
        take: 10,
        include: {
          dam: { select: { id: true, name: true, registrationNo: true } },
        },
      },
    },
  });
}

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  SOLD: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  DECEASED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  TRANSFERRED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  LOANED: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const timelineIcons: Record<string, string> = {
  BORN: "bg-green-500",
  PURCHASED: "bg-blue-500",
  SOLD: "bg-yellow-500",
  TREATMENT: "bg-red-500",
  VACCINATION: "bg-purple-500",
  WEIGHT: "bg-gray-400",
  MOVEMENT: "bg-orange-500",
  BREEDING: "bg-pink-500",
  CALVING: "bg-teal-500",
  DEATH: "bg-gray-600",
};

export default async function AnimalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
  if (!farmId) redirect("/onboarding");

  const { id } = await params;
  const animal = await getAnimal(id, farmId);

  if (!animal) notFound();

  const latestWeight = animal.weights[0];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/animals" className="hover:text-gray-700 dark:hover:text-gray-200">
          Animals
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">
          {animal.name || animal.registrationNo}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Photo placeholder */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
          {animal.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={animal.photos[0]}
              alt={animal.name || animal.registrationNo}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {animal.name || "Unnamed Animal"}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusBadge[animal.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {animal.status.charAt(0) + animal.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            #{animal.registrationNo}
          </p>
        </div>
      </div>

      {/* Tabs (static, no JS required for SSR) */}
      <div className="space-y-6">
        {/* ─── OVERVIEW TAB ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Overview</h2>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Species
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {animal.species}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Gender
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {animal.gender.toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Breed
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {animal.breed?.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Date of Birth
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(animal.dob)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Age
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {calculateAge(animal.dob)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Color
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {animal.color || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                RFID Tag
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {animal.rfidTag || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Latest Weight
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {latestWeight ? `${Number(latestWeight.weightKg).toFixed(1)} kg` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Dam (Mother)
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {animal.mother ? (
                  <Link
                    href={`/animals/${animal.mother.id}`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    {animal.mother.name || animal.mother.registrationNo}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Sire (Father)
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {animal.father ? (
                  <Link
                    href={`/animals/${animal.father.id}`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    {animal.father.name || animal.father.registrationNo}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Registered
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(animal.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* ─── TIMELINE TAB ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Timeline</h2>
          </div>
          <div className="p-6">
            {animal.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                No timeline events recorded yet.
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-6 ml-3">
                {animal.timeline.map((event) => (
                  <li key={event.id} className="ml-6">
                    <span
                      className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center ${
                        timelineIcons[event.eventType] || "bg-gray-400"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {event.eventType.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(event.occurredAt)}
                      </span>
                    </div>
                    {event.eventData && typeof event.eventData === "object" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {JSON.stringify(event.eventData).replace(/[{}"]/g, "").replace(/,/g, " · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ─── HEALTH TAB ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Health</h2>
          </div>

          {/* Treatments */}
          <div className="p-6 border-b border-gray-50 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Treatments
            </h3>
            {animal.treatments.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No treatments recorded.</p>
            ) : (
              <div className="space-y-3">
                {animal.treatments.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t.illness || t.diagnosis || "Treatment"}
                      </p>
                      {t.medicines.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t.medicines.map((m) => m.medicine.name).join(", ")}
                        </p>
                      )}
                      {t.notes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">
                          {t.notes}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(t.treatmentDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vaccinations */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Vaccinations
            </h3>
            {animal.vaccinations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No vaccinations recorded.</p>
            ) : (
              <div className="space-y-3">
                {animal.vaccinations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {v.vaccine.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {v.batchNo ? `Batch: ${v.batchNo}` : ""}
                        {v.batchNo && v.boosterDue ? " · " : ""}
                        {v.boosterDue ? `Booster due: ${formatDate(v.boosterDue)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(v.administeredAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── BREEDING TAB ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Breeding</h2>
          </div>
          <div className="p-6">
            {animal.breedingAsDam.length === 0 && animal.breedingAsSire.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                No breeding events recorded for this animal.
              </p>
            ) : (
              <div className="space-y-4">
                {animal.breedingAsDam.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide">
                        As Dam
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(event.eventDate)}
                      </span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {event.method.replace(/_/g, " ")}
                      </span>
                      {event.result && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          event.result === "PREGNANT"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : event.result === "NOT_PREGNANT"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {event.result.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {event.sire && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sire:{" "}
                        <Link
                          href={`/animals/${event.sire.id}`}
                          className="text-green-600 dark:text-green-400 hover:underline"
                        >
                          {event.sire.name || event.sire.registrationNo}
                        </Link>
                      </p>
                    )}
                    {event.calvingRecord?.calf && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Calf:{" "}
                        <Link
                          href={`/animals/${event.calvingRecord.calf.id}`}
                          className="text-green-600 dark:text-green-400 hover:underline"
                        >
                          {event.calvingRecord.calf.name || event.calvingRecord.calf.registrationNo}
                        </Link>{" "}
                        ({event.calvingRecord.calf.gender.toLowerCase()})
                      </p>
                    )}
                  </div>
                ))}

                {animal.breedingAsSire.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        As Sire
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(event.eventDate)}
                      </span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {event.method.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Dam:{" "}
                      <Link
                        href={`/animals/${event.dam.id}`}
                        className="text-green-600 dark:text-green-400 hover:underline"
                      >
                        {event.dam.name || event.dam.registrationNo}
                      </Link>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
