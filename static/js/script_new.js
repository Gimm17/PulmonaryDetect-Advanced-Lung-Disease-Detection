// Global variables
let model, webcam, labelContainer, maxPredictions;
let isModelLoaded = false;
let currentMode = "webcam";
let uploadedImageElement = null;
let capturedPhoto = null;
let predictionInterval = null;
let isRealtimeMode = true; // Flag for realtime mode
let selectedCameraId = null; // Store selected camera device ID
let requestAnimationFrameId = null; // For tracking animation frame requests
let lastFrameTime = 0; // For throttling frames
let renderFPS = 30; // Target FPS for rendering
let processingFPS = 5; // Target FPS for ML processing
let lastProcessingTime = 0; // For throttling processing
let isHighPerformanceMode = true; // Flag for high-performance mode
let videoWidth = 500; // Default video dimensions
let videoHeight = 500;
let canvasCtx = null; // Store canvas context to avoid recreating it
let videoElement = null; // Store video element reference
let canvasElement = null; // Store canvas element reference
let mediaStream = null; // Store media stream for cleanup
let frameCounter = 0; // Count frames for diagnostics
let lastFPSUpdateTime = 0; // Track when we last updated the FPS counter
let isProcessingFrame = false; // Flag to prevent processing overlap

// Model path - using the working path from debug test
const URL = "/static/model/";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  loadModel();
  labelContainer = document.getElementById("label-container");

  // Initialize animations and interactions
  initAnimations();

  // Initialize drag & drop
  initDragDrop();

  // List available cameras
  listCameras();

  // Initialize high performance mode checkbox
  initPerformanceSettings();
});

// Initialize performance settings
function initPerformanceSettings() {
  const highPerformanceCheckbox = document.getElementById(
    "highPerformanceMode"
  );

  if (highPerformanceCheckbox) {
    // Check if we have a saved preference
    const savedPerformance = localStorage.getItem("highPerformanceMode");
    if (savedPerformance !== null) {
      isHighPerformanceMode = savedPerformance === "true";
      highPerformanceCheckbox.checked = isHighPerformanceMode;
    }

    highPerformanceCheckbox.addEventListener("change", function () {
      isHighPerformanceMode = this.checked;
      localStorage.setItem("highPerformanceMode", isHighPerformanceMode);

      // Adjust FPS settings based on mode
      if (isHighPerformanceMode) {
        renderFPS = 30;
        processingFPS = 5;
      } else {
        renderFPS = 15;
        processingFPS = 3;
      }

      // If webcam is running, restart it to apply new settings
      if (mediaStream) {
        restartWebcam();
      }

      showNotification(
        isHighPerformanceMode
          ? "High performance mode enabled - smoother video, higher resource usage"
          : "Standard performance mode enabled - reduced resource usage",
        "info"
      );
    });
  }
}

// Restart webcam with current settings
function restartWebcam() {
  stopWebcam();
  // Small delay to ensure everything is cleaned up
  setTimeout(() => {
    initWebcam();
  }, 100);
}

// Initialize animations
function initAnimations() {
  // Animate count up for statistics in the hero section
  const statNumbers = document.querySelectorAll(".stat-number[data-count]");

  statNumbers.forEach((stat) => {
    const target = parseInt(stat.getAttribute("data-count"));
    let count = 0;
    const duration = 2000; // 2 seconds
    const interval = duration / target;

    const counter = setInterval(() => {
      count++;
      stat.textContent = count;

      if (count >= target) {
        clearInterval(counter);
      }
    }, interval);
  });
}

// Initialize drag and drop functionality
function initDragDrop() {
  const dropArea = document.querySelector(".drag-area");
  const imagePreviewContainer = document.getElementById(
    "image-preview-container"
  );

  if (!dropArea) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    imagePreviewContainer.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    imagePreviewContainer.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    imagePreviewContainer.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    imagePreviewContainer.classList.add("highlight");
  }

  function unhighlight() {
    imagePreviewContainer.classList.remove("highlight");
  }

  imagePreviewContainer.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }
}

