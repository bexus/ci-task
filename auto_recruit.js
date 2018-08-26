const pptr = require('puppeteer');
const url = require('url');
require('dotenv').config();

async function run(){
    var u = new url.Url()
    u.protocol = 'https'
    u.host = 'crowdworks.jp'
    const target = 'https://crowdworks.jp/public/jobs/2365914'

    const params = process.env.CI ? {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    } : {
        headless: false,
        slowMo: 50
    };
    const browser = await pptr.launch(params);
    const page = await browser.newPage()
    await page.goto('https://crowdworks.jp/login?ref=root_pages-index-header')
    await page.type('input[name="username"]', process.env.CW_USERNAME)
    await page.type('input[name="password"]', process.env.CW_PASSWORD)
    const loginBtn = await page.$('input[name="commit"]')
    loginBtn.click()
    await page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"})
    console.log("[INFO] Logined")
    await page.goto(target)
    const copyBtn = await page.$('.action_buttons a.copy')
    await copyBtn.click()
    await page.waitFor(1000)
    console.log("[INFO] Moved apply page")
    const autoFill = await page.evaluate(() => {
        begginer = document.querySelector('.custom_fields.specific_level .beginner input')
        begginer.checked = true
        moreThanOne = document.querySelector('#project_contract_hope_number_more_than_one')
        moreThanOne.checked = true
        hopeNumField = document.querySelector('#job_offer_project_contract_hope_number')
        hopeNumField.value = 10
    })
    console.log("[INFO] Inputed data")
    const confirmBtn = await page.$('.submit button')
    await confirmBtn.click()
    await page.waitFor(1500)
    console.log("[INFO] Moved confirm page")
    if(process.env.NODE_ENV != "test") {
        await page.evaluate(() => { document.querySelector('input.submit').click() })
        await page.waitFor(1500)
        console.log("[INFO] Completed")
    } else {
        console.log("[INFO] Test completed")
    }
    await browser.close()
}

run()

