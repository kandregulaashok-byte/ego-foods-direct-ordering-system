import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sampleBatchLogs, sampleExternalMappings, sampleIngredients, sampleMenuItems, samplePortions, sampleRecipes } from '../lib/sampleData';
import { todayISO, uid } from '../lib/format';
import { convertUnit } from '../lib/units';
import { readLocal, writeLocal } from '../lib/localPersist';

const inventoryKey = 'kitchen-os.inventory';
const initialInventory = readLocal(inventoryKey, {
  menuItems: sampleMenuItems,
  portions: samplePortions,
  ingredients: sampleIngredients,
  recipes: sampleRecipes,
  externalMappings: sampleExternalMappings,
  batchLogs: sampleBatchLogs
});

function persistInventory(state) {
  writeLocal(inventoryKey, {
    menuItems: state.menuItems,
    portions: state.portions,
    ingredients: state.ingredients,
    recipes: state.recipes,
    externalMappings: state.externalMappings,
    batchLogs: state.batchLogs
  });
}

export function recipeDeductionAmount(recipe, kgCooked, ingredientUnit) {
  const baseQuantity = Number(recipe.base_quantity || 1);
  const baseUnit = recipe.base_unit || 'kg';
  const cookedInBaseUnit = convertUnit(Number(kgCooked || 0), 'kg', baseUnit);
  const multiplier = baseQuantity ? cookedInBaseUnit / baseQuantity : Number(kgCooked || 0);
  const amountInRecipeUnit = multiplier * Number(recipe.quantity || recipe.quantity_per_kg || 0);
  return convertUnit(amountInRecipeUnit, recipe.unit, ingredientUnit);
}

