import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl, extractS3KeyFromUrl } from '@/lib/aws/s3-upload';

export async function POST(request: NextRequest) {
  try {
    const { receiptUrl } = await request.json();

    if (!receiptUrl) {
      return NextResponse.json(
        { success: false, error: 'Receipt URL is required' },
        { status: 400 }
      );
    }

    console.log('📄 Processing view request for URL:', receiptUrl);

    // 🔥 FIX: Use the helper function to extract S3 key
    const key = extractS3KeyFromUrl(receiptUrl);
    
    console.log('🔑 Extracted S3 key:', key);

    // Generate signed URL
    const signedUrl = await getSignedUrl(key);

    console.log('✅ Signed URL generated successfully');

    return NextResponse.json({
      success: true,
      signedUrl,
    });
  } catch (error) {
    console.error('❌ View receipt error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate view URL' },
      { status: 500 }
    );
  }
}