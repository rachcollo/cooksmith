import { useId, useMemo, useState, type KeyboardEvent } from 'react'

import type { Recipe } from '../../domain/recipes/types'

export function RecipeSearchField({
  label,
  onSelect,
  recipe,
  recipes,
}: {
  label: string
  onSelect: (recipeId: string) => void
  recipe: Recipe
  recipes: Recipe[]
}) {
  const listboxId = useId()
  const [query, setQuery] = useState(recipe.name)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('en-AU')
    return [...recipes]
      .filter((candidate) => candidate.name.toLocaleLowerCase('en-AU').includes(search))
      .sort((left, right) => left.name.localeCompare(right.name, 'en-AU'))
      .slice(0, 8)
  }, [query, recipes])

  function choose(recipeId: string) {
    const selected = recipes.find((candidate) => candidate.id === recipeId)
    if (!selected) return
    onSelect(recipeId)
    setQuery(selected.name)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(recipe.name)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return
    if (!open) {
      setOpen(true)
      return
    }
    if (matches.length === 0) return
    if (event.key === 'Enter') {
      const selected = matches[activeIndex]
      if (selected) {
        event.preventDefault()
        choose(selected.id)
      }
      return
    }
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    setActiveIndex((current) => (current + direction + matches.length) % matches.length)
  }

  return (
    <div
      className="recipe-search-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          setQuery(recipe.name)
        }
      }}
    >
      <label>
        <input
          aria-activedescendant={
            open && matches[activeIndex] ? `${listboxId}-${matches[activeIndex].id}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-label={`Search recipe for ${label}`}
          autoComplete="off"
          role="combobox"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={(event) => {
            event.currentTarget.select()
            setActiveIndex(0)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
      </label>
      {open ? (
        <div className="recipe-search-results" id={listboxId} role="listbox">
          {matches.length ? (
            matches.map((candidate, index) => (
              <button
                className={index === activeIndex ? 'active' : ''}
                id={`${listboxId}-${candidate.id}`}
                key={candidate.id}
                role="option"
                tabIndex={-1}
                type="button"
                aria-selected={candidate.id === recipe.id}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(candidate.id)}
              >
                {candidate.name}
              </button>
            ))
          ) : (
            <p>No matching recipes</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
