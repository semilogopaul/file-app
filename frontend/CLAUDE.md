# File App — Frontend

> Next.js frontend application. TypeScript / React / Tailwind CSS / TanStack Query / Zustand.

## Quick Reference

### Commands

```bash
# Setup
npm install                    # Install dependencies

# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run start                  # Start production server (after build)

# Code Quality
npm run lint                   # ESLint
npm run test                   # Run tests
```

### Project Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── config/
├── modules/
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       ├── styles/
│       └── tests/
├── common/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── constants/
└── styles/
    └── globals.css
```

Static assets (images, fonts, icons) go in the top-level `public/` directory per Next.js convention, served from `/` - there is no separate `assets/` folder.

> **Note on `app/`:** this tree follows a feature-first SPA layout (`App.tsx` + `router.tsx`). If this project uses the Next.js App Router, `app/` is Next's reserved file-based routing directory (`layout.tsx`, `page.tsx`, route segments) instead — route composition and providers would live in `app/layout.tsx` rather than `App.tsx`/`router.tsx`. Confirm the routing model (App Router vs. a custom/SPA setup) before scaffolding this folder, and adjust accordingly.

Every feature lives under `modules/<feature>/` and owns its own components, hooks, services, types, styles, and tests.

Styling is Tailwind CSS utility classes by default (configured via `@theme` in `globals.css`, Tailwind v4 - no `tailwind.config.js`). A feature's `styles/` folder is only for CSS that genuinely can't be expressed as utilities (keyframes, complex selectors); it is not a default per-component stylesheet.

## 1. Design Principles

### 1.1 Feature-First Architecture

- Applications must be organized by business features
- Each feature owns its components, logic, styles, and tests
- Feature isolation is mandatory

### 1.2 Separation of Concerns

- UI rendering, state management, and side effects must be clearly separated
- Components must not contain unrelated responsibilities

### 1.3 Predictable State Management

- Global state must be minimized
- Server state and client/UI state must be clearly distinguished
- State updates must be deterministic and traceable

### 1.4 Explicit Interfaces

- All data structures must be strongly typed
- Implicit or undocumented data contracts are prohibited

## 2. Structural Rules

- Cross-feature imports are prohibited
- Shared logic must reside in `common/`
- Each feature must expose a public API via an index file (`index.ts`)
- Circular dependencies are prohibited

## 3. Coding Standards

### 3.1 TypeScript Standards

- `strict: true` must be enabled
- Use of `any` is prohibited
- Prefer immutability (`readonly`)
- `interface` is used for contracts, `type` for unions

### 3.2 React Standards

- Functional components only
- Hooks must follow the Rules of Hooks
- Side effects must be isolated in hooks
- Excessive prop drilling is prohibited

## 4. State Management Standards

- Server State: TanStack Query
- Client/UI State: Zustand or React Context (when justified)

Rules:

- Duplicate state between server and client is prohibited
- Side effects must be centralized
- State logic must be testable

## 5. Error Handling & Resilience

- A global error boundary is mandatory
- Errors must be handled gracefully
- User-facing error messages must be clear and non-technical
- Centralized error handling utilities must be used

## 6. Performance Standards

- Route-based code splitting is mandatory
- Lazy loading must be used for heavy components
- Memoization must be applied where justified
- Unnecessary re-renders must be avoided
- Bundle size limits must be enforced in CI

## 7. Security Requirements

- Secrets must never be embedded in frontend code
- Configuration must be environment-based
- Protection against XSS must be enforced
- Authentication tokens must be handled securely
- Third-party dependencies must be vetted and approved

## 8. Accessibility Requirements

- WCAG 2.1 AA compliance is mandatory
- Keyboard navigation must be supported
- Semantic HTML must be used
- Screen reader compatibility is required
- Accessibility testing must be included in CI pipelines
