/**
 * Convert an image file path to base64 data URL for local storage
 */
export const imageUrlToBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    // If it's already a data URL, return it
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`, response.status);
      return null;
    }

    // Convert to blob
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = () => {
        console.warn(`Failed to convert image to base64: ${imageUrl}`, reader.error);
        reject(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error converting image to base64: ${imageUrl}`, error);
    return null;
  }
};

/**
 * Convert all crop image URLs to base64 and return updated crops
 */
export const convertCropImagesToBase64 = async (crops: Array<{ id: string; imageUrl?: string; [key: string]: any }>): Promise<Array<any>> => {
  const convertedCrops = await Promise.all(
    crops.map(async (crop) => {
      if (!crop.imageUrl || crop.imageUrl.startsWith('data:')) {
        // Already base64 or no image
        return crop;
      }

      // Convert image to base64
      const base64Image = await imageUrlToBase64(crop.imageUrl);
      if (base64Image) {
        return { ...crop, imageUrl: base64Image };
      }
      
      // If conversion failed, keep original URL
      return crop;
    })
  );

  return convertedCrops;
};

/**
 * Compress an image file to reduce size for storage
 * Resizes to max 1200px width/height and reduces quality to 0.8
 */
export const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
