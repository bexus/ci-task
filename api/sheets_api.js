require('dotenv').config()
const GoogleSpreadsheet = require('google-spreadsheet');
const credentials = require('./credentials/google_drive.json');
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
const async = require('async');
const moment = require('moment');
const COLUMN_SIZE = 30;

const recordToSpreadsheet = function(items) {
  return doc.useServiceAccountAuth(credentials, function(err) {
    if (err) throw err;
    let headers = ['article_title', 'pv'];
    [...Array(COLUMN_SIZE)].map((_, i) => {
      headers.push(`word${i+1}`);
    });
    const opt = {
      title: moment().format('YYYY/MM/DD'),
      headers: headers
    };
    return doc.addWorksheet(opt, function(err, sheet) {
      if (err) throw err;
      return async.eachSeries(items, function(item, next) {
        const rowData = { article_title: item[0], pv: item[1] };
        [...Array(COLUMN_SIZE)].map((_, i) => {
          rowData[`word${i+1}`] = item[i+2];
        });
        // console.log(rowData);
        return sheet.addRow(rowData, next);
      }, function(err) {
        return console.log('complete');
      });
    });
  });
}

module.exports = {
  record: recordToSpreadsheet
};
