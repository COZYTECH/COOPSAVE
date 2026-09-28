# Pamoja Frontend UI Guidelines

This is the permanent visual and interaction contract for the Pamoja frontend. New screens should feel like Pamoja expanding, not like a separate application or another redesign.

## Source Of Truth

Use this order when implementing frontend work:

1. The existing implemented Pamoja UI and reusable components.
2. This document and the centralized Tailwind tokens.
3. Existing API contracts, routes, permissions, and real response data.
4. Original Stitch screens as historical reference for patterns not yet represented in the application.

The backend remains the functional source of truth. Preserve authentication, authorization, API payloads, payment behavior, provider integrations, Socket.IO events, and reconciliation behavior.

Never fabricate balances, payments, payouts, bank accounts, transaction history, or success states. Unsupported features must use an honest unavailable or coming-soon state.

## Brand And Terminology

- User-facing brand: `Pamoja`.
- User-facing group concept: `Group` or `Savings group`.
- Internal API and field names such as `cooperative_id`, `/cooperatives`, and `cooperativeApi` remain unchanged.
- Use Plus Jakarta Sans throughout the product.
- Use Lucide icons consistently. Do not add another icon library for ordinary interface actions.

## Design Tokens

### Colors

- Forest: `#0E3B2E`
- Deep forest: `#00241A`
- Ochre: `#C27803`
- Emerald: `#10B981`
- Application surface: `#EFFDF4`
- Canvas: `#FBF9F5`
- Mint surface: `#E9F7EE`
- Headline ink: `#111D18`
- Body ink: `#2D3A33`
- Muted ink: `#5A6860`
- Error: `#BA1A1A`
- Borders: forest tint at approximately 8% opacity

Use the `pamoja-*` Tailwind tokens in `frontend/tailwind.config.js`. Do not introduce page-specific colors or a second palette.

### Typography

- Display: 56px desktop, 36px mobile, bold, tight line height.
- Page headings: 28px to 36px, semibold.
- Section headings: 20px to 28px, semibold.
- Body: 14px to 18px with comfortable line height.
- Labels and metadata: 12px to 14px, semibold where emphasis is needed.
- Financial amounts, counts, dates, and identifiers use `tabular-nums` and consistent formatting.
- Letter spacing stays at zero unless a token explicitly defines a small tracking value for uppercase labels.

### Shape And Elevation

- Controls: 8px radius.
- Structural cards and modules: 16px radius.
- Status indicators: full pill radius.
- Level 1: `0 2px 8px rgba(14, 59, 46, 0.04)`.
- Level 2: `0 8px 24px -4px rgba(14, 59, 46, 0.08)`.
- Level 3: `0 16px 40px -8px rgba(17, 29, 24, 0.14)`.
- Prefer quiet borders and tonal layering over heavy shadows, gradients, or decorative blobs.

## Application Shell

The authenticated application uses the Stitch-inspired shell already implemented in:

- `frontend/src/components/layout/AppLayout.jsx`
- `frontend/src/components/layout/Navbar.jsx`
- `frontend/src/components/layout/MobileBottomNav.jsx`

Desktop behavior:

- Use a horizontal product header, not a persistent left sidebar.
- Keep Overview, Groups, Members, and Activity as the supported primary destinations.
- Keep the primary group action and owner context in the header.
- Use a maximum content width near 1280px.

Mobile behavior:

- Use the bottom navigation dock with a central add-member action.
- Keep touch targets at least 44px high.
- Stack content intentionally rather than relying on desktop collapse.
- Convert important tables into cards where practical; otherwise use deliberate horizontal scrolling.

Do not add links for unsupported Payouts, Ajo Cycles, Treasury, Audit Logs, Settings, or Bank Verification features until their routes and APIs exist.

## Component System

Reuse before creating:

1. Reuse an existing component.
2. Compose existing components.
3. Extend a component when the behavior is genuinely shared.
4. Create a new primitive only when the pattern is truly new.

Current shared primitives include:

- `Button`
- `Card`
- `FormField`
- `DataTable`
- `StatusBadge`
- `Tabs`
- `LoadingState`
- `EmptyState`
- `Alert`
- `PageHeader`
- `MobileBottomNav`

Do not create duplicate variants such as `ModernCard`, `DashboardCard`, or `FeatureTable` when an existing primitive can express the need.

