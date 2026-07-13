# AI implementation checklist

Complete this checklist for every AI operation before implementation and repeat it for material model, prompt or schema changes.

- [ ] Operation name and owner are recorded.
- [ ] User problem and reason AI is needed are stated.
- [ ] Deterministic alternative was considered, with the decision recorded.
- [ ] Versioned structured input schema is defined and sends only necessary data.
- [ ] Versioned structured output schema is defined.
- [ ] Server-side hard-constraint validation is defined.
- [ ] Allergy and dietary safety rules are deterministic and tested.
- [ ] AI cannot invent trusted record identifiers or bypass permissions.
- [ ] User confirmation requirements are defined for consequential imports, plan changes and safety-sensitive results.
- [ ] Timeout, retry limit and useful deterministic fallback behaviour are defined.
- [ ] Per-operation and monthly cost limits are defined, with an action when the limit is reached.
- [ ] Evaluation cases cover normal, boundary, allergy, dietary, malformed-output, provider-failure and adversarial inputs.
- [ ] Acceptance thresholds and regression baseline are defined.
- [ ] Logging records operation, model, prompt version, latency, usage, estimated cost and outcome without sensitive content.
- [ ] Privacy approach covers data minimisation, retention, provider processing, redaction and deletion.
- [ ] A feature flag or equivalent kill switch can disable the operation without breaking the core journey.
- [ ] Applicable cost approval is linked before a paid call is enabled.

AI output remains advisory. The server validates it and the household keeps the final decision.
