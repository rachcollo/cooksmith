import { useId, useState, type KeyboardEvent } from 'react'
import type { Recipe } from '../../domain/recipes/types'

/** One deliberate choice: a visible recipe or a named meal without ingredients. */
export function MealSearchField({
  value,
  recipes,
  loading,
  error,
  disabled,
  onQuery,
  onRecipe,
  onManual,
}: {
  value: string
  recipes: Recipe[]
  loading: boolean
  error: string | null
  disabled: boolean
  onQuery: (value: string) => void
  onRecipe: (recipe: Recipe) => void
  onManual: (name: string) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = value.trim()
  const matches =
    loading || error
      ? []
      : recipes
          .filter(
            (recipe) =>
              !recipe.archivedAt &&
              recipe.name.toLocaleLowerCase('en-AU').includes(query.toLocaleLowerCase('en-AU')),
          )
          .slice(0, 8)
  const count = matches.length + (query ? 1 : 0)
  const index = Math.min(active, Math.max(0, count - 1))
  function choose(position: number) {
    if (disabled) return
    const recipe = matches[position]
    if (recipe) onRecipe(recipe)
    else if (query) onManual(query)
    setOpen(false)
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(0)
      } else if (count) setActive((index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count)
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (count) choose(index)
    }
  }
  return (
    <div
      className="recipe-search-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <label className="field" htmlFor={id}>
        Dinner
      </label>
      <input
        id={id}
        data-autofocus
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-results`}
        aria-activedescendant={open && count ? `${id}-option-${index}` : undefined}
        aria-describedby={`${id}-help`}
        autoComplete="off"
        maxLength={120}
        disabled={disabled}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={keyDown}
      />
      <p id={`${id}-help`} className="form-hint" role="status">
        {loading
          ? 'Loading recipes. You can still add a manual meal.'
          : error ||
            (open && query && !matches.length
              ? 'No matching recipes. Add this as a manual meal.'
              : 'Search recipes or type a meal name, then choose an option.')}
      </p>
      {open ? (
        <div
          className="recipe-search-results"
          id={`${id}-results`}
          role="listbox"
          aria-label="Dinner choices"
        >
          {matches.map((recipe, position) => (
            <button
              type="button"
              role="option"
              aria-selected={index === position}
              id={`${id}-option-${position}`}
              key={`${recipe.scope ?? 'household'}:${recipe.id}`}
              tabIndex={-1}
              className={index === position ? 'active' : ''}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(position)}
            >
              {recipe.name}
              <small>
                {' '}
                ·{' '}
                {recipe.scope === 'public'
                  ? 'Shared recipe'
                  : recipe.scope === 'private'
                    ? 'Private recipe'
                    : 'Household recipe'}
              </small>
            </button>
          ))}
          {query ? (
            <button
              type="button"
              role="option"
              aria-selected={index === matches.length}
              id={`${id}-option-${matches.length}`}
              tabIndex={-1}
              className={index === matches.length ? 'active' : ''}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(matches.length)}
            >
              Add “{query}” — manual meal
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
