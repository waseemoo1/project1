const nodemailer = require('nodemailer');
const config = require('config');

const emailService = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: config.get('email'),
        pass: config.get('password')
    }
})


module.exports = emailService;