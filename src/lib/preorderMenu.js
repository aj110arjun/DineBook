// Menu pages contain only the visible foods. Retain visited options separately
// so changing the listing never changes a selected item's price or offer scope.
export function mergePreorderVariants(current, foods) {
  const next = { ...current };
  for (const food of foods) {
    for (const variant of food.variants) {
      next[variant.id] = {
        ...variant,
        food_id: food.id,
        food_name: food.name,
        category_id: food.category_id,
        category_name: food.category_name,
      };
    }
  }
  return next;
}

export function getPreorderCartDetails(cart, variants) {
  let subtotal = 0;
  const foodIds = new Set();
  const categoryIds = new Set();
  for (const line of cart) {
    const variant = variants[line.variant_id];
    if (!variant) continue;
    subtotal += Number(variant.price) * line.quantity;
    foodIds.add(variant.food_id);
    categoryIds.add(variant.category_id);
  }
  return { subtotal, foodIds, categoryIds };
}
