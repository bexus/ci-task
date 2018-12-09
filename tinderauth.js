const pptr = require('puppeteer')
const axios = require('axios')
const FACEBOOK_AUTHENTICATION_TOKEN_URL = 'https://www.facebook.com/dialog/oauth?client_id=464891386855067&redirect_uri=fb464891386855067://authorize/&&scope=user_birthday,user_photos,user_education_history,email,user_relationship_details,user_friends,user_work_history,user_likes&response_type=token'

module.exports = class TinderAuth {
  constructor(email, password) {
    this._email = email
    this._password = password
  }

  get access_token() {
    return this._access_token
  }

  getAccessToken() {
    return new Promise(async (resolve, reject) => {
      const params = process.env.CI ? {args: ['--no-sandbox', '--disable-setuid-sandbox']} : {headless: false, slowMo: 50}
      const browser = await pptr.launch(params)
      const page = await browser.newPage()
      await page.goto(FACEBOOK_AUTHENTICATION_TOKEN_URL)
      await page.waitFor(5000)
      await page.type('#email', this._email)
      await page.type('#pass', this._password)
      await page.click('#loginbutton')
      await page.waitFor(5000)
      console.log('passed login')
      const urlRegex = /\/v[0-9]\.[0-9]\/dialog\/oauth\/(confirm|read)\?dpr=[0-9]{1}/
      page.on('response', async response => {
        if (response.url().match(urlRegex)) {
          const url = response.url()
          try {
            const body = await response.text()
            const [, token] = body.match(/access_token=(.+?)&/)
            this._access_token = token
            await browser.close()
            resolve(token)
          } catch(e) {
            console.error(`Failed getting data from: ${url}`)
            reject(e)
          }
        }
      })

      try {
        await page.click('body')
        await page.click('button[name="__CONFIRM__"]')
      } catch (e) {
        console.log('[ERROR] failure confirm')
        reject(e)
      }
    })
  }

  async getUserId() {
    if(!this._access_token) return null
    let {data: {id: uid}} = await axios.get(`https://graph.facebook.com/me?access_token=${this._access_token}`)
    return uid
  }
}
