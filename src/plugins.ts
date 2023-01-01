import app from 'apprun';
import { data } from './model/page';
export default async () => {
  app['model'] = { data };
  try {
    // (await import('./ui/editor_toolbar')).default();
  } catch (e) {
    console.error(e);
  }
}