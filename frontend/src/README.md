# Frontend Source Layout

The current UI is still the existing static frontend in `frontend/public` so authentication and routing continue to work without adding a build step.

This `frontend/src` tree mirrors the target React/TypeScript architecture for the next migration:

- `pages`: page-level route views.
- `components`: reusable layout and UI pieces.
- `features`: module-specific state and business UI.
- `services`: API client boundaries.
- `contexts`, `hooks`, `types`, `utils`, `constants`: shared frontend foundations.
