const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../photos/');

const deleteFile = async (fileUrl) => {

    return new Promise((resolve, reject) => {
        fs.unlink(filePath + fileUrl, (err) => {
            if (err) {
               reject(new Error(err.message));
            } else {
                resolve(true);
            }
        })
    })
}

exports.deleteFile = deleteFile;