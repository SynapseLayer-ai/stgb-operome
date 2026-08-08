import { readFileSync } from "node:fs";

import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

import { MACHINE_SCOPE_PROFILES, MACHINE_SUBJECTIVE_ELEMENTS } from "@/lib/stgb/machine";

const xsdPath = new URL(
  "../../operome/source/stgb_machine/StGB_Machine_Enforcement_v1.xsd",
  import.meta.url,
);

function machineProfilesFromXsd() {
  const xml = readFileSync(xsdPath, "utf8");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(document.getElementsByTagName("MachineProfile")).map((node) => ({
    sectionId: node.getAttribute("sectionId") ?? "",
    stgbRef: node.getAttribute("stgbRef") ?? "",
    capabilities: (node.getAttribute("capabilities") ?? "").split(/\s+/).filter(Boolean),
    materialisation: node.getAttribute("materialisation") ?? "",
    rationale: Array.from(node.getElementsByTagName("Rationale"))[0]?.textContent?.trim() ?? "",
    subjectiveElements: Array.from(node.getElementsByTagName("SubjectiveElement")).map(
      (element) => element.getAttribute("name") ?? "",
    ),
  }));
}

describe("StGB machine-enforcement operome", () => {
  it("keeps the derived XSD profile catalogue synchronized with the runtime", () => {
    const profiles = machineProfilesFromXsd();

    expect(profiles).toHaveLength(40);
    expect(
      profiles.map(({ sectionId, capabilities, materialisation, rationale }) => ({
        sectionId,
        capabilities,
        materialisation,
        rationale,
      })),
    ).toEqual(MACHINE_SCOPE_PROFILES);
  });

  it("keeps the explicit human-subjective register synchronized with the runtime", () => {
    const fromXsd = Object.fromEntries(
      machineProfilesFromXsd()
        .filter((profile) => profile.subjectiveElements.length > 0)
        .map((profile) => [profile.sectionId, profile.subjectiveElements]),
    );

    expect(fromXsd).toEqual(MACHINE_SUBJECTIVE_ELEMENTS);
  });
});
