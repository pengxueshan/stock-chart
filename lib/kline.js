import {EventEmitter} from 'events'
import {KLINE_CONFIG, KLINE_DICT} from './constants'
import _ from 'lodash'
import * as d3 from 'd3'
import moment from 'moment'
import {randomColor} from '../util/index'
import ImmutableJS from 'immutable'
import {calcMA, formatKlineData} from './kline-utils'

export default class KLine extends EventEmitter {
    constructor(root, config) {
        super()
        this.config = _.assign(KLINE_CONFIG, config)
        this.root = root
        this.curDataIndex = 0
        this.showCrossLine = true
        this.lastHorPoint1 = {
            x: this.config.padding.left,
            y: this.config.padding.top
        }
        this.lastHorPoint2 = {
            x: this.config.width - this.config.padding.right,
            y: this.config.padding.top
        }
        this.lastVerPoint1 = {
            x: this.config.padding.left,
            y: this.config.padding.top
        }
        this.lastVerPoint2 = {
            x: this.config.padding.left,
            y: this.config.height - this.config.padding.bottom
        }
        this.curSliceIndex = {
            start: 0,
            end: 0
        }
        this.init()
    }

    init() {
        //创建svg
        this.wrap = d3
            .select(this.root)
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .on('mousemove', this.SVGMouseMove.bind(this))
        //创建坐标轴
        this.xAxisWrap = this
            .wrap
            .append('g')
        this.yAxisWrap = this
            .wrap
            .append('g')
        //创建图形容器
        this.chart = this
            .wrap
            .append('g')
            .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        this.chartWidth = this.config.width - this.config.padding.left - this.config.padding.right
        this.chartHeight = this.config.height - this.config.padding.top - this.config.padding.bottom
        //创建比例尺
        this.xScale = d3
            .scaleTime()
            .rangeRound([0, this.chartWidth])
        this.yScale = d3
            .scaleLinear()
            .rangeRound([0, this.chartHeight])
        this.setXAxis()
        this.setYAxis()
        //创建十字线容器
        this.crossLineWrap = this
            .wrap
            .append('g')
        //创建详情浮层容器
        this.detailLayerWrap = this
            .wrap
            .append('g')
            .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        //放大缩小
        this.zoomInWrap = this
            .wrap
            .append('g')
            .attr('transform', `translate(${this.config.width - this.config.padding.right + 30}, ${this.config.padding.top})`)
            .on('click', () => this.zoomIn())
        this.zoomOutWrap = this
            .wrap
            .append('g')
            .attr('transform', `translate(${this.config.width - this.config.padding.right + 30}, ${this.config.padding.top + 20})`)
            .on('click', () => this.zoomOut())
        this.setZoomButton()
        //绑定事件
        this.bindEvent()

        // test
        this
            .wrap
            .append('text')
            .text('实心线')
            .attr('x', this.config.width - this.config.padding.right + 20)
            .attr('y', 75)
            .style('font-size', 12)
            .style('cursor', 'pointer')
            .on('click', () => {
                this.setConfig({lineType: 1})
            })
        this
            .wrap
            .append('text')
            .text('空心线')
            .attr('x', this.config.width - this.config.padding.right + 20)
            .attr('y', 95)
            .style('font-size', 12)
            .style('cursor', 'pointer')
            .on('click', () => {
                this.setConfig({lineType: 0})
            })
    }

    setConfig(config) {
        this.config = _.assign(this.config, config)
        this.render()
    }

    setZoomButton() {
        this
            .zoomInWrap
            .append('rect')
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#369')
        this
            .zoomInWrap
            .append('text')
            .text('+')
            .attr('x', 4)
            .attr('y', 11)
            .attr('fill', '#fff')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
        this
            .zoomOutWrap
            .append('rect')
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#963')
        this
            .zoomOutWrap
            .append('text')
            .text('-')
            .attr('x', 4)
            .attr('y', 11)
            .attr('fill', '#fff')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
    }

