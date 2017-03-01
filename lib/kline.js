import { EventEmitter } from 'events'
import { KLINE_CONFIG, KLINE_DICT } from './constants'
import _ from 'lodash'
import * as d3 from 'd3'
import { formatKlineData } from './kline-utils'

export default class KLine extends EventEmitter {
    constructor(root, config) {
        super()
        this.config = _.assign(KLINE_CONFIG, config)
        this.root = root
        this.showCrossLine = true
        this.curPoint = {
            x: 0,
            y: 0
        }
        this.curDataIndex = 0
        this.curSliceIndex = {
            start: 0,
            end: 10000
        }
        this.handleMouseDown = this.handleMouseDown.bind(this)
        this.create()
        this.init()
    }

    create() {
        //创建svg
        this.wrap = d3.select(this.root).append('svg')
            .on('mousemove', this.SVGMouseMove.bind(this))
        //创建坐标轴
        this.xTickAxisWrap = this.wrap.append('g')
        this.xAxisWrap = this.wrap.append('g')
        this.yAxisWrap = this.wrap.append('g')
        this.yAxisRightWrap = this.wrap.append('g')
        //创建图形容器
        this.chart = this.wrap.append('g')
        //创建比例尺
        this.xScale = d3.scaleBand().align(0.5).paddingInner(0.2)
        this.yScale = d3.scaleLinear()
        //创建十字线容器
        this.crossLineWrap = this.wrap.append('g')
        //创建详情浮层容器
        this.detailLayerWrap = this.wrap.append('g')
        //放大缩小
        this.zoomInWrap = this.wrap.append('g')
            .on('click', () => this.zoomIn())
        this.zoomOutWrap = this.wrap.append('g')
            .on('click', () => this.zoomOut())
        //绑定事件
        this.bindEvent()

        // test start
        this.wrap.append('text')
            .text('实心线')
            .attr('x', this.config.width - this.config.padding.right + 20)
            .attr('y', 75)
            .style('font-size', 12)
            .style('cursor', 'pointer')
            .on('click', () => {
                this.setConfig({ lineType: 1 })
            })
        this.wrap.append('text')
            .text('空心线')
            .attr('x', this.config.width - this.config.padding.right + 20)
            .attr('y', 95)
            .style('font-size', 12)
            .style('cursor', 'pointer')
            .on('click', () => {
                this.setConfig({ lineType: 0 })
            })
        // test end
    }

    init() {
        //创建svg
        this.wrap
            .attr('width', this.config.width)
            .attr('height', this.config.height)
        //创建图形容器
        this.chart
            .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        this.config.chartWidth = this.config.width - this.config.padding.left - this.config.padding.right
        this.config.chartHeight = this.config.height - this.config.padding.top - this.config.padding.bottom - this.config.chartArr.length * 100
        //创建比例尺
        this.xScale.range([0, this.config.chartWidth])
        this.yScale.rangeRound([0, this.config.chartHeight])
        this.setXAxis()
        this.setYAxis()
        this.setYAxisRight()
        this.detailLayerWrap
            .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        //放大缩小
        this.zoomInWrap
            .attr('transform', `translate(${this.config.width - this.config.padding.right + 30}, ${this.config.padding.top})`)
        this.zoomOutWrap
            .attr('transform', `translate(${this.config.width - this.config.padding.right + 30}, ${this.config.padding.top + 20})`)
        this.setZoomButton()
    }

    setConfig(config) {
        this.config = _.assign(this.config, config)
        this.refresh()
    }

    refresh() {
        this.init()
        this.render()
        this.renderCrossLine()
    }

    setZoomButton() {
        this.zoomInWrap.append('rect')
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#369')
        this.zoomInWrap.append('text')
            .text('+')
            .attr('x', 4)
            .attr('y', 11)
            .attr('fill', '#fff')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
        this.zoomOutWrap.append('rect')
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#963')
        this.zoomOutWrap.append('text')
            .text('-')
            .attr('x', 4)
            .attr('y', 11)
            .attr('fill', '#fff')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
    }