// Load the machine learning model (based on Teachable Machine template)
async function loadModel() {
  try {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Update status
    document.getElementById("model-status").innerHTML =
      'Loading diagnostic model... <span class="loading"></span>';

    // Load the model and metadata
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    isModelLoaded = true;
    document.getElementById("model-status").innerHTML =
      "<i class='fas fa-check-circle'></i> Diagnostic model loaded successfully!";
    document.getElementById("model-status").style.color = "#00a8b5";
    console.log("Model loaded successfully");
    console.log("Total diagnostic classes:", maxPredictions);
  } catch (error) {
    console.error("Error loading model:", error);
    document.getElementById("model-status").innerHTML =
      "<i class='fas fa-exclamation-triangle'></i> Error loading diagnostic model. Please check console for details.";
    document.getElementById("model-status").style.color = "#e53e3e";

    // Add more detailed error message to help diagnose the problem
    console.error("Model load error details:", {
      error: error.toString(),
      modelURL: URL + "model.json",
      metadataURL: URL + "metadata.json",
    });

    // Check if files exist using fetch
    checkModelFiles();
  }
}

// Check if model files exist
async function checkModelFiles() {
  try {
    const response = await fetch("/check-model");
    const data = await response.json();
    console.log("Model files status:", data);
  } catch (error) {
    console.error("Error checking model files:", error);
  }
}

// Switch between modes
function switchMode(mode) {
  currentMode = mode;

  // Clear predictions when switching modes
  clearPredictions();

  // Stop webcam and animation frames if switching away from webcam mode
  if (mode !== "webcam") {
    stopWebcam();
  }

  // Update tab buttons
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    // Match the button with the current mode
    if (
      (mode === "webcam" && btn.textContent.includes("Live Camera")) ||
      (mode === "image" && btn.textContent.includes("Upload X-ray"))
    ) {
      btn.classList.add("active");
    }
  });

  // Switch content
  document.querySelectorAll(".mode-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Show the appropriate content for the selected mode
  const modeContent = document.getElementById(mode + "-mode");
  if (modeContent) {
    modeContent.classList.add("active");
  }

  // Handle specific requirements for each mode
  if (mode === "webcam") {
    // Show webcam container and controls
    document.getElementById("webcam-container").style.display = "block";
    document.querySelector(".webcam-section").style.display = "block";

    // Hide image upload elements if they exist
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );
    if (imagePreviewContainer) {
      imagePreviewContainer.innerHTML = `
          <div class="drag-area">
              <i class="fas fa-cloud-upload-alt"></i>
              <h3>Drag & Drop</h3>
              <p>or click to browse your files</p>
          </div>
      `;
    }

    const detectBtn = document.getElementById("detectBtn");
    if (detectBtn) {
      detectBtn.style.display = "none";
    }

    uploadedImageElement = null;
  } else if (mode === "image") {
    // Hide webcam container and controls when in image upload mode
    document.getElementById("webcam-container").style.display = "none";
    document.querySelector(".webcam-section").style.display = "none";

    // Reset the image preview
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );
    if (imagePreviewContainer) {
      imagePreviewContainer.innerHTML = `
          <div class="drag-area">
              <i class="fas fa-cloud-upload-alt"></i>
              <h3>Drag & Drop</h3>
              <p>or click to browse your files</p>
          </div>
      `;
    }
  }
}

// Perbaikan untuk error "Failed to list cameras. Cannot read properties of null"
// Tambahkan ke file script_new.js atau sidebar-nav.js

// Cari fungsi listCameras() yang bermasalah dan modifikasi menjadi:

async function listCameras() {
  try {
    const cameraSelect = document.getElementById("cameraSelect");

    // Tambahkan pengecekan apakah elemen cameraSelect ada
    if (!cameraSelect) {
      console.log(
        "Camera select element not found on this page - skipping camera initialization"
      );
      return; // Exit function jika tidak ada elemen kamera
    }

    // Clear existing options except the first placeholder
    while (cameraSelect.options.length > 1) {
      cameraSelect.remove(1);
    }

    // Check if mediaDevices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.error("mediaDevices API not supported in this browser");
      showNotification(
        "Your browser doesn't support camera selection. Try using Chrome or Edge.",
        "error"
      );
      return;
    }

    // Try to get permission first to see camera labels
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (permissionError) {
      console.warn("Could not get camera permission:", permissionError);
      // Continue anyway to at least list available devices without labels
    }

    // Now enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );

    if (videoDevices.length === 0) {
      const option = document.createElement("option");
      option.text = "No cameras found";
      option.disabled = true;
      cameraSelect.add(option);

      showNotification("No cameras were detected on your device.", "warning");
      console.log("No video input devices found");
      return;
    }

    // Add each camera to the dropdown
    videoDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;

      // Create more descriptive labels
      if (device.label) {
        option.text = device.label;
      } else {
        option.text = `Camera ${index + 1}`;
      }

      cameraSelect.add(option);
    });

    console.log(`Found ${videoDevices.length} cameras`);

    // Set default selection
    if (videoDevices.length > 0 && cameraSelect.value === "") {
      cameraSelect.selectedIndex = 1; // Select first actual camera
      selectedCameraId = cameraSelect.value;
    }
  } catch (error) {
    console.error("Error listing cameras:", error);
    // Jangan tampilkan notifikasi error - hanya log ke konsol
    // showNotification("Failed to list cameras. " + error.message, "error");
  }
}

