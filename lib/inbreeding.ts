import { db } from "@/lib/db";

export type RiskLevel = "safe" | "moderate" | "high" | "critical";

export interface InbreedingResult {
  riskLevel: RiskLevel;
  coefficient: number;
  sharedAncestors: SharedAncestor[];
}

interface SharedAncestor {
  id: string;
  registrationNo: string;
  name: string | null;
  contribution: number;
}

interface AncestorPathMap {
  // ancestorId -> array of path lengths from the subject to that ancestor
  [ancestorId: string]: number[];
}

/**
 * Recursively builds a map of ancestor IDs to their generation distances
 * from the starting animal. Traverses up to `maxGenerations` levels.
 */
async function buildAncestorMap(
  animalId: string,
  generation: number,
  maxGenerations: number,
  pathMap: AncestorPathMap = {}
): Promise<AncestorPathMap> {
  if (generation > maxGenerations) return pathMap;

  const animal = await db.animal.findUnique({
    where: { id: animalId },
    select: { id: true, motherId: true, fatherId: true },
  });

  if (!animal) return pathMap;

  // Record this animal as an ancestor at this generation depth
  if (!pathMap[animalId]) {
    pathMap[animalId] = [];
  }
  pathMap[animalId].push(generation);

  const parentPromises: Promise<AncestorPathMap>[] = [];

  if (animal.motherId) {
    parentPromises.push(
      buildAncestorMap(animal.motherId, generation + 1, maxGenerations, pathMap)
    );
  }

  if (animal.fatherId) {
    parentPromises.push(
      buildAncestorMap(animal.fatherId, generation + 1, maxGenerations, pathMap)
    );
  }

  await Promise.all(parentPromises);

  return pathMap;
}

/**
 * Wright's inbreeding coefficient calculation.
 *
 * F = Σ (0.5)^(L1 + L2 + 1)
 *
 * Where:
 *   L1 = number of generations from sire to common ancestor
 *   L2 = number of generations from dam to common ancestor
 *
 * For each shared ancestor A, we sum over all distinct path combinations
 * (one path through the sire side, one through the dam side).
 *
 * @param sireId  UUID of the proposed sire
 * @param damId   UUID of the proposed dam
 * @returns       InbreedingResult with coefficient, risk level, and shared ancestors
 */
export async function checkInbreeding(
  sireId: string,
  damId: string
): Promise<InbreedingResult> {
  const MAX_GENERATIONS = 6;

  // Build ancestor maps for both animals
  // We start at generation 1 because the parents of the sire/dam are at generation 1
  const [sireAncestors, damAncestors] = await Promise.all([
    buildAncestorMap(sireId, 1, MAX_GENERATIONS),
    buildAncestorMap(damId, 1, MAX_GENERATIONS),
  ]);

  // Find common ancestors (intersection of both maps)
  const sireAncestorIds = new Set(Object.keys(sireAncestors));
  const commonAncestorIds = Object.keys(damAncestors).filter((id) =>
    sireAncestorIds.has(id)
  );

  if (commonAncestorIds.length === 0) {
    return {
      riskLevel: "safe",
      coefficient: 0,
      sharedAncestors: [],
    };
  }

  // Fetch ancestor details in one query
  const ancestorDetails = await db.animal.findMany({
    where: { id: { in: commonAncestorIds } },
    select: { id: true, registrationNo: true, name: true },
  });

  const ancestorMap = new Map(ancestorDetails.map((a) => [a.id, a]));

  // Calculate Wright's F coefficient
  let totalF = 0;
  const sharedAncestors: SharedAncestor[] = [];

  for (const ancestorId of commonAncestorIds) {
    const sirePathLengths = sireAncestors[ancestorId];
    const damPathLengths = damAncestors[ancestorId];

    let ancestorContribution = 0;

    // Sum over all path combinations (L1 from sire side, L2 from dam side)
    for (const L1 of sirePathLengths) {
      for (const L2 of damPathLengths) {
        // Wright's formula: (0.5)^(L1 + L2 + 1)
        const pathContribution = Math.pow(0.5, L1 + L2 + 1);
        ancestorContribution += pathContribution;
      }
    }

    totalF += ancestorContribution;

    const details = ancestorMap.get(ancestorId);
    if (details) {
      sharedAncestors.push({
        id: ancestorId,
        registrationNo: details.registrationNo,
        name: details.name,
        contribution: ancestorContribution,
      });
    }
  }

  // Sort by contribution descending
  sharedAncestors.sort((a, b) => b.contribution - a.contribution);

  // Cap at 1.0 (theoretical maximum)
  const coefficient = Math.min(totalF, 1.0);

  // Map to risk levels
  // Standard thresholds used in livestock breeding:
  //   <0.0625 (< 6.25%) : safe (equivalent to first cousins or less)
  //   <0.125  (< 12.5%) : moderate (half-sibling equivalent)
  //   <0.25   (< 25%)   : high (parent-offspring or full-sibling equivalent)
  //   ≥0.25   (≥ 25%)   : critical
  let riskLevel: RiskLevel;

  if (coefficient < 0.0625) {
    riskLevel = "safe";
  } else if (coefficient < 0.125) {
    riskLevel = "moderate";
  } else if (coefficient < 0.25) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  return {
    riskLevel,
    coefficient,
    sharedAncestors,
  };
}
