import { isServerSide } from './utils/ssr.ts';
import { useWindowSize } from './utils/hooks/use-window-size.ts';

export enum Breakpoints {
  Small = 576,
  Medium = 768,
  Large = 992,
  XLarge = 1200,
}

export const MediaQueries = {
  Mobile: `@media (max-width: ${Breakpoints.Medium}px)`,
  Tablet: `@media (min-width: ${Breakpoints.Medium}px)`,
  TabletOnly: `@media (min-width: ${Breakpoints.Medium}px) and (max-width: ${Breakpoints.Large}px)`,
  TabletAndMobile: `@media (max-width: ${Breakpoints.Large}px)`,
  Computer: `@media (min-width: ${Breakpoints.Large}px)`,
  LaptopOnly: `@media (min-width: ${Breakpoints.Large}px) and (max-width: ${Breakpoints.XLarge}px)`,
  Desktop: `@media (min-width: ${Breakpoints.XLarge}px)`,
};

export enum Devices {
  Mobile,
  Tablet,
  Laptop,
  Desktop,
}

function getDevice(screenWidth: number) {
  if (screenWidth < Breakpoints.Medium) {
    return Devices.Mobile;
  }
  if (screenWidth < Breakpoints.Large) {
    return Devices.Tablet;
  }
  if (screenWidth < Breakpoints.XLarge) {
    return Devices.Laptop;
  }
  return Devices.Desktop;
}

export function getCurrentDevice() {
  return getDevice(window.innerWidth);
}

export const useCurrentDevice = isServerSide
  ? () => Devices.Laptop
  : function () {
      const { width } = useWindowSize();

      return getDevice(width);
    };
