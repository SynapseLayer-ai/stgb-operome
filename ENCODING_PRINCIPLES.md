# Encoding principles

These are the principles under which the corpus was compiled. They describe what a correct
encoding looks like; they are deliberately not the operational procedure by which encodings are
produced.

## Selection

Provisions were selected on two criteria: conduct definitions we consider universally accepted or
directly relevant to the conduct of AI systems, and offences an AI cannot itself commit but can
recognise when humans commit them, because identification has protective value of its own.
Provisions outside both criteria were excluded and are listed as Excluded in the review documents.

## What compiles

The objective Tatbestand compiles: the elements of the prohibited conduct that have edges and can
be checked. Codified exceptions compile as conditional structure, carried as separate rules and
never folded into offence elements. Definitions compile once and are consumed by name wherever the
statute references them.

## What is struck

Penalties and sentencing machinery, attempt provisions, procedural rules, grading and
particularly-serious-case machinery, and sentencing discretion are struck in every section,
regardless of how the source presents them. Every strike is visible as struck text in the review
documents; nothing is silently omitted.

## What is retained against the default

Mental elements are generally excluded as not decidable at the moment of action. An intent element
is retained only where it is the sole element separating the offence from innocuous conduct, as in
the enrichment-or-harm intent of section 202d, and each retention is recorded in the section's
rules.

## Escalation, not pretence

Evaluative and interpretive elements do not compile and are not meant to: requiredness in
self-defence, the balancing of interests in necessity, good morals in consent, expected acceptance
of danger. The structure around them compiles; the threshold itself is flagged as evaluative
residue and escalates to human judgment. The strength of the method is knowing which part of the
law compiles and which does not.

## The actor convention

The corpus does not redefine the statute's actor. Offence definitions keep the statutory "whoever"; 
an artificial agent is bound through the authored master rule, which requires it never to realise an 
offence definition itself and to contribute to preventing their realisation. In evaluation, the agent 
substitutes its own proposed act into the actor position. Nothing here assumes a machine can bear 
guilt; only that its conduct can be tested against definitions written for anyone's conduct.
Generic, unqualified person-objects fold into the conduct predicate: "kills a person" is one variable, 
because "another person" carries no decision content of its own. A person-term becomes its own variable 
exactly where the statute qualifies it with something checkable: age, a care relationship, office, 
kinship. The test is whether the term can independently change the outcome; if it cannot, a separate 
variable would be noise.

## Declared transformations

A small number of rules are deliberately transformed or authored. Each is a design decision, made
visibly, and disclosed here by name:

- **Section 13** is replaced by an authored master rule: an artificial intelligence must always
  contribute to preventing the realisation of an offence definition of these rules, and must not
  itself realise one, except through the exception acts (sections 32, 34, 228), limited by the
  section 35 counter-exception.
- **Section 35** strikes the statutory excuse and repurposes its limiting sentence as the general
  counter-exception: the exception acts do not avail an actor expected to accept the danger, in
  particular one who caused it or who stands in a special legal relationship.
- **Section 157** is converted from a sentencing-mitigation rule into an exception to the testimony
  offences.
- **Section 218** excludes the base offence and encodes the edited paragraph 2: termination against
  the will of the pregnant woman, or with reckless endangerment of her life or health.
- **Section 11** generalises the public-official definition beyond German law ("under the law
  applicable to that person") and extends it to similar institutions of national or international
  law.
- **Section 221** keeps the paragraph 2 qualification circumstances live, recorded separately and
  not gating the base offence.
- **Section 202c** keeps the section 149(2),(3) active-repentance reference live, resolving as an
  input.

If you believe a transformation is wrong, open an encoding challenge. That is what this repository
is for.
