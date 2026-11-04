const YOUTUBE_DOMAINS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      !YOUTUBE_DOMAINS.has(hostname) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    let videoId: string | null = null;
    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      const match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      videoId = match?.[1] ?? null;
    } else if (/^\/watch\/?$/.test(url.pathname)) {
      const values = url.searchParams.getAll("v");
      videoId = values.length === 1 ? values[0] : null;
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/);
      videoId = match?.[1] ?? null;
    }

    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}
