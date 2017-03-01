import KLine from './lib/kline'
import Timeseries from './lib/timeseries'
import KlineData from './mock/kline-new'

// import io from 'socket.io-client/dist/socket.io'

var root = document.getElementById('root')
var k = new KLine (root)
k.setData(KlineData.data)
k.render()

var testButton = document.createElement('button')
testButton.innerHTML = 'destroy'
testButton.style.padding = '10px 20px'
testButton.onclick = function () {
    k.destroy()
}
var testButton2 = document.createElement('button')
testButton2.innerHTML = 'change size'
testButton2.style.padding = '10px 20px'
testButton2.onclick = function () {
    k.insertVOL()
}
root.appendChild(testButton)
root.appendChild(testButton2)
// var socket = io.connect('ws://10.2.237.250:8060')
// socket.emit('kl', {exchange: 105, code: '000776'})
// socket.on('kl', data => {
//     console.log(data)
// })

// var t = new Timeseries({ct:root,width:1000,height:500});
// t.setData(KlineData.timedata,18.17);
