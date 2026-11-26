# WARGO — Project Structure

This document describes the initial repository layout.

## Workspaces

- `apps/web`: the main WARGO web application. The technology stack will be selected before application code is added.
- `games`: individually maintained game modules. Games should load on demand so users do not download the full catalogue when opening WARGO.
- `packages/shared`: reusable, platform-independent code and shared contracts.
- `docs`: architecture notes, technical decisions, and project documentation.

## Initial engineering principles

1. Keep game execution client-side for single-player games whenever practical.
2. Load only the selected game and its required assets.
3. Keep persistent account data and records in the backend, not only in local device storage.
4. Deliver static assets through a CDN/object-storage layer when the deployment architecture is selected.
5. Keep secrets and privileged backend credentials out of client-side code.
6. Measure performance on low-end devices and realistic network conditions.
7. Add automated checks and tests as the application stack is established.

## Current status

This is a repository scaffold only. No framework, hosting provider, database project, or production infrastructure has been provisioned yet.
