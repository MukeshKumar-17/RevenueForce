import JSZip from "jszip";

// Zips { "path/inside/zip.md": "text" } into <folderName>.zip and starts a browser download.
export async function downloadZip(files, folderName) {
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  for (const [path, content] of Object.entries(files)) {
    folder.file(path, content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${folderName}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // give the browser time to start the download
}
