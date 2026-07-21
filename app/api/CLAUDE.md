# API route conventions

**maxDuration:** every route must export `export const maxDuration = 300`. These routes call external AI APIs and Remotion Lambda — they time out without it.

**Error responses:** always return `NextResponse.json({ error: message }, { status: N })`. Never throw or return a bare string.

**Supabase queries:** use `.maybeSingle()` instead of `.single()`. `.single()` throws a Postgres error when the row doesn't exist; `.maybeSingle()` returns `null` so the route can return a clean 404.

**Anthropic client:** instantiate once at module level — `const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. Never create it inside a request handler.

**Tool schemas:** add `as const` to every `type: "object"` field inside `input_schema`. TypeScript narrows the literal type — without it the SDK type-checks fail.

**Forced tool use:** when the route requires Claude to call a tool (not chat), set `tool_choice: { type: "any" }`. This guarantees the model calls a tool rather than producing free text.

**AI error handling:** on catch, update the episode row in Supabase with the error message before returning HTTP 500. This keeps the dashboard in sync — a failed episode should show the error, not be silently stuck.
