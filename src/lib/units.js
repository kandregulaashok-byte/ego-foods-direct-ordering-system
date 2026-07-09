const families = {
  kg: 'weight',
  g: 'weight',
  litre: 'volume',
  litres: 'volume',
  ml: 'volume',
  pieces: 'count'
};

const toBase = {
  kg: 1000,
  g: 1,
  litre: 1000,
  litres: 1000,
  ml: 1,
  pieces: 1
};

export const unitOptions = ['kg', 'g', 'litres', 'ml', 'pieces'];

export function unitFamily(unit) {
  return families[unit] || '';
}

export function canConvertUnits(fromUnit, toUnit) {
  return Boolean(fromUnit && toUnit && unitFamily(fromUnit) && unitFamily(fromUnit) === unitFamily(toUnit));
}

export function convertUnit(value, fromUnit, toUnit) {
  const number = Number(value || 0);
  if (fromUnit === toUnit) return number;
  if (!canConvertUnits(fromUnit, toUnit)) {
    throw new Error(`Cannot convert ${fromUnit || 'unknown'} to ${toUnit || 'unknown'}.`);
  }
  return (number * toBase[fromUnit]) / toBase[toUnit];
}

export function formatQuantity(value, unit) {
  const number = Number(value || 0);
  if (unit === 'g' && number >= 1000) return `${Number((number / 1000).toFixed(2))} kg`;
  if (unit === 'ml' && number >= 1000) return `${Number((number / 1000).toFixed(2))} litres`;
  const decimals = unit === 'pieces' || Number.isInteger(number) ? 0 : 2;
  return `${Number(number.toFixed(decimals))} ${unit}`;
}
