import {
  evaluateMaterialElements,
  evaluateSection,
  type CorpusIndex,
  type EvalResult,
  type FactMap,
} from "@/lib/stgb/evaluator";

export type MachineCapability =
  | "network"
  | "data"
  | "code_execution"
  | "filesystem"
  | "communications"
  | "publication"
  | "payments"
  | "platform"
  | "election_system"
  | "coordination"
  | "omission_monitor";

export type MaterialisationKind = "direct" | "mediated" | "omission";

export interface MachineScopeProfile {
  sectionId: string;
  capabilities: MachineCapability[];
  materialisation: MaterialisationKind;
  rationale: string;
}

const p = (
  sectionId: string,
  capabilities: MachineCapability[],
  materialisation: MaterialisationKind,
  rationale: string,
): MachineScopeProfile => ({ sectionId, capabilities, materialisation, rationale });

/**
 * Capability-addressable scopes selected from the current 105-section StGB
 * corpus. Inclusion means that an AI can perform a material conduct element
 * using ordinary digital tools. It does not mean that the AI is a legal
 * offender, or that every use of the capability realises the offence.
 */
export const MACHINE_SCOPE_PROFILES: readonly MachineScopeProfile[] = [
  // Network, data and systems.
  p(
    "UnauthorisedDataAccess",
    ["network", "data"],
    "direct",
    "A machine can obtain access to protected data through network or system calls.",
  ),
  p(
    "InterceptionOfData",
    ["network", "data"],
    "direct",
    "A machine can technically capture non-public data transmissions.",
  ),
  p(
    "PreparationOfDataAccess",
    ["network", "data", "code_execution"],
    "direct",
    "A machine can produce, obtain or share credentials and offence-purpose programs.",
  ),
  p(
    "HandlingUnlawfullyObtainedData",
    ["network", "data"],
    "direct",
    "A machine can procure, transmit or expose unlawfully obtained non-public data.",
  ),
  p(
    "ComputerFraud",
    ["network", "code_execution"],
    "direct",
    "A machine can manipulate data processing through programs, data or credentials.",
  ),
  p(
    "DataAlteration",
    ["filesystem", "data", "code_execution"],
    "direct",
    "A machine can delete, suppress, disable or alter data.",
  ),
  p(
    "ComputerSabotage",
    ["network", "filesystem", "code_execution"],
    "direct",
    "A machine can significantly disrupt important data processing.",
  ),
  p(
    "DisruptionOfTelecommunications",
    ["network", "code_execution"],
    "direct",
    "A machine can disable or endanger telecommunications operation.",
  ),
  p(
    "ForgeryOfDocuments",
    ["filesystem", "publication"],
    "direct",
    "A machine can create, alter and use electronic documents.",
  ),
  p(
    "ObstructionOfJustice",
    ["filesystem", "data", "communications"],
    "mediated",
    "A machine can destroy evidence, conceal records or mislead an investigation.",
  ),

  // Communications and content.
  p(
    "Coercion",
    ["communications"],
    "mediated",
    "A machine can issue a threat intended to compel a person.",
  ),
  p("Threat", ["communications"], "direct", "A machine can transmit a threatening communication."),
  p(
    "Extortion",
    ["communications", "payments"],
    "mediated",
    "A machine can demand value while issuing a threat.",
  ),
  p(
    "Fraud",
    ["communications", "publication"],
    "mediated",
    "A machine can make deceptive factual representations to a person.",
  ),
  p(
    "PublicIncitement",
    ["publication", "communications"],
    "direct",
    "A machine can publish an incitement to an unlawful act.",
  ),
  p(
    "DisseminationOfPersonalData",
    ["publication", "data"],
    "direct",
    "A machine can disseminate personal data in a dangerous manner.",
  ),
  p(
    "InstructionsForOffences",
    ["publication", "communications"],
    "direct",
    "A machine can create or publish instructions intended to promote offences.",
  ),
  p(
    "RewardingAndCondoningOffences",
    ["publication", "communications"],
    "direct",
    "A machine can publicly reward or condone specified offences.",
  ),
  p(
    "DeceptionOfVoters",
    ["publication", "communications"],
    "mediated",
    "A machine can deliver deceptive election communications.",
  ),
  p(
    "InducementToFalseStatement",
    ["communications"],
    "mediated",
    "A machine can attempt to induce a person to give a false statement.",
  ),
  p(
    "SexualAbuseOfChildrenWithoutContact",
    ["communications"],
    "mediated",
    "A machine can conduct prohibited non-contact communications with a child.",
  ),
  p(
    "PreparationOfSexualAbuseOfChildren",
    ["communications", "publication"],
    "mediated",
    "A machine can carry out prohibited preparatory communications.",
  ),
  p(
    "InstructionsForSexualAbuseOfChildren",
    ["publication", "data"],
    "direct",
    "A machine can possess or disseminate prohibited instructional content.",
  ),
  p(
    "PromotionOfSexualActsOfMinors",
    ["communications", "platform"],
    "mediated",
    "A machine can facilitate or arrange prohibited conduct through a platform.",
  ),
  p(
    "ViolentOrAnimalPornography",
    ["publication", "data"],
    "direct",
    "A machine can acquire, store or disseminate prohibited content.",
  ),
  p(
    "ChildPornographyOffences",
    ["publication", "data"],
    "direct",
    "A machine can acquire, store, produce or disseminate prohibited content.",
  ),
  p(
    "YouthPornographyOffences",
    ["publication", "data"],
    "direct",
    "A machine can acquire, store, produce or disseminate prohibited content.",
  ),
  p(
    "PornographicPerformances",
    ["communications", "platform"],
    "mediated",
    "A machine can organise or operate access to a prohibited performance.",
  ),

  // Payments, assets and platforms.
  p(
    "BriberyOfVoters",
    ["communications", "payments"],
    "mediated",
    "A machine can offer or transfer a benefit to influence a voter.",
  ),
  p(
    "BriberyOfElectedRepresentatives",
    ["communications", "payments"],
    "mediated",
    "A machine can offer or transfer an unjustified advantage.",
  ),
  p(
    "CriminalTradingPlatforms",
    ["platform", "code_execution"],
    "direct",
    "A machine can deploy or operate virtual trading infrastructure.",
  ),
  p(
    "AssistanceAfterTheFact",
    ["data", "payments", "communications"],
    "mediated",
    "A machine can help secure benefits obtained through another offence.",
  ),
  p(
    "MoneyLaundering",
    ["payments", "data"],
    "direct",
    "A machine with asset authority can move, conceal or process criminal proceeds.",
  ),

  // Election systems.
  p(
    "ObstructionOfElection",
    ["election_system", "network"],
    "direct",
    "A machine can disrupt digital election processes.",
  ),
  p(
    "ElectoralFraud",
    ["election_system", "data"],
    "direct",
    "A machine can cast, suppress or manipulate digital voting records.",
  ),
  p(
    "FalsificationOfElectionDocuments",
    ["election_system", "filesystem"],
    "direct",
    "A machine can create or alter electronic election documents.",
  ),
  p(
    "BreachOfElectoralSecrecy",
    ["election_system", "data"],
    "direct",
    "A machine can expose protected voting information.",
  ),

  // Coordination and omission.
  p(
    "CriminalOrganisations",
    ["coordination", "communications"],
    "mediated",
    "A machine can coordinate or support an organisation through communications and resources.",
  ),
  p(
    "TerroristOrganisations",
    ["coordination", "communications"],
    "mediated",
    "A machine can coordinate or support an organisation through communications and resources.",
  ),
  p(
    "FailureToReportPlannedOffences",
    ["omission_monitor", "communications"],
    "omission",
    "A supervisory machine can detect a reportable plan and fail to escalate it.",
  ),
] as const;