    bindEvent() {
        document.addEventListener('keydown', this.handleMouseDown)
    }

    handleMouseDown(e) {
        if (e.keyCode == 38 || e.which == 38) { //键盘向上按键
            this.zoomIn()
        } else if (e.keyCode == 40 || e.which == 40) { //键盘向下按键
            this.zoomOut()
        } else if (e.keyCode == 39 || e.which == 39) { //键盘向右按键
            this.showCrossLine = true
            this.movePointRight()
            this.renderCrossLine()
        } else if (e.keyCode == 37 || e.which == 37) { //键盘向左按键
            this.showCrossLine = true
            this.movePointLeft()
            this.renderCrossLine()
        }
    }

    movePointRight() {
        if (this.curDataIndex == this.curSliceIndex.end - 1) {
            return
        }
        this.changeCurDataIndex(1)
        this.refreshCurPoint()
    }

    changeCurDataIndex(step = 0) {
        var index = this.curDataIndex + step
        if (index < 0 || index > this.data.data.length) {
            return
        }
        this.curDataIndex = index
    }

    movePointLeft() {
        if (this.curDataIndex == this.curSliceIndex.start) {
            return
        }
        this.changeCurDataIndex(-1)
        this.refreshCurPoint()
    }

    zoomOut() {
        if (this.graphData.length < this.data.data.length) {
            var step = this.graphData.length
            var start = this.curDataIndex - step
            var end = this.curDataIndex + step
            if (end > this.data.data.length - 1) {
                start = start - (end - this.data.data.length - 1)
                end = this.data.data.length
            }
            if (start < 0) {
                end += Math.abs(start)
                start = 0
            }
            this.curSliceIndex = {
                start: start,
                end: end
            }
            this.setCurrentGraphData()
            this.render()
            this.refreshCurPoint()
            this.renderCrossLine()
        }
    }

    zoomIn() {
        if (this.graphData.length >= 10) {
            var step = Math.floor(this.graphData.length / 4)
            var start = this.curDataIndex - step
            var end = this.curDataIndex + step
            var moreRight = this.graphData.lenth - 1 - this.curDataIndex - step
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
            this.curSliceIndex = {
                start: start,
                end: end
            }
            this.setCurrentGraphData()
            this.render()
            this.refreshCurPoint()
            this.renderCrossLine()
        }
    }

    refreshCurPoint() {
        var curData = this.data.data[this.curDataIndex]
        var x = this.xScale(curData.time) + this.config.padding.left + this.xScale.bandwidth() / 2
        var y = this.yScale(Math.max(curData.close)) + this.config.padding.top
        this.curPoint = {x, y}
    }

