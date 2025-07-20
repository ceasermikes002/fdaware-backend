export const S3_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'your-bucket-name',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key-id',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-access-key',
}; 