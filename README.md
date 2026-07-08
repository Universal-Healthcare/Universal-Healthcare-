# Universal Healthcare Data Network

Universal Healthcare Data Network is a modern, full-stack healthcare data network foundation built as a TypeScript monorepo. It combines a secure backend API, a web portal, a mobile client, shared validation/types, and a ledger-ready integration package for trusted data exchange workflows.

The goal is to provide a reusable platform for securely managing authenticated data access, cross-application data contracts, and future-proof auditability across healthcare participants.

---

## What This Project Is

Universal Healthcare Data Network is designed as a prototype architecture for healthcare interoperability.

Key capabilities include:

- secure authentication and session management for users and care teams
- shared schema and validation logic across backend and frontend
- web and mobile interfaces for patient/provider workflows
- a backend API structured to support modular healthcare domains
- a ledger integration package for future data provenance and transaction tracing

This project is an ideal starting point for building a network that connects providers, payers, and patients using consistent data contracts across web, mobile, and API layers.

---

## Repository Structure

```txt
universal-healthcare-data-network/
├── apps/
│   ├── api/        # @ask4moreish/api    – Express API and modular backend
│   ├── web/        # @ask4moreish/web    – Next.js web portal
│   └── mobile/     # @ask4moreish/mobile – Expo mobile client
│
├── packages/
│   ├── shared/     # @ask4moreish/shared – shared types, validation, and interfaces
│   └── stellar/    # @ask4moreish/stellar – ledger integration scaffold
│
├── docs/           # architecture, environment, testing, contributing
├── .github/workflows/  # per-package CI workflows
└── README.md
```

---

## Applications

### `apps/api`

The API is an Express app built as a modular backend. It provides authentication, user management, and domain-specific healthcare services, all backed by shared validation schemas.

Current implementation includes:

- auth module with registration and login
- user module with profile persistence
- shared middleware for auth and error handling

### `apps/web`

The web app is a Next.js portal for managing healthcare workflows.

Current implementation includes:

- login and registration flows
- shared client-side validation using the same schemas as the API
- authenticated session handling with persisted state

### `apps/mobile`

The mobile app is a React Native / Expo foundation for clinician and patient experiences.

Current implementation includes:

- Expo tooling and TypeScript setup
- mobile UI skeleton ready for secure workflows
- a basic startup screen and smoke test

---

## Shared Packages

### `packages/shared`

Shared TypeScript types and validation logic keep request and response contracts consistent across the API, web, and mobile apps.

### `packages/stellar`

A ledger integration scaffold for future proofing data provenance, secure transaction flows, and audit trail support.

---

## Tech Stack

- Backend: Express, Prisma, TypeScript
- Web: Next.js, React, TypeScript
- Mobile: Expo, React Native, TypeScript
- Shared: workspace packages for cross-app contracts
- Package manager: pnpm
- Monorepo tooling: Turborepo

---

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run locally

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

### Run tests

```bash
pnpm test
```

---

## Notes

This repository is intended to serve as a foundation for healthcare data interoperability projects. It is organized to separate domain logic, shared contracts, and platform-specific clients while allowing rapid expansion into richer healthcare workflows.
