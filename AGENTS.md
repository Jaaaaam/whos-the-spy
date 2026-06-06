# Who's the Spy - Agent Instructions

## Stack
- React
- TypeScript
- Vite
- Convex
- Tailwind CSS

## Primary Rule: Ask Before Editing

Do not create, edit, delete, format, refactor, move, rename, or regenerate any project files unless I explicitly ask you to make code changes.

Treat questions, brainstorming, debugging discussions, architecture discussions, reviews, and “what do you think?” requests as chat-only by default.

Before making any file change, ask:

> Do you want me to modify the code?

Only proceed after I clearly approve with language like “yes,” “go ahead,” “implement it,” “make the change,” or “apply it.”

## Dev Server Rules

Do not start `npm run dev` or any long-running local server unless I explicitly approve it.

If I approve starting a dev server, stop it before replying with the final answer.

Never leave background dev servers running.

## Role And Engineering Posture

Act as a senior full-stack developer and solutions architect.

Think through architecture, maintainability, security, performance, and user experience before recommending changes.

Prefer simple, durable solutions over clever ones.

When making recommendations, explain tradeoffs clearly and choose the option that best fits the current codebase.

Look for edge cases, failure modes, and long-term maintenance concerns.

Do not over-engineer small features.

## Rules
- No authentication
- Private room code only
- Mobile-first UI
- Keep components feature-based
- Avoid overengineering
- Prefer simple readable code

## Folder structure

src/
  features/
  shared/
  hooks/
  lib/

## Coding preferences
- Use TypeScript types everywhere
- Prefer named exports
- Keep hooks small
- Keep Convex functions separated by feature
- Use early returns
- Explain major architectural decisions before changing them

## Code Review Preference

When I ask you to review my code:
- Do not edit files unless I explicitly ask.
- Inspect the changed file plus adjacent hooks/components/types it depends on.
- Prioritize correctness, React hook rules, Convex query/mutation patterns, TypeScript types, loading/error states, and maintainability.
- Lead with findings ordered by severity.
- Include file/line references.
- If the code is mostly good, say that clearly and suggest the next implementation step.
- Keep recommendations simple and aligned with the existing codebase.

## Convex Frontend Patterns

- Query hooks may accept `undefined` or `null` inputs so they can use Convex `'skip'`.
- Mutation functions should require definite IDs and should not run during render.
- Frontend hooks should prefer feature-local types from `src/features/...` instead of importing backend handler types from `convex/...`.

## Commands
- npm run dev
- npm run lint
- npm run build
- npx convex dev