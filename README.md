# Blind Help - Visual Aid Assistant

An AI-powered mobile application designed to assist visually impaired users by providing audio descriptions of images. The app uses advanced deep learning models for object detection and image captioning, converting visual information into spoken descriptions.

## 🌟 Features

- **Image Analysis**: Upload or capture images to get detailed descriptions
- **Object Detection**: Identifies objects in images using Faster R-CNN with ResNet-50
- **Image Captioning**: Generates natural language descriptions using BLIP (Bootstrapping Language-Image Pre-training)
- **Text-to-Speech**: Converts image descriptions into audio using Google Text-to-Speech
- **Audio Playback**: Listen to image descriptions with play/pause controls
- **Mobile-First Design**: Built with React Native for cross-platform compatibility (iOS, Android, Web)
- **User-Friendly Interface**: Simple, accessible UI designed with accessibility in mind

## 🏗️ Architecture

The application follows a client-server architecture:

```
┌─────────────────────┐
│   React Native App  │
│   (Expo Frontend)   │
│                     │
│  - Image Upload     │
│  - Audio Playback   │
│  - UI/UX            │
└──────────┬──────────┘
           │ HTTP/REST
           │
┌──────────▼──────────┐
│   FastAPI Backend   │
│                     │
│  - Object Detection │
│  - Image Captioning │
│  - TTS Generation   │
└─────────────────────┘
```

### Technology Stack

#### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **PyTorch**: Deep learning framework
- **Torchvision**: Computer vision models and utilities
- **Transformers (Hugging Face)**: BLIP model for image captioning
- **Pillow**: Image processing
- **gTTS**: Google Text-to-Speech for audio generation

#### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: React Native development platform
- **Axios**: HTTP client for API requests
- **Expo Image Picker**: Image selection from device
- **Expo AV**: Audio playback functionality

## 📋 Prerequisites

### Backend Requirements
- Python 3.8 or higher
- pip (Python package manager)
- 4GB+ RAM recommended
- CUDA-compatible GPU (optional, for faster processing)

### Frontend Requirements
- Node.js 14.x or higher
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

## 🚀 Installation

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Download the BLIP model**:
   The application uses the BLIP image captioning model. Create a `models` directory and download the model:
   ```bash
   mkdir -p models
   cd models
   git clone https://huggingface.co/Salesforce/blip-image-captioning-base
   cd ..
   ```

5. **Create necessary directories**:
   ```bash
   mkdir -p uploads
   mkdir -p torch_cache
   mkdir -p huggingface_cache
   ```

6. **Start the backend server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the backend URL**:
   Open `App.js` and update the `BASE_URL` constant with your backend server address:
   ```javascript
   const BASE_URL = 'http://YOUR_IP_ADDRESS:8000';
   ```
   
   **Note**: 
   - For iOS Simulator, you can use `http://localhost:8000`
   - For Android Emulator, use `http://10.0.2.2:8000`
   - For physical devices, use your computer's local IP address (e.g., `http://192.168.1.100:8000`)

4. **Start the Expo development server**:
   ```bash
   npm start
   ```

5. **Run on your platform**:
   - **iOS**: Press `i` in the terminal or run `npm run ios`
   - **Android**: Press `a` in the terminal or run `npm run android`
   - **Web**: Press `w` in the terminal or run `npm run web`

## 🎯 Usage

### Using the Mobile App

1. **Launch the app** on your device or emulator
2. **Upload an image**:
   - Tap the "Upload Image" button
   - Grant camera/photo library permissions if prompted
   - Select an image from your device (JPG, JPEG, or PNG format, max 5MB)
3. **Wait for processing**: The app will send the image to the backend for analysis
4. **View the caption**: A text description of the image will appear
5. **Listen to the description**: Tap "Play Audio Description" to hear the caption read aloud
6. **Upload another image**: Tap "Change Image" to analyze a different photo

### API Endpoints

#### `GET /`
Health check endpoint to verify the backend is running.

**Response**:
```json
{
  "message": "Backend is running successfully!"
}
```

#### `POST /analyze/`
Upload and analyze an image.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing the image

**Request Constraints**:
- Supported formats: JPG, JPEG, PNG
- Maximum file size: 5MB

**Response**:
```json
{
  "caption": "a person standing on a beach",
  "audio_url": "/audio/generated_audio_id.mp3"
}
```

**Error Responses**:
- `422`: Invalid file type or file size exceeds limit
- `500`: Server error during processing

#### `GET /audio/{filename}`
Retrieve the generated audio file.

