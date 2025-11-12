// Shared list of available emojis
// This should match the EMOJIS array in client/src/constants/emojis.js
export const EMOJIS = [
  '👶', '🧸', '⭐', '💫', '🎈', '✨', '🌱',
  '🎀', '🎁', '🎃', '🐻', '🐰', '🐱', '🐶', 
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🌙', 
  '☀️', '🌈', '☁️', '🌺', '🌻', '🌷', '🌹', 
  '🌸', '🍎', '🍌', '🍓', '🍇', '🍉', '🍊', 
  '🍋', '🍑', '🍒', '🥝', '🚀', '🎪', '🎨', 
  '🎭', '🎧', '🎮', '🎯', '🎲', '🥝', '🥑',
  '🌿', '🍀', '🍁', '🍄', '🌵', '🌴', '🌲'
];

// Generate a random emoji
export function getRandomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