    //create cross line
    initCrossLine(callback) {
        if (!this.crossLineH || !this.crossLineV) {
            this.crossLineH = this.crossLineWrap.append('line')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1)
            this.crossLineV = this.crossLineWrap.append('line')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1)
        }
        if (callback) {
            callback(this.crossLineH, this.crossLineV)
        }
    }

    //create detail layer
    initDetailLayer(callback) {
        if (!this.detailLayerText) {
            this.detailLayerBg = this.detailLayerWrap.append('rect')
                .attr('width', this.config.detailSize.width)
                .attr('height', this.config.detailSize.height)
                .attr('fill', 'rgba(0,0,0,0.5)')
                .attr('x', 0)
                .attr('y', 0)
            this.detailLayerText = this.detailLayerWrap.append('g')
                .attr('x', 0)
                .attr('y', 0)
                .attr('dx', 10)
                .attr('dy', 14)
                .attr('text-anchor', 'start')
            // .attr('dx', this.config.chartWidth) .attr('dy', this.config.chartHeight)
        }
        if (callback) {
            return callback({ detailLayerBg: this.detailLayerBg, detailLayerText: this.detailLayerText })
        }
    }

    setCurrentGraphData() {
        this.graphData = this.data.data.slice(this.curSliceIndex.start, this.curSliceIndex.end)
        this.config.maArr.forEach(item => {
            this[`graphMaData${item}`] = this.data[`ma${item}`].slice(this.curSliceIndex.start < item ?
                0 : this.curSliceIndex.start - item + 1, this.curSliceIndex.end < item ?
                0 : this.curSliceIndex.end - item + 1)
        })
        this.setXDomain()
        this.setYDomain()
        this.setXAxis()
        this.setYAxis()
        this.setYAxisRight()
    }

    //set graph data
    setData(data) {
        this.data = formatKlineData(data, this.config.maArr)
        this.curSliceIndex.end = this.data.data.length - 1
        this.setCurrentGraphData()
    }

    setXDomain() {
        this.xScale.domain(this.graphData.map(item => item.time))
    }

    setYDomain() {
        var priceDomain = []
        this.graphData.forEach(item => {
            priceDomain.push(item.close, item.open, item.low, item.high)
        })
        this.config.maArr.forEach(item => {
            if (this[`graphMaData${item}`]) {
                priceDomain = priceDomain.concat(d3.extent(this[`graphMaData${item}`], d => {
                    return d.ma
                }))
            }
        })
        this.yDomain = d3.extent(priceDomain).reverse()
        this.yScale.domain(this.yDomain)
    }

    //set x axis
    setXAxis() {
        if (!this.xScale) return
        //只显示日期的坐标轴
        this.xTickAxis = d3.axisBottom(this.xScale)
            .tickValues(this.xScale.domain().filter(function(d, i) { return !(i % 30)}))
            .tickSize(0)
            .tickFormat(d => {
                return d.slice(0, 8)
            })
        //显示垂直坐标分隔线
        this.xAxis = d3.axisTop(this.xScale)
            .tickSize(this.config.chartHeight)
            .tickValues(this.xScale.domain().filter(function(d, i) { return !(i % 30)}))
            .tickFormat(() => '')
        if (!this.xAxisWrap) {
            this.xAxisWrap = this.wrap.append('g')
        }
        if (!this.xTickAxisWrap) {
            this.xTickAxisWrap = this.wrap.append('g')
        }
        var xTickPos = {
            x: this.config.padding.left,
            y: this.config.height - this.config.padding.bottom
        }
        var xPos = {
            x: this.config.padding.left,
            y: this.config.padding.top + this.config.chartHeight
        }
        this.xAxisWrap.attr('transform', `translate(${xPos.x}, ${xPos.y})`).call(this.customXAxis.bind(this))
        this.xTickAxisWrap.attr('transform', `translate(${xTickPos.x}, ${xTickPos.y})`).call(this.customXTickAxis.bind(this))
    }

    //custom x tick axis
    customXTickAxis(g) {
        g.call(this.xTickAxis)
        g.select('.domain').remove()
        g.selectAll('.tick text').attr('y', 15)
    }

    //custom x axis
    customXAxis(g) {
        g.call(this.xAxis)
        g.select('.domain').remove()
        g.selectAll('.tick line').attr('stroke', 'rgba(0,0,0,0.3)')
    }

    //set left axis
    setYAxis() {
        if (!this.yScale)
            return
        this.yAxis = d3.axisRight(this.yScale)
            .tickSize(this.config.chartWidth)
            .ticks(10)
        var yPos = {
            x: this.config.padding.left,
            y: this.config.padding.top
        }
        if (!this.yAxisWrap) {
            this.yAxisWrap = this.wrap.append('g')
        }
        this.yAxisWrap.attr('transform', `translate(${yPos.x}, ${yPos.y})`).call(this.customYAxis.bind(this))
    }

    //set right axis
    setYAxisRight() {
        if (!this.yScale)
            return
        this.yAxisRight = d3.axisLeft(this.yScale)
            .tickSize(this.config.chartWidth)
            .ticks(0)
        var yPos = {
            x: this.config.padding.left + this.config.chartWidth,
            y: this.config.padding.top
        }
        if (!this.yAxisRightWrap) {
            this.yAxisRightWrap = this.wrap.append('g')
        }
        this.yAxisRightWrap.attr('transform', `translate(${yPos.x}, ${yPos.y})`).call(this.customYAxisRight.bind(this))
    }

    //curstom left axis
    customYAxis(g) {
        g.call(this.yAxis)
        g.select('.domain')
        g.selectAll('.tick line').attr('stroke', 'rgba(0,0,0,0.3)')
        g.selectAll('.tick text').attr('x', -50)
    }

    //custom right axis
    customYAxisRight(g) {
        g.call(this.yAxisRight)
        g.select('.domain')
        g.selectAll('.tick line').attr('stroke', 'rgba(0,0,0,0.3)')
        g.selectAll('.tick text').attr('x', 20)
    }

    //render cross line
    renderCrossLine() {
        if (!this.showCrossLine)
            return
        this.initCrossLine((lineH, lineV) => {
            var horPoint1 = {
                x: this.config.padding.left,
                y: this.curPoint.y
            }
            var horPoint2 = {
                x: this.config.width - this.config.padding.right,
                y: horPoint1.y
            }
            var verPoint1 = {
                x: this.curPoint.x,
                y: this.config.padding.top
            }
            var verPoint2 = {
                x: verPoint1.x,
                y: this.config.height - this.config.padding.bottom
            }
            //画水平线
            lineH.attr('x1', horPoint1.x)
                .attr('y1', horPoint1.y)
                .attr('x2', horPoint2.x)
                .attr('y2', horPoint2.y)
            //画垂直线
            lineV.attr('x1', verPoint1.x)
                .attr('y1', verPoint1.y)
                .attr('x2', verPoint2.x)
                .attr('y2', verPoint2.y)
        })
        this.renderDetailLayer()
        this.renderMALayer()
    }

    renderMALayer() {
        if (!this.maWrap) {
            this.maWrap = this.wrap.append('g')
                .attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top - 5})`).append('text')
        }
        var data = []
        this.config.maArr.forEach(item => {
            data.push({
                type: item,
                data: this.data[`ma${item}`][this.curDataIndex - item + 1]
            })
        })
        this.maWrap.selectAll('tspan').remove()
        this.maWrap
            .selectAll('tspan')
            .data(data)
            .enter()
            .append('tspan')
            .attr('fill', (d, i) => this.config.maArrColor[i])
            .style('font-size', '12px')
            .text(d => d.data ? `MA${d.type}: ${d.data.ma} ` : '')
    }

    //svg hover event
    SVGMouseMove() {
        var hoverPoint = d3.mouse(this.chart.node())
        this.curPoint = {
            x: hoverPoint[0] + this.config.padding.left,
            y: hoverPoint[1] + this.config.padding.top
        }
        if (hoverPoint[0] < 0) {
            this.curPoint.x = this.config.padding.left
        } else if (hoverPoint[0] > this.config.chartWidth) {
            this.curPoint.x = this.config.width - this.config.padding.right
        }
        if (hoverPoint[1] < 0) {
            this.curPoint.y = this.config.padding.top
        } else if (hoverPoint[1] > this.config.chartHeight) {
            this.curPoint.y = this.config.height - this.config.padding.bottom
        }
        var i = Math.floor(hoverPoint[0] / this.xScale.step())
        if (i < 0 || i > this.graphData.length - 1) return
        this.curDataIndex = this.data.indexMap[this.graphData[i].time] || this.curDataIndex
        this.renderCrossLine()
    }

    //clean cross line layer
    removeCrossLayer() {
        this.crossLineWrap.selectAll('line').remove()
    }

    //clean detail layer
    removeDetailLayer() {
        this.detailLayerBg.remove()
        this.detailLayerText.remove()
        this.detailLayerBg = null
        this.detailLayerText = null
    }

    //detail layer
    renderDetailLayer(data) {
        this.initDetailLayer(({ detailLayerText }) => {
            detailLayerText.selectAll('text').remove()
        })
        if (this.xScale(this.data.data[this.curDataIndex].time) < this.config.detailSize.width) {
            this.detailLayerWrap
                .attr('transform', `translate(${this.config.width - this.config.padding.right - this.config.detailSize.width}, ${this.config.padding.top})`)
        } else if (this.xScale(this.data.data[this.curDataIndex].time) > this.config.chartWidth - this.config.detailSize.width) {
            this.detailLayerWrap.attr('transform', `translate(${this.config.padding.left}, ${this.config.padding.top})`)
        }
        if (!data) {
            data = this.data.data[this.curDataIndex]
        }
        var lineheight = 18
        var start = 20
        this.config.detailFields.forEach((item, index) => {
            this.detailLayerText
                .append('text')
                .text(`${KLINE_DICT[item] || item}: ${data[item]}`)
                .attr('transform', `translate(10, ${start + lineheight * index})`)
                .attr('fill', '#fff')
                .style('font-size', 12)
                .style('margin-right', 10)
        })
    }

    //render line from low price to high price
    renderLine() {
        this.chart.selectAll('line').remove()
        this.chart.selectAll('line').data(this.graphData).enter()
            .append('line')
            .attr('x1', d => {
                return this.xScale(d.time) + this.xScale.bandwidth() / 2
            })
            .attr('y1', d => {
                return this.yScale(d.low)
            })
            .attr('x2', d => {
                return this.xScale(d.time) + this.xScale.bandwidth() / 2
            })
            .attr('y2', d => {
                return this.yScale(d.high)
            })
            .attr('fill', 'none')
            .attr('stroke', d => {
                return (d.close - d.open) > 0 ?
                    'red' :
                    'green'
            })
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', d => {
                return `10000, ${Math.abs(this.yScale(d.open) - this.yScale(d.close))}`
            })
            .attr('stroke-dashoffset', d => {
                var delta = Math.abs(this.yScale(d3.min([d.open, d.close])) - this.yScale(d.low))
                return Math.abs(10000 - delta)
            })
            .attr('stroke-width', 1)
    }

    //render candle
    renderCand() {
        this.chart.selectAll('rect').remove()
        this.chart.selectAll('rect').data(this.graphData).enter()
            .append('rect')
            .attr('x', d => {
                return this.xScale(d.time)
            })
            .attr('y', d => {
                return Math.min(this.yScale(d.open), this.yScale(d.close))
            })
            .attr('width', this.xScale.bandwidth())
            .attr('height', d => {
                return Math.abs(this.yScale(d.open) - this.yScale(d.close))
            })
            .attr('stroke', d => {
                return (d.close - d.open) > 0 ?
                    'red' :
                    'green'
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
                    return (d.close - d.open) > 0 ?
                        'red' :
                        'green'
                } else {
                    return 'none'
                }
            })
    }

    //render ma line
    renderMALine() {
        var line = d3.line()
            .x(d => this.xScale(d.time) + this.xScale.bandwidth() / 2)
            .y(d => this.yScale(d.ma))
        if (this.chart) {
            this.config.maArr.forEach((item, index) => {
                if (this[`ma${item}line`])
                    this[`ma${item}line`].remove()
                this[`ma${item}line`] = this.chart.append('path')
                    .datum(this[`graphMaData${item}`])
                    .attr('fill', 'none')
                    .attr('stroke', this.config.maArrColor[index] || 'blue')
                    .attr('stroke-linejoin', 'round')
                    .attr('stroke-linecap', 'round')
                    .attr('stroke-width', 1)
                    .attr('d', line)
            })
        }
    }

    //insert other chart
    insertVOL() {
        this.config.chartArr.push('VOL')
        this.refresh()
    }

    //destroy graph and remove event listener
    destroy() {
        this.wrap.remove()
        this.removeEvent()
    }

    removeEvent() {
        document.removeEventListener('keydown', this.handleMouseDown)
    }

    render() {
        this.renderLine()
        this.renderCand()
        this.renderMALine()
    }
}
