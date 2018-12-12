import { EventEmitter } from 'events';

var CHART_OPTIONS = {
  upColor: 'red',
  downColor: 'green',
  evenColor: 'gray'
};

function isSupportTouchEvent() {
  return !!('ontouchend' in document);
}

export default class StockChart extends EventEmitter {
  constructor(root, options) {
    super();
    if (root) {
      this.id = root;
      var el = document.getElementById(root);
      if (el) {
        var cvs = document.createElement('canvas');
        cvs.width = el.clientWidth * window.devicePixelRatio;
        cvs.height = el.clientHeight * window.devicePixelRatio;
        cvs.style.width = cvs.width / window.devicePixelRatio + 'px';
        cvs.style.height = cvs.height / window.devicePixelRatio + 'px';
        el.appendChild(cvs);
        this.wrap = el;
        this.root = cvs;
        this.ctx = cvs.getContext('2d');
        this.width = cvs.width;
        this.height = cvs.height;
        this.viewportWidth = cvs.clientWidth;
        this.viewportHeight = cvs.clientHeight;
        this.options = Object.assign({}, CHART_OPTIONS, options);

        this.addEvent();
      }
    }
  }

  addEvent() {
    var that = this;
    var isDrag = false;
    var dragStartPoint = [];
    var dragDistance = [];
    var tmpCurViewportIndex = [];
    function handleMouseDown(e) {
      isDrag = true;
      tmpCurViewportIndex = that.viewportIndex;
      dragStartPoint = [that.formatEventPosition(e).clientX, that.formatEventPosition(e).clientY];
    }
    function handleMouseMove(e) {
      that.clear();
      if (!isSupportTouchEvent()) {
        that.renderCrossLine(e);
      }
      if (isDrag) {
        dragDistance = [that.formatEventPosition(e).clientX - dragStartPoint[0], that.formatEventPosition(e).clientY - dragStartPoint[1]];
        that.updateDragData(dragDistance, tmpCurViewportIndex);
        that.renderAllCandle();
      } else {
        that.renderAllCandle();
      }
    }
    function handleMouseOut(e) {
      isDrag = false;
      that.clear();
      that.renderAllCandle();
    }
    function handleMouseUp() {
      isDrag = false;
    }
    if (isSupportTouchEvent()) {
      this.root.addEventListener('touchstart', handleMouseDown);
      this.root.addEventListener('touchmove', handleMouseMove);
      this.root.addEventListener('touchend', handleMouseUp);
    } else {
      this.root.addEventListener('mousedown', handleMouseDown);
      this.root.addEventListener('mousemove', handleMouseMove);
      this.root.addEventListener('mouseout', handleMouseOut);
      this.root.addEventListener('mouseup', handleMouseUp);
    }
  }

  formatEventPosition(e) {
    if (isSupportTouchEvent()) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      };
    }
    return e;
  }

  updateDragData(distance, tmpCurViewportIndex) {
    var distanceX = distance[0];
    var needAdd = Math.floor(distanceX / this.intervalX);
    var [lowIndex, highIndex] = tmpCurViewportIndex;
    lowIndex -= needAdd;
    highIndex -= needAdd;
    if (lowIndex < 0 || highIndex > this.data.length - 1) return;
    this.setViewPortData(this.data.slice(lowIndex, highIndex + 1));
  }

  renderCrossLine(e) {
    var ctx = this.ctx;
    var bounding = this.getBounding();
    ctx.save();
    ctx.strokeStyle = 'pink';
    ctx.beginPath();
    var data = this.getDataByPoint(e.clientX * window.devicePixelRatio - bounding.left);
    var [x] = this.getPointByData(data.time, data.open);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.height * window.devicePixelRatio);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, e.clientY * window.devicePixelRatio - bounding.top);
    ctx.lineTo(this.width * window.devicePixelRatio, e.clientY * window.devicePixelRatio - bounding.top);
    ctx.stroke();
    ctx.restore();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  getDevicePixelRatio() {
    return window.devicePixelRatio;
  }

  getBounding() {
    return this.root.getBoundingClientRect();
  }

  setData(data) {
    if (!data) return;
    this.data = data;
  }

  setViewPortData(data) {
    this.viewportData = data || this.data;
    this.intervalX = this.width / (this.viewportData.length - 1);
    this.udpateViewportIndex();
  }

  udpateViewportIndex() {
    this.viewportIndex = [
      this.data.findIndex(item => item.time === this.viewportData[0].time),
      this.data.findIndex(item => item.time === this.viewportData[this.viewportData.length - 1].time),
    ];
  }

  scale(ratio = 2) {
    this.scale = ratio;
    this.setViewPortData(this.viewportData.slice(0, Math.floor(this.viewportData.length / ratio)));
  }

  // get point according data
  getPointByData(xData, yData) {
    var ret = [];
    var viewportData = this.viewportData;
    var index = viewportData.findIndex(item => item.time === xData);
    ret[0] = index * this.intervalX;
    var [min, max] = this.getRangeY();
    var distance = Math.abs(max - min);
    ret[1] = this.height * (max - yData) / distance;
    return ret;
  }

  // get the nearest data according point
  getDataByPoint(x) {
    var index = Math.round(x / this.intervalX);
    return this.viewportData[index];
  }

  getRangeY() {
    var min;
    var max;
    var viewportData = this.viewportData;
    viewportData.forEach(item => {
      var arr = [item.open, item.close, item.high, item.low];
      var curMin = Math.min(...arr);
      var curMax = Math.max(...arr);
      if (curMin < min || min === undefined) {
        min = curMin;
      }
      if (curMax > max || max === undefined) {
        max = curMax;
      }
    });
    return [min, max];
  }

  renderCandle(data) {
    var highPos = this.getPointByData(data.time, data.high);
    var lowPos = this.getPointByData(data.time, data.low);
    var openPos = this.getPointByData(data.time, data.open);
    var closePos = this.getPointByData(data.time, data.close);
    var candleWidth = this.intervalX * 0.5;
    var rectPos = [
      openPos[0] - candleWidth / 2,
      openPos[1],
      candleWidth + 1,
      Math.abs(openPos[1] - closePos[1])
    ];
    if (closePos[1] > openPos[1]) {
      rectPos[0] = closePos[0] - candleWidth / 2;
      rectPos[1] = closePos[1];
    }
    var ctx = this.ctx;
    var options = this.options;
    ctx.save();
    if (data.close > data.open) {
      ctx.strokeStyle = options.upColor;
      ctx.fillStyle = options.upColor;
    } else if (data.close < data.open) {
      ctx.strokeStyle = options.downColor;
      ctx.fillStyle = options.downColor;
    } else {
      ctx.strokeStyle = options.evenColor;
      ctx.fillStyle = options.evenColor;
    }
    // draw candle line
    ctx.beginPath();
    ctx.moveTo(...highPos);
    ctx.lineTo(...lowPos);
    ctx.stroke();
    // draw candle rect
    ctx.fillRect(...rectPos);
    ctx.restore();
  }

  renderAllCandle() {
    this.viewportData.forEach(item => this.renderCandle(item));
  }
}
