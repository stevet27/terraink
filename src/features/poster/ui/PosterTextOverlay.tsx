import { formatCoordinates } from "@/shared/geo/posterBounds";
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
  formatCityLabel,
} from "@/features/poster/domain/textLayout";
import { parseHex } from "@/shared/utils/color";

interface PosterTextOverlayProps {
  title: string;
  citySpacing: number;
  city: string;
  landscape: boolean;
  country: string;
  lat: number;
  lon: number;
  date: string;
  fontFamily: string;
  textColor: string;
  landColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  showOverlay: boolean;
}

/**
 * DOM-based poster text overlay (sharp at any resolution, GPU-composited).
 * Renders city name, divider, country, coordinates, and attribution
 * positioned to match the canvas export layout exactly.
 */
export default function PosterTextOverlay({
  title,
  citySpacing,
  city,
  landscape,
  country,
  lat,
  lon,
  date,
  fontFamily,
  textColor,
  landColor,
  showPosterText,
  includeCredits,
  showOverlay,
}: PosterTextOverlayProps) {
  const toCqMin = (px: number) => (px / TEXT_DIMENSION_REFERENCE_PX) * 100;

  const titleFont = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFont = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const hasTitle = title.trim().length > 0;
  const titleFontSize = `${toCqMin(TITLE_FONT_BASE_PX)}cqmin`;
  const cityBaseSize = toCqMin(hasTitle ? CITY_FONT_WITH_TITLE_BASE_PX : CITY_FONT_BASE_PX);
  const cityMinSize = toCqMin(hasTitle ? CITY_FONT_WITH_TITLE_MIN_PX : CITY_FONT_MIN_PX);
  const detailText = date.trim() ? date.trim() : formatCoordinates(lat, lon);

  const cityLabel = formatCityLabel(city, citySpacing);

  const cityLen = Math.max(city.length, 1);
  const cityFontSize =
    cityLen > CITY_TEXT_SHRINK_THRESHOLD
      ? `${Math.max(cityMinSize, cityBaseSize * (CITY_TEXT_SHRINK_THRESHOLD / cityLen))}cqmin`
      : `${cityBaseSize}cqmin`;

  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX)}cqmin`;
  const landRgb = parseHex(landColor);
  const landLuma = landRgb
    ? (0.2126 * landRgb.r + 0.7152 * landRgb.g + 0.0722 * landRgb.b) / 255
    : 0.5;
  const attributionColor = showOverlay
    ? textColor
    : landLuma < 0.52
      ? "#f5faff"
      : "#0e1822";
  const attributionOpacity = showOverlay ? 0.55 : 0.9;

  return (
    <div className="poster-text-overlay" style={{ color: textColor }}>
      {showPosterText && (
        <>
          {title.trim() && (
            <p
              className="poster-title"
              style={{
                fontFamily: titleFont,
                top: `${(landscape ? TEXT_TITLE_Y_RATIO_LANDSCAPE : TEXT_TITLE_Y_RATIO) * 100}%`,
                fontSize: titleFontSize,
                textShadow: `0 0 12px ${landColor}, 0 0 6px ${landColor}`,
              }}
            >
              {title.trim()}
            </p>
          )}
          <p
            className="poster-city"
            style={{
              fontFamily: titleFont,
              top: `${TEXT_CITY_Y_RATIO * 100}%`,
              fontSize: cityFontSize,
            }}
          >
            {cityLabel}
          </p>
          <hr
            className="poster-divider"
            style={{
              borderColor: textColor,
              top: `${TEXT_DIVIDER_Y_RATIO * 100}%`,
            }}
          />
          <p
            className="poster-country"
            style={{
              fontFamily: titleFont,
              top: `${TEXT_COUNTRY_Y_RATIO * 100}%`,
              fontSize: countryFontSize,
            }}
          >
            {country.toUpperCase()}
          </p>
          <p
            className="poster-coords"
            style={{
              fontFamily: bodyFont,
              top: `${TEXT_COORDS_Y_RATIO * 100}%`,
              fontSize: coordsFontSize,
            }}
          >
            {detailText}
          </p>
        </>
      )}

      <span
        className="poster-attribution"
        style={{
          fontFamily: bodyFont,
          color: attributionColor,
          opacity: attributionOpacity,
          fontSize: attributionFontSize,
          bottom: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
          right: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
        }}
      >
        &copy; OpenStreetMap contributors
      </span>

      {includeCredits && (
        <span
          className="poster-credits"
          style={{
            fontFamily: bodyFont,
            color: attributionColor,
            opacity: attributionOpacity,
            fontSize: attributionFontSize,
            bottom: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
            left: `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
          }}
        >
          created with {APP_CREDIT_URL}
        </span>
      )}
    </div>
  );
}
