const Minio = require('minio')
const path = require("path");
const {etag} = require("express/lib/utils");
require('dotenv').config()

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT, // port: 9000,
    useSSL: true,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_ACCESS_SECRET,
})

const buildFolder = path.join(__dirname, 'react-builds'); // Host directory to store React app builds

const uploadToMinIo = (fileName, callback) => {
    // File to upload
    const sourceFile = `${buildFolder}/${fileName}.tar.gz`;

    // Destination bucket
    const bucket = 'apps-generated'

    // Destination object name
    const destinationObject = `${fileName}.tar.gz`
    // const exists = await minioClient.bucketExists(bucket)

    minioClient.makeBucket(bucket, 'ap-south-1a', function (err) {
        if (err) {
            console.log("Bucket Already Exist")
        } else {
            console.log('Bucket created successfully')
        }

        const metaData = {
            'Content-Type': 'application/gzip', 'X-Amz-Meta-Testing': 1234, example: 5678,
        }

        // Using fPutObject API upload your file to the bucket europetrip.
        minioClient.fPutObject(bucket, destinationObject, sourceFile, metaData, function (err, etag) {
            if (err) return callback(err)

            console.log('File uploaded successfully.', etag)
        })
        // const fGetObjectAsync = util.promisify(minioClient.fGetObject).bind(minioClient);

        // Get file URL
        minioClient.presignedGetObject(bucket, destinationObject, 24 * 60 * 60, (err, url) => {
            if (err)
                return callback(err)
            callback(null, {
                etag, url,
            })
        })
    })

// ESM code
//     if (exists) {
//         console.log('Bucket ' + bucket + ' exists.')
//     } else {
//         await minioClient.makeBucket(bucket, 'ap-south-1a')
//         console.log('Bucket ' + bucket + ' created in "ap-south-1a".')
//     }
//
//     console.log("Bucket build successfully.");
//
// // Set the object metadata for tar.gz
//     var metaData = {
//         'Content-Type': 'application/gzip', 'X-Amz-Meta-Testing': 1234, example: 5678,
//     }
//
// // Upload the .tar.gz file with fPutObject
// // If an object with the same name exists,
// // it is updated with new data
//     console.log("Uploading");
//     await minioClient.fPutObject(bucket, destinationObject, sourceFile, metaData)
//     console.log('File ' + sourceFile + ' uploaded as object ' + destinationObject + ' in bucket ' + bucket)

}

module.exports = {uploadToMinIo}