// Get optimal camera constraints based on performance settings
function getOptimalCameraConstraints(deviceId) {
  const constraints = {
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: isHighPerformanceMode ? 640 : 480 },
      height: { ideal: isHighPerformanceMode ? 640 : 480 },
    },
    audio: false,
  };

  // Advanced settings for high performance mode
  if (isHighPerformanceMode) {
    constraints.video.frameRate = { ideal: 30, min: 15 };
  } else {
    constraints.video.frameRate = { ideal: 15, min: 10 };
  }

  return constraints;
}

// Completely rewritten webcam initialization for optimal performance
async function initWebcam() {
  if (!isModelLoaded) {
    showNotification(
      "Please wait for the diagnostic model to load first!",
      "error"
    );
    return;
  }

  const cameraSelect = document.getElementById("cameraSelect");
  const webcamContainer = document.getElementById("webcam-container");

  // Check if a camera is selected
  if (cameraSelect.value === "") {
    showNotification("Please select a camera first", "warning");
    return;
  }

  try {
    // Clean up any existing resources
    stopWebcam();

    // Clear the webcam container
    webcamContainer.innerHTML = "";

    // Create video element
    videoElement = document.createElement("video");
    videoElement.id = "webcam-video";
    videoElement.style.display = "none"; // Hide actual video element
    videoElement.setAttribute("playsinline", ""); // Required for iOS
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("muted", "");

    // Create canvas for drawing
    canvasElement = document.createElement("canvas");
    canvasElement.id = "webcam-canvas";
    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    // Add FPS counter
    const fpsCounter = document.createElement("div");
    fpsCounter.id = "fps-counter";
    fpsCounter.className = "fps-counter";
    fpsCounter.innerHTML = "FPS: --";
    fpsCounter.style.position = "absolute";
    fpsCounter.style.bottom = "10px";
    fpsCounter.style.right = "10px";
    fpsCounter.style.background = "rgba(0,0,0,0.5)";
    fpsCounter.style.color = "white";
    fpsCounter.style.padding = "5px 10px";
    fpsCounter.style.borderRadius = "4px";
    fpsCounter.style.fontSize = "12px";
    fpsCounter.style.fontFamily = "monospace";

    // Add elements to DOM
    webcamContainer.appendChild(videoElement);
    webcamContainer.appendChild(canvasElement);
    webcamContainer.appendChild(fpsCounter);

    // Setup canvas context once
    canvasCtx = canvasElement.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    // Apply optimizations to context if supported
    if (canvasCtx.imageSmoothingEnabled !== undefined) {
      canvasCtx.imageSmoothingEnabled = false; // Disable antialiasing for better performance
    }

    // Add realtime indicator
    const realtimeIndicator = document.createElement("div");
    realtimeIndicator.className = "realtime-indicator";
    realtimeIndicator.innerHTML = "<i class='fas fa-circle'></i> ANALYZING";
    webcamContainer.appendChild(realtimeIndicator);

    // Get camera stream with optimal settings
    const constraints = getOptimalCameraConstraints(cameraSelect.value);
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Attach stream to video element
    videoElement.srcObject = mediaStream;

    // Wait for video to start playing
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play().then(resolve);
      };
    });

    // Set canvas dimensions to match actual video dimensions for better performance
    videoWidth = videoElement.videoWidth;
    videoHeight = videoElement.videoHeight;

    // Only resize if dimensions are valid
    if (videoWidth && videoHeight) {
      // Calculate aspect ratio constrained to container
      const containerWidth = webcamContainer.clientWidth;
      const containerHeight = webcamContainer.clientHeight;

      // Calculate scaling to fit within container
      const scale = Math.min(
        containerWidth / videoWidth,
        containerHeight / videoHeight
      );

      // Update canvas size to match video aspect ratio
      canvasElement.width = Math.floor(videoWidth * scale);
      canvasElement.height = Math.floor(videoHeight * scale);
    }

    // Start the render loop
    lastFrameTime = performance.now();
    lastProcessingTime = performance.now();
    lastFPSUpdateTime = performance.now();
    frameCounter = 0;
    renderFrame();

    // Update UI
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("stopBtn").style.display = "inline-block";

    // Show success and scroll to results
    showNotification(
      `Camera activated in ${
        isHighPerformanceMode ? "high" : "standard"
      } performance mode!`,
      "success"
    );

    setTimeout(() => {
      document
        .querySelector(".results-section")
        .scrollIntoView({ behavior: "smooth" });
    }, 500);
  } catch (error) {
    console.error("Error accessing camera:", error);

    let errorMsg = "Error accessing camera: ";
    if (error.name === "NotAllowedError") {
      errorMsg += "Camera access denied. Please check browser permissions.";
    } else if (error.name === "NotFoundError") {
      errorMsg += "The selected camera was not found.";
    } else if (
      error.name === "NotReadableError" ||
      error.name === "AbortError"
    ) {
      errorMsg += "The camera is already in use by another application.";
    } else {
      errorMsg += error.message || "Unknown error";
    }

    showNotification(errorMsg, "error");
  }
}

