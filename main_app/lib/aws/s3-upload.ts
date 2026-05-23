import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
      Body: buffer,
      ContentType: file.type,
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

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const location = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

    console.log('✅ S3 upload successful:', location);

    return {
      success: true,
      url: location,
    };
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

export const getSignedUrlForS3 = async (key: string): Promise<string> => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ResponseContentDisposition: 'inline',
    };

    console.log('🔗 Generating signed URL for:', key);
    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3Client as any, command, { expiresIn: 3600 });
    console.log('✅ Signed URL generated successfully');

    return signedUrl;
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    throw error;
  }
};

export const extractS3KeyFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('.s3.')) {
      return urlObj.pathname.substring(1);
    } else if (urlObj.hostname.startsWith('s3.')) {
      const pathParts = urlObj.pathname.split('/');
      return pathParts.slice(2).join('/');
    } else {
      return urlObj.pathname.substring(1);
    }
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return url.split('/').slice(3).join('/');
  }
};
