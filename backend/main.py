from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import torchvision
from torchvision import transforms as T
from torchvision.models.detection import FasterRCNN_ResNet50_FPN_Weights
from PIL import Image
from transformers import AutoProcessor, BlipForConditionalGeneration
import os
import uuid
import gtts
import shutil
import logging

# ---------------------------
# 1. FastAPI App & CORS Setup
# ---------------------------
app = FastAPI()

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# ---------------------------
# 2. Environment Setup & Model Initialization
# ---------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Fix for missing cache directory issue
os.environ["TORCH_HOME"] = os.path.join(os.getcwd(), "torch_cache")
os.environ["HF_HOME"] = os.path.join(os.getcwd(), "huggingface_cache")

# Load Object Detection Model with correct API
object_detector = torchvision.models.detection.fasterrcnn_resnet50_fpn(
    weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT
).eval().to(device)

# Load Image Captioning Model
caption_processor = AutoProcessor.from_pretrained("./models/blip-image-captioning-base")
caption_model = BlipForConditionalGeneration.from_pretrained("./models/blip-image-captioning-base")

# Directory for storing uploaded files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------
# 3. Scene Description Function
# ---------------------------
def describe_scene(image_path: str, detection_threshold=0.6, max_caption_length=50):
    """
    Processes the image using object detection & generates a caption.
    """
    try:
        image = Image.open(image_path).convert("RGB")
        transform = T.Compose([T.ToTensor()])
        input_tensor = transform(image).unsqueeze(0).to(device)

        # Object Detection
        with torch.no_grad():
            detections = object_detector(input_tensor)[0]

        scores = detections["scores"]
        keep = scores >= detection_threshold
        bboxes = detections["boxes"][keep]
        labels = detections["labels"][keep]

        # Image Captioning
        inputs = caption_processor(images=image, text="", return_tensors="pt").to(device)
        with torch.no_grad():
            generated_ids = caption_model.generate(**inputs, max_length=max_caption_length)
        caption = caption_processor.decode(generated_ids[0], skip_special_tokens=True)

        return caption

    except Exception as e:
        logger.error(f"Error in scene description: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in scene description: {str(e)}")

# ---------------------------
# 4. API Endpoints
# ---------------------------
@app.get("/")
def root():
    return {"message": "Backend is running successfully!"}

@app.post("/analyze/")
async def analyze_image(file: UploadFile = File(...)):
    """
    Receives an image, runs object detection & captioning, then generates TTS.
    """
    try:
        # Validate file type
        allowed_extensions = {"jpg", "jpeg", "png"}
        file_ext = file.filename.split(".")[-1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=422, detail="Invalid file type. Only JPG, JPEG, and PNG are allowed.")

        # Validate file size (e.g., 5MB limit)
        max_file_size = 5 * 1024 * 1024  # 5MB
        file.file.seek(0, 2)  # Move to the end of the file
        file_size = file.file.tell()  # Get file size
        file.file.seek(0)  # Reset file pointer
        if file_size > max_file_size:
            raise HTTPException(status_code=422, detail="File size exceeds the 5MB limit.")

        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.{file_ext}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run scene description
        caption = describe_scene(file_path)

        # Generate TTS
        tts_file = file_path.replace(f".{file_ext}", ".mp3")
        tts = gtts.gTTS(caption)
        tts.save(tts_file)

        return JSONResponse({"caption": caption, "audio_url": f"/audio/{os.path.basename(tts_file)}"})

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to process image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Serves the generated TTS audio file.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg")