"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BREEDS = [
  "Angus", "Hereford", "Simmental", "Charolais", "Brahman", "Bonsmara",
  "Nguni", "Afrikaner", "Limousin", "Brangus", "Santa Gertrudis", "Drakensberger",
  "Tuli", "Beefmaster", "Simentaler", "Other",
];

export default function NewAnimalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    gender: "",
    dob: "",
    color: "",
    rfidTag: "",
    breedName: "",
    status: "ACTIVE",
    ownershipType: "OWNER",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.gender) {
      setError("Please select a gender.");
      return;
    }

    setLoading(true);
    try {
      // If a breed name is provided, create/find it first
      let breedId: string | null = null;
      if (form.breedName.trim()) {
        const breedRes = await fetch("/api/v1/breeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.breedName.trim() }),
        });
        if (breedRes.ok) {
          const breedData = await breedRes.json();
          breedId = breedData.data?.id ?? null;
        }
      }

      const res = await fetch("/api/v1/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          gender: form.gender,
          dob: form.dob || null,
          color: form.color.trim() || null,
          rfidTag: form.rfidTag.trim() || null,
          breedId,
          status: form.status,
          ownershipType: form.ownershipType,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add animal.");
        return;
      }

      router.push(`/animals/${data.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/animals"
          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Add Animal</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Register a new animal to your herd</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Basic Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Name <span className="text-[#64748B] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Bessie"
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="FEMALE">Female (Cow / Heifer)</option>
                <option value="MALE">Male (Bull / Steer)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Date of Birth <span className="text-[#64748B] font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Breed <span className="text-[#64748B] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                list="breed-list"
                value={form.breedName}
                onChange={(e) => set("breedName", e.target.value)}
                placeholder="e.g. Angus"
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
              <datalist id="breed-list">
                {BREEDS.map((b) => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Color / Markings <span className="text-[#64748B] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="e.g. Black, Red roan"
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                RFID Tag <span className="text-[#64748B] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.rfidTag}
                onChange={(e) => set("rfidTag", e.target.value)}
                placeholder="e.g. 982000123456789"
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Ownership */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Ownership & Status</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              >
                <option value="ACTIVE">Active</option>
                <option value="LOANED">Loaned</option>
                <option value="SOLD">Sold</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Ownership Type</label>
              <select
                value={form.ownershipType}
                onChange={(e) => set("ownershipType", e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
              >
                <option value="OWNER">Owner</option>
                <option value="SHARED_OWNERSHIP">Shared Ownership</option>
                <option value="BREEDING_LOAN">Breeding Loan</option>
                <option value="TEMPORARY_TRANSFER">Temporary Transfer</option>
                <option value="LEASE">Lease</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Notes <span className="text-[#64748B] font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes about this animal..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            href="/animals"
            className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !form.gender}
            className="px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-2"
          >
            {loading ? "Saving..." : "Add Animal"}
          </button>
        </div>
      </form>
    </div>
  );
}
