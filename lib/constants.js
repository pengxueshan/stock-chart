export const KLINE_CONFIG = {
    color: '#000',
    width: 1000,
    height: 500,
    chartWidth: 1000,
    chartHeight: 500,
    chartArr: [],
    lineType: 1, //0: 空心 1: 实心
    maArr: [5, 10, 20, 50],
    maArrColor: ['#499aff', '#e74431', '#8b3cd5'],
    maxCandWidth: 30,
    detailFields: ['time', 'open', 'close', 'high', 'low'],
    type: 'day',
    detailSize: {
        width: 150,
        height: 120
    },
    padding: {
        top: 20,
        right: 60,
        bottom: 60,
        left: 60
    }
}

export const KLINE_DICT = {
    open: '开盘',
    close: '收盘',
    high: '最高',
    low: '最低',
    time: '日期'
}