**Parameters**:
- `filename`: The audio file name returned from `/analyze/` endpoint

**Response**: Audio file (MP3 format)

## 📁 Project Structure

```
blind-help/
├── backend/
│   ├── main.py                 # FastAPI application and endpoints
│   ├── requirements.txt        # Python dependencies
│   ├── models/                 # ML models directory
│   │   └── blip-image-captioning-base/
│   ├── uploads/                # Temporary storage for uploaded images
│   ├── torch_cache/            # PyTorch model cache
│   └── huggingface_cache/      # Hugging Face model cache
│
├── frontend/
│   ├── App.js                  # Main React Native application
│   ├── index.js                # Application entry point
│   ├── package.json            # Node.js dependencies
│   ├── app.json                # Expo configuration
│   └── assets/                 # App icons and images
│       ├── icon.png
│       ├── splash-icon.png
│       ├── adaptive-icon.png
│       └── favicon.png
│
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Backend Configuration

The backend uses several configuration options that can be customized:

1. **Device Selection**: The backend automatically detects and uses CUDA GPU if available:
   ```python
   device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
   ```

2. **Model Paths**: Models are cached in dedicated directories:
   ```python
   os.environ["TORCH_HOME"] = os.path.join(os.getcwd(), "torch_cache")
   os.environ["HF_HOME"] = os.path.join(os.getcwd(), "huggingface_cache")
   ```

3. **CORS Configuration**: Update allowed origins in `main.py` for production:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Change this for production
       ...
   )
   ```

4. **Detection Parameters**: Adjust object detection sensitivity:
   ```python
   def describe_scene(image_path: str, detection_threshold=0.6, max_caption_length=50):
   ```

### Frontend Configuration

1. **Backend URL**: Update in `App.js`:
   ```javascript
   const BASE_URL = 'http://YOUR_BACKEND_URL:8000';
   ```

2. **Image Quality**: Adjust compression in `App.js`:
   ```javascript
   quality: 0.7, // 0.0 to 1.0
   ```

3. **File Size Limit**: Modify validation in `App.js`:
   ```javascript
   const max_file_size = 5 * 1024 * 1024; // 5MB
   ```

## 🐛 Troubleshooting

### Backend Issues

**Issue**: `Model not found` error
- **Solution**: Ensure the BLIP model is downloaded in the `models/blip-image-captioning-base/` directory

**Issue**: `CUDA out of memory`
- **Solution**: The app will automatically fall back to CPU. Consider reducing image resolution or using a machine with more GPU memory

**Issue**: `Port 8000 already in use`
- **Solution**: Change the port: `uvicorn main:app --port 8001`

### Frontend Issues

**Issue**: `Network Error` when uploading images
- **Solution**: 
  1. Verify the backend is running
  2. Check the `BASE_URL` is correctly set
  3. Ensure your device can reach the backend (same network for physical devices)

**Issue**: Audio not playing
- **Solution**: 
  1. Check device volume settings
  2. Verify audio permissions are granted
  3. Ensure the backend successfully generated the audio file

**Issue**: "Invalid file type" error
- **Solution**: Only JPG, JPEG, and PNG formats are supported. Convert your image or try a different file.

**Issue**: "File size exceeds limit" error
- **Solution**: Compress the image or select a smaller image (max 5MB)

### Common Development Issues

**Issue**: Expo app not connecting to development server
- **Solution**:
  1. Ensure your device and computer are on the same network
  2. Try running with tunnel: `expo start --tunnel`
  3. Clear Expo cache: `expo start -c`

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly on both iOS and Android (if possible)
- Update documentation for any new features
- Ensure the backend passes all tests before submitting

## 📝 License

This project is licensed under the 0BSD License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **BLIP Model**: Salesforce Research for the BLIP image captioning model
- **Faster R-CNN**: Facebook AI Research for object detection
- **Expo**: For the excellent React Native development platform
- **FastAPI**: For the modern Python web framework

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for similar problems
- Provide detailed information about your environment and the issue

## 🔮 Future Enhancements

- [ ] Real-time camera capture and analysis
- [ ] Multi-language support for audio descriptions
- [ ] Offline mode with on-device models
- [ ] Scene understanding with more context
- [ ] Object counting and spatial relationships
- [ ] Integration with voice commands
- [ ] History of analyzed images
- [ ] Customizable TTS voice and speed
- [ ] Cloud deployment options
- [ ] Enhanced accessibility features

---

**Made with ❤️ for improving accessibility through AI**