// Optimized rendering loop using requestAnimationFrame
function renderFrame() {
  if (!videoElement || !canvasElement || !canvasCtx) return;

  const now = performance.now();
  const elapsed = now - lastFrameTime;
  const frameInterval = 1000 / renderFPS; // ms per frame

  // Only render if enough time has passed for target FPS
  if (elapsed > frameInterval) {
    // Calculate actual FPS
    frameCounter++;
    if (now - lastFPSUpdateTime > 1000) {
      // Update FPS count every second
      const fps = Math.round((frameCounter * 1000) / (now - lastFPSUpdateTime));
      const fpsCounter = document.getElementById("fps-counter");
      if (fpsCounter) {
        fpsCounter.innerHTML = `FPS: ${fps}`;
      }
      frameCounter = 0;
      lastFPSUpdateTime = now;
    }

    // Draw video frame to canvas (with flip horizontally)
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    canvasCtx.restore();

    lastFrameTime = now;

    // Check if it's time to process a frame for AI analysis
    if (now - lastProcessingTime > 1000 / processingFPS && !isProcessingFrame) {
      processFrame();
      lastProcessingTime = now;
    }
  }

  // Schedule next frame
  requestAnimationFrameId = requestAnimationFrame(renderFrame);
}

// Process frame with AI model
async function processFrame() {
  if (!model || !canvasElement || isProcessingFrame) return;

  try {
    isProcessingFrame = true;

    // Run inference
    const prediction = await model.predict(canvasElement);

    // Update UI with results
    displayPredictions(prediction);
  } catch (error) {
    console.error("Error during prediction:", error);
  } finally {
    isProcessingFrame = false;
  }
}

// Clean stop of webcam and all related resources
function stopWebcam() {
  // Cancel animation frame first
  if (requestAnimationFrameId) {
    cancelAnimationFrame(requestAnimationFrameId);
    requestAnimationFrameId = null;
  }

  // Stop all tracks on the mediaStream
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStream = null;
  }

  // Clear video element source
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject = null;
  }

  // Clear references
  videoElement = null;
  canvasElement = null;
  canvasCtx = null;

  // Update UI
  const webcamContainer = document.getElementById("webcam-container");
  webcamContainer.innerHTML = `
    <div class="placeholder-container">
      <i class="fas fa-camera"></i>
      <p>Camera preview will appear here</p>
    </div>
  `;

  document.getElementById("startBtn").style.display = "inline-block";
  document.getElementById("stopBtn").style.display = "none";
}

