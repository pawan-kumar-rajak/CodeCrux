

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs'; // Needed to read the file into a stream for FormData
import { ApiError } from './ApiError.js';
import path from 'path';

// This URL must point to your running Python Flask ML service
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export const mlService = {
    /**
     * Sends an image file and metadata to the external ML service for detection.
     * @param {string} filePath - The local path to the image file (from multer).
     * @param {object} metadata - Additional metadata for the ML model.
     * @returns {Promise<object>} The response data from the ML service.
     */
    async detectWaste(filePath, metadata) {
        try {
            console.log(`mlService: Sending file ${filePath} to ML service at ${ML_SERVICE_URL}/detect`);
            const formData = new FormData();
            
            // Append the image file using fs.createReadStream
            // The 'image' field name here must match what Flask expects (request.files['image'])
            formData.append('image', fs.createReadStream(filePath), {
                filename: path.basename(filePath), // Use original filename or a generated one
                contentType: 'image/jpeg' // Or infer dynamically if needed
            });

            // Add metadata fields
            Object.entries(metadata).forEach(([key, value]) => {
                formData.append(key, value);
            });

            const response = await axios.post(`${ML_SERVICE_URL}/detect`, formData, {
                headers: {
                    ...formData.getHeaders(), // Important for multipart/form-data
                },
                maxContentLength: Infinity, // Allow large payloads
                maxBodyLength: Infinity,    // Allow large payloads
                timeout: 60000 // 60 second timeout for ML processing
            });

            return response.data;
        } catch (error) {
            console.error('mlService: Error calling ML Service /detect:', error.message);
            if (error.response) {
                console.error('ML Service Response Data:', error.response.data);
                console.error('ML Service Response Status:', error.response.status);
            } else if (error.request) {
                console.error('ML Service No Response Received:', error.request);
            }
            return next( new ApiError(                500,
                'Failed to process waste image with external ML service. ' + (error.response?.data?.error || error.message)
            ));

        }
    },

    /**
     * Checks the health of the external ML service.
     * @returns {Promise<object>} The health status data.
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data;
        } catch (error) {
            console.error('mlService: ML Service Health Check Error:', error.message);
            return { status: 'unhealthy', error: error.message };
        }
    }
};
