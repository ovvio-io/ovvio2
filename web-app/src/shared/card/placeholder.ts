import { useState } from 'react';

const PLACEHOLDERS = [
  'Buy beer for the office 🍺 @Someone #party',
  'Order lunch before rush hour @Someone #food #high-priority',
  'Get a coffee, you need it! @Someone #important',
  'Get doughnuts for the team @Someone',
  'Find the secret nap room @Someone',
  'Cover your co-workers desk with sticky notes @Someone #teamwork',
];

export function getRandomCardPlaceholder() {
  const rand = Math.round(Math.random() * (PLACEHOLDERS.length - 1));

  return PLACEHOLDERS[rand];
}

export function useCardPlaceholderText(): string {
  const [placeholder] = useState(getRandomCardPlaceholder);

  return placeholder;
}
