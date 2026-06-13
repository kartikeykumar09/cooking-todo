import type { JSX } from 'react';

import { deriveGroceryList } from '@/domain/derive';
import type { GroceryLineItem, IngredientCategory, Plan } from '@/domain/types';

const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
];

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  produce: 'Produce',
  meat: 'Meat',
  dairy: 'Dairy',
  bakery: 'Bakery',
  frozen: 'Frozen',
  pantry: 'Pantry',
  beverages: 'Beverages',
  other: 'Other',
};

function formatCents(cents: number | null): string {
  if (cents === null) return '—';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

function formatQuantity(quantity: number): string {
  // Drop trailing zeros but keep integer-like display clean.
  if (Number.isInteger(quantity)) return quantity.toString();
  return Number(quantity.toFixed(2)).toString();
}

export function GroceryList({ plan }: { plan: Plan }): JSX.Element {
  const list = deriveGroceryList(plan);
  const itemCount = list.items.length;
  const knownTotalCents = list.items.reduce(
    (sum, line) => sum + (line.totalCostCents ?? 0),
    0,
  );
  const hasKnownCost = list.items.some((line) => line.totalCostCents !== null);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-2xl text-foreground">Grocery List</h2>
        <p className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {' · '}
          {hasKnownCost ? formatCents(knownTotalCents) : '—'} total
        </p>
      </header>

      {itemCount === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((category) => list.byCategory[category]?.length).map(
            (category) => {
              const items = list.byCategory[category] ?? [];
              return (
                <CategorySection
                  key={category}
                  category={category}
                  items={items}
                />
              );
            },
          )}
        </div>
      )}
    </section>
  );
}

function CategorySection({
  category,
  items,
}: {
  category: IngredientCategory;
  items: GroceryLineItem[];
}): JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {CATEGORY_LABEL[category]}
      </h3>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <LineItemRow key={item.ingredientIds.join(':')} item={item} />
        ))}
      </ul>
    </div>
  );
}

function LineItemRow({ item }: { item: GroceryLineItem }): JSX.Element {
  const quantityLabel = `${formatQuantity(item.quantity)}${
    item.unit ? ` ${item.unit}` : ''
  } ${item.name}`;

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-foreground">
      <span className="font-medium">{quantityLabel}</span>
      <span className="flex items-baseline gap-2 text-foreground">
        <span>{formatCents(item.totalCostCents)}</span>
        {item.costIsEstimated && item.totalCostCents !== null ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            est.
          </span>
        ) : null}
      </span>
    </li>
  );
}
