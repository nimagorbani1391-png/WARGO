# WARGO

WARGO is a gaming and entertainment platform built around lightweight, single-player games.

## Repository layout

- `apps/web` — main web application
- `games` — independently maintained game modules
- `packages/shared` — reusable shared code and contracts
- `docs` — architecture and project documentation

## Engineering direction

- Games run on the user's device whenever practical.
- Games and assets are loaded on demand.
- User accounts and persistent records are stored remotely.
- Performance is measured on low-end devices and realistic networks.

## Project status

Initial repository scaffold. The application framework, backend project, hosting, and deployment setup have not yet been selected or provisioned.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the initial structure and engineering principles.
