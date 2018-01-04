var z = require('zero-fill')
  , n = require('numbro')
  , fs = require('fs')
  , path = require('path')
  , analytics = require('forex.analytics')

module.exports = function container (get, set, clear) {
  return {
    name: 'forex_analytics',
    description: 'Apply the trained forex analytics model.',

    getOptions: function (s) {
      this.option('modelfile', 'modelfile (generated by running `train`), should be in models/', String, 'none')
      this.option('period', 'period length of a candlestick (default: 30m), same as --period_length', String, '30m')
      this.option('period_length', 'period length of a candlestick (default: 30m), same as --period', String, '30m')
      this.option('min_periods', 'min. number of history periods', Number, 100)

      if (s.options) {
        if (!s.options.modelfile) {
          console.error('No modelfile specified. Please train a model and specify the resulting file.')
          process.exit(1)
        }
  
        if (path.isAbsolute(s.options.modelfile)) {
          modelfile = s.options.modelfile
        } else {
          modelfile = path.resolve(__dirname, '../../../', s.options.modelfile)
        }
        
        if (fs.existsSync(modelfile)) {
          model = require(modelfile)
        } else {
          console.error('Modelfile ' + modelfile + ' does not exist.')
          process.exit(1)          
        }
        
        if (s.options.period !== model.period) {
          console.error(('Error: Period in model training was ' + model.period + ', now you specified ' + s.options.period + '.').red)
          process.exit(1)
        }
      }
    },

    calculate: function (s) {
      // Calculations only done at the end of each period
    },

    onPeriod: function (s, cb) {
      if (s.lookback.length > s.options.min_periods) {
        var candlesticks = []

        var candlestick = {
          open: s.period.open,
          high: s.period.high,
          low: s.period.low,
          close: s.period.close,
          time: s.period.time / 1000
        }
        candlesticks.unshift(candlestick)
        
        s.lookback.slice(0, s.lookback.length).map(function (period) {
          var candlestick = {
            open: period.open,
            high: period.high,
            low: period.low,
            close: period.close,
            time: period.time / 1000
          }
          candlesticks.unshift(candlestick)
        })
        
        var result = analytics.getMarketStatus(candlesticks, {"strategy": model.strategy})
        if (result.shouldSell) {
          s.signal = "sell"
        } else if (result.shouldBuy) {
          s.signal = "buy"          
        }
      }

      cb()
    },

    onReport: function (s) {
      var cols = []
      return cols
    }
  }
}
