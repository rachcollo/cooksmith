// Opt-in real PostgreSQL regression; synthetic transaction rolls back in the local container.
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import type { Recipe } from '../../src/domain/recipes/types'

const cases = [
  ['0.004 g saffron', [null]],
  ['0.004 g saffron\n0.006 g saffron', [0.01]],
  ['0.004 g mushroom\n0.006 g mushrooms', [null, null]],
  ['0.004 kg rice\n0.004 L milk', [4, 4]],
] as const

function additions(ingredients: string) {
  const recipe = { id: 'tiny', ingredients, ingredientRows: [] } as unknown as Recipe
  return buildPlanAdditions(
    [
      {
        recipeState: {
          kind: 'active',
          recipe: { id: 'tiny', name: 'Synthetic', archivedAt: null },
        },
      },
    ],
    [recipe],
    [],
  ).additions
}

describe('v2 precision integration', () => {
  it.each(cases)('keeps totals consistent with physical source partitions: %s', (ingredients) => {
    const payload = additions(ingredients)
    for (const item of payload) {
      const sources = item.sourceQuantities ?? []
      expect(item.quantity).toEqual(
        sources.some((source) => source.purchaseQuantity === null)
          ? null
          : sources.reduce((sum, source) => sum + (source.purchaseQuantity ?? 0), 0),
      )
      expect(sources.every((source) => source.quantity !== null)).toBe(true)
    }
    expect(additions(ingredients)).toEqual(payload)
  })

  it.skipIf(process.env.COOKSMITH_RUN_DATABASE_COMPATIBILITY !== '1').each(cases)(
    'persists generated demand through actual v2 reconciliation and retry: %s',
    (ingredients, quantities) => {
      const payload = JSON.stringify(additions(ingredients))
      const sql = `begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into cooksmith.household_recipes(id,household_id,name) values('a0000000-0000-4000-8000-000000000228','20000000-0000-4000-8000-000000000001','Synthetic v2 precision');
insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title,recipe_id) values('80000000-0000-4000-8000-000000000228','20000000-0000-4000-8000-000000000001','2026-11-23','dinner','Synthetic v2 precision','a0000000-0000-4000-8000-000000000228');
select cooksmith.reconcile_planned_meal_shopping_v2('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000228',$payload$${payload}$payload$);
select 'RESULT:'||jsonb_agg(jsonb_build_object('id',id,'item',shopping_item_id,'quantity',quantity,'sources',source_quantities))::text from cooksmith.shopping_item_contributions where planned_meal_id='80000000-0000-4000-8000-000000000228';
select cooksmith.reconcile_planned_meal_shopping_v2('20000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000228',$payload$${payload}$payload$);
select 'RESULT:'||jsonb_agg(jsonb_build_object('id',id,'item',shopping_item_id,'quantity',quantity,'sources',source_quantities))::text from cooksmith.shopping_item_contributions where planned_meal_id='80000000-0000-4000-8000-000000000228';
rollback;`
      const output = execFileSync(
        'docker',
        [
          'exec',
          '-i',
          'supabase_db_cooksmith-v2-local',
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-At',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        { input: sql, encoding: 'utf8' },
      )
      const results = output
        .split('\n')
        .filter((line) => line.startsWith('RESULT:'))
        .map(
          (line) =>
            JSON.parse(line.slice(7)) as {
              id: string
              item: string
              quantity: number | null
              sources: unknown[]
            }[],
        )
      expect(results).toHaveLength(2)
      expect(results[0].map((row) => row.quantity).sort()).toEqual([...quantities].sort())
      expect(results[1].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        results[0].sort((a, b) => a.id.localeCompare(b.id)),
      )
      expect(results[0].flatMap((row) => row.sources)).toEqual(
        expect.arrayContaining(
          additions(ingredients).flatMap((item) => item.sourceQuantities ?? []),
        ),
      )
    },
  )
})
