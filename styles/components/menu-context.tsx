import React, { createContext, useContext, useState } from 'react';

const HoverContext = createContext();

export function HoverProvider({ children }) {
  const [firstInstanceUpdated, setFirstInstanceUpdated] = useState(false);

  return (
    <HoverContext.Provider value={{ firstInstanceUpdated, setFirstInstanceUpdated}}>
      {children}
    </HoverContext.Provider>
  );
}

export function useHoverContext() {
  return useContext(HoverContext);
}

