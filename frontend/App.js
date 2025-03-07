import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator,
  Platform,
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Audio } from 'expo-av';

export default function ImageUploadApp() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // BASE URL configuration
  const BASE_URL = 'http://192.168.231.228:8000';

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permissions needed', 'We need camera roll permissions to continue.');
        return;
      }

      // Launch image picker with optimized options
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Reduced quality to help with file size
        aspect: [4, 3],
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Validate file extension
        const fileUri = selectedAsset.uri;
        const fileExtension = fileUri.split('.').pop().toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png'];
        
        if (!allowedExtensions.includes(fileExtension)) {
          Alert.alert('Error', 'Invalid file type. Please select JPG, JPEG, or PNG.');
          return;
        }
        
        // Validate file size
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        const fileSizeMB = fileInfo.size / (1024 * 1024);
        
        if (fileSizeMB > 5) {
          Alert.alert('Error', 'File size exceeds 5MB limit. Please select a smaller image.');
          return;
        }

        console.log('Selected image details:', {
          uri: fileUri,
          type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
          size: `${fileSizeMB.toFixed(2)}MB`
        });

        setSelectedImage(selectedAsset);
        uploadImage(selectedAsset);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick an image: ' + error.message);
    }
  };

  const uploadImage = async (image) => {
    if (!image || !image.uri) {
      Alert.alert('Error', 'No image selected');
      return;
    }

    setIsLoading(true);
    setCaption('');
    setAudioUrl(null);
    
    // Stop any playing audio
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlayingAudio(false);
    }

    // Create FormData with proper file information
    const formData = new FormData();
    const fileUri = image.uri;
    const fileExtension = fileUri.split('.').pop().toLowerCase();
    
    formData.append('file', {
      uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
      name: `image_${Date.now()}.${fileExtension}`,
      type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
    });

    console.log('Uploading image with formData:', formData);

    try {
      const response = await axios.post(`${BASE_URL}/analyze/`, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // Extended timeout for larger images
      });

      console.log('Upload response:', response.data);
      
      if (response.data && response.data.caption) {
        setCaption(response.data.caption);
        if (response.data.audio_url) {
          setAudioUrl(`${BASE_URL}${response.data.audio_url}`);
        }
      } else {
        setCaption('No caption generated');
      }
    } catch (error) {
      console.error('Detailed upload error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      });

      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const errorDetail = error.response.data?.detail || 'Unknown server error';
        
        if (status === 422) {
          Alert.alert('Validation Error', errorDetail);
        } else if (status >= 500) {
          Alert.alert('Server Error', 'The server encountered an error processing your image.');
        } else {
          Alert.alert('Error', `Server responded with: ${errorDetail}`);
        }
      } else if (error.request) {
        Alert.alert('Network Error', 'Could not reach the server. Please check your connection.');
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }

      setCaption('Failed to generate caption');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async () => {
    if (!audioUrl) return;
    
    try {
      if (sound) {
        // If audio is already loaded
        if (isPlayingAudio) {
          await sound.pauseAsync();
          setIsPlayingAudio(false);
        } else {
          await sound.playAsync();
          setIsPlayingAudio(true);
        }
      } else {
        // Load the audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Audio Error', 'Could not play audio description');
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsPlayingAudio(false);
    }
  };

  const resetImage = () => {
    setSelectedImage(null);
    setCaption('');
    setAudioUrl(null);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlayingAudio(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visual Aid Assistant</Text>
      
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Text style={styles.uploadButtonText}>
          {selectedImage ? 'Change Image' : 'Upload Image'}
        </Text>
      </TouchableOpacity>

      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: selectedImage.uri }} 
            style={styles.image} 
          />

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
          ) : (
            caption ? (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>{caption}</Text>
                
                {audioUrl && (
                  <TouchableOpacity 
                    style={styles.audioButton} 
                    onPress={playAudio}
                  >
                    <Text style={styles.audioButtonText}>
                      {isPlayingAudio ? 'Pause Audio' : 'Play Audio Description'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          )}

          <TouchableOpacity style={styles.resetButton} onPress={resetImage}>
            <Text style={styles.resetButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loader: {
    marginTop: 20,
  },
  captionContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    width: '90%',
  },
  captionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  audioButton: {
    marginTop: 15,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  audioButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 10,
  },
  resetButtonText: {
    color: 'white',
    textAlign: 'center',
  },
});