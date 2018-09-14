require('dotenv').config()
const puppeteer = require('puppeteer')

const localConfig = { headless: false, slowMo: 20 }
const ciConfig = { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
const config = process.env.CI ? ciConfig : localConfig

exports.browser = puppeteer.launch(config)