/**
 * Human subjective legal elements present in the machine-selected scopes.
 * A machine goal, action plan or observation may never satisfy these source
 * predicates. They remain part of the legal substrate and are reported as
 * `not_assessed_for_machine`; the enforcement decision instead relies on
 * conduct, circumstances, effects and external authorization.
 *
 * This is an explicit, reviewable register rather than a name heuristic.
 */
export const MACHINE_SUBJECTIVE_ELEMENTS: Readonly<Record<string, readonly string[]>> = {
  HandlingUnlawfullyObtainedData: [
    "IntentToEnrichSelf",
    "IntentToEnrichThirdParty",
    "IntentToHarmAnother",
  ],
  ComputerFraud: ["ActsWithAdvantageIntention"],
  ComputerSabotage: ["ActsWithDetrimentIntention"],
  ForgeryOfDocuments: ["ActsToDeceiveInLegalTransactions"],
  ObstructionOfJustice: ["Intentionally", "Knowingly"],
  Threat: ["AgainstBetterKnowledge"],
  Extortion: ["ActsWithEnrichmentIntention"],
  Fraud: ["ActsWithAdvantageIntention"],
  InstructionsForOffences: ["ActsToAwakenReadiness", "ActsToPromoteReadiness"],
  ViolentOrAnimalPornography: ["EnableAnotherUse", "ForUseUnderPoint1"],
  ChildPornographyOffences: [
    "EnableAnotherUse",
    "ForUseUnderPoint1",
    "ForUseUnderPoint2",
  ],
  YouthPornographyOffences: [
    "EnableAnotherUse",
    "ForUseUnderPoint1",
    "ForUseUnderPoint2",
  ],
  AssistanceAfterTheFact: ["ActsWithSecuringIntention"],
  MoneyLaundering: ["ActsWithPreventionIntention", "KnewOriginAtAcquisition"],
  FalsificationOfElectionDocuments: ["KnowsEntitlementToVote", "KnowsNoEntitlementToEntry"],
  BreachOfElectoralSecrecy: ["ActsWithKnowledgeIntention"],
  FailureToReportPlannedOffences: ["LearnsCredibly"],
};

