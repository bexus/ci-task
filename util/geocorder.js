const axios = require('axios')
const parser = require('xml2json')

const geocode = async (landmark) => {
  const params = { v: 1.1, q: landmark }
  const geodata_xml = await axios.get('https://www.geocoding.jp/api/', { params }).then(response => response.data)
  const geodata = parser.toJson(geodata_xml, { object: true })
  if(geodata.result.error) throw new Error(`not found keyword: ${landmark}`)
  return geodata.result.coordinate
}

module.exports = { geocode }
