import React from "react";
import { FONT_FAMILY_GROUPS } from "../constants/fontFamilies";

export default function FontFamilySelect({ value, onChange, ...props }) {
  const selectedValue = value || "Inter";
  const knownFonts = new Set(FONT_FAMILY_GROUPS.flatMap((group) => group.fonts));

  return (
    <select value={selectedValue} onChange={(event) => onChange(event.target.value)} {...props}>
      {!knownFonts.has(selectedValue) && (
        <optgroup label="Current">
          <option value={selectedValue}>{selectedValue}</option>
        </optgroup>
      )}
      {FONT_FAMILY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
