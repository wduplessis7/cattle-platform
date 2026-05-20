import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AnimalStatus } from "@prisma/client";
import Link from "next/link";
import { calculateAge, formatDate } from "@/lib/date-utils";

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
}

const PAGE_SIZE = 25;

async function getAnimals(
  farmId: string,
  page: number,
  search: string,
  status: string
) {
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
    ...(status && status !== "ALL"
      ? { status: status as AnimalStatus }
      : {}),
  };

  const [animals, total] = await Promise.all([
    db.animal.findMany({
      where,
      include: {
        breed: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.animal.count({ where }),
  ]);

  return { animals, total };
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SOLD: "bg-blue-100 text-blue-700",
  DECEASED: "bg-slate-100 text-slate-600",
  TRANSFERRED: "bg-blue-100 text-blue-700",
  LOANED: "bg-amber-100 text-amber-700",
};

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const farmId = (session as unknown as Record<string, unknown>).farmId as string | undefined;
  if (!farmId) redirect("/onboarding");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const search = params.search || "";
  const status = params.status || "ALL";

  const { animals, total } = await getAnimals(farmId, page, search, status);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0F172A]">Animals</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {total.toLocaleString()} animal{total !== 1 ? "s" : ""} on record
          </p>
        </div>
        <Link
          href="/animals/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Animal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-[#E2E8F0]">
          {/* Search */}
          <form method="get" className="flex-1 flex gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="search"
                type="text"
                defaultValue={search}
                placeholder="Search by reg no, name, or RFID..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
            </div>

            {/* Status filter */}
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SOLD">Sold</option>
              <option value="DECEASED">Deceased</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="LOANED">Loaned</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-sm font-medium text-[#0F172A] hover:bg-[#E2E8F0] transition"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Reg No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">
                  Breed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">
                  DOB
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {animals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#64748B]">
                    {search || status !== "ALL"
                      ? "No animals match your filters."
                      : "No animals yet. Click \"Add Animal\" to get started."}
                  </td>
                </tr>
              ) : (
                animals.map((animal) => (
                  <tr
                    key={animal.id}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-[#0F172A]">
                        {animal.registrationNo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#0F172A]">
                        {animal.name || (
                          <span className="text-[#94A3B8] italic">Unnamed</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[#64748B]">
                      {animal.breed?.name || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#64748B] capitalize">
                      {animal.gender.toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[animal.status] ||
                          "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {animal.status.charAt(0) + animal.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#64748B]">
                      {calculateAge(animal.dob)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#64748B]">
                      {formatDate(animal.dob)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/animals/${animal.id}`}
                        className="text-[#16A34A] hover:text-[#15803D] text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/animals?page=${page - 1}&search=${search}&status=${status}`}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/animals?page=${page + 1}&search=${search}&status=${status}`}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
