# Space Typing — Code Quality & Performance Rules

> Status: **CURRENT POLICY — 2026-09-25**
>
> This policy supersedes earlier M22 hard byte/file-count ceilings for JavaScript,
> CSS, total build output, committed audio payload, and Ship V3 transfer size.
> Historical CI measurements remain useful evidence, but they are not current
> hard acceptance limits.

## 1. Reuse before adding

Before adding a new component, helper, renderer, state field, CSS block, service,
or data pipeline:

1. search the current production path for an existing implementation with the
   same responsibility;
2. extend/refactor that implementation when practical;
3. create a new path only when the responsibility is genuinely distinct.

Do not create parallel systems for the same behavior merely because adding a
new file/function is easier.

## 2. Remove dead and superseded code

When code becomes unused or a newer implementation replaces it:

- remove the old implementation in the same change when safe;
- remove stale CSS selectors/overrides, unused helpers/imports, obsolete
  feature branches inside production code, and abandoned compatibility paths
  that are no longer required;
- do not keep commented-out production code as a backup; Git history is the
  backup;
- do not leave temporary debug code, unused assets, or duplicate data mappings
  after the feature is accepted.

If backward compatibility requires old code, document the exact compatibility
reason and the condition for eventual removal.

## 3. Single source of truth

Existing production state, registries, renderers and services stay
authoritative. New work must integrate with them rather than creating a second
source of truth.

Examples:

- one gameplay state path per feature;
- one canonical registry for a data domain;
- shared UI/icon/tooltip components when behavior is the same;
- one renderer/helper reused by equivalent visual paths unless a mode truly
  requires a distinct visual contract.

## 4. Performance is measured by behavior, not arbitrary source size

There is no hard CI failure based solely on JavaScript KiB, CSS KiB, total
dist KiB, audio payload MiB, or image transfer MiB.

Build output sizes are still reported so unusual growth is visible in review.
A size increase is a review signal, not an automatic reason to delete valid
code or compress source into less maintainable forms.

Performance acceptance focuses on evidence such as:

- frame-time average/p95 and slow-frame ratio;
- FPS under representative and worst-case pressure;
- Canvas draw cost and effective DPR/pixel workload;
- input/typing responsiveness;
- DOM update frequency and layout/reflow churn;
- allocation churn in hot paths;
- active particles/projectiles/enemies and other runtime collections;
- audio lifecycle/voice reuse;
- browser memory/load behavior when relevant.

## 5. Keep integrity guards that protect correctness

Removing file-size ceilings does **not** mean removing correctness checks.

Keep checks that verify:

- required assets exist;
- expected file format/header is valid;
- reviewed production artwork identity/provenance is deliberate;
- required atlas dimensions/layout are correct where runtime slicing depends on
  them;
- invalid/corrupt assets fail clearly;
- TypeScript, unit/runtime tests, production build, and real-browser QA remain
  required.

These checks must not impose an arbitrary byte ceiling.

## 6. Review rule for meaningful growth

If a change produces a large bundle/asset increase, review why:

- Is existing code duplicated?
- Can an existing component/helper/asset be reused?
- Is there dead code that should be removed?
- Is the new functionality actually needed?
- Does runtime profiling show a regression?

Fix the underlying issue when one exists. Do not reduce quality, readability,
or maintainability merely to hit a historic byte number.

## 7. CSS-specific rule

For CSS:

- prefer existing design tokens/components/selectors;
- merge duplicate responsibility rather than stacking overrides indefinitely;
- remove obsolete selectors when redesigns replace them;
- avoid specificity wars and repeated late-file overrides;
- do not minify or contort authored CSS by hand just to reduce KiB; the build
  pipeline already minifies production output.

## 8. Acceptance

A change is acceptable when it is:

- functionally correct;
- integrated with existing architecture;
- free of known dead/duplicate code introduced by the change;
- test/build clean;
- performant in relevant runtime measurements;
- manually readable/usable where automated checks cannot decide UX.

Bundle and asset sizes remain visible metrics only.
