/**
 * Downloads an image from the given URL and returns it as a Blob.
 * @param url - The HTTP(S) URL of the image to download
 * @returns The downloaded image as a Blob
 * @throws Error if the download fails or the response is not ok
 */
const downloadImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(
      `URL ${url} did not return an image (content-type: ${contentType})`,
    );
  }

  return response.blob();
};

export { downloadImage };
