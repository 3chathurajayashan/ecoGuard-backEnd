import cloudinary from "../utils/cloudinary.js";

 

export const uploadToCloudinary = (fileBuffer, folder) => {

    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image"
            },

            (error, result) => {

                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }

            }
        );

        uploadStream.end(fileBuffer);
    });
};
 

export const deleteFromCloudinary = (publicId) => {

    return new Promise((resolve, reject) => {

        cloudinary.uploader.destroy(
            publicId,
            {
                resource_type: "image"
            },

            (error, result) => {

                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }

            }
        );

    });
};