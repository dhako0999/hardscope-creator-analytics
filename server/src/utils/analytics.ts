export function calculateEngagementRate(
  views: number,
  likes: number,
  comments: number,
): number {
  if (!views || views <= 0) {
    return 0;
  }

  return Number((((likes + comments) / views) * 100).toFixed(4));
}
