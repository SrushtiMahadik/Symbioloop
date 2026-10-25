# SymbioLoop AI Image Classification Module

The React Add Waste page is connected to `POST /api/vision/predict`. The FastAPI endpoint accepts JPG/PNG/WEBP images and loads `backend/models/rubber_waste_classifier.joblib` when it exists. The local training script uses HOG image features with an SVM classifier.

## Run the project
1. Install Node.js (LTS) and Python 3.11 or 3.12.
2. Run `START_SYMBIOLOOP.bat` on Windows. This starts the backend and frontend in separate terminals.
3. Open the frontend URL printed by Vite, usually `http://localhost:5173`.
4. Register/login, open Add Waste, upload a rubber scrap image, and click Analyse image.

## Enable actual image classification
1. Add real, correctly labelled images to the class folders under `backend/dataset/`. Example: `backend/dataset/NBR_scrap/`.
2. Aim for 50-100+ varied images per class where possible. The training script technically requires at least 4 images per class, but that is not enough for reliable performance.
3. In a terminal: `cd backend`, activate `.venv` if used, then run `python train_vision_model.py`.
4. Confirm it reports a saved model at `backend/models/rubber_waste_classifier.joblib`. Review the held-out test report.
5. Restart the backend and test again.

## Important limitations
This ZIP does not contain a trained classifier because no verified, labelled rubber-waste image dataset was provided. The app will correctly display “Model not configured” until you supply images and train the model; it does not fabricate a prediction. A model score is not a guarantee of correctness. NBR, EPDM, and SBR may not be reliably distinguishable from photographs alone, so verify materials independently before industrial use.
