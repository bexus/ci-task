const pptr = require('puppeteer');
const url = require('url');
require('dotenv').config();

async function run(){
    var u = new url.Url()
    u.protocol = 'https'
    u.host = 'crowdworks.jp'

    const params = process.env.CI ? {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    } : {
        headless: false,
        slowMo: 250
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
    const newBtn = await page.$('.menu_lists.employer.current > li:first-child > a')
    await newBtn.click()
    await page.goto('https://crowdworks.jp/job_offers?source=copy_job_offer')
    await page.waitFor(2000)
    const copyRequest = await page.evaluate(() => {
        a = document.querySelector('.valign_middle > tr:first-child .edit > a')
        href = a.getAttribute('href')
        return href
    })
    u.pathname = copyRequest
    const request = u.format()
    await page.goto(request)
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
    // await page.evaluate(() => { document.querySelector('input.submit').click() })
    // await page.waitFor(1500)
    console.log("[INFO] Completed")
    await browser.close()
}

run()

