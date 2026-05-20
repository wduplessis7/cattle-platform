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
  ACTIVE: "bg-green-100 text-green-700",
  SOLD: "bg-amber-100 text-amber-700",
  DECEASED: "bg-stone-100 text-stone-500",
  TRANSFERRED: "bg-blue-100 text-blue-700",
  LOANED: "bg-purple-100 text-purple-700",
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
          <h1 className="text-2xl font-bold text-[#1C1208]">Animals</h1>
          <p className="text-sm text-[#8B7355] mt-0.5">
            {total.toLocaleString()} animal{total !== 1 ? "s" : ""} on record
          </p>
        </div>
        <Link
          href="/animals/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A7C2F] hover:bg-[#3D6B24] text-white text-sm font-semibold transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Animal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5DAC8]">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-[#E5DAC8]">
          {/* Search */}
          <form method="get" className="flex-1 flex gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]"
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
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E5DAC8] bg-white text-sm text-[#3D2B14] placeholder-[#C9B89A] focus:outline-none focus:ring-2 focus:ring-[#4A7C2F] focus:border-transparent"
              />
            </div>

            {/* Status filter */}
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-[#E5DAC8] bg-white text-sm text-[#3D2B14] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A7C2F]"
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
              className="px-4 py-2 rounded-lg bg-[#F7F3EC] border border-[#E5DAC8] text-sm font-medium text-[#3D2B14] hover:bg-[#EDE6D8] transition"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5DAC8]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider">
                  Reg No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider hidden sm:table-cell">
                  Breed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider hidden md:table-cell">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider hidden lg:table-cell">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B7355] uppercase tracking-wider hidden lg:table-cell">
                  DOB
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8D8]">
              {animals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#8B7355]">
                    {search || status !== "ALL"
                      ? "No animals match your filters."
                      : "No animals yet. Click \"Add Animal\" to get started."}
                  </td>
                </tr>
              ) : (
                animals.map((animal) => (
                  <tr
                    key={animal.id}
                    className="hover:bg-[#FAF6EF] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-[#3D2B14]">
                        {animal.registrationNo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#1C1208]">
                        {animal.name || (
                          <span className="text-[#C9B89A] italic">Unnamed</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[#8B7355]">
                      {animal.breed?.name || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#8B7355] capitalize">
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
                    <td className="px-4 py-3 hidden lg:table-cell text-[#8B7355]">
                      {calculateAge(animal.dob)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#8B7355]">
                      {formatDate(animal.dob)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/animals/${animal.id}`}
                        className="text-[#4A7C2F] hover:text-[#3D6B24] text-xs font-medium"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5DAC8]">
            <p className="text-xs text-[#8B7355]">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/animals?page=${page - 1}&search=${search}&status=${status}`}
                  className="px-3 py-1.5 rounded-lg border border-[#E5DAC8] text-xs font-medium text-[#3D2B14] hover:bg-[#F7F3EC] transition"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/animals?page=${page + 1}&search=${search}&status=${status}`}
                  className="px-3 py-1.5 rounded-lg border border-[#E5DAC8] text-xs font-medium text-[#3D2B14] hover:bg-[#F7F3EC] transition"
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
