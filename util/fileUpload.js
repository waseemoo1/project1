const fs = require('fs');
const { v4: uuid } = require('uuid');
const { join, parse } = require('path');

const filePath = join(__dirname, '../photos/');

const processUpload = async (file) => {
    const { createReadStream, mimetype, encoding, filename } = await file;

    /*if (!(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg')) {
        const errors = new Error("you can just upload (png or jpg or jpeg)");
        errors.code = 400;
        throw errors;
    }*/

    console.log(file);
    let { ext, name } = parse(filename);

    const fileUrl = uuid() + ext;

    let stream = createReadStream();

    return new Promise((resolve, reject) => {
        stream.pipe(fs.createWriteStream(filePath + fileUrl))
            .on("finish", () => {
                resolve({
                    success: true,
                    message: "Successfully Uploaded",
                    mimetype, filename, encoding, location: fileUrl
                })
            })
            .on("error", (err) => {
                console.log(err.message);
                reject({
                    success: false,
                    message: err.message
                })
            })
    })
}

exports.processUpload = processUpload;