# Rubber waste image classification setup

The API supports a locally trained image classifier. It does not ship with a fake or synthetic model because that would produce misleading polymer predictions.

## 1. Add labelled data
Create folders like:

```text
backend/dataset/
  NBR_scrap/
  EPDM_scrap/
  SBR_scrap/
  Natural_rubber/
  Mixed_unknown/
```

Place real, correctly labelled JPG/PNG/WEBP photos in each folder. Use varied lighting, angles, backgrounds, and actual material samples. Start with 50-100+ images per class if possible. Do not mix near-duplicate images across training and test sets.

## 2. Train the local model
From `backend` with the virtual environment activated:

```powershell
python train_vision_model.py
```

The script creates `backend/models/rubber_waste_classifier.joblib`. This is a HOG + SVM baseline classifier; it is not a state-of-the-art deep learning model. Review the held-out report and test with photos not used in training before relying on it.

## 3. Use it
Restart the backend, open `http://127.0.0.1:8000/docs`, authorize with a login bearer token, and call `POST /api/vision/predict` with an image. The React Waste page also calls this endpoint.

If the model file is absent, the API clearly reports that a model is not configured and does not invent a prediction. Never use image predictions alone for industrial material acceptance or safety decisions.
