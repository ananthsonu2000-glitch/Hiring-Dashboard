import type { Role } from "@/types";

export interface RubricCriterion {
  criterion: string;
  weight: number;
  definition: string;
  jd_reference: string;
}

export interface Rubric {
  role: Role;
  title: string;
  source: string;
  total: number;
  criteria: RubricCriterion[];
}

/**
 * Section 1 patterns from the Kargo hiring analysis: traits across 8 prior
 * hires, independent of function. Used as pre-screen context (not scored
 * points) to inform interview-brief reasoning ("coachable bet" vs
 * "culture-fit risk"), per rubrics.txt Section 1 + NOTES.
 */
export const PRE_SCREEN_PATTERNS = [
  {
    name: "Unprompted ownership",
    description:
      "A bullet where the candidate spotted a problem no one assigned them and built the fix on their own initiative, unasked.",
  },
  {
    name: "Ground-level ops / freight exposure",
    description:
      "Direct freight-forwarding, port, or supply-chain floor experience, regardless of job title.",
  },
  {
    name: "Comfort operating with no senior layer above them",
    description:
      "Worked without a manager catching their mistakes — autonomy under ambiguity, not a matrixed or committee-driven environment.",
  },
] as const;

export const PM_RUBRIC: Rubric = {
  role: "PM",
  title: "Product Manager (PM)",
  source:
    "Kargo PM JD — first dedicated PM, one product, building the function from zero.",
  total: 100,
  criteria: [
    {
      criterion: "Shipping Track Record (shipped + killed, short cycles)",
      weight: 30,
      definition:
        "Concrete evidence of features shipped AND killed based on data, in cycles measured in weeks/months, not years.",
      jd_reference:
        '"shipped things, killed things, learned from both — preferably in short cycles."',
    },
    {
      criterion: "Zero-Structure / Ambiguity Comfort",
      weight: 25,
      definition:
        "Has built process (not just followed it) — created a template, ritual, or workflow that did not exist before, with no playbook to copy.",
      jd_reference:
        '"no PM handbook, no design system, no sprint template. You\'ll build those."',
    },
    {
      criterion: "Ground-Level Customer Discovery Instinct",
      weight: 20,
      definition:
        "Direct, hands-on engagement with end users in their environment (not just surveys/calls) — genuine curiosity about how the work happens.",
      jd_reference:
        '"spent time inside freight forwarding operations... in the rooms where the work actually happens."',
    },
    {
      criterion: "Direct Engineering Partnership",
      weight: 15,
      definition:
        "Worked engineer-to-PM (or as the engineer) to define scope and sequencing — not just handed requirements to a delivery layer.",
      jd_reference:
        '"working directly with the engineering team to define what gets built, in what order, and why."',
    },
    {
      criterion: "Operations / Logistics Domain Proximity",
      weight: 10,
      definition:
        "Prior exposure to freight, logistics, or comparably operations-heavy, field-driven businesses.",
      jd_reference:
        '"genuine curiosity about how operations work at ground level."',
    },
  ],
};

export const SPM_RUBRIC: Rubric = {
  role: "SPM",
  title: "Senior Product Manager (SPM)",
  source:
    "Kargo SPM JD — owns integration/data layer; most senior PM; shapes the function.",
  total: 100,
  criteria: [
    {
      criterion: "Ownership of a Complex / Platform Product Area",
      weight: 30,
      definition:
        "Owned a technically complex, integration-heavy, or platform-level product area end-to-end, with no senior PM layer above making the calls.",
      jd_reference:
        '"owning a product area without a layer of senior PMs above you... platform products, integration layers, complex existing technical environments."',
    },
    {
      criterion: "High-Stakes Decisions Under Ambiguity",
      weight: 25,
      definition:
        "Documented instances of making a consequential, non-reversible call alone and living with the outcome — not rubber-stamped by a committee.",
      jd_reference:
        '"proven ability to make calls in ambiguous situations and live with the consequences... there is no committee that approves product decisions."',
    },
    {
      criterion: "Early-Stage / Zero-Rules Operating Experience",
      weight: 20,
      definition:
        'Time at an early-stage company, OR clear evidence of building where "the rules were not written yet," independent of company stage.',
      jd_reference:
        '"time spent at an early-stage company, or strong evidence that you have operated in environments where the rules were not written yet."',
    },
    {
      criterion: "Logistics / Supply-Chain Domain Fluency",
      weight: 15,
      definition:
        "Working familiarity with operations-heavy industries — logistics, supply chain, ports, or adjacent — a genuine edge, not a bonus line.",
      jd_reference: '"a genuine advantage here, not a nice-to-have."',
    },
    {
      criterion: "Function-Building & Standard-Setting",
      weight: 10,
      definition:
        "Evidence of defining practices, frameworks, or a bar for others to follow — not just doing the work, but shaping how it gets done.",
      jd_reference:
        '"helping define the practices, decision frameworks, and ways of working the PM function will run on as Kargo grows."',
    },
  ],
};

export function getRubric(role: Role): Rubric {
  return role === "PM" ? PM_RUBRIC : SPM_RUBRIC;
}

/** Recommendation thresholds, applied to the rubric percentage. */
export const RECOMMENDATION_THRESHOLDS = {
  strongInterview: 85,
  interview: 70,
  borderline: 50,
} as const;

export function recommendationFromPercentage(
  percentage: number
): "Strong Interview" | "Interview" | "Borderline" | "Reject" {
  if (percentage >= RECOMMENDATION_THRESHOLDS.strongInterview)
    return "Strong Interview";
  if (percentage >= RECOMMENDATION_THRESHOLDS.interview) return "Interview";
  if (percentage >= RECOMMENDATION_THRESHOLDS.borderline) return "Borderline";
  return "Reject";
}