## Pages And Composition

Supported pages should follow this composition:

1. Contextual page heading and one clear primary action.
2. A strong forest or white structural module for the main state.
3. Real-data summary metrics with clear financial hierarchy.
4. A focused data area such as a ledger, roster, group directory, or reconciliation queue.
5. Loading, empty, error, success, and disabled states.

Dashboard, Groups, Members, and Reconciliation currently use forest-led hero modules, mint data surfaces, compact status pills, and API-backed records. New pages should reuse those patterns.

## Forms

- Every field has a visible label connected to its input.
- Use the existing `FormField` and `Button` components.
- Preserve existing validation and payload shapes.
- Show idle, loading, disabled, error, and success states.
- Keep provider-assigned fields read-only when the backend owns their value.
- Do not add fields because a Stitch screen contains them unless the API supports them.

## Tables And Financial Data

- Use `DataTable` for supported tabular data.
- Use tabular figures for amounts, dates, references, and counts.
- Status must be communicated with text and icon, never color alone.
- Prioritize member, amount, status, date, and reference columns.
- On mobile, use the page's card representation or controlled horizontal scrolling.
- Never replace an empty response with demo rows.

## Status System

Use `StatusBadge` and `getStatusTone` for shared states:

- `success`: successful, paid, matched, assigned.
- `pending`: pending, queued, review required.
- `processing`: work currently in progress.
- `danger`: failed, rejected, or errored.
- `neutral`: unavailable, not assigned, or not yet configured.

Map a new business status to an existing tone where its meaning matches. Add a new visual treatment only for a genuinely new semantic state.

## Loading, Empty, Error, And Success

Every API-backed screen must define:

- Loading: `LoadingState` or an appropriate skeleton.
- Empty: `EmptyState` that explains what is missing and offers the next supported action.
- Error: readable `Alert` text without stack traces, with retry where useful.
- Success: confirmation that reflects the actual completed operation.
- Disabled: a clear disabled control when the action cannot currently be performed.

## Responsive And Motion Rules

- Design mobile, tablet, and desktop composition together.
- Validate widths around 375px, 430px, 768px, 1024px, and 1280px.
- Prevent horizontal overflow except inside intentional data scrollers.
- Keep cards and controls at stable dimensions.
- Use subtle transitions for buttons, tabs, navigation, alerts, and skeletons.
- Never animate financial values in a way that implies money moved.
- Respect `prefers-reduced-motion`.

## Accessibility

- Use semantic landmarks, headings, links, buttons, and labels.
- Give icon-only actions accessible names and tooltips where helpful.
- Keep focus visible with the Pamoja focus ring.
- Use `aria-selected`, `role="tab"`, and `role="status"` where appropriate.
- Maintain strong contrast on forest, mint, and canvas surfaces.
- Do not rely on color alone for financial or reconciliation states.

## Future Screen Workflow

Before adding a page:

1. Confirm the user goal and the API data available.
2. Find the closest existing Pamoja page and component.
3. Identify supported and unsupported actions.
4. Compose the screen from existing tokens and primitives.
5. Implement loading, empty, error, success, and disabled states.
6. Add the responsive mobile composition at the same time.
7. Preserve auth, routing, authorization, and payload contracts.
8. Validate parser, lint, build, and available tests.
9. Compare the page with the current Pamoja shell and ask whether it looks native to the product.
10. Update this document only when a genuinely reusable design pattern is introduced.

## Design Review Checklist

- [ ] Uses Pamoja tokens and Plus Jakarta Sans.
- [ ] Reuses existing components before creating new ones.
- [ ] Uses the current shell and navigation.
- [ ] Has a clear hierarchy and primary action.
- [ ] Uses real API data only.
- [ ] Handles loading, empty, error, success, and disabled states.
- [ ] Uses the shared status system.
- [ ] Works at mobile, tablet, and desktop widths.
- [ ] Preserves existing routes and API contracts.
- [ ] Does not invent unsupported financial functionality.
- [ ] Does not create a second visual system.

## Role-aware product boundaries

The authenticated shell is role-aware. Keep platform administration at `/admin`, group management at the existing group-admin routes, and member views separate from management screens. Frontend guards improve navigation clarity but backend authorization remains authoritative. Every new screen must define its platform role, group role, direct-URL behavior, and unavailable state before it is added.