    bindEvent() {
        document.addEventListener('keydown', (e) => {
            if (e.keyCode == 38 || e.which == 38) { //键盘向上按键
                this.zoomIn()
            } else if (e.keyCode == 40 || e.which == 40) { //键盘向下按键
                this.zoomOut()
            } else if (e.keyCode == 39 || e.which == 39) { //键盘向右按键
                this.showCrossLine = true
                this.renderCrossLine('index', 'right')
            } else if (e.keyCode == 37 || e.which == 37) { //键盘向左按键
                this.showCrossLine = true
                this.renderCrossLine('index', 'left')
            }
        })
    }

    zoomOut() {
        if (!this._data) {
            this.initOriginData()
        }
        if (this.data.length < this._data.length) {
            this.setData(this.getZoomOutData())
        }
        this.render()
    }

    zoomIn() {
        if (!this._data) {
            this.initOriginData()
        }
        if (this.data.length >= 10) {
            this.setData(this.getZoomInData())
        }
        this.render()
    }

    initOriginData() {
        if (!this._data) {
            this._data = this
                .data
                .concat()
            this._curDataIndex = this.curDataIndex
        }
    }

    getZoomInData() {
        var step = Math.floor(this.data.length / 4)
        var start = this._curDataIndex - step
        var end = this._curDataIndex + step
        var moreRight = this.data.lenth - 1 - this.curDataIndex - step
        var moreLeft = this.curDataIndex - step
        if (moreRight < 0) {
            var absMoreRight = Math.abs(moreRight)
            start -= absMoreRight
            end -= absMoreRight
        }
        if (moreLeft < 0) {
            var absMoreLeft = Math.abs(moreLeft)
            start += absMoreLeft
            end += absMoreLeft

        }
        this.setCurSliceIndex(start, end)
        return this
            ._data
            .slice(start, end)
    }

    getZoomOutData() {
        var step = this.data.length
        var start = this._curDataIndex - step
        var end = this._curDataIndex + step
        if (end > this._data.length - 1) {
            start = start - (end - this._data.length - 1)
            end = this._data.length
        }
        if (start < 0) {
            end += Math.abs(start)
            start = 0
        }
        this.setCurSliceIndex(start, end)
        return this
            ._data
            .slice(start, end)
    }

    setCurSliceIndex(start = 0, end = 0) {
        this.curSliceIndex = {
            start: start,
            end: end
        }
    }

    //创建十字线
    initCrossLine(callback) {
        if (!this.crossLineH || !this.crossLineV) {
            this.crossLineH = this
                .crossLineWrap
                .append('line')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .attr('stroke-width', 1)
            this.crossLineV = this
                .crossLineWrap
                .append('line')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-linejoin', 'round')
                .attr('stroke-linecap', 'round')
                .attr('stroke-width', 1)
        }
        if (callback) {
            callback(this.crossLineH, this.crossLineV)
        }
    }

    //创建详情浮层
    initDetailLayer(callback) {
        if (!this.detailLayerText) {
            this.detailLayerBg = this
                .detailLayerWrap
                .append('rect')
                .attr('width', 120)
                .attr('height', 120)
                .attr('fill', 'rgba(0,0,0,0.5)')
                .attr('x', 0)
                .attr('y', 0)
            this.detailLayerText = this
                .detailLayerWrap
                .append('g')
                .attr('x', 0)
                .attr('y', 0)
                .attr('dx', 10)
                .attr('dy', 14)
                .attr('text-anchor', 'start')
            // .attr('dx', this.chartWidth) .attr('dy', this.chartHeight)
        }
        if (callback) {
            return callback({detailLayerBg: this.detailLayerBg, detailLayerText: this.detailLayerText})
        }
    }

    setGraphData(data) {
        var parseTime = d3.timeParse('%Y%m%d')
        this.data = data.map(item => {
            item.formatDate = parseTime(item.date)
            return item
        })
        this.setMAData()
        this.setXDomain()
        this.setYDomain()
        if (this._curDataIndex != undefined) {
            this.curDataIndex = _.findIndex(this.data, item => {
                return item.date == this._data[this._curDataIndex].date
            })
        }
        this.setXAxis()
        this.setYAxis()
        this.setCand()
    }

