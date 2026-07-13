# Cooksmith Functional Specification & User Story Catalogue

**Version:** 1.0  
**Status:** Product Definition (Authoritative Functional Specification)

## Document Hierarchy

1. Product Principles
2. Product Specification
3. Functional Specification & User Story Catalogue
4. Customer Experience Map
5. UX Wireframes & Interaction Specification
6. Technical Architecture Specification
7. Implementation Roadmap

## Purpose

The Product Specification defines **what Cooksmith is**.

The Technical Architecture defines **how Cooksmith is built**.

This Functional Specification defines **how Cooksmith behaves**.

Every feature should trace to a Product Principle, roadmap milestone and acceptance test.

## Functional Design Principles

- Remove effort from meal planning.
- Require as few taps as possible.
- Feel obvious on first use.
- Be mobile-first.
- Use sensible defaults.
- Respect household preferences automatically.

## Functional Traceability

```text
Product Principle
↓
Epic
↓
Feature
↓
User Story
↓
Acceptance Criteria
↓
UX Screen
↓
Roadmap Milestone
↓
Technical Component
↓
Test Case
```

## Epics

### Epic 1 – Household Management
Objective: Configure a household once so Cooksmith can personalise planning.
Features:
- Household creation
- Household settings
- Member management
- Dietary preferences
- Allergies
- Cuisine preferences
- Cooking preferences
- Shopping preferences

### Epic 2 – Pantry Management
Objective: Build a reliable household pantry.
Features:
- Pantry
- Fridge
- Freezer
- Starter pantry
- Custom items
- Low stock

### Epic 3 – Recipe Library
Objective: Curated public recipes plus private household recipes.
Features:
- Public recipes
- Personal recipes
- Chef profiles
- Attribution
- Search
- Import
- Favourites

### Epic 4 – Meal Planning
Objective: Generate a practical fortnight meal plan.
Planning considers:
- Pantry
- Allergies
- Preferences
- Budget
- Available cooking time
- Ingredient overlap
- Leftovers

### Epic 5 – Meal Preparation
Objective: Reduce weekday cooking effort.
Prep modes:
- No Prep
- Quick
- Standard
- Batch

### Epic 6 – Smart Shopping
Objective: Produce the easiest shopping experience.
Key MVP:
- Pantry subtraction
- Duplicate merging
- One-tap "Copy for Coles/Woolworths"

### Epic 7 – AI Intelligence
AI quietly:
- Generates meal plans
- Suggests swaps
- Optimises shopping
- Builds prep plans
- Learns household preferences

### Epic 8 – Administration
Manage:
- Recipes
- Chefs
- Imports
- Categories
- Tags
- Moderation
- Analytics

## UX Dependencies

Complete before feature implementation:
1. Customer Experience Map
2. Information Architecture
3. UX Wireframes
4. Interaction Specifications

## Success Measures

- Onboarding under 10 minutes
- Fortnight planning under 15 minutes
- Shopping list generation under 5 seconds
- Practical Sunday prep plan
- Reduced mental load

> Users stop asking "What's for dinner?" because Cooksmith has already answered it.
