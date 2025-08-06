import cv2
import math
import cvzone
from ultralytics import YOLO
import time

# Initialize video capture
video_path = "Media\\garbage.mp4"
cap = cv2.VideoCapture(video_path)

# Get video FPS
video_fps = cap.get(cv2.CAP_PROP_FPS)
frame_skip = 4  # Skip every 4th frame for faster processing

# Load YOLO model with FP16 precision
model = YOLO("Weights/bestold.pt")
model.to('cuda' if cv2.cuda.getCudaEnabledDeviceCount() > 0 else 'cpu')  # Use GPU if available

# Define class names
classNames = ['0', 'c', 'garbage', 'garbage_bag', 'sampah-detection', 'trash']

frame_id = 0
while True:
    success, img = cap.read()
    if not success:
        break

    # Skip frames more aggressively
    frame_id += 1
    if frame_id % frame_skip != 0:
        continue

    # Resize input for super fast processing
    img_resized = cv2.resize(img, (480, 360))

    # Perform detection
    start_time = time.time()
    results = model(img_resized, stream=True)
    inference_time = time.time() - start_time

    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            w, h = x2 - x1, y2 - y1

            # Faster confidence extraction
            conf = float(box.conf[0])
            cls = int(box.cls[0])

            # Dynamic confidence threshold
            if conf > 0.4:  # Increased threshold to reduce detections
                conf = round(conf, 2)
                cvzone.cornerRect(img_resized, (x1, y1, w, h), t=2)
                cvzone.putTextRect(img_resized, f'{classNames[cls]} {conf}', (max(0, x1), max(35, y1)), scale=1, thickness=1)

    # Display FPS
    fps = 1 / max(inference_time, 1e-6)
    cvzone.putTextRect(img_resized, f"FPS: {int(fps)}", (20, 40), scale=1, thickness=1)

    # Show output
    cv2.imshow("Image", img_resized)
    if cv2.waitKey(int(10000 / video_fps)) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
