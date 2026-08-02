import type { WeeklyPreparationCandidate } from './weeklyPreparationPlan.ts'

export type WeeklyPreparationEvaluationCase = {
  key: string
  availableMinutes: 15 | 30 | 60
  candidates: WeeklyPreparationCandidate[]
  meals: Array<{
    plannedMealId: string
    mealDate: string
    recipeName: string
    ingredients: string[]
    instructions: string[]
  }>
  expectedEmpty: boolean
  minimumUsefulTasks: number
  minimumUsefulMinutes: number
}

type CandidateFixture = {
  ingredient: string
  action: string
  recipeName: string
  instruction: string
  boundaries?: WeeklyPreparationCandidate['boundaries']
  maximumLeadTimeHours?: number | null
}

const portfolios: Array<{
  key: string
  fixtures: CandidateFixture[]
  expectedEmpty?: boolean
}> = [
  {
    key: 'shared-taco-vegetables',
    fixtures: [
      {
        ingredient: 'brown onion',
        action: 'dice',
        recipeName: 'Beef tacos',
        instruction: 'Soften the onion before adding beef.',
      },
      {
        ingredient: 'brown onion',
        action: 'dice',
        recipeName: 'Bean burritos',
        instruction: 'Cook the onion with the bean filling.',
      },
      {
        ingredient: 'capsicum',
        action: 'slice',
        recipeName: 'Chicken fajitas',
        instruction: 'Add sliced capsicum to the pan.',
      },
    ],
  },
  {
    key: 'curry-aromatics',
    fixtures: [
      {
        ingredient: 'garlic',
        action: 'mince',
        recipeName: 'Butter chicken',
        instruction: 'Add minced garlic to the sauce.',
      },
      {
        ingredient: 'ginger',
        action: 'grate',
        recipeName: 'Hainanese chicken',
        instruction: 'Stir grated ginger through the rice.',
      },
      {
        ingredient: 'coriander',
        action: 'chop',
        recipeName: 'Lentil curry',
        instruction: 'Finish with chopped coriander.',
      },
    ],
  },
  {
    key: 'marinade-and-slaw',
    fixtures: [
      {
        ingredient: 'satay chicken',
        action: 'marinate',
        recipeName: 'Baked satay chicken',
        instruction: 'Marinate the chicken, then refrigerate.',
        boundaries: ['raw-protein', 'cross-contamination'],
        maximumLeadTimeHours: 24,
      },
      {
        ingredient: 'cabbage',
        action: 'shred',
        recipeName: 'Pork bao bowls',
        instruction: 'Serve with shredded cabbage.',
      },
      {
        ingredient: 'carrot',
        action: 'grate',
        recipeName: 'Pork bao bowls',
        instruction: 'Add grated carrot to the slaw.',
      },
    ],
  },
  {
    key: 'single-useful-task',
    fixtures: [
      {
        ingredient: 'pumpkin',
        action: 'dice',
        recipeName: 'Pumpkin risoni',
        instruction: 'Fold diced pumpkin through the risoni.',
      },
    ],
  },
  {
    key: 'mixed-safe-and-unsafe',
    fixtures: [
      {
        ingredient: 'zucchini',
        action: 'slice',
        recipeName: 'Vegetable lasagne',
        instruction: 'Layer sliced zucchini into the lasagne.',
      },
      {
        ingredient: 'garlic cloves',
        action: 'cook',
        recipeName: 'Garlic pasta',
        instruction: 'Cook garlic and reserve the pasta water.',
      },
      {
        ingredient: 'mushrooms',
        action: 'slice',
        recipeName: 'Beef stroganoff',
        instruction: 'Add sliced mushrooms to the sauce.',
      },
    ],
  },
  {
    key: 'raw-protein-boundary',
    fixtures: [
      {
        ingredient: 'chicken breast',
        action: 'slice',
        recipeName: 'Chicken noodles',
        instruction: 'Slice the chicken before stir-frying.',
        boundaries: ['raw-protein', 'cross-contamination'],
      },
      {
        ingredient: 'spring onion',
        action: 'slice',
        recipeName: 'Chicken noodles',
        instruction: 'Top with sliced spring onion.',
      },
      {
        ingredient: 'broccoli',
        action: 'chop',
        recipeName: 'Beef and broccoli',
        instruction: 'Add chopped broccoli to the wok.',
      },
    ],
  },
  {
    key: 'batch-vegetable-base',
    fixtures: [
      {
        ingredient: 'carrot',
        action: 'dice',
        recipeName: 'Spaghetti bolognese',
        instruction: 'Cook diced carrot in the sauce base.',
      },
      {
        ingredient: 'celery',
        action: 'dice',
        recipeName: 'Spaghetti bolognese',
        instruction: 'Cook diced celery in the sauce base.',
      },
      {
        ingredient: 'brown onion',
        action: 'dice',
        recipeName: 'Shepherd’s pie',
        instruction: 'Soften diced onion before adding lamb.',
      },
      {
        ingredient: 'carrot',
        action: 'dice',
        recipeName: 'Shepherd’s pie',
        instruction: 'Add diced carrot to the filling.',
      },
    ],
  },
  {
    key: 'fresh-finishers',
    fixtures: [
      {
        ingredient: 'parsley',
        action: 'chop',
        recipeName: 'Greek lemon potatoes',
        instruction: 'Finish with chopped parsley.',
      },
      {
        ingredient: 'mint',
        action: 'chop',
        recipeName: 'Lamb kebabs',
        instruction: 'Stir chopped mint through the yoghurt.',
      },
    ],
  },
  {
    key: 'no-worthwhile-prep',
    expectedEmpty: true,
    fixtures: [
      {
        ingredient: 'garlic cloves',
        action: 'cook',
        recipeName: 'Garlic noodles',
        instruction: 'Cook the garlic and reserve the noodle water.',
      },
      {
        ingredient: 'oven',
        action: 'preheat',
        recipeName: 'Sausage rolls',
        instruction: 'Preheat the oven immediately before baking.',
        maximumLeadTimeHours: null,
      },
    ],
  },
  {
    key: 'mixed-textures',
    fixtures: [
      {
        ingredient: 'cucumber',
        action: 'slice',
        recipeName: 'Hainanese chicken',
        instruction: 'Serve with sliced cucumber.',
      },
      {
        ingredient: 'red onion',
        action: 'roughly_chop',
        recipeName: 'Italian beef rice pilaf',
        instruction: 'Cook roughly chopped onion with the beef.',
      },
      {
        ingredient: 'feta',
        action: 'crumble',
        recipeName: 'Creamy feta risoni',
        instruction: 'Crumble feta over the finished dish.',
        maximumLeadTimeHours: null,
      },
    ],
  },
]

