import React, { ReactElement, useContext } from 'react';

const context = React.createContext(1);

interface LayerProps {
  priority?: number;
  children: ({ zIndex: number }) => ReactElement;
}

export default function Layer({ children, priority = 0 }: LayerProps) {
  const zIndex = useContext(context) + priority;
  const newZIndex = zIndex * 10;
  return (
    <context.Provider value={newZIndex}>
      {children({ zIndex: zIndex })}
    </context.Provider>
  );
}
