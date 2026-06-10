# corpus.json schema and expression dialect

## Shape

```
{ version, provenance: { sources: [{file, sha256}], counts },
  sections: [ { id, ref, chapter, title_en, provenance_de, composite, condition,
                variables: [{name, type, surface}], computables: {name: expression},
                rules: [{id, actor, body}], markup, flags: [{title, text}] } ] }
```

`markup` uses this notation: `{Name}` input variable, `[Name]` computable, `«if expr» ... «end if»`
conditional block, `~~text~~` struck in the markup (penalties, attempt, grading, excluded
material). `condition` is the scope's evaluable composite expression.

## Expression grammar

```
expr       := term (("and" | "or") term)*
term       := ["not"] (comparison | ident ["is true" | "is false"] | "(" expr ")")
comparison := operand ("<" | "<=" | ">" | ">=" | "=" | "!=") operand
operand    := ident | integer
```

`X` alone means `X is true`. Identifiers resolve to the section's computables first, then to the
supplied facts; anything unresolved is unknown.

## Semantics (Kleene K3, three-valued)

Values are `true`, `false`, `unknown`. `and`: false dominates, then unknown. `or`: true dominates,
then unknown. `not unknown` is unknown. `X is false` over unknown is unknown. Comparisons over
unknown or non-numeric operands evaluate to unknown; numeric variables accept numeric strings as
facts. Evaluation is pure: the same facts always produce the same result.

Results map as: composite true → `realised`, false → `not_realised`, otherwise `unknown`.

## Conformance

An implementation conforms when it passes every vector in `tests.json` (3,033 vectors).
`scripts/reference_evaluator.py` is the reference implementation.
