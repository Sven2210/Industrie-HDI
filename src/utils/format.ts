/** Formats a numeric string input with German thousand separators (e.g. 1000000 → 1.000.000) */
export const formatNumberInput = (value: string): string => {
  const digits = value.replace(/\./g, '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('de-DE');
};

/** Parses a German-formatted number string back to a JS number */
export const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};
