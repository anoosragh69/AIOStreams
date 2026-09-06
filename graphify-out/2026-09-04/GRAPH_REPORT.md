# Graph Report - AIOStreams  (2026-09-04)

## Corpus Check
- 1099 files · ~907,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6 nodes · 7 edges · 2 communities (1 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2817ae8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- format-zod-error.ts
- formatIssues

## God Nodes (most connected - your core abstractions)
1. `formatIssues()` - 3 edges
2. `formatZodError()` - 2 edges
3. `formatIssue()` - 2 edges
4. `ZodIssue` - 1 edges
5. `FormatZodErrorOptions` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (2 total, 1 thin omitted)

### Community 1 - "formatIssues"
Cohesion: 0.67
Nodes (3): formatIssue(), formatIssues(), formatZodError()

## Knowledge Gaps
- **2 isolated node(s):** `ZodIssue`, `FormatZodErrorOptions`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `formatIssues()` connect `formatIssues` to `format-zod-error.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `ZodIssue`, `FormatZodErrorOptions` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._