const MACHINE_SCOPES = new Map(
  MACHINE_SCOPE_PROFILES.map((profile) => [profile.sectionId, profile]),
);

export type GoalEvidenceSource =
  | "agent_goal"
  | "action_plan"
  | "orchestrator_goal"
  | "trusted_monitor";

export type AuthorizationDecision = "authorised" | "not_authorised" | "unknown";

export interface MachineGoalEvidence {
  /** Raw goal is retained for provenance; the deterministic evaluator does not parse it. */
  goal?: string;
  /** Exact section-variable assignments derived from the goal or action plan. */
  facts?: FactMap;
  source: GoalEvidenceSource;
}

export interface MachineAuthorization {
  decision: AuthorizationDecision;
  /** Set only by a trusted capability broker after verifying its authority artifact. */
  verified?: boolean;
  source?: string;
  scope?: string;
}

export interface MachineEvalInput {
  /** Facts supplied by trusted action, system and environment adapters. */
  facts?: FactMap;
  /** Structured evidence supplied by the AI goal or its proposed action plan. */
  goalEvidence?: MachineGoalEvidence;
  /** Positive authority is required before an action can be allowed. */
  authorization?: MachineAuthorization;
}

export interface MachineFactConflict {
  name: string;
  observed: string;
  goal: string;
}

export interface MachineEvalResult {
  section: { id: string; ref: string; title_en: string };
  profile: MachineScopeProfile;
  /** Source-faithful attribution result with Actor fixed to false for the AI. */
  legal: EvalResult;
  /** Conduct/circumstance evaluation without the natural-person actor gate. */
  material: EvalResult;
  goalEvidence: {
    source: GoalEvidenceSource | null;
    goal: string | null;
    acceptedFacts: FactMap;
    rejectedFacts: string[];
    conflicts: MachineFactConflict[];
  };
  subjectiveElements: {
    status: "not_assessed_for_machine";
    elements: { name: string; surface: string }[];
    /** Values offered by either the machine plan or an observer and deliberately ignored. */
    suppliedButIgnored: string[];
  };
  authorization: MachineAuthorization;
  enforcement: {
    decision: "allow" | "block" | "escalate";
    executable: boolean;
    reasons: string[];
  };
}

export function getMachineScopeProfile(sectionId: string): MachineScopeProfile | undefined {
  return MACHINE_SCOPES.get(sectionId);
}

/**
 * Evaluate a proposed machine action. Unknown is fail-closed: `escalate`
 * means the action is not executable until the missing facts or authority are
 * resolved. Agent-declared goal facts can describe planned conduct, but can
 * never satisfy human subjective legal elements, create authority or override
 * conflicting observed facts.
 */
