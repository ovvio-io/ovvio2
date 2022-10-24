import React, { useContext, useMemo } from 'react';

export interface DemoData {
  isInDemo: boolean;
  demoWorkspaces: string[];
  setSelectedWorkspaces: React.Dispatch<React.SetStateAction<string[]>>;
}

const DemoContext = React.createContext<DemoData>({
  isInDemo: false,
  demoWorkspaces: [],
  setSelectedWorkspaces: () => {},
});

export const DemoProvider: React.FC<DemoData> = ({
  isInDemo,
  demoWorkspaces,
  setSelectedWorkspaces,
  children,
}) => {
  const ctx = useMemo(
    () => ({
      isInDemo,
      demoWorkspaces,
      setSelectedWorkspaces,
    }),
    [isInDemo, demoWorkspaces, setSelectedWorkspaces]
  );

  return <DemoContext.Provider value={ctx}>{children}</DemoContext.Provider>;
};

export function useDemoInfo() {
  return useContext(DemoContext);
}
