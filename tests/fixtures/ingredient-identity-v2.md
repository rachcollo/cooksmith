# CS-116 ingredient fixture review

Reviewed on 2026-11-17 against the deterministic aisle policy in `ingredientCategory.ts`.

The JSON contains 233 distinct synthetic ingredient labels, with independently specified expected aisle categories. It includes regular and irregular plurals, Australian/imported synonyms, meaningful product forms, whole-word collisions and unknown labels. The unit suite checks all expected categories and identity idempotence. The SQL suite checks the same labels against the TypeScript identity outputs to detect cross-runtime drift.

Precedence reviewed: household products first; explicitly frozen products next; packaged/dried/powdered products and specific shelf-stable phrases before generic meat/dairy/produce words; fresh green/runner/broad beans before generic shelf-stable beans. Chicken stock, eggplant, cream of tartar and black beans have explicit regression cases. Unrecognised labels remain Other. Grocery-store layouts vary; these are Cooksmith's deterministic defaults, not a universal retailer aisle promise.

Fresh garlic and garlic powder, plain and extra virgin olive oil, canned and fresh tomatoes, dietary qualifiers, and explicit fresh/frozen forms remain distinct. Shallots and generic peppers are not treated as interchangeable aliases because imported usage is ambiguous. Existing manual aisle choices are preserved.

Follow-up review adds mangoes, quiche/quiches and mousse/mousses to catch final-e and -oes inflection errors in both runtimes. Mangoes remain Produce; quiche and mousse remain Other until an explicit prepared-food aisle policy is established.
