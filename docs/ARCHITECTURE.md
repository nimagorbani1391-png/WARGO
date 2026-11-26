# WARGO — Initial Application Architecture

## Application foundation

- **UI:** React + TypeScript
- **Build tooling:** Vite
- **Language direction:** Persian-first, RTL-ready
- **Game model:** single-player games execute on the client
- **Loading strategy:** game metadata is kept in a central registry; game code is loaded through per-game dynamic imports

## Scaling the catalogue

The catalogue size must not determine the initial JavaScript bundle size. Each game is an independent module with a stable ID, metadata, and a lazy loader. The application shell loads first; a game's implementation and assets load only after that game is selected.

There is no hard-coded 100- or 200-game ceiling. The architecture should be evaluated by bundle size, catalogue query/render performance, asset delivery, and device/network measurements as the catalogue grows.

## Data boundaries

- Game runtime and temporary session state: client device
- Account identity and durable records: backend, after backend selection
- Game images and static assets: static hosting/object storage/CDN, after deployment selection
- Shared contracts: `packages/shared`

## Engineering requirements

1. Keep game modules isolated from the application shell.
2. Avoid importing all game implementations into the initial bundle.
3. Validate game metadata and stable IDs.
4. Lazy-load images and non-critical assets.
5. Keep secrets out of browser code.
6. Add automated tests for registry behavior, score handling, and critical user flows.
7. Measure production bundle sizes and test on low-end Android devices.
8. Do not claim a concurrency or performance target is met until it has been tested.

## Current scope

This commit establishes the web application foundation and a first responsive shell. It does not provision hosting, a database, authentication, analytics, or Android packaging. No playable games are registered yet.
