// Each font's zoom levels, each with a "<font> <size>" family in fonts.css. Lucida's are an original 10/12/14/18px
// bitmap or one doubled (8 was too small and 16, 8px doubled, too blocky), Helvetica's likewise from 10/12/14/18/24;
// Terminus has every level natively.
// bitmapText.ts snaps every glyph to whole pixels, so these all stay sharp. Every font needs 12 (the default and
// Settings) and 18 (phones)
export const FONTS: Record<string, number[]> = {
  'Lucida Sans': [10, 12, 14, 18, 20, 24, 28, 36],
  Terminus: [12, 14, 16, 18, 20, 22, 24, 28, 32],
  Helvetica: [10, 12, 14, 18, 20, 24, 28, 36],
  'Luxi Sans TTF': [10, 12, 14, 18, 20, 24, 28, 36],
  'Luxi Serif TTF': [10, 12, 14, 18, 20, 24, 28, 36],
}
// Outline fonts (NsCDE's Luxi, "TTF" so they read as not the bitmaps): one family for every size, drawn by the
// browser rather than bitmapText.ts
export const OUTLINE = ['Luxi Sans TTF', 'Luxi Serif TTF']
