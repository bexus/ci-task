const fs = require('fs');
const {TinderClient, GENDERS, GENDER_SEARCH_OPTIONS} = require('tinder-client');
const userdata_path = './userdata.json';
const geocorder = require('./util/geocorder')
const moment = require('moment')
const facepp = require('./util/facepp')
const { SlackOAuthClient } = require('messaging-api-slack')
const TARGET_NUM = process.env.TINDER_NUM || 10
const BORDER = process.env.TINDER_BORDER || 50
const KEVIN_BORDER = process.env.KEVIN_BORDER || 78
const TRY_MAX = 50
const userGender = GENDERS.male
const searchPreferences = {
  maximumAge: 30,
  minimumAge: 18,
  genderPreference: GENDER_SEARCH_OPTIONS.female,
  maximumRangeInKilometers: 30,
}


const birth2age = (birthdate) => {
  const birth = moment(birthdate)
  return moment().diff(birth, 'years')
}

const fbUserDataWithLogin = async () => {
  if(!process.env.TINDER_EMAIL || !process.env.TINDER_PASSWORD) {
    console.error('undefined email or password')
    process.exit(1)
  }
  const TinderAuth = require('./tinderauth')
  const Crypt = require('./util/crypt')
  const email = process.env.TINDER_EMAIL
  const password = Crypt.decrypt(process.env.TINDER_PASSWORD)
  const tinderauth = new TinderAuth(email, password)
  await tinderauth.getAccessToken()
  token = tinderauth.access_token
  uid = await tinderauth.getUserId()
  fs.writeFileSync(userdata_path, JSON.stringify({uid, token}))
  return {uid, token}
}

(async () => {
  let userdata = {}
  let is_exist_userdata = false
  let kevin_recommends = []
  let try_count = 0, target_count = 0
  try {
    fs.accessSync(userdata_path)
    is_exist_userdata = true
  } catch(err) {
    is_exist_userdata = false
  }

  // ユーザデータのファイルがなければfacebookにログインしてアクセストークンを取得
  if(!is_exist_userdata)
    userdata = await fbUserDataWithLogin()
  else
    userdata = JSON.parse(fs.readFileSync(userdata_path, 'utf-8'))

  // TinderAPIの認証 & ユーザ設定更新
  const tinder_client = await TinderClient.create({facebookUserId: userdata.uid, facebookToken: userdata.token})
  await tinder_client.updateProfile({ userGender, searchPreferences })

  // 指定した場所から場所から緯度経度を取得してTinderに反映
  // const coordinate = await geocorder.geocode(process.env.TINDER_LOCATION || '青学')
  // console.log(coordinate)
  // await tinder_client.changeLocation({ latitude: coordinate.lat, longitude: coordinate.lng })

  // console.log("[INFO] create TinderAPI connection")

  while(target_count < TARGET_NUM && try_count < TRY_MAX) {
    // Tinderからリコメンドを取得(15人前後/回)
    let recommendations = await tinder_client.getRecommendations()
    if(recommendations.results.length === 0) break;
    for(let girl of recommendations.results) {
      let uid = girl._id
      let profile_image = girl.photos[0].url
      // Face++でスコアを評価
      let faces = []
      try {
        faces = await facepp.evaluateFace(profile_image)
      } catch(e) {
        console.log(e.response.data.error_message)
      }
      console.log('after face++')
      await new Promise(r => setTimeout(r, 3000));
      console.log(faces.length)
      // 顔が認識されない場合はスキップ
      if(faces.length === 0) {
        await tinder_client.pass(uid)
        continue
      }

      let facedata = faces[0].attributes
      let age = birth2age(girl.birth_date)
      let score = facedata.beauty.female_score

      let detail_data = await tinder_client.getUser(uid)
      // 閾値以上はケビンのおすすめに追加
      if(detail_data.results.instagram) {
        let g = {
          uid,
          name: girl.name,
          bio: girl.bio,
          distance: girl.distance_mi,
          estimate_age: facedata.age.value,
          profile_image,
          age,
          score
        }
        if(detail_data.results.instagram) g.instagram = detail_data.results.instagram.username
        kevin_recommends.push(g)
      }

      // 設定したレベル以上はLIKE, 未満はPASS
      let res = score >= BORDER ? "Liked" : "Passed"
      if(score >= BORDER) {
        target_count++
        await tinder_client.like(uid)
      } else {
        await tinder_client.pass(uid)
      }
      try_count++

      console.log('==============================')
      console.log(`${girl.name} ${girl.distance_mi}km先, 実年齢: ${age}`)
      console.log(`スコア: ${score}, 推定年齢: ${facedata.age.value}`)
      console.log(res)
      console.log(profile_image)
      console.log(`${target_count} / ${try_count}`)
      if(target_count >= TARGET_NUM || try_count >= TRY_MAX) break
    }
  }

  console.log("===================")
  console.log(`RESULT: Liked ${target_count}/${try_count}`)
  console.log("===================")

  let result_messege = `${target_count}人ナンパしといたわ\nちな俺の一押しはこいつらな`
  let attachments = []
  for(let girl of kevin_recommends) {
    let attachment = {
      title: girl.name,
      callback_id: girl.uid,
      color: "good",
      attachment_type: "default",
      fields: [
        { title: "スコア", value: girl.score, short: true },
        { title: "距離", value: `${girl.distance}km`, short: true },
        { title: "おれの推測年齢", value: girl.estimate_age, short: true},
        { title: "実年齢", value: girl.age, short: true},
        { title: "自己紹介", value: girl.bio }
      ],
      thumb_url: girl.profile_image,
      actions: []
    }
    if(girl.instagram) {
      attachment.actions.push({
        text: ":instagram: Instagram",
        type: "button",
        url: `https://www.instagram.com/${girl.instagram}`
      })
    }
    attachments.push(attachment)
  }

  const slack_client = SlackOAuthClient.connect(process.env.SLACK_BOT_TOKEN)
  slack_client.postMessage(
    'bot-test',
    { text: result_messege, attachments },
    { as_user: true }
  )

})()
