import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { extractRecipe } from '../../supabase/functions/import-recipe/extractor'

const url = 'https://recipes.example/soup'
const wrap = (body: string) => `<article><h1>Soup</h1>${body}</article>`
const extract = (html: string) => extractRecipe(html, url)
const lists =
  '<h2>Ingredients</h2><ul><li>1 onion</li><li>2 cups broth</li></ul><h2>Method</h2><ol><li>Chop.</li><li>Simmer.</li></ol>'

describe('labelled HTML recipe fallback', () => {
  it('extracts the Cannings sibling-column layout without sharing controls or tags', () => {
    const html = readFileSync('tests/fixtures/recipe-import/cannings-layout.html', 'utf8')
    const draft = extract(html)
    expect(draft.ingredients).toBe('1 onion, sliced\n2 cups broth\nSalt & pepper')
    expect(draft.description).toBe(
      'Slice the onion.\nBrown gently.\nAdd broth.\nSimmer until tender.\nServe.',
    )
    expect(draft.publisherName).toBe('Fixture Butchers')
    expect(draft.authorName).toBe('Fixture Cook')
    expect(draft.sourceUrl).toBe(url)
    expect(draft.warnings).toHaveLength(1)
  })
  it.each(['Method', 'Instructions', 'Directions', 'Preparation', 'Steps'])(
    'supports %s headings with lists',
    (heading) => {
      const draft = extract(wrap(lists.replace('Method', heading)))
      expect(draft.ingredients).toBe('1 onion\n2 cups broth')
      expect(draft.description).toBe('Chop.\nSimmer.')
    },
  )
  it('supports paragraph and line-break sections and labelled bold paragraphs', () => {
    const draft = extract(
      wrap(
        '<p><strong>Ingredients:</strong></p><p>1 onion<br>2 cups broth</p><p><b>Directions</b></p><p>Chop.</p><p>Simmer.</p>',
      ),
    )
    expect(draft.ingredients).toBe('1 onion\n2 cups broth')
    expect(draft.description).toBe('Chop.\nSimmer.')
  })
  it('supports wrapped headings, sibling sections and div rows', () => {
    const draft = extract(
      wrap(
        '<section><div><h2>Ingredients</h2></div><div>1 onion</div><div>2 cups broth</div></section><section><h2>Method</h2><div>Chop.</div><div>Simmer.</div></section>',
      ),
    )
    expect(draft.ingredients).toBe('1 onion\n2 cups broth')
    expect(draft.description).toBe('Chop.\nSimmer.')
  })
  it('preserves subsection labels, inline text, entities and ordering', () => {
    const draft = extract(
      wrap(
        '<h2>Ingredients</h2><h3>Base</h3><ul><li>&frac12; cup <em>rice</em></li><li>Salt&nbsp;&amp; pepper</li></ul><h3>Sauce</h3><ul><li>2 tbsp soy</li></ul><h2>Method</h2><h3>Prepare</h3><ol><li>Rinse <a href="/rice">rice</a>.</li></ol><h3>Finish</h3><ol><li>Cook &#189; hour.</li></ol><h2>Notes</h2><p>Not a step.</p>',
      ),
    )
    expect(draft.ingredients).toBe('Base\n½ cup rice\nSalt & pepper\nSauce\n2 tbsp soy')
    expect(draft.description).toBe('Prepare\nRinse rice.\nFinish\nCook ½ hour.')
  })
  it('ignores inert, hidden and navigation content; does not execute scripts', () => {
    const draft = extract(
      `<nav>${lists}</nav><script>throw new Error('executed')</script><div hidden>${lists}</div><div aria-hidden="true">${lists}</div><div style="display: none">${lists}</div>${wrap(lists)}`,
    )
    expect(draft.name).toBe('Soup')
  })
  it('does not absorb paragraphs after a section container ends', () => {
    const draft = extract(
      wrap(
        '<section><h2>Ingredients</h2><p>Onion</p></section><section><div><h2>Method</h2></div><p>Cook.</p></section><p>Subscribe for news.</p>',
      ),
    )
    expect(draft.description).toBe('Cook.')
  })
  it('uses explicit metadata without inventing servings, times or a person', () => {
    const draft = extract(
      `<meta name="author" content="A &amp; B"><meta property="og:site_name" content="Kitchen"><meta property="og:image" content="/soup.jpg">${wrap(lists)}`,
    )
    expect(draft).toMatchObject({
      authorName: 'A & B',
      publisherName: 'Kitchen',
      imageUrl: 'https://recipes.example/soup.jpg',
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
    })
    expect(extract(wrap(lists)).authorName).toBeNull()
  })
  it('does not accept an executable image URL', () => {
    expect(
      extract(`<meta property="og:image" content="javascript:alert(1)">${wrap(lists)}`).imageUrl,
    ).toBeNull()
  })
  it.each([
    ['unrelated article', '<h1>News</h1><p>There is no recipe here.</p>', 'recipe_not_found'],
    [
      'article JSON-LD alone',
      '<script type="application/ld+json">{"@type":"Article","articleBody":"A story"}</script>',
      'recipe_not_found',
    ],
    [
      'missing method',
      '<h1>Soup</h1><h2>Ingredients</h2><ul><li>Onion</li></ul>',
      'incomplete_recipe',
    ],
    [
      'empty ingredients',
      '<h1>Soup</h1><h2>Ingredients</h2><h2>Method</h2><p>Cook.</p>',
      'incomplete_recipe',
    ],
    ['missing title', lists, 'incomplete_recipe'],
    ['multiple recipes', wrap(lists) + wrap(lists), 'ambiguous_recipe'],
    [
      'duplicate method',
      wrap(lists + '<h2>Method</h2><p>Different method.</p>'),
      'ambiguous_recipe',
    ],
    [
      'split articles',
      '<article><h1>Soup</h1><h2>Ingredients</h2><p>Onion</p></article><article><h2>Method</h2><p>Cook.</p></article>',
      'ambiguous_recipe',
    ],
    [
      'nested list',
      wrap(lists.replace('1 onion', '1 onion<ul><li>Other</li></ul>')),
      'unsupported_layout',
    ],
    [
      'unlabelled second list',
      wrap(lists.replace('</ul>', '</ul><ul><li>Extra ingredient</li></ul>')),
      'incomplete_recipe',
    ],
  ])('rejects %s clearly', (_name, html, error) => {
    expect(() => extract(html)).toThrow(error)
  })
  it('rejects a subgroup without content', () => {
    expect(() =>
      extract(wrap(lists.replace('<h2>Method</h2>', '<h3>Sauce</h3><h2>Method</h2>'))),
    ).toThrow('incomplete_recipe')
  })
  it('bounds nesting', () => {
    expect(() => extract('<div>'.repeat(90) + wrap(lists) + '</div>'.repeat(90))).toThrow(
      'unsupported_layout',
    )
  })
  it('keeps valid Recipe JSON-LD ahead of ambiguous HTML, graph and array forms', () => {
    for (const data of [
      [
        {
          '@type': 'Recipe',
          name: 'Structured',
          recipeIngredient: ['Rice'],
          recipeInstructions: ['Cook.'],
        },
      ],
      {
        '@graph': [
          {
            '@type': ['Thing', 'Recipe'],
            name: 'Structured',
            recipeIngredient: ['Rice'],
            recipeInstructions: ['Cook.'],
          },
        ],
      },
    ]) {
      expect(
        extract(
          `<script type="application/ld+json">bad json</script><script type="application/ld+json">${JSON.stringify(data)}</script>${wrap(lists)}${wrap(lists)}`,
        ),
      ).toMatchObject({
        name: 'Structured',
        ingredients: 'Rice',
        description: 'Cook.',
        warnings: [],
      })
    }
  })
  it('keeps the existing partial structured-draft warnings', () => {
    expect(
      extract('<script type="application/ld+json">{"@type":"Recipe","name":"Soup"}</script>')
        .warnings,
    ).toHaveLength(2)
  })
})
