/* eslint-disable no-return-assign */
/* eslint-disable import/no-extraneous-dependencies */
const sgMail = require('@sendgrid/mail');
const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const AppError = require('./AppError');
const CONST = require('../constants');

class Email {
  constructor(user, url, errorMessage, next) {
    this.to = user.email;
    this.user = user;
    this.url = url;
    this.from = `Nurses rent <${process.env.EMAIL_FROM}>`;
    this.next = next;
    this.isSuccess = false;
    this.errorMessage = errorMessage;
  }

  transporter() {
    // if (process.env.NODE_ENV === CONST.PROD) {
    //   return nodemailer.createTransport({
    //     host: 'smtp.sendgrid.net',
    //     port: Number(process.env.SENDGRID_PORT),
    //     secure: true,
    //     auth: {
    //       user: process.env.SENDGRID_USERNAME,
    //       pass: process.env.SENDGRID_PASSWORD,
    //     },
    //   });
    // }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    let username = '';
    if (this.user.firstName !== undefined && this.user.lastName !== undefined) {
      username = `${this.user.firstName} ${this.user.lastName}`;
    } else if (
      this.user.firstName === undefined &&
      this.user.lastName === undefined &&
      this.user.displayName !== undefined
    ) {
      username = this.user.displayName;
    }

    let html = '';
    ejs.renderFile(
      path.join(__dirname, `../../views/Email/${template}.ejs`),
      {
        username,
        to: this.to,
        from: this.from,
        url: this.url,
        subject,
        imagesUrl: process.env.IMAGES_URL,
      },
      function (err, str) {
        if (err) {
          // eslint-disable-next-line no-console
          console.log(err);
          return this.next(
            new AppError(
              'Can not render the email html',
              CONST.INTERNAL_SERVER_ERROR
            )
          );
        }
        html = str;
      }
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html),
    };

    if (process.env.NODE_ENV === CONST.PROD) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail
        .send(mailOptions)
        .then(() => (this.isSuccess = true))
        .catch(() => {
          this.isSuccess = false;
          this.next(
            new AppError(this.errorMessage, CONST.INTERNAL_SERVER_ERROR)
          );
        });
    } else {
      await this.transporter()
        .sendMail(mailOptions)
        .then(() => (this.isSuccess = true))
        .catch(() => {
          this.isSuccess = false;
          this.next(
            new AppError(this.errorMessage, CONST.INTERNAL_SERVER_ERROR)
          );
        });
    }
  }

  // Email types
  async sendWelcome() {
    await this.send('welcomeEmail', `Hello and welcome to Nurses rent!`);
    return this.isSuccess;
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Change your pasword.');
    return this.isSuccess;
  }

  async sendEmailVerification() {
    await this.send('emailVerification', 'Please verify your email!');
    return this.isSuccess;
  }
}

module.exports = Email;
