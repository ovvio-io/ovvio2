import React, { ReactElement, useContext } from 'https://esm.sh/react@18.2.0';

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
