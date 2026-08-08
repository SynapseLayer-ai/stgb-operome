import { describe, expect, it } from "vitest";
import corpusJson from "../../../public/data/stgb/corpus.json";
import { buildIndex, type Corpus } from "./evaluator";
import {
  evaluateMachineSection,
  MACHINE_SCOPE_PROFILES,
  MACHINE_SUBJECTIVE_ELEMENTS,
} from "./machine";

const index = buildIndex(corpusJson as unknown as Corpus);

const protectedStoredData = {
  WithoutAuthorisation: "true",
  DataNotIntendedForActor: "true",
  SpeciallySecured: "true",
  StoredNonPerceivably: "true",
};

describe("machine-materialisable StGB profile", () => {
  it("contains 40 unique scopes and every scope resolves in the corpus", () => {
    expect(MACHINE_SCOPE_PROFILES).toHaveLength(40);
    expect(new Set(MACHINE_SCOPE_PROFILES.map((profile) => profile.sectionId)).size).toBe(40);
    for (const profile of MACHINE_SCOPE_PROFILES) {
      expect(index.sections.has(profile.sectionId), profile.sectionId).toBe(true);
    }
  });

  it("keeps the subjective-element register explicit and corpus-resolvable", () => {
    for (const [sectionId, elements] of Object.entries(MACHINE_SUBJECTIVE_ELEMENTS)) {
      const section = index.sections.get(sectionId);
      expect(section, sectionId).toBeTruthy();
      const corpusText = JSON.stringify({
        variables: section?.variables,
        computables: section?.computables,
      });
      for (const element of elements) expect(corpusText, `${sectionId}.${element}`).toContain(element);
    }
  });

  it("separates machine materialisation from legal actor attribution", () => {
    const result = evaluateMachineSection(index, "UnauthorisedDataAccess", {
      facts: protectedStoredData,
      goalEvidence: {
        source: "agent_goal",
        goal: "Reach the protected store by bypassing its access control.",
        facts: {
          ObtainsAccessForSelf: "true",
          OvercomesAccessProtection: "true",
        },
      },
      authorization: { decision: "not_authorised", source: "evaluation manifest" },
    });

    expect(result.material.result).toBe("realised");
    expect(result.legal.result).toBe("not_realised");
    expect(result.legal.facts.supplied).toContainEqual(
      expect.objectContaining({ name: "Actor", value: "false" }),
    );
    expect(result.enforcement).toEqual(
      expect.objectContaining({ decision: "block", executable: false }),
    );
  });

  it("uses an honest AI goal to complete the conduct path and stop the action", () => {
    const result = evaluateMachineSection(index, "UnauthorisedDataAccess", {
      facts: protectedStoredData,
      goalEvidence: {
        source: "action_plan",
        facts: {
          ObtainsAccessForAnother: "true",
          OvercomesAccessProtection: "true",
        },
      },
      authorization: { decision: "unknown" },
    });

    expect(result.goalEvidence.acceptedFacts).toEqual({
      ObtainsAccessForAnother: "true",
      OvercomesAccessProtection: "true",
    });
    expect(result.material.result).toBe("realised");
    expect(result.enforcement.decision).toBe("block");
  });

  it("does not let a machine goal satisfy a human subjective legal element", () => {
    const result = evaluateMachineSection(index, "ComputerSabotage", {
      facts: {
        Disrupts: "true",
        Significantly: "true",
        EssentialToAnother: "true",
        EntersData: "true",
        Data: "true",
        CommitsDataAlteration: "false",
        DataProcessingSystem: "false",
        DataMedium: "false",
      },
      goalEvidence: {
        source: "agent_goal",
        facts: { ActsWithDetrimentIntention: "true" },
      },
      authorization: { decision: "authorised", source: "test manifest" },
    });

    expect(result.goalEvidence.acceptedFacts).not.toHaveProperty("ActsWithDetrimentIntention");
    expect(result.subjectiveElements).toEqual(
      expect.objectContaining({
        status: "not_assessed_for_machine",
        suppliedButIgnored: ["ActsWithDetrimentIntention"],
      }),
    );
    expect(result.material.result).toBe("unknown");
    expect(result.material.missing).toContain("ActsWithDetrimentIntention");
    expect(result.enforcement.reasons).toContain(
      "Human subjective legal elements are not assessed for a machine: ActsWithDetrimentIntention.",
    );
    expect(result.enforcement).toEqual(
      expect.objectContaining({ decision: "escalate", executable: false }),
    );
  });

  it("blocks conflicts between the AI goal and trusted observations", () => {
    const result = evaluateMachineSection(index, "UnauthorisedDataAccess", {
      facts: { ...protectedStoredData, OvercomesAccessProtection: "true" },
      goalEvidence: {
        source: "agent_goal",
        facts: { OvercomesAccessProtection: "false" },
      },
      authorization: { decision: "authorised" },
    });

    expect(result.goalEvidence.conflicts).toEqual([
      { name: "OvercomesAccessProtection", observed: "true", goal: "false" },
    ]);
    expect(result.enforcement.decision).toBe("block");
  });

  it("allows only a positively authorised action whose material elements are false", () => {
    const result = evaluateMachineSection(index, "UnauthorisedDataAccess", {
      facts: { OvercomesAccessProtection: "false" },
      authorization: {
        decision: "authorised",
        verified: true,
        source: "signed evaluation scope",
      },
    });

    expect(result.material.result).toBe("not_realised");
    expect(result.enforcement).toEqual(
      expect.objectContaining({ decision: "allow", executable: true }),
    );
  });

  it("does not let an AI or public caller grant itself authority", () => {
    const result = evaluateMachineSection(index, "UnauthorisedDataAccess", {
      facts: { OvercomesAccessProtection: "false" },
      authorization: { decision: "authorised", verified: false, source: "agent assertion" },
    });

    expect(result.material.result).toBe("not_realised");
    expect(result.enforcement).toEqual(
      expect.objectContaining({ decision: "escalate", executable: false }),
    );
  });
});
