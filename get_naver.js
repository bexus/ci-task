require('dotenv').config()
const puppeteer = require('./utils/pptr')
const kuromoji = require('./utils/kuromoji')
const request = require('request');

const get_titles = async (browser, url) => {
  const page = await browser.newPage()
  process.on("unhandledRejection", console.dir)
  let allData = []
  await page.goto(url)
  console.log('Reached: ' + url)
  while(true) {
    let postList = await page.evaluate(() => {
        let data = []
        linkList = document.querySelectorAll('.mdTopMTMList01Item .mdTopMTMList01ItemTtl a')
        linkList.forEach(element => {
            data.push(element.getAttribute('href'))
        });
        return data
    })
    for(post of postList) {
      const postTab = await browser.newPage()
      await postTab.goto('https://matome.naver.jp' + post)
      await postTab.waitFor(100)
      const postData = await postTab.evaluate(() => {
        return [
          document.title,
          document.querySelector('.mdHeading01CountPV .mdHeading01CountNum').innerHTML
        ]
      });
      await kuromoji.analyze(postData[0], function(result){
        const pData = postData.concat(result)
        allData.push(pData)
      });
      await postTab.close()
    }
    break
  }
  await ss_operotor.record(allData)
  await page.close()
}

(async () => {
  const browser = await puppeteer.browser;
  const urls = ["https://matome.naver.jp/girls"];
  await Promise.all(
    urls.map(url => get_titles(browser, url))
  );
  browser.close();
})()
