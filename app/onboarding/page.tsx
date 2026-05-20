"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COUNTRIES = [
  "South Africa",
  "Namibia",
  "Botswana",
  "Zimbabwe",
  "Zambia",
  "Kenya",
  "Tanzania",
  "Uganda",
  "Ethiopia",
  "Nigeria",
  "Ghana",
  "Australia",
  "New Zealand",
  "United States",
  "Canada",
  "United Kingdom",
  "Argentina",
  "Brazil",
  "Uruguay",
  "Other",
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();

  const [farmName, setFarmName] = useState("");
  const [slug, setSlug] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-derive slug from farm name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(farmName));
    }
  }, [farmName, slugEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmName, slug, country }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create farm. Please try again.");
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set up your farm
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Let&apos;s get your HerdCore farm profile ready
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-7">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Account</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">2</span>
              </div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Farm Details</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-500">3</span>
              </div>
              <span className="text-xs font-medium text-gray-400">Dashboard</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="farmName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Farm name
              </label>
              <input
                id="farmName"
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="Green Valley Farm"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Farm URL slug
              </label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition">
                <span className="inline-flex items-center px-3 bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  herdcore.app/
                </span>
                <input
                  id="slug"
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                  placeholder="green-valley-farm"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !farmName.trim() || !slug.trim()}
              className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {loading ? "Creating farm..." : "Create farm & continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
