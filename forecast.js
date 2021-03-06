const pptr = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const request = require('request')
const fs = require('fs')
const timeout = 60000
const cookies_path = './cookies.json'
const slack_user_id = process.env.SLACK_USER_ID
const RESULT_SCREENSHOT_PATH = 'result.png'
const SLACK_API_URL = 'https://slack.com/api/files.upload'
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const CHANNEL = '4cast'

const SLACK_USERS = [
  'UAQNQ5Y0M',
  'UAQJTGQV8',
  'UAQP61JF7'
]

const loginWithUserInfo = async ({page, user_id}) => {
  await page.goto('https://www.4cast.to/web/login')
  await page.waitFor(10000)
  await page.click('.login_btn button')
  await page.waitFor(10000)
  await page.evaluate((id, password) => {
    document.querySelector('#id').value = id
    document.querySelector('#passwd').value = password
  }, process.env[`ID_${user_id}`], process.env[`PW_${user_id}`])
  await page.screenshot({path: 'loginpage.png'})
  await page.click('.MdSPBtnLogin')
  await page.waitFor(13000)
  await page.goto('https://www.4cast.to/web/mypage')
  await page.waitFor(13000)
  await page.screenshot({path: 'mypage1.png'})
  console.log(`logined with user: ${user_id}`)
  // ローカルではcookieを保存
  if(!process.env.CI) {
    const cookies = await page.cookies();
    fs.writeFileSync(cookies_path, JSON.stringify(cookies))
  }
}

const loginWithCookie = async ({page}) => {
  const cookies = JSON.parse(fs.readFileSync(cookies_path, 'utf-8'))
  for (let cookie of cookies) {
    await page.setCookie(cookie)
  }
  await page.goto('https://www.4cast.to/web/mypage')
  await page.waitFor('.left', {timeout})
  console.log('logined with cookie')
}

(async () => {
  const user_id = SLACK_USERS.indexOf(slack_user_id)
  if(user_id === -1) {
    console.log('ユーザー未登録です')
    return
  }

  const params = process.env.CI ? {args: ['--no-sandbox', '--disable-setuid-sandbox']} : {headless: false, slowMo: 250}
  const browser = await pptr.launch(params)
  const page = await browser.newPage()
  await page.emulate(devices['iPhone X'])

  // クッキーの存在確認
  let isExistCookie
  try {
    fs.accessSync(cookies_path)
    isExistCookie = true
  } catch(err) {
    isExistCookie = false
  }

  console.log(`ユーザー:${user_id} でログインします`)
  // CI or クッキーが保存されてない場合は通常ログイン
  if(process.env.CI || !isExistCookie) {
    await loginWithUserInfo({ page, user_id })
  } else {
    await loginWithCookie({ page })
  }

  // 未参加一覧
  await page.waitFor(3000)
  let left_num
  try {
    left_num = await page.evaluate(() => {
      return parseInt(document.querySelector('.left .num').innerText.replace(',',''), 10)
    })
  } catch(e) {
    console.log(e)
    return
  }
  console.log(`未参加: ${left_num}個を予想します。`)
  await page.click('.left .num')
  await page.waitFor(5000)
  await page.click('.list_img li')
  await page.waitFor(5000)

  global.count = 0

  for(let i = 0; i < left_num; i++) {
    try {
      await page.click('.btn_quiz_next')
      await page.waitFor(1000)
      const choices = await page.$$('.quiz_lst ul li a.bar')
      if(choices.length > 3) {
        await choices[Math.floor( Math.random() * 3 )].click()
      } else {
        await choices[0].click()
      }
      await page.waitFor(1000 + Math.random())
      const result = await page.evaluate((id) => {
        let question = document.querySelector('.card_tit').textContent
        let forecast = document.querySelector('.tit').textContent
        return `${id}:「${question}」の${forecast} (${document.URL})`
      }, global.count)
      console.log(result)
      await page.click('.btn.type1')
      await page.waitFor(1000 + Math.random())
      global.count++
    } catch(error) {
      console.log(error)
      continue
    }
  }

  await page.goto('https://www.4cast.to/web/mypage')
  await page.waitFor(10000)
  await page.screenshot({path: RESULT_SCREENSHOT_PATH})
  await browser.close()

  console.log(`${global.count}個の予想に成功しました`)

  let data = {
    url: SLACK_API_URL,
    formData: {
      token: SLACK_BOT_TOKEN,
      filename: RESULT_SCREENSHOT_PATH,
      initial_comment: `<@${slack_user_id}> ${global.count}個予想してやったぞ`,
      file: fs.createReadStream('./' + RESULT_SCREENSHOT_PATH),
      channels: CHANNEL
    }
  }

  request.post(data, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('Uploading a screenshot to slack is Success')
    } else {
      console.log('Uploading a screenshot to slack is Failure')
    }
  })
})()