function candidate(
  caseNumber: number,
  item: number,
  fixture: CandidateFixture,
): WeeklyPreparationCandidate {
  const id = `evaluation-${caseNumber}-${item}`
  return {
    id,
    householdId: '00000000-0000-4000-8000-000000000094',
    planId: `evaluation-${caseNumber}`,
    plannedMealId: `meal-${id}`,
    recipeId: `recipe-${id}`,
    recipeVersionId: `version-${id}`,
    enrichmentVersion: 'recipe-intelligence-v1',
    servings: 4,
    sourceIngredientId: `ingredient-${id}`,
    sourceStepIds: [`step-${id}`],
    originalText: `1 ${fixture.ingredient}, ${fixture.action}`,
    canonicalIngredient: fixture.ingredient,
    canonicalAction: fixture.action,
    preparationDetail: fixture.action,
    quantity: { state: 'known', value: 1, unit: null },
    maximumLeadTimeHours:
      fixture.maximumLeadTimeHours === undefined ? 24 : fixture.maximumLeadTimeHours,
    storageGuidanceReference:
      fixture.maximumLeadTimeHours === null ? null : 'refrigerate-covered-and-labelled',
    boundaries: fixture.boundaries ?? [],
    confidence: 'high',
  }
}

export function buildWeeklyPreparationEvaluationCorpus(): WeeklyPreparationEvaluationCase[] {
  return ([15, 30, 60] as const).flatMap((availableMinutes, durationIndex) =>
    portfolios.map((portfolio, portfolioIndex) => {
      const caseNumber = durationIndex * portfolios.length + portfolioIndex + 1
      const candidates = portfolio.fixtures.map((fixture, index) =>
        candidate(caseNumber, index + 1, fixture),
      )
      const meals = Array.from({ length: 5 }, (_, mealIndex) => {
        const fixture = portfolio.fixtures[mealIndex % portfolio.fixtures.length]
        const suppliedCandidate = candidates[mealIndex % candidates.length]
        if (!fixture || !suppliedCandidate) throw new Error('evaluation_fixture_invalid')
        return {
          plannedMealId: suppliedCandidate.plannedMealId,
          mealDate: `2026-08-${String(3 + mealIndex).padStart(2, '0')}`,
          recipeName: fixture.recipeName,
          ingredients: [suppliedCandidate.originalText],
          instructions: [fixture.instruction],
        }
      })
      const safeCandidateCount = candidates.filter(
        (item) =>
          item.maximumLeadTimeHours !== null &&
          item.storageGuidanceReference &&
          !['cook', 'preheat', 'crumble'].includes(item.canonicalAction ?? ''),
      ).length
      const expectedEmpty = portfolio.expectedEmpty === true
      return {
        key: `${portfolio.key}-${availableMinutes}m`,
        availableMinutes,
        candidates,
        meals,
        expectedEmpty,
        minimumUsefulTasks: expectedEmpty || safeCandidateCount === 0 ? 0 : 1,
        minimumUsefulMinutes: expectedEmpty || safeCandidateCount === 0 ? 0 : 5,
      }
    }),
  )
}
