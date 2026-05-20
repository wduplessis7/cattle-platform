import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "@/lib/date-utils";

async function getDashboardData(farmId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalAnimals,
    activeThisMonth,
    upcomingVaccinations,
    pendingMovements,
    recentTimeline,
  ] = await Promise.all([
    // Total active animals
    db.animalOwnership.count({
      where: {
        farmId,
        endDate: null,
        animal: { status: "ACTIVE", deletedAt: null },
      },
    }),

    // Animals with activity this month (weights, treatments, or movements)
    db.animal.count({
      where: {
        deletedAt: null,
        ownerships: {
          some: {
            farmId,
            endDate: null,
          },
        },
        OR: [
          { weights: { some: { farmId, capturedAt: { gte: startOfMonth } } } },
          { treatments: { some: { farmId, treatmentDate: { gte: startOfMonth } } } },
          { movements: { some: { farmId, movedAt: { gte: startOfMonth } } } },
        ],
      },
    }),

    // Upcoming vaccinations booster due in next 30 days
    db.vaccination.count({
      where: {
        farmId,
        boosterDue: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    }),

    // Pending movements (movements recorded today or in future)
    db.movement.count({
      where: {
        farmId,
        movedAt: { gte: startOfMonth },
      },
    }),

    // Recent timeline events
    db.animalTimelineEvent.findMany({
      where: {
        farmId,
        occurredAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { occurredAt: "desc" },
      take: 10,
      include: {
        animal: {
          select: { name: true, registrationNo: true },
        },
      },
    }),
  ]);

  return {
    totalAnimals,
    activeThisMonth,
    upcomingVaccinations,
    pendingMovements,
    recentTimeline,
  };
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BORN: "Born",
    PURCHASED: "Purchased",
    SOLD: "Sold",
    TREATMENT: "Treatment",
    VACCINATION: "Vaccinated",
    WEIGHT: "Weight recorded",
    MOVEMENT: "Moved camp",
    BREEDING: "Breeding event",
    CALVING: "Calved",
    DEATH: "Deceased",
    TRANSFER: "Transferred",
  };
  return labels[type] ?? type;
}

function eventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    BORN: "bg-green-100 text-green-700",
    PURCHASED: "bg-blue-100 text-blue-700",
    SOLD: "bg-amber-100 text-amber-700",
    TREATMENT: "bg-red-100 text-red-700",
    VACCINATION: "bg-purple-100 text-purple-700",
    WEIGHT: "bg-stone-100 text-stone-600",
    MOVEMENT: "bg-orange-100 text-orange-700",
    BREEDING: "bg-pink-100 text-pink-700",
    CALVING: "bg-teal-100 text-teal-700",
    DEATH: "bg-stone-200 text-stone-500",
  };
  return colors[type] ?? "bg-stone-100 text-stone-500";
}

const kpiCards = [
  {
    key: "totalAnimals",
    label: "Total Animals",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    key: "activeThisMonth",
    label: "Active This Month",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-[#4A7C2F]",
    bg: "bg-green-50",
  },
  {
    key: "upcomingVaccinations",
    label: "Upcoming Vaccinations",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
  {
    key: "pendingMovements",
    label: "Movements This Month",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;

  if (!farmId) {
    redirect("/onboarding");
  }

  const data = await getDashboardData(farmId);

  const values: Record<string, number> = {
    totalAnimals: data.totalAnimals,
    activeThisMonth: data.activeThisMonth,
    upcomingVaccinations: data.upcomingVaccinations,
    pendingMovements: data.pendingMovements,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1C1208]">Dashboard</h1>
        <p className="text-sm text-[#8B7355] mt-0.5">
          Overview of your herd and farm activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-xl border border-[#E5DAC8] p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bg} ${card.color} p-2.5 rounded-lg`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#1C1208]">
                  {values[card.key].toLocaleString()}
                </p>
                <p className="text-xs text-[#8B7355] mt-0.5 truncate">
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-[#E5DAC8]">
        <div className="px-6 py-4 border-b border-[#E5DAC8]">
          <h2 className="text-base font-semibold text-[#1C1208]">
            Recent Activity
          </h2>
          <p className="text-xs text-[#8B7355] mt-0.5">
            Last 7 days of herd events
          </p>
        </div>

        <div className="divide-y divide-[#F0E8D8]">
          {data.recentTimeline.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <svg
                className="mx-auto w-10 h-10 text-[#C9B89A] mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-[#8B7355]">
                No activity in the last 7 days
              </p>
              <p className="text-xs text-[#C9B89A] mt-1">
                Events will appear here as you record activity
              </p>
            </div>
          ) : (
            data.recentTimeline.map((event) => (
              <div key={event.id} className="flex items-start gap-4 px-6 py-3.5">
                <span
                  className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${eventTypeColor(event.eventType)}`}
                >
                  {eventTypeLabel(event.eventType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#3D2B14] font-medium truncate">
                    {event.animal.name || event.animal.registrationNo}
                  </p>
                  <p className="text-xs text-[#8B7355] mt-0.5">
                    #{event.animal.registrationNo}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#8B7355] whitespace-nowrap">
                  {formatDistanceToNow(new Date(event.occurredAt))}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
