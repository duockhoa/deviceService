const axios = require("axios");

const authAxios = axios.create({
  baseURL: "https://auth.dkpharma.io.vn/api/v1", // Replace with your Auth API base URL
  timeout: 10000, // Set a timeout limit for requests
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add a request interceptor
authAxios.interceptors.request.use(
  (config) => {
    // You can modify the request config here (e.g., add auth tokens)
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Add a response interceptor
authAxios.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Handle response errors
    return Promise.reject(error);
  }
);
 
module.exports = authAxios;