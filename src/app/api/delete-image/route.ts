import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to extract public_id from a Cloudinary URL
const getPublicId = (imageUrl: string) => {
    try {
        const url = new URL(imageUrl);
        // The public ID is the last part of the path, without the file extension.
        const pathParts = url.pathname.split('/');
        const versionAndId = pathParts.slice(pathParts.indexOf('upload') + 1).join('/');
        const publicIdWithExtension = versionAndId.substring(versionAndId.indexOf('/') + 1);
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
        return publicId;
    } catch (e) {
        console.error("Invalid image URL for public_id extraction:", imageUrl);
        return null;
    }
};

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 });
    }
    
    const publicId = getPublicId(imageUrl);
    
    if (!publicId) {
        return NextResponse.json({ success: false, error: 'Could not extract public ID from image URL' }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(result.result);
    }
    
    return NextResponse.json({ success: true, message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
