# Contributing

This corpus is a discussion draft and the review is the point. Three ways in:

**Encoding challenge.** You believe a section is encoded wrongly: an element missed, a strike that
should be live, a transformation you contest. Cite the section, the German text, and the rule or
variable at issue. The German text governs the argument.

**Translation correction.** The English layer is an unofficial machine translation. If a surface
form or source rendering is wrong, propose the correction with the German alongside.

**Loophole report.** You found a fact pattern the structure decides wrongly or fails to escalate.
Provide the section, the facts as a variables assignment, the result you got and the result you
believe is right.

Use the issue templates. Changes to `corpus/corpus.json` are never accepted directly; change the
substrate, regenerate with `scripts/xsd_to_json.py`, and CI must pass.
