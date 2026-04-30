import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import HTTPException, status
import logging
from typing import Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_s3_client():
    """Create and return an S3 client."""
    try:
        client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        return client
    except Exception as e:
        logger.error(f"Failed to create S3 client: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS S3 connection failed",
        )


def upload_file_to_s3(
    file_content: bytes,
    s3_key: str,
    content_type: str = "text/csv",
) -> str:
    """Upload a file to S3 and return the S3 URI."""
    client = get_s3_client()
    try:
        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
        s3_uri = f"s3://{settings.S3_BUCKET_NAME}/{s3_key}"
        logger.info(f"Uploaded file to {s3_uri}")
        return s3_uri
    except NoCredentialsError:
        logger.error("AWS credentials not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS credentials not configured",
        )
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error(f"S3 ClientError [{error_code}]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 upload failed: {error_code}",
        )


def download_file_from_s3(s3_key: str) -> bytes:
    """Download a file from S3 and return its content."""
    client = get_s3_client()
    try:
        response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return response["Body"].read()
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error(f"S3 download error [{error_code}]: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found in S3: {s3_key}",
        )


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """Generate a presigned URL for an S3 object."""
    client = get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return None


def list_s3_files(prefix: str = "") -> list:
    """List files in the S3 bucket under a prefix."""
    client = get_s3_client()
    try:
        response = client.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME, Prefix=prefix
        )
        return [obj["Key"] for obj in response.get("Contents", [])]
    except ClientError as e:
        logger.error(f"S3 list error: {e}")
        return []
