import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();

export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadReceiptToS3 = async (
  file: File,
  orderId: string,
  orderType: string
): Promise<UploadResponse> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fileExtension = file.name.split('.').pop();
    const fileName = `receipts/${orderType}/${orderId}/${uuidv4()}.${fileExtension}`;
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer, // 🔥 FIX: Use buffer instead of file
      ContentType: file.type,
      ACL: 'private' as const, // Private access only for admin
      Metadata: {
        'original-name': file.name,
        'order-id': orderId,
        'order-type': orderType,
        'upload-date': new Date().toISOString(),
      },
    };

    console.log('📤 Uploading to S3:', {
      bucket: uploadParams.Bucket,
      key: fileName,
      size: buffer.length,
      contentType: file.type,
    });

    const result = await s3.upload(uploadParams).promise();
    
    console.log('✅ S3 upload successful:', result.Location);
    
    return {
      success: true,
      url: result.Location,
    };
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// Function to get signed URL for viewing PDF
export const getSignedUrl = async (key: string): Promise<string> => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Expires: 3600, // URL expires in 1 hour
      ResponseContentDisposition: 'inline', // 🔥 ADD: Display PDF in browser instead of downloading
    };
    
    console.log('🔗 Generating signed URL for:', key);
    const signedUrl = s3.getSignedUrl('getObject', params);
    console.log('✅ Signed URL generated successfully');
    
    return signedUrl;
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    throw error;
  }
};

// 🔥 ADD: Helper function to extract S3 key from URL
export const extractS3KeyFromUrl = (url: string): string => {
  try {
    // Handle both S3 URL formats:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key
    
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('.s3.')) {
      // Format: https://bucket.s3.region.amazonaws.com/key
      return urlObj.pathname.substring(1); // Remove leading slash
    } else if (urlObj.hostname.startsWith('s3.')) {
      // Format: https://s3.region.amazonaws.com/bucket/key
      const pathParts = urlObj.pathname.split('/');
      return pathParts.slice(2).join('/'); // Remove /bucket part
    } else {
      // Fallback: assume the path is the key
      return urlObj.pathname.substring(1);
    }
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    // Fallback: return the original URL without protocol and domain
    return url.split('/').slice(3).join('/');
  }
};