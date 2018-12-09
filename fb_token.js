const TinderAuth = require('./tinderauth');
const Crypt = require('./util/crypt');
const axios = require('axios');
const HUBOT_API_URL = 'http://localhost:8080/service_users/tinder';

(async () => {
  let response = {}
  try {
    response = await axios.get(HUBOT_API_URL)
  } catch(e) {
    console.error(e)
    process.exit(1)
  }
  let users = response.data
  users['XXXXXXX'] = users['UAQNQ5Y0M']

  for(uid in users) {
    let email = users[uid].email
    let password = Crypt.decrypt(users[uid].password)
    const tinderauth = new TinderAuth(email, password)
    try {
      users[uid].fb_token = await tinderauth.getAccessToken()
      users[uid].fb_uid = await tinderauth.getUserId()
    } catch(e) {
      continue
    }
  }

  try {
    await axios.post(HUBOT_API_URL, users)
    console.log('success update fb access token')
  } catch(e) {
    console.log(e.message)
    process.exit(1)
  }
})()
