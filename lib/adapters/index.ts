import { NotImplementedError, PlatformAdapter } from './types';
const todo = (name: string, why: string): PlatformAdapter => ({
  async publish() { throw new NotImplementedError(`${name}: ${why}`); },
});
export const ADAPTERS: Record<string, PlatformAdapter> = {
  youtube: todo('YouTube', 'account linking works; video upload (resumable videos.insert) is the next step'),
  tiktok: todo('TikTok', 'needs Content Posting API approval; unaudited apps can only post privately'),
  instagram: todo('Instagram', 'needs Meta app review for instagram_content_publish'),
  facebook: todo('Facebook', 'needs Meta app review for pages_manage_posts'),
};