    //设置图表数据
    setData(data) {
        var parseTime = d3.timeParse('%Y%m%d')
        this.data = data.map(item => {
            item.formatDate = parseTime(item.date)
            return item
        })
        this.setMAData()
        this.setXDomain()
        this.setYDomain()
        if (this._curDataIndex != undefined) {
            this.curDataIndex = _.findIndex(this.data, item => {
                return item.date == this._data[this._curDataIndex].date
            })
        }
        this.setXAxis()
        this.setYAxis()
        this.setCand()
    }

    setXDomain() {
        this
            .xScale
            .domain(d3.extent(this.data, function (d) {
                return d.formatDate
            }))
    }

    setYDomain() {
        var priceDomain = []
        this
            .data
            .forEach(item => {
                priceDomain.push(item.close, item.open, item.low, item.high)
            })
        this.config.maArr.forEach(item => {
            if (this[`ma${item}`]) {
                priceDomain = priceDomain.concat(d3.extent(this[`ma${item}`], d => {
                    return d.ma
                }))
            }
        })
        this.yDomain = d3.extent(priceDomain).reverse()
        this.yScale.domain(this.yDomain)
    }

    setMAData() {
        var arr = this._data || this.data
        this.config.maArr.forEach(item => {
            if (!this[`_ma${item}`] || this[`_ma${item}`].length < 1) {
                this[`_ma${item}`] = calcMA(arr, item).slice(item - 1)
            }
            this[`ma${item}`] = this[`_ma${item}`].slice(this.curSliceIndex.start < item
                ? 0
                : this.curSliceIndex.start - item + 1, this.curSliceIndex.end ? this.curSliceIndex.end - item + 1 : this[`_ma${item}`].length)
        })
    }

    //设置k线柱子尺寸
    setCand() {
        var length = this.data.length
        var bandWidth = this.chartWidth / length
        bandWidth = Math.max(1, bandWidth)
        bandWidth = Math.min(this.config.maxCandWidth, bandWidth)
        this.config.candWidth = bandWidth
    }

    //设置x坐标轴
    setXAxis() {
        if (!this.xScale)
            return
        this.xAxis = d3
            .axisTop(this.xScale)
            .ticks(d3.timeMonth.every(1))
            .tickSize(this.chartHeight)
            .tickFormat(d => {
                var ret = moment(d).format('MM')
                return ret == '01'
                    ? moment(d).format('YYYY')
                    : ret
            })
        var xPos = {
            x: this.config.padding.left,
            y: this.config.height - this.config.padding.bottom
        }
        if (!this.xAxisWrap) {
            this.xAxisWrap = this
                .wrap
                .append('g')
        }
        this
            .xAxisWrap
            .attr('transform', `translate(${xPos.x}, ${xPos.y})`)
            .call(this.customXAxis.bind(this))
    }

    //定制x坐标轴样式
    customXAxis(g) {
        g.call(this.xAxis)
        // g.select('.domain').remove()
        g
            .selectAll('.tick line')
            .attr('stroke', 'rgba(0,0,0,0.3)')
        g.selectAll('.tick text')
        // .attr('x', 4)
            .attr('y', 20)
    }

    //设置y坐标轴
    setYAxis() {
        if (!this.yScale)
            return
        this.yAxis = d3
            .axisRight(this.yScale)
            .tickSize(this.chartWidth)
            .ticks(10)
        var yPos = {
            x: this.config.padding.left,
            y: this.config.padding.top
        }
        if (!this.yAxisWrap) {
            this.yAxisWrap = this
                .wrap
                .append('g')
        }
        this
            .yAxisWrap
            .attr('transform', `translate(${yPos.x}, ${yPos.y})`)
            .call(this.customYAxis.bind(this))
    }

