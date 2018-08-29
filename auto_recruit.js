require('dotenv').config()
const urlUtil = require('./utils/url')
const apiUtil = require('./utils/api')
const puppeteer = require('./utils/pptr')

const recruit = async (browser, url) => {
    console.log("[INFO] Target Job: " + url)
    let page = await browser.newPage()
    await page.goto(urlUtil.cw)
    await page.type('input[name="username"]', process.env.CW_USERNAME)
    await page.type('input[name="password"]', process.env.CW_PASSWORD)
    const loginBtn = await page.$('input[name="commit"]')
    loginBtn.click()
    await page.waitForNavigation({timeout: 90000, waitUntil: "domcontentloaded"})
    console.log("[INFO] Logined")
    await page.goto(url, {waitUntil: "domcontentloaded"})
    await page.waitFor(2000)
    const copyBtn = await page.$('.action_buttons a.copy')
    await copyBtn.click()
    await page.waitFor(2000)
    console.log("[INFO] Moved apply page")
    await page.evaluate(() => {
        moreThanOne = document.querySelector('#project_contract_hope_number_more_than_one')
        moreThanOne.checked = true
        hopeNumField = document.querySelector('#job_offer_project_contract_hope_number')
        hopeNumField.value = 10
    })
    console.log("[INFO] Inputed data")
    const confirmBtn = await page.$('.submit button')
    await confirmBtn.click()
    await page.waitFor(2000)
    console.log("[INFO] Moved confirm page")
    if(process.env.NODE_ENV != 'test' || process.env.API_ENV != 'stage') {
        await page.evaluate(() => { document.querySelector('input.submit').click() })
        await page.waitFor(2000)
        console.log("[INFO] Completed")
    } else {
        console.log("[INFO] Test completed")
    }
    await page.close()
}

(async () => {
    const response = apiUtil.fetch(urlUtil.api)
    const browser = await puppeteer.browser
    await Promise.all(
        response.offer_url.map(url => recruit(browser, url))
    );
    browser.close();
})()
