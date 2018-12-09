const TinderAuth = require('./tinderauth');
const Crypt = require('./util/crypt');
const axios = require('axios');
const HUBOT_API_URL = `${process.env.HUBOT_HOST || 'http://localhost:8080/'}service_users/tinder`;

(async () => {
  let response = {}
  // ユーザーデータをHubotから取得
  try {
    response = await axios.get(HUBOT_API_URL)
  } catch(e) {
    console.error(e)
    process.exit(1)
  }

  // ユーザーデータがなければ終了
  let users = response.data
  if(!users || !Object.keys(users).length) {
    console.log('users not found')
    return
  }

  // 全員分アクセストークンを取得
  for(uid in users) {
    let email = users[uid].email
    let password = Crypt.decrypt(users[uid].password)
    const tinderauth = new TinderAuth(email, password)
    try {
      users[uid].fb_token = await tinderauth.getAccessToken()
      users[uid].fb_uid = await tinderauth.getUserId()
      console.log(`User ${uid}: get new access token`)
    } catch(e) {
      console.log(`User ${uid}: failure new access token`)
      continue
    }
  }

  // Hubotに投げてRedisのデータを更新
  try {
    await axios.post(HUBOT_API_URL, users)
    console.log('success update fb access token of redis')
    return
  } catch(e) {
    console.log(e.message)
    process.exit(1)
  }
})()
