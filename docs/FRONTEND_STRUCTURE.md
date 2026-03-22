# Frontend layout and files

This document maps UI areas to source files so you can jump straight to the right place when editing.

## Entry

| Area | File |
|------|------|
| Root render, login vs app shell | `src/App.tsx` |
| Global styles | `src/index.css` |

## Pre-login (marketing)

| Area | File |
|------|------|
| Landing hero, features, scroll hero | `src/LandingPage.tsx` |
| Login / sign-up modal | `src/LoginModal.tsx` |
| Demo credential map (replace with real auth later) | `src/auth/demoCredentials.ts` |

## Post-login shell

| Area | File |
|------|------|
| Layout: sidebar, header, upload (top-left), step tabs, tab content | `src/AppShell.tsx` |
| Step gating: tagging confirmed unlocks dashboard, real-time, and email | `src/context/WorkflowContext.tsx` |
| Cash-flow period (daily / month / year) vs data span | `src/dashboard/granularity.ts`, `DashboardGranularityBar.tsx` |

## Feature modules

| Area | File |
|------|------|
| Top-left upload card | `src/components/UploadSection.tsx` |
| Filter sidecar (date, amount, categories, logout) | `src/components/FilterSidebar.tsx` |
| Step tabs (Tagging / Dashboard / Real-time / Email) + lock rules | `src/components/StepTabs.tsx` |
| Confirmation modal (tagging → dashboard) | `src/components/ConfirmDialog.tsx` |
| Charts, metrics, transaction table | `src/dashboard/DashboardHome.tsx` |
| Counterparty tagging, thresholds, expandable editable grid | `src/tagging/TaggingView.tsx` |
| Gmail (OAuth + top 10 messages) | `src/email/EmailIntegration.tsx` — set `VITE_GOOGLE_CLIENT_ID` (see `frontend/.env.example`) |
| Real-time placeholder (always available) | `src/realtime/RealtimeUpdates.tsx` |

## Shared types

| Area | File |
|------|------|
| `Transaction`, `TransactionRowRef` | `src/types/transaction.ts` |

## Typical edit scenarios

- **Change login copy or demo credentials**: `src/LoginModal.tsx` and `src/auth/demoCredentials.ts`.
- **Change upload copy or styling**: `src/components/UploadSection.tsx` and `index.css` (search `upload-` classes).
- **Change filters**: `src/components/FilterSidebar.tsx`.
- **Change charts / dashboard metrics**: `src/dashboard/DashboardHome.tsx`.
- **Change tagging rules, edit columns, or confirm flow**: `src/tagging/TaggingView.tsx`.
- **Change which tab is locked and when**: `src/components/StepTabs.tsx` and `src/context/WorkflowContext.tsx`.

When a single concept should live in one place only, prefer extending the file above rather than duplicating logic in `AppShell.tsx`.
