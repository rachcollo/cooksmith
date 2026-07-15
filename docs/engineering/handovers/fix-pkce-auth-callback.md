# PKCE authentication callback handover

Review the focused diff and CI results, then verify the deployed preview with a fresh magic link. Success means the link establishes a session and opens Cooksmith without leaving `code` in the visible URL or redirecting to `/welcome`. The safe rollback is to revert this commit; no database or provider rollback is required.
