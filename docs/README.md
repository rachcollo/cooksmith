# Cooksmith documentation index

This index defines the source-of-truth order for Cooksmith v2. Contributors must resolve conflicts using the priority below, not the date or location of a document.

## Authority order

| Priority | Document | Role | Repository status |
|---:|---|---|---|
| 1 | [Product Principles](product/Cooksmith_Product_Principles.md) | Governing product and delivery lens | Available |
| 2 | Cooksmith Product Specification | Defines what Cooksmith is | Not supplied to this repository at Milestone 1 |
| 3 | [Functional Specification and User Story Catalogue](product/Cooksmith_Functional_Specification_and_User_Story_Catalogue.md) | Defines expected behaviour | Available |
| 4 | [Technical Architecture Specification](engineering/Cooksmith_Technical_Architecture_Specification.md) | Defines the approved target architecture | Available |
| 5 | [Implementation Roadmap](engineering/Cooksmith_Implementation_Roadmap.md) | Defines milestone sequence and delivery scope | Available |

The Product Specification remains authoritative at priority 2 even though its content was not available for this milestone. Do not infer, reconstruct or replace it. Add the approved source unchanged when it becomes available, then update this index.

## Engineering governance

- Contributor rules: [`AGENTS.md`](../AGENTS.md)
- Architecture decisions: [ADR index](architecture/decisions/README.md)
- ADR template: [ADR template](architecture/decisions/000-template.md)
- Cost review: [Cost approval checklist](engineering/checklists/cost-approval.md)
- AI review: [AI implementation checklist](engineering/checklists/ai-implementation.md)
- Pull requests: [Pull request template](../.github/pull_request_template.md)
- Milestone handovers: [Handover index](engineering/handovers/README.md)
- Handover template: [Milestone handover template](engineering/templates/milestone-handover.md)

## Reference material

The [Current State Assessment](reference/Cooksmith_Current_State_Assessment.md) describes the prototype baseline. It is evidence and context, not an authority over the documents above.

## Recording future decisions

Record durable architecture decisions as sequential ADRs. Record delivery results as milestone handovers. Product changes require an update to the appropriate authoritative product document and explicit approval, not an ADR alone.
