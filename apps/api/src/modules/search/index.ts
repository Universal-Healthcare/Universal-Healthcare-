// ─────────────────────────────────────────────────────────────────────────────
//  Public surface of the search module.
//  app.ts imports `searchRouter` for mounting; tests may import the service
//  or the controller directly. Search has no own Prisma model (no
//  `repositories/` folder) — it composes `creatorRepository`,
//  `playlistRepository`, and `commentRepository`.
// ─────────────────────────────────────────────────────────────────────────────

export { searchRouter } from './routes/search.routes.js'
export { searchService } from './services/search.service.js'
