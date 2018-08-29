const STAGE = 'api-stg.amy-inc.com'
const PRODUCTION = 'anatamo-kirei.jp'
const protocol = 'https'
const host = process.env.API_ENV == 'stage' ? STAGE : PRODUCTION
const endpoint = '/wp-json/wp/v2/cwinfo'

module.exports = {
  api: `${protocol}://${host}${endpoint}`,
  cw: 'https://crowdworks.jp/login?ref=root_pages-index-header'
}
