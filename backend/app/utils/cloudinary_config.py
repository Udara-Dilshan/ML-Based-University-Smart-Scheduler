import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()

def init_cloudinary():
    """Initialize Cloudinary configuration from environment variables."""
    cloudinary_url = os.getenv("CLOUDINARY_URL")
    if cloudinary_url:
        # The cloudinary python package automatically detects CLOUDINARY_URL from the environment
        # But we explicitly call config() to ensure it's initialized if needed
        cloudinary.config()
        return True
    return False

def upload_image(file_content: bytes, folder: str = "", filename: str = None) -> str:
    """
    Uploads an image (or file) to Cloudinary and returns the secure URL.
    
    :param file_content: The bytes of the file to upload
    :param folder: The Cloudinary folder to store the file in (e.g. 'uni-scheduler/profiles')
    :param filename: Optional filename (Cloudinary will generate a random one if not provided)
    :return: The secure URL of the uploaded file
    """
    resource_type = "auto"
    if filename:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext in ["pdf", "doc", "docx", "xls", "xlsx", "zip", "txt"]:
            resource_type = "raw"
            
    options = {"resource_type": resource_type}
    if folder:
        options["folder"] = folder
    if filename:
        options["public_id"] = filename

    result = cloudinary.uploader.upload(file_content, **options)
    return result.get("secure_url")
