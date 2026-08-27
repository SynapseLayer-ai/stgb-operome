# German source snapshot

`2026-08-27/xml.zip` is the official complete XML distribution downloaded from
[gesetze-im-internet.de](https://www.gesetze-im-internet.de/stgb/) on 27 August 2026.
The XML identifies the consolidated text as last amended on 20 March 2026, matching the source
date pinned for this Operome release.

The ZIP is retained byte-for-byte. Its URL, SHA-256, XML member, official build timestamp and
consolidation statement are recorded in `2026-08-27/manifest.json`. This is the canonical German
source for the derived discovery index in `corpus/german-search.json`.

Regenerate or verify the index without a network connection:

```text
python scripts/build_german_search.py
python scripts/build_german_search.py --verify
```

The German text is provided for provenance and discovery. The XSD substrates remain the
authoritative executable layer, and the official German publication remains authoritative law.
