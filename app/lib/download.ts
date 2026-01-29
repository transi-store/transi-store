function createAnchor(href: string, name = "download"): HTMLAnchorElement {
  const id = `dowload-link-${Date.now()}-${Math.round(
    Math.random() * 1000000,
  )}`;

  const anchor = document.createElement("a");

  anchor.setAttribute("class", "hidden");
  anchor.setAttribute("download", name);
  anchor.setAttribute("id", id);
  anchor.href = href;

  return anchor;
}

function convertBlobPromiseToDataUrl(
  blobPromise: Promise<Blob>,
): Promise<string> {
  return blobPromise.then((blob) => URL.createObjectURL(blob));
}

export function downloadFile(url: string, name?: string): void {
  const anchor = createAnchor(url, name);

  document.body.append(anchor);

  const link = document.getElementById(anchor.id);

  if (!link) {
    throw new Error("Unable to create anchor link for download");
  }

  link.click();
  link.remove();
}

export function downloadResponse(
  response: Response,
  name: string,
): Promise<void> {
  return convertBlobPromiseToDataUrl(response.blob()).then((url) => {
    createAnchor(url, name).click();
  });
}
