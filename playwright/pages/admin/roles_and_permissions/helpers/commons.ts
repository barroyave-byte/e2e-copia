export const formatTextForTestId = (title: string) => {
  return title.trim().toLowerCase().replace(/\s+/g, '-');
};
