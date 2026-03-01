(async () => {
    // Ensure the face-api library is loaded
    await loadFaceAPI();

    // Create video element
    let video = document.createElement("video");
    video.setAttribute("autoplay", true);
    video.setAttribute("playsinline", true);
    video.style.position = "fixed";
    video.style.top = "-1000px";
    document.body.appendChild(video);

    // Request webcam access
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { 
            video.srcObject = stream; 
        })
        .catch(error => console.error("Error accessing webcam:", error));

    // Function to load Face API
    async function loadFaceAPI() {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri("https://justadummyurl.com/models");
            console.log("Face API Loaded Successfully!");
        } catch (error) {
            console.error("Error loading Face API:", error);
        }
    }

    // Function to check face distance
    async function checkDistance() {
        if (!video.srcObject) return; // Ensure webcam is available
        try {
            let detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
            if (detections) {
                let faceWidth = detections.box.width;
                if (faceWidth > 150) {  // If face is too large, user is too close
                    chrome.runtime.sendMessage({ action: "alertUser" });
                }
            }
        } catch (error) {
            console.error("Error detecting face:", error);
        }
    }

    // Run AI detection every 5 seconds
    setInterval(checkDistance, 5000);
})();
