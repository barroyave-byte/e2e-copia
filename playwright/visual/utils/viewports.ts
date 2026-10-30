export const viewports = {
  tablet: { label: 'tablet', width: 768, height: 1024 },
  desktop: { label: 'desktop', width: 1440, height: 900 },
  fullscreen: { label: 'fullscreen', width: 1920, height: 1080 },
  phone: { label: 'phone', width: 393, height: 852 },
};

export const commonViewportSets = {
  all: [viewports.tablet, viewports.desktop, viewports.fullscreen],
  desktopOnly: [viewports.desktop],
  phoneOnly: [viewports.phone],
  tabletOnly: [viewports.tablet],
  desktopAndFullscreen: [viewports.desktop, viewports.fullscreen],
  mobileAndTablet: [viewports.phone, viewports.tablet],
};
