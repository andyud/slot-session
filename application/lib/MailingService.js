const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bitale365812@gmail.com',
        pass: 'wjstks11!'
    }
});

const MailService = {
    async mailtest(to, subject, texthtml) {
        await transporter.sendMail({
            from: 'bitale365812@gmail.com',
            to: to,
            subject: subject,
            text: texthtml
        });
    }
}

module.exports = MailService;