# Cooksmith Product Principles

**Version:** 1.0  
**Status:** Governing product and delivery principles  
**Purpose:** The lens for every Cooksmith product, UX, architecture and implementation decision

## Product promise

Cooksmith does the thinking. The household makes the final decision.

Cooksmith exists to make feeding a household feel calmer, easier and more organised. It is not a recipe catalogue with a clever search box. It is a practical meal-planning assistant that prepares the next useful answer before the household has to wrestle with the question.

## The ten principles

### 1. Save people time

Every feature should remove effort from planning, shopping, preparing or cooking. If it creates more administration than it removes, it has missed the point.

### 2. Reduce mental load

Cooksmith should present a sensible starting point, not another blank page. Defaults, recommendations and next actions should reduce decisions without taking control away.

### 3. Reduce food waste

Prioritise what the household already has. Plans, preparation and shopping lists should reuse ingredients intelligently and help avoid forgotten fridge sludge.

### 4. Reduce grocery spend

Use pantry stock, combine ingredients, minimise unnecessary purchases and respect household budget preferences. No fake savings theatre. Just fewer wasteful shops.

### 5. AI works quietly in the background

The user should not need to become a prompt engineer to organise dinner. AI should prepare, suggest and explain. The household reviews and adjusts.

### 6. One tap is always better than five

Prefer direct actions, helpful defaults and bulk decisions. Do not turn a simple choice into a small government form.

### 7. Every screen answers “what should I do next?”

Each screen needs one clear primary action or a reassuring indication that nothing needs doing. Navigation should never feel like wandering around the pantry looking for the good scissors.

### 8. The app should feel calm, not busy

Use plain language, generous space, restrained choices and progressive disclosure. Show the useful bit now. Keep the rest nearby, not shouting.

### 9. Optimise for weekly habits, not daily engagement

Success is not opening Cooksmith constantly. Success is one effective planning session, a useful shopping list and easier dinners across the fortnight.

### 10. Don’t make users think if Cooksmith can think for them

Cooksmith should calculate, combine, remember, order and propose wherever it can do so safely. Ask only for information or decisions that genuinely require the household.

## Decision test

Before building or approving a feature, ask:

1. Which principle does this satisfy?
2. What user effort or decision does it remove?
3. Can Cooksmith make a safe default instead of asking another question?
4. Does the screen remain calm and obvious on a phone?
5. Is this needed for the current product outcome, or are we building an impressive cupboard nobody asked for?

If a feature satisfies none of the principles, it should not be built. If principles conflict, protect household safety and trust first, then reduce mental load and time.

## Delivery rule

Every milestone, pull request and design review must state:

- the principles it supports;
- the user effort it removes;
- the primary next action it creates or improves;
- any new complexity or ongoing cost it introduces.

These principles govern the Product Specification, Technical Architecture Specification and Implementation Roadmap. Where a later implementation choice conflicts with them, the choice must be changed or explicitly recorded as an approved exception.
