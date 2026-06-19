const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;
const MAX_IMAGES = 5;

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error("Kunde inte läsa bilden"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Kunde inte läsa filen"));
    reader.readAsDataURL(file);
  });
}

export async function processImageFiles(files: FileList | File[]): Promise<string[]> {
  const fileArray = Array.from(files).slice(0, MAX_IMAGES);
  return Promise.all(fileArray.map(compressImage));
}

export { MAX_IMAGES };
