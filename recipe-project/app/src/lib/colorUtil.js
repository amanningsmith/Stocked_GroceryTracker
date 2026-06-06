// Deterministic vibrant gradient for any recipe without a photo.
// Same name always produces the same color — stable across renders and sessions.
const GRADIENTS = [
  'linear-gradient(135deg, #43B581 0%, #2A8C56 100%)',  // emerald
  'linear-gradient(135deg, #E8913A 0%, #C96A18 100%)',  // amber
  'linear-gradient(135deg, #E85D5D 0%, #C93030 100%)',  // tomato
  'linear-gradient(135deg, #A66CCA 0%, #7B40AB 100%)',  // grape
  'linear-gradient(135deg, #4FA8D8 0%, #2878AF 100%)',  // ocean
  'linear-gradient(135deg, #F2C230 0%, #D49A10 100%)',  // gold
  'linear-gradient(135deg, #4BB8A5 0%, #278F7C 100%)',  // teal
  'linear-gradient(135deg, #D46A6A 0%, #B03A3A 100%)',  // brick
];

export function placeholderGradient(name = '') {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}
