# Graph Report - AIOStreams  (2026-09-06)

## Corpus Check
- 1099 files · ~907,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 33 nodes · 40 edges · 6 communities (4 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cea57035`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- format-zod-error.ts
- languages.ts
- getLanguageDisplayName
- findEntryByCode
- graphify.js
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `getLanguageDisplayName()` - 5 edges
2. `findEntryByCode()` - 4 edges
3. `formatIssues()` - 3 edges
4. `computeLanguageCode()` - 3 edges
5. `normaliseLanguage()` - 3 edges
6. `toSupportedLanguage()` - 3 edges
7. `formatIssue()` - 2 edges
8. `formatZodError()` - 2 edges
9. `convertLangCodeToName()` - 2 edges
10. `iso6391ToLanguage()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `toSupportedLanguage()` --calls--> `getLanguageDisplayName()`  [EXTRACTED]
  packages/core/src/utils/languages.ts → packages/core/src/utils/languages.ts  _Bridges community 2 → community 3_

## Import Cycles
- None detected.

## Communities (6 total, 2 thin omitted)

### Community 0 - "format-zod-error.ts"
Cohesion: 0.47
Nodes (5): formatIssue(), formatIssues(), formatZodError(), FormatZodErrorOptions, ZodIssue

### Community 1 - "languages.ts"
Cohesion: 0.17
Nodes (7): AMBIGIOUS_LANGUAGES, ENTRY_BY_NAME, LANGUAGE_ALIAS_MAP, LANGUAGE_BY_NAME, LANGUAGE_CODE_CACHE, languageEmojiMap, REGION_ALIASES

### Community 2 - "getLanguageDisplayName"
Cohesion: 0.40
Nodes (5): computeLanguageCode(), convertLangCodeToName(), getLanguageDisplayName(), iso6391ToLanguage(), languageToCode()

### Community 3 - "findEntryByCode"
Cohesion: 0.40
Nodes (5): findEntryByCode(), mapLanguageCode(), normaliseLangCode(), normaliseLanguage(), toSupportedLanguage()

## Knowledge Gaps
- **10 isolated node(s):** `graphify`, `FormatZodErrorOptions`, `ZodIssue`, `AMBIGIOUS_LANGUAGES`, `ENTRY_BY_NAME` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 17 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getLanguageDisplayName()` connect `getLanguageDisplayName` to `languages.ts`, `findEntryByCode`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `findEntryByCode()` connect `findEntryByCode` to `languages.ts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `graphify`, `FormatZodErrorOptions`, `ZodIssue` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._