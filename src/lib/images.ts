const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
const WARN_BYTES = 1024 * 1024;

export interface ProcessedImage {
    blob: Blob;
    previewUrl: string;
    ext: 'webp' | 'jpg';
    tooLarge: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            resolve(img);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that image file.'));
        };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function processImage(file: File): Promise<ProcessedImage> {
    const img = await loadImage(file);

    let { width, height } = img;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
    let ext: 'webp' | 'jpg' = 'webp';

    if (!blob) {
        blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
        ext = 'jpg';
    }
    if (!blob) throw new Error('This browser could not encode the image. Try a different image or browser.');

    return {
        blob,
        previewUrl: URL.createObjectURL(blob),
        ext,
        tooLarge: blob.size > WARN_BYTES,
    };
}

export function safeFileSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'image';
}

export function buildImagePath(postSlug: string, originalName: string, ext: string): string {
    const stamp = Date.now();
    return `public/images/blog/${postSlug}/${stamp}-${safeFileSlug(originalName)}.${ext}`;
}

/** Cover images get a stable, un-timestamped filename so re-publishing overwrites in place. */
export function buildCoverPath(postSlug: string, ext: string): string {
    return `public/images/blog/${postSlug}/cover.${ext}`;
}

export function publicUrlFor(repoPath: string): string {
    // repoPath is `public/images/blog/...` -> served from BASE_URL + `images/...`
    const withoutPublic = repoPath.replace(/^public\//, '');
    return `${import.meta.env.BASE_URL}${withoutPublic}`;
}