// Display predictions with interactive visualization
function displayPredictions(predictions) {
  // Don't update display if container doesn't exist
  if (!labelContainer) return;

  labelContainer.innerHTML = "";

  // Sort predictions by probability
  predictions.sort((a, b) => b.probability - a.probability);

  // In realtime mode, filter out very low confidence predictions
  const minConfidence = 0.01; // 1% minimum confidence for display
  const filteredPredictions = predictions.filter(
    (p) => p.probability >= minConfidence
  );

  if (filteredPredictions.length === 0) {
    labelContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-hourglass-half pulse"></i>
        <p>No diagnostic findings available</p>
      </div>
    `;
    return;
  }

  filteredPredictions.forEach((prediction, index) => {
    const predictionItem = document.createElement("div");
    predictionItem.className = "prediction-item";

    // For display, show percentage with 1 decimal place
    const percentage = (prediction.probability * 100).toFixed(1);

    // Get the class name
    let diagnosticResult = prediction.className;

    // Set appropriate icon based on the condition
    let conditionIcon = "fas fa-lungs";
    if (diagnosticResult.toLowerCase().includes("pneumonia")) {
      conditionIcon = "fas fa-lungs-virus";
    } else if (diagnosticResult.toLowerCase().includes("tuberculosis")) {
      conditionIcon = "fas fa-bacterium";
    } else if (diagnosticResult.toLowerCase().includes("other")) {
      conditionIcon = "fas fa-question-circle"; // Special icon for OTHER class
    }

    // Add severity indicator based on confidence level
    let severityClass = "";
    if (index === 0) {
      predictionItem.classList.add("top-prediction");

      // Add severity indicators for medical context (only for top prediction)
      if (percentage > 90) {
        severityClass = "high-confidence";
      } else if (percentage > 70) {
        severityClass = "medium-confidence";
      } else {
        severityClass = "low-confidence";
      }
      predictionItem.classList.add(severityClass);
    }

    predictionItem.innerHTML = `
      <div class="class-name"><i class="${conditionIcon}"></i> ${diagnosticResult}</div>
      <div class="probability ${severityClass}">${percentage}% confidence</div>
      <div class="progress-bar">
        <div class="progress-fill ${severityClass}" style="width: ${percentage}%"></div>
      </div>
    `;

    // Add interactive hover effect
    predictionItem.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.02)";
      this.style.transition = "transform 0.3s ease";
    });

    predictionItem.addEventListener("mouseleave", function () {
      this.style.transform = index === 0 ? "scale(1.02)" : "scale(1)";
    });

    labelContainer.appendChild(predictionItem);
  });

  // If this is the first prediction result, scroll to it
  if (
    document
      .querySelector(".results-section")
      .getAttribute("data-first-result") !== "shown"
  ) {
    document
      .querySelector(".results-section")
      .setAttribute("data-first-result", "shown");
    document
      .querySelector(".results-section")
      .scrollIntoView({ behavior: "smooth" });
  }
}

function clearPredictions() {
  if (labelContainer) {
    labelContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-hourglass-half pulse"></i>
        <p>No diagnostic results yet. Please upload or capture an X-ray image.</p>
      </div>
    `;

    // Reset first-result flag
    document
      .querySelector(".results-section")
      .removeAttribute("data-first-result");
  }
}

// Image upload and handling
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  handleFileUpload(file);
}

function handleFileUpload(file) {
  if (!file.type.startsWith("image/")) {
    showNotification("Please select a valid image file.", "error");
    return;
  }

  // Create and display image preview
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.onload = function () {
      uploadedImageElement = img;
      img.classList.add("captured-image");

      const container = document.getElementById("image-preview-container");
      container.innerHTML = "";
      container.appendChild(img);

      document.getElementById("detectBtn").style.display = "inline-block";

      // Show upload success notification
      showNotification("X-ray image uploaded successfully!", "success");
    };
  };
  reader.readAsDataURL(file);

  // Clear webcam capture if it exists
  capturedPhoto = null;
}

