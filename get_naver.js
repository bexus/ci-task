require('dotenv').config()
const puppeteer = require('./utils/pptr')
const request = require('request');
const moment = require('moment');
const uri = require('url');
const path = require('path');

(async () => {
  const browser = await puppeteer.browser
  const paths = ["wellness", "girls"]
  const gasURL = "https://script.google.com/macros/s/AKfycbxxoLcXqPYJQZv6O3ZNurhYOkctCZq8CWWKAAqjApqJ5CCzbW0/exec"
  const pageLimit = 2

  for(let p of paths) {
    // カテゴリページへ遷移
    const page = await browser.newPage()
    let pageNo = 1
    const url = `https://matome.naver.jp/${p}?page=${pageNo}`
    await page.goto(url)
    console.log(`Reached: ${url}`)
    // シート作成
    await request.post({
      uri: gasURL,
      headers: { "Content-type": "application/json" },
      json: { type: p, method: "create", sheetName: moment().format('YYYY/MM/DD') }
    }, (err, res, data) => {
      if(err) console.log(err)
    });

    let buffer
    while(pageNo <= pageLimit) {
      // 1ページ分のデータ(20記事)を格納するバッファ
      buffer = []
      // 1ページ分の記事のリンク配列
      let postList = await page.evaluate(() => {
        let data = []
        linkList = document.querySelectorAll('.ArCol02 > div:first-child .mdTopMTMList01ItemTtl a')
        linkList.forEach(element => {
          data.push(element.getAttribute('href'))
        })
        return data
      })
      // 記事詳細ページを開くタブ
      const postTab = await browser.newPage()
      await postTab.setRequestInterception(true)
      await postTab.on('request', interceptedRequest => {
        const reqUrl = uri.parse(interceptedRequest.url())
        const reqExt = path.extname(reqUrl.pathname)
        const reqHost = reqUrl.hostname
        if (reqHost !== 'matome.naver.jp') {
          interceptedRequest.abort();
        } else if (reqExt === '.png' || reqExt === '.jpg') {
          interceptedRequest.abort();
        } else {
          interceptedRequest.continue();
        }
      });
      for(let post of postList) {
        postTab.goto(`https://matome.naver.jp${post}`)
        await postTab.waitForNavigation({timeout: 0, waitUntil: 'networkidle0'})
        const postData = await postTab.evaluate(() => {
          return {
            article_title: document.title,
            pv: document.querySelector('.mdHeading01CountPV .mdHeading01CountNum').innerHTML
          }
        })
        console.dir(postData)
        await buffer.push(postData)
      }
      await postTab.close()
      // データ書き込み
      await request.post({
        uri: gasURL,
        headers: { "Content-type": "application/json" },
        json: { type: p, method: "insert", sheetName: moment().format('YYYY/MM/DD'), rows: buffer }
      }, (err, res, data) => {
        if(err) console.log(err)
      })
      // 次ページ
      page.goto(`https://matome.naver.jp/${p}?page=${++pageNo}`)
      await page.waitForNavigation({waitUntil: "networkidle0"})
    }
    await page.close()
  }
  await browser.close()
})()
