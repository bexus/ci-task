const kuromoji = require('kuromoji')

const analyze = function(text, callback) {
  kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build(function (err, tokenizer) {
    const tokens = tokenizer.tokenize(text).map(function(token) {
      return token.surface_form
    });
    callback(tokens);
  });
}

module.exports = {
  analyze: analyze
};