    //定制y坐标轴样式
    customYAxis(g) {
        g.call(this.yAxis)
        g.select('.domain')
        // .remove()
        g
            .selectAll('.tick line')
            .attr('stroke', 'rgba(0,0,0,0.3)')
        g
            .selectAll('.tick text')
            .attr('x', -50)
        // .attr('dy', -4)
    }

    //渲染十字线
    renderCrossLine(type, direct, step = 1) {
        if (!this.showCrossLine)
            return
        this.initCrossLine((lineH, lineV) => {
            var horPoint1 = {},
                horPoint2 = {},
                verPoint1 = {},
                verPoint2 = {}
            if ('index' === type) {
                horPoint1.x = this.lastHorPoint1.x
                horPoint1.y = this.lastHorPoint1.y
                horPoint2.x = this.lastHorPoint2.x
                horPoint2.y = this.lastHorPoint2.y
                verPoint1.y = this.lastVerPoint1.y
                verPoint2.y = this.lastVerPoint2.y
                if ('right' === direct && this.curDataIndex < this.data.length - step) {
                    this.curDataIndex += step
                    this._curDataIndex += step
                }
                if ('left' === direct && this.curDataIndex > (step - 1)) {
                    this.curDataIndex -= step
                    this._curDataIndex -= step
                }
                verPoint1.x = verPoint2.x = this.xScale(this.data[this.curDataIndex].formatDate) + this.config.padding.left
                horPoint1.y = horPoint2.y = this.yScale(this.data[this.curDataIndex].close) + this.config.padding.top
            } else {
                this.lastHorPoint1 = horPoint1 = {
                    x: this.config.padding.left,
                    y: this.crossLineLimitY()
                }
                this.lastHorPoint2 = horPoint2 = {
                    x: this.config.width - this.config.padding.right,
                    y: this.crossLineLimitY()
                }
                this.lastVerPoint1 = verPoint1 = {
                    x: this.crossLineLimitX(),
                    y: this.config.padding.top
                }
                this.lastVerPoint2 = verPoint2 = {
                    x: this.crossLineLimitX(),
                    y: this.config.height - this.config.padding.bottom
                }
            }
            //画水平线
            lineH
                .attr('x1', horPoint1.x)
                .attr('y1', horPoint1.y)
                .attr('x2', horPoint2.x)
                .attr('y2', horPoint2.y)
            //画垂直线
            lineV
                .attr('x1', verPoint1.x)
                .attr('y1', verPoint1.y)
                .attr('x2', verPoint2.x)
                .attr('y2', verPoint2.y)
        })
        this.renderDetailLayer()
    }

    //svg hover
    SVGMouseMove() {
        var date = this
            .xScale
            .invert(d3.mouse(this.chart.node())[0])
        var curIndex = _.findIndex(this.data, item => {
            return item.date == moment(new Date(date)).format('YYYYMMDD')
        })
        if (this._data) {
            var _curIndex = _.findIndex(this._data, item => {
                return item.date == moment(new Date(date)).format('YYYYMMDD')
            })
            this._curDataIndex = _curIndex
        }
        if (curIndex != -1) {
            this.curDataIndex = curIndex
            this.renderCrossLine()
        }
    }

    removeCrossLayer() {
        this
            .crossLineWrap
            .selectAll('line')
            .remove()
    }

    removeDetailLayer() {
        this
            .detailLayerBg
            .remove()
        this
            .detailLayerText
            .remove()
        this.detailLayerBg = null
        this.detailLayerText = null
    }

    //详情浮层
    renderDetailLayer(data) {
        this.initDetailLayer(({detailLayerText}) => {
            detailLayerText
                .selectAll('text')
                .remove()
        })
        if (this.xScale(this.data[this.curDataIndex].formatDate) < 120) {
            this
                .detailLayerWrap
                .attr('transform', `translate(${this.config.width - this.config.padding.right - 120}, ${this.config.padding.top})`)
        } else if (this.xScale(this.data[this.curDataIndex].formatDate) > (this.config.width - this.config.padding.right - this.config.padding.left - 120)) {
            this
                .detailLayerWrap
                .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        }
        if (!data) {
            data = this.data[this.curDataIndex]
        }
        var lineheight = 18
        var start = 20
        var index = 0
        _.mapKeys(data, (value, key) => {
            if (key != 'formatDate') {
                this
                    .detailLayerText
                    .append('text')
                    .text(`${KLINE_DICT[key] || key}: ${value}`)
                    .attr('transform', `translate(10, ${start + lineheight * index})`)
                    .attr('fill', '#fff')
                    .style('font-size', 12)
                    .style('margin-right', 10)
                index++
            }
        })
    }

