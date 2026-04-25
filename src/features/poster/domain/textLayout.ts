/**
 * Shared poster text layout constants used by both the live preview overlay
 * and the export canvas renderer.
 */
export const TEXT_DIMENSION_REFERENCE_PX = 3600;

export const TEXT_TITLE_Y_RATIO = 0.812;
export const TEXT_TITLE_Y_RATIO_LANDSCAPE = 0.798;
export const TEXT_CITY_Y_RATIO = 0.845;
export const TEXT_DIVIDER_Y_RATIO = 0.875;
export const TEXT_COUNTRY_Y_RATIO = 0.9;
export const TEXT_COORDS_Y_RATIO = 0.93;

/** Margin from the edges for attribution/credits. */
export const TEXT_EDGE_MARGIN_RATIO = 0.02;

/** City text scales down when labels get long. */
export const CITY_TEXT_SHRINK_THRESHOLD = 10;

export const TITLE_FONT_BASE_PX = 180;
export const CITY_FONT_BASE_PX = 250;
export const CITY_FONT_WITH_TITLE_BASE_PX = 120;
export const CITY_FONT_MIN_PX = 110;
export const CITY_FONT_WITH_TITLE_MIN_PX = 60;
export const COUNTRY_FONT_BASE_PX = 92;
export const COORDS_FONT_BASE_PX = 80;
export const ATTRIBUTION_FONT_BASE_PX = 30;

export function isLatinScript(text: string | undefined | null): boolean {
  if (!text) {
    return true;
  }

  let latinCount = 0;
  let alphaCount = 0;

  for (const char of text) {
    if (/[A-Za-z\u00C0-\u024F]/.test(char)) {
      latinCount += 1;
      alphaCount += 1;
    } else if (/\p{L}/u.test(char)) {
      alphaCount += 1;
    }
  }

  if (alphaCount === 0) {
    return true;
  }

  return latinCount / alphaCount > 0.8;
}

export function formatCityLabel(city: string, spacing: number = 2): string {
  const gap = " ".repeat(Math.max(0, Math.round(spacing)));
  return isLatinScript(city) ? city.toUpperCase().split("").join(gap) : city;
}
