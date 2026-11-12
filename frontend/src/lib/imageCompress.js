/**
 * Client-side image compression for mobile label captures
 * Resizes longest dimension to max 1600px, converts to JPEG/WebP, and guards <= 5MB
 */

const MAX_DIMENSION = 1600;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function compressImage(file) {
  if (!file) {
    throw new Error('No image file provided');
  }

  // Validate MIME type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Please upload a valid JPG, PNG, or WebP image');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Corrupt or unsupported image format'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down if larger than MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize canvas context'));
          return;
        }

        // Draw image on white background for transparency handling
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed'));
              return;
            }

            if (blob.size > MAX_FILE_SIZE_BYTES) {
              reject(new Error('Compressed image still exceeds 5MB limit. Please crop or reduce lighting glare.'));
              return;
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              previewUrl: URL.createObjectURL(blob),
              width,
              height,
              sizeBytes: blob.size,
            });
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

