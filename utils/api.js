const request = require('sync-request');

const getJSON = function(url) {
  let response = request('GET', url)
  return JSON.parse(response.body)
}

module.exports = {
  fetch: getJSON
};
