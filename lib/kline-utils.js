import ImmutableJS from 'immutable'
import * as d3 from 'd3'
import Big from 'big.js'

/**
 * 格式化k线数据
 * 计算MA指标数据
 * @param raw 原始数据
 * @param maArr ma数组
 */
export function formatKlineData(raw, maArr = []) {
    var parseTime = d3.timeParse('%Y%m%d')
    var ret = {}
    ret.data = ImmutableJS.fromJS(raw).map(item => {
        if (item.get('__formatDate__')) {
            item.set('__formatDate__', parseTime(item.get('date')))
        }
        return item
    })
    maArr.forEach(item => {
        ret[`ma${item}`] = calcMA(ret.data, item)
    })
    return ret
}

/**
 * 计算MA指标
 * @export
 * @param {list} list
 * @param {number} ma
 * @returns list
 */
export function calcMA(list, ma) {
    var resultArr = ImmutableJS.fromJS([])
    ImmutableJS.fromJS(list).reduce((preValue, curValue, index, origin) => {
        var frontIndex = index - ma
        var delta = 0
        var temp = {}
        if (frontIndex >= 0) {
            delta = origin.getIn([frontIndex, 'close'])
        }
        if (curValue.get('formatDate')) {
            temp.formatDate = curValue.get('formatDate')
        }
        var sum = new Big(preValue).plus(curValue.get('close')).minus(delta)
        temp.ma = sum.div(ma).valueOf()
        resultArr = resultArr.push(temp)
        return sum.valueOf()
    }, 0)
    return resultArr.toJS()
}
