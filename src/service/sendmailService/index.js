const axios = require('axios');

const url = "https://script.google.com/macros/s/AKfycbweaV-u6v08K1R-MRul9C2Cl8WYOAkNNjdpA8Cog7_VkDpsCkEVGkQqBGeXo_IzpsGD/exec"

const sendEmail = async ({ to, subject, body }) => {
  try {
    const response = await axios.post(url, {
      to: to || "phamvanbinh97hup@gmail.com",
      subject: subject || "Thông báo từ DK Request",
      body: body || "Đây là email test từ DK Request"
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    console.log('Email sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
  }
};

module.exports = {
  sendEmail
};