import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { Coordinate } from "@/shared/geo/types";
import { APP_CREDIT_URL } from "@/core/config";
import {
  TEXT_DIMENSION_REFERENCE_PX,
  TEXT_TITLE_Y_RATIO,
  TEXT_TITLE_Y_RATIO_LANDSCAPE,
  TEXT_CITY_Y_RATIO,
  TEXT_DIVIDER_Y_RATIO,
  TEXT_COUNTRY_Y_RATIO,
  TEXT_COORDS_Y_RATIO,
  TEXT_EDGE_MARGIN_RATIO,
  CITY_TEXT_SHRINK_THRESHOLD,
  TITLE_FONT_BASE_PX,
  CITY_FONT_BASE_PX,
  CITY_FONT_WITH_TITLE_BASE_PX,
  CITY_FONT_MIN_PX,
  CITY_FONT_WITH_TITLE_MIN_PX,
  COUNTRY_FONT_BASE_PX,
  COORDS_FONT_BASE_PX,
  ATTRIBUTION_FONT_BASE_PX,
  isLatinScript,
  formatCityLabel,
} from "@/features/poster/domain/textLayout";
import { parseHex } from "@/shared/utils/color";

export function drawPosterText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: { ui?: { text?: string } },
  center: Coordinate,
  city: string,
  country: string,
  fontFamily: string | undefined,
  showPosterText: boolean,
  showOverlay: boolean,
  includeCredits: boolean = true,
  displayTitle: string = "",
  displayDate: string = "",
  citySpacing: number = 2,
): void {
  const textColor = theme.ui?.text || "#111111";
  const landColor = theme.map?.land || "#808080";
  const landRgb = parseHex(landColor);
  const landLuma = landRgb
    ? (0.2126 * landRgb.r + 0.7152 * landRgb.g + 0.0722 * landRgb.b) / 255
    : 0.5;
  const attributionColor = showOverlay
    ? textColor
    : landLuma < 0.52
      ? "#f5faff"
      : "#0e1822";
  const attributionAlpha = showOverlay ? 0.55 : 0.9;
  const titleFontFamily = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFontFamily = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const dimScale = Math.max(
    0.45,
    Math.min(width, height) / TEXT_DIMENSION_REFERENCE_PX,
  );
  const attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale;

  if (showPosterText) {
    const titleText = displayTitle.trim();
    const hasTitle = titleText.length > 0;

    if (hasTitle) {
      const titleFontSize = TITLE_FONT_BASE_PX * dimScale;
      const titleYRatio = width > height ? TEXT_TITLE_Y_RATIO_LANDSCAPE : TEXT_TITLE_Y_RATIO;
      const titleY = height * titleYRatio;
      // Soft halo so the title lifts off road detail behind it.
      ctx.shadowColor = landColor;
      ctx.shadowBlur = 10 * dimScale;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `300 italic ${titleFontSize}px ${titleFontFamily}`;
      ctx.fillText(titleText, width * 0.5, titleY);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    const cityLabel = formatCityLabel(city, citySpacing);
    const cityLength = Math.max(city.length, 1);
    const cityBase = hasTitle ? CITY_FONT_WITH_TITLE_BASE_PX : CITY_FONT_BASE_PX;
    const cityMin = hasTitle ? CITY_FONT_WITH_TITLE_MIN_PX : CITY_FONT_MIN_PX;
    let cityFontSize = cityBase * dimScale;
    if (cityLength > CITY_TEXT_SHRINK_THRESHOLD) {
      cityFontSize = Math.max(
        cityMin * dimScale,
        cityFontSize * (CITY_TEXT_SHRINK_THRESHOLD / cityLength),
      );
    }

    const countryFontSize = COUNTRY_FONT_BASE_PX * dimScale;
    const coordinateFontSize = COORDS_FONT_BASE_PX * dimScale;
    const cityY = height * TEXT_CITY_Y_RATIO;
    const lineY = height * TEXT_DIVIDER_Y_RATIO;
    const countryY = height * TEXT_COUNTRY_Y_RATIO;
    const coordinatesY = height * TEXT_COORDS_Y_RATIO;

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    ctx.fillText(cityLabel, width * 0.5, cityY);

    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3 * dimScale;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, lineY);
    ctx.lineTo(width * 0.6, lineY);
    ctx.stroke();

    ctx.font = `300 ${countryFontSize}px ${titleFontFamily}`;
    ctx.fillText(country.toUpperCase(), width * 0.5, countryY);

    ctx.globalAlpha = 0.75;
    ctx.font = `400 ${coordinateFontSize}px ${bodyFontFamily}`;
    const detailText = displayDate.trim()
      ? displayDate.trim()
      : formatCoordinates(center.lat, center.lon);
    ctx.fillText(detailText, width * 0.5, coordinatesY);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = attributionColor;
  ctx.globalAlpha = attributionAlpha;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
  ctx.fillText(
    "\u00a9 OpenStreetMap contributors",
    width * (1 - TEXT_EDGE_MARGIN_RATIO),
    height * (1 - TEXT_EDGE_MARGIN_RATIO),
  );
  ctx.globalAlpha = 1;

  if (includeCredits) {
    ctx.fillStyle = attributionColor;
    ctx.globalAlpha = attributionAlpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
    ctx.fillText(
      `created with ${APP_CREDIT_URL}`,
      width * TEXT_EDGE_MARGIN_RATIO,
      height * (1 - TEXT_EDGE_MARGIN_RATIO),
    );
    ctx.globalAlpha = 1;
  }
}