export function evaluateMachineSection(
  index: CorpusIndex,
  sectionId: string,
  input: MachineEvalInput = {},
): MachineEvalResult {
  const section = index.sections.get(sectionId);
  if (!section) throw new Error(`Unknown section: ${sectionId}`);
  const profile = getMachineScopeProfile(sectionId);
  if (!profile)
    throw new Error(`Section is not in the machine-materialisable profile: ${sectionId}`);

  const subjectiveNames = new Set(MACHINE_SUBJECTIVE_ELEMENTS[sectionId] ?? []);
  const suppliedButIgnored = new Set<string>();
  const observed: FactMap = {};
  for (const [name, value] of Object.entries(input.facts ?? {})) {
    if (subjectiveNames.has(name)) suppliedButIgnored.add(name);
    else observed[name] = value;
  }
  const declaredNames = new Set(
    section.variables.filter((v) => v.type !== "Reference").map((v) => v.name),
  );
  const acceptedFacts: FactMap = {};
  const rejectedFacts: string[] = [];
  const conflicts: MachineFactConflict[] = [];

  for (const [name, value] of Object.entries(input.goalEvidence?.facts ?? {})) {
    if (subjectiveNames.has(name)) {
      suppliedButIgnored.add(name);
      continue;
    }
    if (!declaredNames.has(name)) {
      rejectedFacts.push(name);
      continue;
    }
    if (observed[name] !== undefined && observed[name] !== value) {
      conflicts.push({ name, observed: observed[name], goal: value });
      continue;
    }
    acceptedFacts[name] = value;
  }

  // Observed facts have precedence. Goal facts may fill open elements only.
  const merged: FactMap = { ...acceptedFacts, ...observed };
  const material = evaluateMaterialElements(index, sectionId, merged);

  // Preserve legal attribution separately. An AI is not smuggled through the
  // source-derived Reference actor gate as though it were a natural person.
  const actorFacts = Object.fromEntries(
    section.variables.filter((v) => v.type === "Reference").map((v) => [v.name, "false"]),
  );
  const legal = evaluateSection(index, sectionId, { ...merged, ...actorFacts });
  const authorization: MachineAuthorization = input.authorization ?? {
    decision: "unknown",
    verified: false,
  };
  const positivelyAuthorised =
    authorization.decision === "authorised" && authorization.verified === true;
  const reasons: string[] = [];

  let decision: "allow" | "block" | "escalate";
  if (conflicts.length > 0) {
    decision = "block";
    reasons.push("Goal evidence conflicts with trusted observed facts.");
  } else if (rejectedFacts.length > 0) {
    decision = "block";
    reasons.push("Goal evidence contains facts outside the selected section contract.");
  } else if (authorization.decision === "not_authorised") {
    decision = "block";
    reasons.push("The proposed action is not authorised for this run and scope.");
  } else if (material.result === "realised") {
    decision = "block";
    reasons.push("The proposed action materialises the selected StGB conduct elements.");
  } else if (material.result === "unknown") {
    decision = "escalate";
    const openSubjective = material.missing.filter((name) => subjectiveNames.has(name));
    const openMaterial = material.missing.filter((name) => !subjectiveNames.has(name));
    if (openSubjective.length > 0) {
      reasons.push(
        `Human subjective legal elements are not assessed for a machine: ${openSubjective.join(", ")}.`,
      );
    }
    if (openMaterial.length > 0) {
      reasons.push(`Pivotal material facts remain unresolved: ${openMaterial.join(", ")}.`);
    }
  } else if (!positivelyAuthorised) {
    decision = "escalate";
    reasons.push("Positive authorization has not been verified by a trusted capability broker.");
  } else {
    decision = "allow";
    reasons.push(
      "The selected material elements are not realised and positive authorization is established.",
    );
  }

  return {
    section: { id: section.id, ref: section.ref, title_en: section.title_en },
    profile,
    legal,
    material,
    goalEvidence: {
      source: input.goalEvidence?.source ?? null,
      goal: input.goalEvidence?.goal ?? null,
      acceptedFacts,
      rejectedFacts: rejectedFacts.sort(),
      conflicts,
    },
    subjectiveElements: {
      status: "not_assessed_for_machine",
      elements: [...subjectiveNames]
        .map((name) => ({
          name,
          surface: section.variables.find((variable) => variable.name === name)?.surface ?? "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      suppliedButIgnored: [...suppliedButIgnored].sort(),
    },
    authorization,
    enforcement: {
      decision,
      executable: decision === "allow",
      reasons,
    },
  };
}
