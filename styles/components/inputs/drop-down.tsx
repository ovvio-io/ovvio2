import React, { useContext, useMemo } from 'react';
import Menu, { MenuItem } from '../menu.tsx';

interface DropDownItemProps {
  selected?: boolean;
  children?: React.ReactNode;
  value: any;
  className?: string;
  onChange?: (value: any) => void;
}

const DropDownContext = React.createContext({
  onChange(value: any) {},
  currentValue: null as any,
});

export function DropDownItem({
  children,
  value,
  className,
  ...props
}: DropDownItemProps) {
  const { onChange } = useContext(DropDownContext);

  return (
    <MenuItem className={className} onClick={() => onChange(value)} {...props}>
      {children}
    </MenuItem>
  );
}

interface DropDownProps {
  value: any;
  onChange: (value: any) => void;
  children: any;
  renderSelected: any;
  onOpen?: () => void;
  className?: any;
  align?: 'start' | 'center' | 'end';
  position?: 'top' | 'bottom' | 'left' | 'right';
  direction?: 'in' | 'out';
  popupClassName?: any;
  sizeByButton?: boolean;
}

const noop = () => {};

export default function DropDown({
  value,
  onChange,
  children,
  renderSelected,
  onOpen = noop,

  ...props
}: DropDownProps) {
  const ctx = useMemo(
    () => ({
      onChange,
      currentValue: value,
    }),
    [value, onChange]
  );

  return (
    <DropDownContext.Provider value={ctx}>
      <Menu
        onClick={onOpen}
        renderButton={renderSelected}
        direction="out"
        align="end"
        position="bottom"
        {...props}
      >
        {children}
      </Menu>
    </DropDownContext.Provider>
  );
}
