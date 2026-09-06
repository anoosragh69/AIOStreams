# Graph Report - AIOStreams  (2026-09-04)

## Corpus Check
- 1099 files · ~907,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 28 nodes · 37 edges · 4 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `304a5883`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- format-zod-error.ts
- languages.ts
- getLanguageDisplayName
- findEntryByCode

## God Nodes (most connected - your core abstractions)
1. `getLanguageDisplayName()` - 5 edges
2. `findEntryByCode()` - 4 edges
3. `toSupportedLanguage()` - 3 edges
4. `normaliseLanguage()` - 3 edges
5. `computeLanguageCode()` - 3 edges
6. `formatIssues()` - 3 edges
7. `normaliseLangCode()` - 2 edges
8. `mapLanguageCode()` - 2 edges
9. `convertLangCodeToName()` - 2 edges
10. `languageToCode()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `toSupportedLanguage()` --calls--> `getLanguageDisplayName()`  [EXTRACTED]
  packages/core/src/utils/languages.ts → packages/core/src/utils/languages.ts  _Bridges community 2 → community 3_

## Import Cycles
- None detected.

## Communities (4 total, 0 thin omitted)

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
- **9 isolated node(s):** `LANGUAGE_ALIAS_MAP`, `LANGUAGE_BY_NAME`, `ENTRY_BY_NAME`, `REGION_ALIASES`, `AMBIGIOUS_LANGUAGES` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 13 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getLanguageDisplayName()` connect `getLanguageDisplayName` to `languages.ts`, `findEntryByCode`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `findEntryByCode()` connect `findEntryByCode` to `languages.ts`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `toSupportedLanguage()` connect `findEntryByCode` to `languages.ts`, `getLanguageDisplayName`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `LANGUAGE_ALIAS_MAP`, `LANGUAGE_BY_NAME`, `ENTRY_BY_NAME` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._