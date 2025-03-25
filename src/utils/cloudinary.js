import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
	try {
		if (!localFilePath) return null;
		//upload the file on cloudinary
		const response = await cloudinary.uploader.upload(
			localFilePath,
			{
				resource_type: "auto",
			}
		);
		// file has been uploaded successfull
		console.log(
			"file is uploaded on cloudinary ",
			response.url
		);
		fs.unlinkSync(localFilePath);
		return response;
	} catch (error) {
		fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
		return null;
	}
};

const MultiUploadOnCloudinary = async (localFilePaths) => {
	try {
	  if (!localFilePaths || localFilePaths.length === 0) return [];
  
	  const uploadPromises = localFilePaths.map((localFilePath) =>
		cloudinary.uploader.upload(localFilePath, {
		  resource_type: "auto", // auto-detects file type (image/video)
		})
	  );
  
	  // Wait for all uploads to complete
	  const responses = await Promise.all(uploadPromises);
  
	  // Remove local files after upload
	  localFilePaths.forEach((path) => fs.unlinkSync(path));
  
	  // Return an array of Cloudinary URLs
	  return responses.map((response) => response.url);
	} catch (error) {
	  // If any upload fails, clean up the files and return empty array
	  localFilePaths.forEach((path) => fs.unlinkSync(path));
	  console.error("Cloudinary upload failed", error);
	  return [];
	}
  };
  
/**
 * Deletes an image from Cloudinary using its public ID.
 * @param {string} cloudinaryId - The public ID of the image to delete.
 * @returns {Promise<void>} - Resolves when the image is deleted or rejects if an error occurs.
 */
const deleteImageFromCloudinary = async (cloudinaryId) => {
    try {
        // Call the destroy method from Cloudinary to delete the image by its public_id
        const result = await cloudinary.uploader.destroy(cloudinaryId);

        // If successful, result will contain info about the deletion
        console.log(`Image with ID ${cloudinaryId} deleted from Cloudinary`, result);
        
        // If result is an error, it will be thrown here, you can handle that accordingly
        if (result.result !== 'ok') {
            throw new Error('Failed to delete image from Cloudinary');
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw new Error('Cloudinary image deletion failed');
    }
};


export { uploadOnCloudinary, MultiUploadOnCloudinary,deleteImageFromCloudinary };
