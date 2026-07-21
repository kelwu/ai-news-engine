@AGENTS.md

# Global conventions

**Supabase client:** always import from `@/lib/supabase`. Never instantiate a new client inline.

**Episode status lifecycle** (in order): `ingested → story_selection → scripted → voiced → rendering → rendered → published`. Never skip or invent statuses. When updating status on error, also write the error string to the `error` column so it surfaces in the dashboard.

**Environment variables:** access via `process.env.VAR_NAME` — never hardcode keys or fallback values for secrets.