// Predict image (using same approach as Teachable Machine)
async function predictImage() {
  if (!model || !uploadedImageElement) {
    showNotification(
      "Please upload an X-ray image first or wait for the diagnostic model to load!",
      "error"
    );
    return;
  }

  try {
    // Show loading state
    document.getElementById("detectBtn").innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    document.getElementById("detectBtn").disabled = true;

    // Add slight delay to make loading state visible
    setTimeout(async () => {
      // Create a temporary canvas to draw the uploaded image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = uploadedImageElement.naturalWidth;
      canvas.height = uploadedImageElement.naturalHeight;
      ctx.drawImage(uploadedImageElement, 0, 0, canvas.width, canvas.height);

      // Use the canvas for prediction instead of the image
      const prediction = await model.predict(canvas);

      // Add this debug code
      console.log("Raw predictions before sorting:");
      prediction.forEach((p) => {
        console.log(`${p.className}: ${p.probability.toFixed(4)}`);
      });

      displayPredictions(prediction);

      // Reset button
      document.getElementById("detectBtn").innerHTML =
        '<i class="fas fa-search"></i> Analyze X-ray';
      document.getElementById("detectBtn").disabled = false;

      // Scroll to results
      document
        .querySelector(".results-section")
        .scrollIntoView({ behavior: "smooth" });

      // Show success notification
      showNotification("X-ray analysis complete!", "success");
    }, 500);
  } catch (error) {
    console.error("Error analyzing image:", error);
    showNotification("Error analyzing X-ray image. Please try again.", "error");

    // Reset button
    document.getElementById("detectBtn").innerHTML =
      '<i class="fas fa-search"></i> Analyze X-ray';
    document.getElementById("detectBtn").disabled = false;
  }
}

// Save image to Flask server
async function saveImageToServer(imageData) {
  try {
    const response = await fetch("/upload_cam", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("X-ray image saved:", result.file_url);
      return result.file_url;
    }
  } catch (error) {
    console.error("Error saving image:", error);
  }
  return null;
}

// Notification system
function showNotification(message, type = "info") {
  // Check if notification container exists, if not create it
  let notificationContainer = document.querySelector(".notification-container");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.className = "notification-container";
    document.body.appendChild(notificationContainer);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Choose icon based on type
  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-triangle";
  if (type === "warning") icon = "exclamation-circle";

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;

  // Add to container
  notificationContainer.appendChild(notification);

  // Show with animation
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  }, 10);

  // Remove after timeout
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(-20px)";
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Add event listeners for info cards
document.addEventListener("DOMContentLoaded", function () {
  // Add event listeners to "Learn More" buttons
  const learnMoreButtons = document.querySelectorAll(".card-btn");
  learnMoreButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const cardTitle = this.parentElement.querySelector("h3").textContent;
      showNotification(
        `More information about ${cardTitle} would be displayed here.`,
        "info"
      );
    });
  });

  // Add event listener to consultation button
  const consultationBtn = document.querySelector(".consultation-btn");
  if (consultationBtn) {
    consultationBtn.addEventListener("click", function () {
      showNotification(
        "Consultation request feature would be implemented here.",
        "info"
      );
    });
  }
});

// Helper function to check if browser supports hardware acceleration
function detectHardwareAcceleration() {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  if (!gl) {
    return false; // WebGL not supported at all
  }

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) {
    return true; // Can't determine, assume supported
  }

  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  console.log("GPU renderer:", renderer);

  // Check if renderer indicates software rendering
  const isSoftwareRenderer =
    renderer.includes("SwiftShader") ||
    renderer.includes("ANGLE") ||
    renderer.includes("llvmpipe") ||
    renderer.includes("Software");

  return !isSoftwareRenderer;
}

// MODIFIKASI MENJADI:
document.addEventListener("DOMContentLoaded", function () {
  const hasHardwareAcceleration = detectHardwareAcceleration();
  console.log("Hardware acceleration available:", hasHardwareAcceleration);

  if (!hasHardwareAcceleration) {
    // Set performance mode to low by default
    const highPerformanceCheckbox = document.getElementById(
      "highPerformanceMode"
    );
    if (highPerformanceCheckbox) {
      highPerformanceCheckbox.checked = false;
      isHighPerformanceMode = false;
      localStorage.setItem("highPerformanceMode", "false");

      // Hapus notifikasi yang mengganggu
      // showNotification(
      //   "Hardware acceleration not detected. Using standard performance mode to conserve resources.",
      //   "info"
      // );

      // Hanya mencatat ke konsol tanpa menampilkan notifikasi
      console.log(
        "Hardware acceleration not detected, using standard performance mode"
      );
    }
  }
});
