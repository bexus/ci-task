const axios = require('axios')
const qs = require('qs')
const API_URL = 'https://api-us.faceplusplus.com/facepp/v3/detect'

const evaluateFace = async (image_url) => {
  const params = {
    api_key: process.env.FACEPP_API_KEY || '',
    api_secret: process.env.FACEPP_API_SECRET || '',
    image_url,
    return_attributes: 'gender,age,beauty'
  }
  try {
    const response = await axios.post(API_URL, qs.stringify(params)).then(response => response.data)
    return response.faces
  } catch(e) {
    console.error(e.message)
    throw e
  }
}

module.exports = { evaluateFace }
