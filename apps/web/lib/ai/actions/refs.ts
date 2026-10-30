/**
 * Session AJ (item 9): the same-reply references beyond new habits. A create-recipe card that a plan-meal card of the
 * same reply names (its `recipe_name`) is known by this key, so both cards agree on the recipe's id before either is added.
 * The id has Health's own form (`health_<uuid>`, lib/health.ts newHealthId) without loading Health's module here.
 */
export const recipeRef = (name: string) => `recipe:${name.trim().toLowerCase()}`;
export const newRecipeRefId = () => `health_${crypto.randomUUID()}`;
