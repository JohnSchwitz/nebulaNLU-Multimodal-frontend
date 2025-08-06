#### `env.d.ts` (Type Safety)
**Refactored `env.d.ts`**
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GHOST_URL?: string; // Optional, for consistency
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