export const useInventoryStore = create((set, get) => ({
  menuItems: initialInventory.menuItems,
  portions: initialInventory.portions,
  ingredients: initialInventory.ingredients,
  recipes: initialInventory.recipes,
  externalMappings: initialInventory.externalMappings,
  batchLogs: initialInventory.batchLogs,
  setAll: ({ menuItems, ingredients, recipes, batchLogs, portions, externalMappings }) =>
    set({
      menuItems,
      ingredients,
      recipes,
      batchLogs,
      portions: portions?.length ? portions : get().portions,
      externalMappings: externalMappings?.length ? externalMappings : get().externalMappings
    }),
  logBatch: async (menuItemId, kgCooked) => {
    const recipes = get().recipes.filter((recipe) => recipe.menu_item_id === menuItemId);
    const ingredients = get().ingredients;
    const deductions = recipes.map((recipe) => {
      const ingredient = ingredients.find((item) => item.id === recipe.ingredient_id);
      return {
        recipe,
        ingredient,
        amount: recipeDeductionAmount(recipe, kgCooked, ingredient?.unit || recipe.unit)
      };
    });
    const shortage = deductions.find(({ ingredient, amount }) => !ingredient || Number(ingredient.current_stock) - amount < 0);
    if (shortage) {
      return {
        ok: false,
        message: `Not enough ${shortage.ingredient?.name || 'ingredient'} in stock. You have ${shortage.ingredient?.current_stock || 0} ${shortage.ingredient?.unit || ''} but this batch needs ${shortage.amount.toFixed(2)} ${shortage.recipe.unit}.`
      };
    }

    const batch = {
      id: uid('batch'),
      menu_item_id: menuItemId,
      date: todayISO(),
      kg_cooked: Number(kgCooked),
      kg_sold: 0,
      estimated_waste_cost: Number(kgCooked) * 90,
      logged_at: new Date().toISOString()
    };

    if (supabase) {
      const { error: batchError } = await supabase.from('batch_logs').insert(batch);
      if (batchError) return { ok: false, message: batchError.message };
      for (const { ingredient, amount } of deductions) {
        const { error } = await supabase
          .from('ingredients')
          .update({ current_stock: Number(ingredient.current_stock) - amount })
          .eq('id', ingredient.id);
        if (error) return { ok: false, message: error.message };
      }
    }

    set((state) => {
      const next = {
        ...state,
        batchLogs: [batch, ...state.batchLogs],
        ingredients: state.ingredients.map((ingredient) => {
        const deduction = deductions.find((item) => item.ingredient?.id === ingredient.id);
        return deduction ? { ...ingredient, current_stock: Number(ingredient.current_stock) - deduction.amount } : ingredient;
      })
      };
      persistInventory(next);
      return { batchLogs: next.batchLogs, ingredients: next.ingredients };
    });
    return { ok: true };
  },
  addStock: async ({ ingredientId, quantity, amount }) => {
    const ingredient = get().ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) return { ok: false, message: 'Choose an ingredient.' };
    const nextStock = Number(ingredient.current_stock) + Number(quantity);
    if (supabase) {
      const { error } = await supabase.from('ingredients').update({ current_stock: nextStock }).eq('id', ingredientId);
      if (error) return { ok: false, message: error.message };
    }
    set((state) => {
      const ingredients = state.ingredients.map((item) => (item.id === ingredientId ? { ...item, current_stock: nextStock } : item));
      persistInventory({ ...state, ingredients });
      return { ingredients };
    });
    return { ok: true, ingredient, quantity, amount };
  },
  addSoldKg: async (menuItemId, kg) => {
    const today = todayISO();
    const todayBatch = get().batchLogs.find((batch) => batch.menu_item_id === menuItemId && batch.date === today);
    if (!todayBatch) return;
    const nextSold = Number(todayBatch.kg_sold || 0) + Number(kg || 0);
    if (supabase) {
      await supabase.from('batch_logs').update({ kg_sold: nextSold }).eq('id', todayBatch.id);
    }
    set((state) => {
      const batchLogs = state.batchLogs.map((batch) => (batch.id === todayBatch.id ? { ...batch, kg_sold: nextSold } : batch));
      persistInventory({ ...state, batchLogs });
      return { batchLogs };
    });
  },
  addMenuItem: (input) => {
    const menuItem = {
      id: uid('menu'),
      name: input.name,
      category: input.category || 'menu',
      recipe_base_quantity: Number(input.recipe_base_quantity || 1),
      recipe_base_unit: input.recipe_base_unit || 'kg',
      cooked_low_stock_threshold_kg: Number(input.cooked_low_stock_threshold_kg || 1),
      price_full: Number(input.price_full || 0),
      price_half: Number(input.price_half || 0),
      portion_full_grams: Number(input.portion_full_grams || 0),
      portion_half_grams: Number(input.portion_half_grams || 0),
      is_active: true
    };
    set((state) => {
      const menuItems = [menuItem, ...state.menuItems];
      persistInventory({ ...state, menuItems });
      return { menuItems };
    });
    return menuItem;
  },
  updateMenuItem: (menuItem) =>
    set((state) => {
      const menuItems = state.menuItems.map((item) => (item.id === menuItem.id ? menuItem : item));
      persistInventory({ ...state, menuItems });
      return { menuItems };
    }),
  updatePortions: (menuItemId, portions) =>
    set((state) => {
      const nextPortions = [
        ...state.portions.filter((portion) => portion.menu_item_id !== menuItemId),
        ...portions.map((portion) => ({ ...portion, menu_item_id: menuItemId }))
      ];
      persistInventory({ ...state, portions: nextPortions });
      return { portions: nextPortions };
    }),
  replaceRecipesForMenu: (menuItemId, recipes) =>
    set((state) => {
      const nextRecipes = [
        ...state.recipes.filter((recipe) => recipe.menu_item_id !== menuItemId),
        ...recipes.map((recipe) => ({ ...recipe, menu_item_id: menuItemId }))
      ];
      persistInventory({ ...state, recipes: nextRecipes });
      return { recipes: nextRecipes };
    }),
  updateRecipes: (recipes) =>
    set((state) => {
      const nextRecipes = state.recipes.map((recipe) => recipes.find((item) => item.id === recipe.id) || recipe);
      persistInventory({ ...state, recipes: nextRecipes });
      return { recipes: nextRecipes };
    }),
  upsertExternalMapping: (mapping) =>
    set((state) => {
      const next = { ...mapping, id: mapping.id || uid('mapping') };
      const exists = state.externalMappings.some((item) => item.id === next.id || (item.source === next.source && item.external_item_name === next.external_item_name));
      const externalMappings = exists
          ? state.externalMappings.map((item) => (item.id === next.id || (item.source === next.source && item.external_item_name === next.external_item_name) ? next : item))
          : [next, ...state.externalMappings];
      persistInventory({ ...state, externalMappings });
      return { externalMappings };
    })
}));
