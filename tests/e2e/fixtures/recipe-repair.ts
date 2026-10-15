import { renderApp } from '../../renderApp'
import type {
  RecipeRepairInspection,
  WeeklyPreparationAdminRepository,
} from '../../../src/application/admin/weeklyPreparationAdminRepository'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
let inspection: RecipeRepairInspection = {
  rulesVersion: 'cooksmith-rules-v4',
  currentRules: false,
  enabled: true,
  failureCategory: 'schema_invalid',
  repair: null,
}
const repository = {
  listRecipeEnrichments: async () => [
    {
      recipeId: 'synthetic-recipe',
      sourceKind: 'shared_platform',
      name: 'Family vegetable soup',
      ownerLabel: 'Shared platform recipe',
      updatedAt: '2026-10-15T00:00:00Z',
      status: 'failed',
      completedAt: null,
      aiActive: false,
      retryable: true,
      canEdit: false,
    },
  ],
  inspectRecipeRepair: async () => inspection,
  prepareRecipeRepair: async () => 'synthetic-job',
  runRecipeRepair: async () => {
    inspection = {
      ...inspection,
      currentRules: true,
      failureCategory: null,
      repair: {
        jobId: 'synthetic-job',
        state: 'completed',
        failureCategory: null,
        estimatedCostAud: 0.001234,
        providerStarted: true,
        createdAt: '2026-10-15T00:00:00Z',
        leaseExpired: false,
      },
    }
  },
} as unknown as WeeklyPreparationAdminRepository
renderApp(
  '/admin/recipes',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  {
    isAdmin: async () => true,
    list: async () => [],
    update: async () => {
      throw new Error('Not used by this fixture')
    },
  },
  undefined,
  repository,
)
