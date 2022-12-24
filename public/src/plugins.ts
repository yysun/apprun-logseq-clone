export default async () => {
  try {
    (await import('./ui/editor_toolbar')).default();
  } catch (e) {
    console.error(e);
  }
}