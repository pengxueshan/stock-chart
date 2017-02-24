import KLine from './lib/kline'
import Timeseries from './lib/timeseries'
import KlineData from './mock/kline'

import {calcMA} from './lib/kline-utils'

// import io from 'socket.io-client/dist/socket.io'

var root = document.getElementById('root')
var k = new KLine (root)
k.setData(KlineData.data)
k.render()
// var socket = io.connect('ws://10.2.237.250:8060')
// socket.emit('kl', {exchange: 105, code: '000776'})
// socket.on('kl', data => {
//     console.log(data)
// })

// var t = new Timeseries({ct:root,width:1000,height:500});
// t.setData(KlineData.timedata,18.17);