    //十字线Y轴范围
    crossLineLimitY() {
        var ret = d3.mouse(this.wrap.node())[1]
        var limitBottom = this.config.height - this.config.padding.bottom
        var limitTop = this.config.padding.top
        if (ret > limitBottom) {
            ret = limitBottom
        }
        if (ret < limitTop) {
            ret = limitTop
        }
        return ret
    }

    //十字线X轴范围
    crossLineLimitX() {
        var ret = d3.mouse(this.wrap.node())[0]
        var limitLeft = this.config.padding.left
        var limitRight = this.config.width - this.config.padding.right
        if (ret > limitRight) {
            ret = limitRight
        }
        if (ret < limitLeft) {
            ret = limitLeft
        }
        return ret
    }

    renderKline() {
        this
            .chart
            .selectAll('rect, line')
            .remove()
        //线
        this
            .chart
            .selectAll('line')
            .data(this.data)
            .enter()
            .append('line')
            .attr('x1', d => {
                return this.xScale(d.formatDate)
            })
            .attr('y1', d => {
                return this.yScale(d.low)
            })
            .attr('x2', d => {
                return this.xScale(d.formatDate)
            })
            .attr('y2', d => {
                return this.yScale(d.high)
            })
            .attr('fill', 'none')
            .attr('stroke', d => {
                return (d.close - d.open) > 0
                    ? 'red'
                    : 'green'
            })
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', d => {
                return `1000, ${Math.abs(this.yScale(d.open) - this.yScale(d.close))}`
            })
            .attr('stroke-dashoffset', d => {
                var delta = Math.abs(this.yScale(d3.min([d.open, d.close])) - this.yScale(d.low))
                return Math.abs(1000 - delta)
            })
            .attr('stroke-width', 1)
        //柱子
        this
            .chart
            .selectAll('rect')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('x', d => {
                return this.xScale(d.formatDate) - (this.config.candWidth / 2)
            })
            .attr('y', d => {
                return Math.min(this.yScale(d.open), this.yScale(d.close))
            })
            .attr('width', this.config.candWidth)
            .attr('height', d => {
                return Math.abs(this.yScale(d.open) - this.yScale(d.close))
            })
            .attr('stroke', d => {
                return (d.close - d.open) > 0
                    ? 'red'
                    : 'green'
            })
            .attr('stroke-width', () => {
                if (this.config.lineType == 0) {
                    return 1
                } else {
                    return 0
                }
            })
            .attr('fill', d => {
                if (this.config.lineType == 1) {
                    return (d.close - d.open) > 0
                        ? 'red'
                        : 'green'
                } else {
                    return 'none'
                }
            })
        //MA
        this.renderMALine()
    }

    //画MA线
    renderMALine() {
        var line = d3
            .line()
            .x(d => this.xScale(d.formatDate))
            .y(d => this.yScale(d.ma))
        if (this.chart) {
            this.config.maArr.forEach((item, index) => {
                if (this[`ma${item}line`]) this[`ma${item}line`].remove()
                this[`ma${item}line`] = this
                    .chart
                    .append('path')
                    .datum(this[`ma${item}`])
                    .attr('fill', 'none')
                    .attr('stroke', this.config.maArrColor[index] || 'blue')
                    .attr('stroke-linejoin', 'round')
                    .attr('stroke-linecap', 'round')
                    .attr('stroke-width', 1.5)
                    .attr('d', line)
            })
        }
    }

    render() {
        this.renderKline()
    }
}
