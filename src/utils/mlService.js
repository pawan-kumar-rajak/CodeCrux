import axios from 'axios';
import FormData from 'form-data';
import { ApiError } from './ApiError.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:3000';

export const mlService = {
    async detectWaste(imageBuffer, metadata) {
        try {
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename: 'waste_image.jpg',
                contentType: 'image/jpeg'
            });

            // Add metadata
            Object.entries(metadata).forEach(([key, value]) => {
                formData.append(key, value);
            });

            const response = await axios.post(`${ML_SERVICE_URL}/detect`, formData, {
                headers: {
                    ...formData.getHeaders(),
                }
            });

            return response.data;
        } catch (error) {
            console.error('ML Service Error:', error);
            throw new ApiError(
                500,
                'Failed to process waste image'
            );
        }
    },

    async checkHealth() {
        try {
            const response = await axios.get(`${ML_SERVICE_URL}/health`);
            return response.data;
        } catch (error) {
            console.error('ML Service Health Check Error:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }
};
