import {EventEmitter} from 'events'
import {KLINE_CONFIG} from './constants'
import _ from 'lodash'
import * as d3 from 'd3'
import moment from 'moment'
import CrossLine from "./crossline";

const RED = '#f7413d';
const GREEN = '#69ae2f';
const GRAY = '#838383';
const WHITE = '#d2d2d2';
const BG_COLOR = '#181527';
const BG_COLOR_LIGHT = '#ffffff';
const GRID_LINE_COLOR = '#272437';
const GRID_LINE_COLOR_LIGHT = '#EEEEEE';
const CLOSE_LINE_COLOR = '#919191'
const AVG_LINE_COLOR = '#ffcb00';
const PRICE_LINE_COLOR = '#337ec2';
const PRICE_PATH_FILL_COLOR = '#c9e5ff';
const PRICE_PATH_FILL_COLOR_LIGHT = '#68ABFB';
const VOLUME_CANDLE_COLOR = '#C19265';
const OVERLAY_STOCK_COLOR = ['#828282','#8b3cd5','#914C0C'];
const PRICE_PATH_FILL_OPACITY = 0.1;
const PRICE_PATH_FILL_OPACITY_LIGHT = 0.2;
const PADDING = [20, 50, 30, 50];
const FONT_SIZE = '12px';
const FONT_SIZE_SMALL = '10px';
const LINE_WIDTH = '1px';
const INNER_SPAN = 20;
const TIME_SCALE_LABEL_ARR = ['9:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00'];
const TIME_SCALE_LABEL_ARR_GGT = ['9:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const PRICE_SCALE_LABEL_ARR = ['0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'];
const PERCENT_SCALE_LABEL_ARR = ['0.00%','0.00%','0.00%','0.00%','0.00%','0.00%','0.00%','0.00%','0.00%','0.00%','0.00%' ];
const INDEX_A_BEGIN = 9*60+30;
const INDEX_B_BEGIN = 13*60;
const POINT_COUNT = 241; //沪深证券一天的分时总点数
const POINT_COUNT_SEC1 = 120;
const POINT_COUNT_SEC2 = 120;
const POINT_COUNT_GGT = 331; //港股通一天的分时总点数
const POINT_COUNT_GGT_SEC1 = 150;
const POINT_COUNT_GGT_SEC2 = 180;
//画线工具
const LINE_SELLINE = 10;
const LINE_SELNONE = 20;
const NEWLINE_ID = -10;
const SELNONE_ID = -1;

export default class Timeseries extends EventEmitter {
    constructor(config) {
        super()
        this.ct = d3.select(config.ct);
		let cfg = {};
		({
			width: cfg.width = 0,
			height: cfg.height = 0,
			bg_color: cfg.bg_color = BG_COLOR,
			grid_line_color: cfg.grid_line_color = GRID_LINE_COLOR,
			close_line_color: cfg.close_line_color = CLOSE_LINE_COLOR,
			price_scale_up_color: cfg.price_scale_up_color = RED,
			price_scale_down_color: cfg.price_scale_down_color = GREEN,
			price_scale_open_color: cfg.price_scale_open_color = WHITE,
			time_scale_color: cfg.time_scale_color = GRAY,
			padding: cfg.padding = PADDING,
			font_size: cfg.font_size = FONT_SIZE,
			line_width: cfg.line_width = LINE_WIDTH,
			inner_span: cfg.inner_span = INNER_SPAN,
			pirce_line_color: cfg.price_line_color = PRICE_LINE_COLOR,
			price_line_width: cfg.price_line_width = '1.5px',
			price_path_fill_color: cfg.price_path_fill_color = PRICE_PATH_FILL_COLOR,
			price_path_fill_opacity: cfg.price_path_fill_opacity = PRICE_PATH_FILL_OPACITY,
			avg_line_color: cfg.avg_line_color = AVG_LINE_COLOR,
			volume_candle_up_color: cfg.volume_candle_up_color = RED,
			volume_candle_down_color: cfg.volume_candle_down_color = GREEN,
			is_little: cfg.is_little = false,
			is_multi: cfg.is_multi = false,
			day_count: cfg.day_count = 5, //多日分时天数，当如分时忽略此参数
			accuracy: cfg.accuracy = 2,
			is_ggt: cfg.is_ggt = false,
			market: cfg.market = 'sz',
			code: cfg.code = '000776',
			point_count_per_one_day: cfg.point_count_per_one_day = POINT_COUNT,
			cross_line_enabled: cfg.cross_line_enabled = false,
		} = config);
		!cfg.is_multi && (cfg.day_count = 1);
		cfg.is_ggt && (cfg.point_count_per_one_day = POINT_COUNT_GGT);

		this.cfg = cfg;
		this.pclose = 0;
		this.curprice = 0;
		// 十字线水平位置，－1表示暂未定位
		this.cross_index = -1;

		this.canvas = this.ct
			.append('svg')
			.attr('width', cfg.width + 'px')
			.attr('height', cfg.height + 'px')
			.style('background-color', cfg.bg_color)
			.style('fill', cfg.time_scale_color)
			.style('font-size', cfg.font_size);

		//监听按键消息
		document.addEventListener('keydown', (e) => {
            if (e.keyCode == 39 || e.which == 39) { //键盘向右按键
                this.crossMoveRight();
            } else if (e.keyCode == 37 || e.which == 37) { //键盘向左按键
                this.crossMoveLeft();
            }
        })

		this.g = this.canvas.append('g');
		// 成交量group
		this.volume_g = this.canvas.append('g');
		// 创建十字线
		this.cross_line = new CrossLine(this.canvas.append('g'), {show_cross_point: true});
		//用来监听鼠标事件的element放在最上面的group里
		this.front_g = this.canvas.append('g');
		// CrossLine开启状态
		this.cross_line_enabled = cfg.cross_line_enabled;
		// 区间统计开始坐标
		this.section = {x1: 0,y1: 0,x2: 0,y2: 0};
		// 记录上次鼠标位置 防止左右键移动十字线时乱跳
		this.mousepoint = {x:0,y:0};

		this._drawBack();
    }

	crossMoveLeft() {
        if(!this.data)
            return;
		let len = this.data.length;
     	let index_x = -1;
     	let bFirst = false;
     	if(this.cross_line_enabled)
     	{
     		for(let i=0;i<len;i++)
     		{
     			let item = this.data[i];
     			if(this.cross_index===item.index)
     			{
     				index_x = i;
     				break;
     			}
     		}
		}
		else
		{
			index_x = len-1;
			this.cross_line_enabled = true;
			bFirst = true;
            this.emit('cross_open');
		}
		if(index_x==0)
		{
			index_x = len-1;
		}
		else if(index_x>0 && !bFirst)
		{
			index_x--;
		}
		this.cross_index = this.data[index_x].index;

		this._dealAfterVkLeftRight();
	}

	crossMoveRight() {
        if(!this.data)
            return;
		let len = this.data.length;
		let index_x = -1;
     	if(this.cross_line_enabled)
     	{
			for(let i=0;i<len;i++)
     		{
     			let item = this.data[i];
     			if(this.cross_index===item.index)
     			{
     				index_x = i;
     				break;
     			}
     		}
		}
		else
		{
			index_x = 0;
			this.cross_line_enabled = true;
            this.emit('cross_open');
		}
		if(index_x==len-1)
		{
			index_x = 0;
		}
		else if(index_x<len-1)
		{
			index_x++;
		}
		this.cross_index = this.data[index_x].index;

		this._dealAfterVkLeftRight();
	}

	_dealAfterVkLeftRight() {
     	let cfg = this.cfg;
		let index_x = this.cross_index;
		let len = this.data.length;
		let first_index = this.data[0].index;
		let last_index = this.data[len-1].index;
		index_x < first_index && (index_x = first_index);
		index_x > last_index && (index_x = last_index);

		for(let i = 0; i<len; i++)
		{
			let item = this.data[i];
			if(index_x === item.index)
			{
				this.current_point =
				{
					time: item.time,
					price: item.price,
					avg: item.avg,
					volume: item.volume,
					change: item.change,
					rise: item.rise,
					amount: item.amount,
					closeprice: item.pclose
				};
				break;
			}
		}

		let x = cfg.padding[3] + this.delta_x*index_x;
		let y = this.price_scale(this.current_point.price);

		this.current_point.x = this.ct.node().getBoundingClientRect().left+x;//60+x;
		this.current_point.y = this.ct.node().getBoundingClientRect().top+y;187+y;
		this.emit('cross_move', this.current_point);
		let left_label_text, right_label_text;
		let time, time_text;
		this.current_point.time && (time = String(this.current_point.time));
		time_text = time? (time.substr(8,2) + ':' + time.substr(10,2)):'';

		let price = this.current_point.price;
		let price_text = price.toFixed(cfg.accuracy);
		let percent_text = (((price - this.pclose) / this.pclose)*100).toFixed(2) + '%';
		left_label_text = price_text;
		right_label_text = percent_text;

		this.cross_line.update({
			x1: cfg.padding[3],
			x2: cfg.width - cfg.padding[1],
			y1: cfg.padding[0],
			y2: cfg.height - cfg.padding[2],
			x: x,
			y: y,
			price_y:y,
			left_label_text: left_label_text,
			right_label_text: right_label_text,
			bottom_label_text: time_text,
			item: this.current_point
		});
		this.cross_line.show();
     }

	_click(){
		if(this.section.x1 !== this.section.x2 || this.section.y1 !== this.section.y2) { //说明是拖动区间，此时不触发开关十字线操作
			return;
		}
		
		this.cross_line_enabled = !this.cross_line_enabled;
		if(!this.cross_line_enabled){
			this.cross_line.hide();
			this.emit('cross_close');
		}else{
			this.mousepoint.x = this.mousepoint.y = -1;
			this._mouseMove();
            this.emit('cross_open');
		}
	}

	_mouseDown(){
		this.mouse_down = true;
		this.section.x1 = d3.event.pageX - this.ct.node().getBoundingClientRect().left;
		this.section.y1 = d3.event.pageY - this.ct.node().getBoundingClientRect().top;
	}

	_mouseUp(){
		this.mouse_down = false;

		this.section.x2 = d3.event.pageX - this.ct.node().getBoundingClientRect().left;
		this.section.y2 = d3.event.pageY - this.ct.node().getBoundingClientRect().top;
	}

	_mouseMove(){
		let x = d3.event.pageX - this.ct.node().getBoundingClientRect().left;
		let y = d3.event.pageY - this.ct.node().getBoundingClientRect().top;
		if(x==this.mousepoint.x && y==this.mousepoint.y) 
			return;
		this.mousepoint.x = x;
		this.mousepoint.y = y;

		if(y < this.cfg.padding[0] + this.price_rect_height + this.cfg.inner_span)
			this.curprice = this.price_scale.invert(y);
		else if(this.data && this.data.length>0)
			this.curprice = this.data[this.data.length-1].price;
		else 
			this.curprice = this.pclose;
	
		if(!this.cross_line_enabled || !this.data || this.data.length < 1){
			return;
		}
		let cfg = this.cfg;
		let off_x = d3.event.pageX - x;
		let index_x = Math.round((x - cfg.padding[3])/this.delta_x);
		let len = this.data.length;
		let first_index = this.data[0].index;
		let last_index = this.data[len-1].index;
		index_x < first_index && (index_x = first_index);
		index_x > last_index && (index_x = last_index);
		x = cfg.padding[3] + this.delta_x * index_x;
		if(index_x !== this.cross_index){
			this.current_point = {};
			for(let i = 0; i<len; i++){
				let item = this.data[i];
				if(index_x === item.index){
					this.current_point = {
						time: item.time,
						price: item.price,
						avg: item.avg,
						volume: item.volume,
						change: item.change,
						rise: item.rise,
						amount: item.amount,
						closeprice: item.pclose
					};
				}
			}
			this.cross_index = index_x;
		} else {
			//return;
		}
		this.current_point.x = x + off_x;
		this.current_point.y = d3.event.pageY;
		/*中间缺数据点时*/
		if(!this.current_point.time){
			return this.emit('cross_close');
		}else{
			this.emit('cross_move', this.current_point);
		}
		let left_label_text, right_label_text;
		let time, time_text;
		this.current_point.time && (time = String(this.current_point.time));
		time_text = time? (time.substr(8,2) + ':' + time.substr(10,2)):'';
		if(y < cfg.padding[0] + this.price_rect_height + cfg.inner_span){
			let price = this.price_scale.invert(y);
			let price_text = price.toFixed(cfg.accuracy);

			let percent_text = (((price - this.pclose) / this.pclose)*100).toFixed(2) + '%';
			left_label_text = price_text;
			right_label_text = percent_text;
		}else{
			let volume_text = Math.round(this.volume_scale.invert(y));
			left_label_text = volume_text;
			right_label_text = volume_text;
		}
		this.cross_line.update({
			x1: cfg.padding[3],
			x2: cfg.width - cfg.padding[1],
			y1: cfg.padding[0],
			y2: cfg.height - cfg.padding[2],
			x: x,
			y: y,
      		price_y: this.current_point.price ? this.price_scale(this.current_point.price) : null,
			left_label_text: left_label_text,
			right_label_text: right_label_text,
			bottom_label_text: time_text,
			item: this.current_point
		});
		this.cross_line.show();
	}

	_mouseOut(){
		this.cross_line.hide();
		this.emit('cross_close');

		if(this.data && this.data.length>0)
			this.curprice = this.data[this.data.length-1].price;
		else 
			this.curprice = this.pclose;
	}

    _drawPath(d){
		let cfg = this.cfg;
		return this.g.append('path')
			.attr('d',d)
			.style('stroke', cfg.grid_line_color)
			.style('stroke-width', cfg.line_width)
			.style('fill', 'transparent');
	}

    _drawBack(){
		let cfg = this.cfg;

		this.price_rect_height = (cfg.height - cfg.padding[0] - cfg.padding[2] - cfg.inner_span)* 4/5;
		this.volume_rect_height = cfg.height - cfg.padding[0] - cfg.padding[2] - cfg.inner_span - this.price_rect_height;
		this.price_rect_width = cfg.width - cfg.padding[1] - cfg.padding[3];

		let front_layer_path_attr_d_arr = [];

		// Draw price area border
		if(true){
			let x1 = cfg.padding[3];
			let y1 = cfg.padding[0];
			let x2 = cfg.width - cfg.padding[1];
			let y2 = y1;
			let x3 = x2;
			let y3 = this.price_rect_height + y1;
			let x4 = x1;
			let y4 = y3;
			let price_border_attr_d = `M ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4} Z`;
			front_layer_path_attr_d_arr.push(price_border_attr_d);
			if(!this.price_border){
				this.price_border = this._drawPath(price_border_attr_d);
			}else{
				this.price_border.attr('d', price_border_attr_d);
			}
		}

		// Draw volume area border
		if(true){
			let x1 = cfg.padding[3];
			let y1 = cfg.padding[0] + this.price_rect_height + cfg.inner_span;
			let x2 = cfg.width - cfg.padding[1];
			let y2 = y1;
			let x3 = x2;
			let y3 = cfg.height - cfg.padding[2];
			let x4 = x1;
			let y4 = y3;
			let volume_border_attr_d = `M ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4} Z`;
			front_layer_path_attr_d_arr.push(volume_border_attr_d);
			if(!this.volume_border){
				this.volume_border = this._drawPath(volume_border_attr_d);
			}else{
				this.volume_border.attr('d', volume_border_attr_d);
			}
		}

		let delta_y = this.price_rect_height / 10;
		let x1 = cfg.padding[3];
		let x2 = cfg.width - cfg.padding[1];
		if(!this.grid_y_lines_group){
			this.grid_y_lines_group = this.g.append('g')
				.selectAll('line')
				.data([1,2,3,4,5,6,7,8,9])
				.enter()
				.append('line')
				.attr('x1', x1)
				.attr('y1', (v)=>{
					return cfg.padding[0] + delta_y * v;
				})
				.attr('x2', x2)
				.attr('y2', (v)=>{
					return cfg.padding[0] + delta_y * v;
				})
				.style('stroke',(v)=>{
					if(v === 5){
						return cfg.close_line_color;
					}else{
						return cfg.grid_line_color;
					}
				})
				.style('stroke-dasharray', (v)=>{
					if(v==5){
						return '4,3';
					}else{
						return false;
					}
				})
				.style('stroke-width', cfg.line_width)
				.style('visibility',v => {
					if((cfg.is_little || cfg.isSmall) && v != 5){
						return 'hidden';
					}
				});
		}else{
			this.grid_y_lines_group
				.data([1,2,3,4,5,6,7,8,9])
				.attr('x1', x1)
				.attr('y1', (v)=>{
					return cfg.padding[0] + delta_y * v;
				})
				.attr('x2', x2)
				.attr('y2', (v)=>{
					return cfg.padding[0] + delta_y * v;
				});
		}

		let y1 = cfg.padding[0];
		let y2 = cfg.padding[0] + this.price_rect_height;
		let count = 8;
		cfg.is_ggt && (count = 11);
		let delta_x = this.price_rect_width / count;
		let num_arr = [1,2,3,4,5,6,7];
		cfg.is_ggt && (num_arr = [1,2,3,4,5,6,7,8,9,10]);


		// 画价格区域的垂直分隔线
		this.grid_x_up_lines_group && this.grid_x_up_lines_group.remove();
		delete this.grid_x_up_lines_group;
		/*if(!this.grid_x_up_lines_group)*/{
			this.grid_x_up_lines_group = this.g.append('g')
				.selectAll('line')
				.data(num_arr)
				.enter()
				.append('line')
				.style('stroke', cfg.grid_line_color)
				.style('stroke-width', cfg.line_width)
				.attr('y1', y1)
				.attr('y2', y2)
				.attr('x1', (v)=>{
					return cfg.padding[3] + delta_x * v;
				})
				.attr('x2', (v)=>{
					return cfg.padding[3] + delta_x * v;
				})
				.style('visibility',v => {
					if(cfg.is_little || cfg.isSmall){
						if((cfg.is_ggt && v != 5) || (!cfg.is_ggt && v != 4)){
							return 'hidden';
						}
					}
				});
		}

		y1 = y2 + cfg.inner_span;
		y2 = y1 + this.volume_rect_height;
		// 画成交量区域的垂直分隔线
		this.grid_x_down_lines_group && this.grid_x_down_lines_group.remove();
        this.grid_x_down_lines_group = this.g.append('g')
            .selectAll('line')
            .data(num_arr)
            .enter()
            .append('line')
            .style('stroke', cfg.grid_line_color)
            .style('stroke-width', cfg.line_width)
            .attr('y1', y1)
            .attr('y2', y2)
            .attr('x1', (v)=>{
                return cfg.padding[3] + delta_x * v;
            })
            .attr('x2', (v)=>{
                return cfg.padding[3] + delta_x * v;
            })
            .style('visibility',v => {
                if(cfg.is_little || cfg.isSmall){
                    if((cfg.is_ggt && v != 5) || (!cfg.is_ggt && v != 4)){
                        return 'hidden';
                    }
                }
            });
		// 画成交量最高和最低刻度,4个text
		if(!this.volume_left_top_scale_text){
			this.volume_left_top_scale_text = this.g.append('text')
				.attr('x', cfg.padding[3] - 5)
				.attr('y', y1)
				.style('text-anchor', 'end')
				.style('dominant-baseline', 'text-before-edge')
				.text('');
		} else {
			this.volume_left_top_scale_text
				.attr('x', cfg.padding[3] - 5)
				.attr('y', y1)
		}
		if(!this.volume_left_bottom_scale_text){
			this.volume_left_bottom_scale_text = this.g.append('text')
				.attr('x', cfg.padding[3] - 5)
				.attr('y', y2)
				.style('text-anchor', 'end')
				.style('dominant-baseline', 'text-after-edge')
				.text('0');
		} else {
			this.volume_left_bottom_scale_text
				.attr('x', cfg.padding[3] - 5)
				.attr('y', y2);
		}
		if(!this.volume_right_top_scale_text){
			this.volume_right_top_scale_text = this.g.append('text')
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', y1)
				.style('text-anchor', 'start')
				.style('dominant-baseline', 'text-before-edge')
				.text('');
		} else {
			this.volume_right_top_scale_text
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', y1);
		}
		if(!this.volume_right_bottom_scale_text){
			this.volume_right_bottom_scale_text = this.g.append('text')
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', y2)
				.style('text-anchor', 'start')
				.style('dominant-baseline', 'text-after-edge')
				.text('0');
		} else {
			this.volume_right_bottom_scale_text
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', y2);
		}


		// Draw time scale label
		let time_scale_label_arr = TIME_SCALE_LABEL_ARR;
		cfg.is_ggt && (time_scale_label_arr = TIME_SCALE_LABEL_ARR_GGT);
		cfg.is_multi && (time_scale_label_arr = new Array(cfg.day_count));

		let x;
		let y = cfg.height - cfg.padding[2] + 15;
		this.time_scale_label_group && this.time_scale_label_group.remove();
		this.time_scale_label_group = this.g.append('g')
			.selectAll('text')
			.data(time_scale_label_arr)
			.enter()
			.append('text')
			.style('text-anchor', 'middle')
			.style('font-size', cfg.font_size)
			.style('fill', cfg.time_scale_color)
			.attr('y', y)
			.attr('x', (v,i)=>{
				return cfg.padding[3] + delta_x * i;
			})
			.text((v)=>{
				return v;
			})
			.style('visibility',(v,i) => {
				//如果类型为小图或者传入isSmall参数为true，则画小图
				if(cfg.is_little || cfg.isSmall){
					if((cfg.is_ggt && [0,5,11].indexOf(i) < 0)||(!cfg.is_ggt && [0,4,8].indexOf(i)<0)){
						return 'hidden';
					}
				}
			});

		// Draw price scale label
		if(!this.price_label_group){
			this.price_label_group =  this.g.append('g')
				.selectAll('text')
				.data(PRICE_SCALE_LABEL_ARR)
				.enter()
				.append('text')
				.text((v)=>{return v;})
				.style('text-anchor', 'end')
				.style('dominant-baseline', 'middle')
				.style('font-size', cfg.font_size)
				.style('fill', (v,i)=>{
					if(i<5) return cfg.price_scale_up_color;
					if(i==5) return cfg.price_scale_open_color;
					if(i>5) return cfg.price_scale_down_color;
				})
				.attr('x', cfg.padding[3]-5)
				.attr('y', (v,i)=>{
					return delta_y * i + cfg.padding[0];
				})
				.style('visibility',(v,i) => {
					if((cfg.is_little || cfg.isSmall) && [0,5,10].indexOf(i) < 0){
						return 'hidden';
					}
				});
		}else{
			this.price_label_group.data(PRICE_SCALE_LABEL_ARR)
				.attr('x', cfg.padding[3]-5)
				.attr('y', (v,i)=>{
					return delta_y * i + cfg.padding[0];
				});
		}

		// Draw percent scale label
		if(!this.percent_label_group){
			this.percent_label_group =  this.g.append('g')
				.selectAll('text')
				.data(PERCENT_SCALE_LABEL_ARR)
				.enter()
				.append('text')
				.text((v)=>{return v;})
				.style('text-anchor', 'start')
				.style('dominant-baseline', 'middle')
				.style('font-size', cfg.font_size)
				.style('fill', (v,i)=>{
					if(i<5) return cfg.price_scale_up_color;
					if(i==5) return cfg.price_scale_open_color;
					if(i>5) return cfg.price_scale_down_color;
				})
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', (v,i)=>{
					return delta_y * i + cfg.padding[0];
				})
				.style('visibility',(v,i) => {
					//如果类型为小图或者传入isSmall参数为true，则画小图
					if((cfg.is_little || cfg.isSmall) && [0,5,10].indexOf(i) < 0){
						return 'hidden';
					}
				});
		}else{
			this.percent_label_group.data(PERCENT_SCALE_LABEL_ARR)
				.attr('x', cfg.width - cfg.padding[1] + 5)
				.attr('y', (v,i)=>{
					return delta_y * i + cfg.padding[0];
				});
		}

		// Draw the front layer to listen the mouse events.
		if(!this.sel_front_path_group){
			this.sel_front_path_group = this.front_g.selectAll('path')
				.data(front_layer_path_attr_d_arr)
				.enter()
				.append('path')
				.attr('d', (v)=>{return v;})
				.style('stroke-width', 0)
				.style('fill', 'transparent')
				.on('mousemove', _.bind(this._mouseMove, this))
				.on('mouseout', _.bind(this._mouseOut, this))
				.on('mousedown', _.bind(this._mouseDown, this))
				.on('mouseup', _.bind(this._mouseUp, this))
				.on('click', _.bind(this._click, this));
		}else{
			this.sel_front_path_group.data(front_layer_path_attr_d_arr)
				.attr('d', (v)=>{return v;});
		}

		this.delta_y = delta_y;
	}

    //没有数据的情况
	setpclose(pclose) {
		if(this.pclose==undefined) {
			this.pclose = pclose;
			let price_scale_label_arr = [];
			let percent_scale_label_arr = [];
			let len = PRICE_SCALE_LABEL_ARR.length;
			let price = 0.0;
			let up_price = 0;
			let down_price = 0;
			for(let i=0; i<len; i++){
				price = pclose+(i-5)*1/(Math.pow(10,this.cfg.accuracy));
				price_scale_label_arr[i] = price.toFixed(this.cfg.accuracy);

				percent_scale_label_arr[i] = ((Math.abs(price - pclose) / pclose)*100).toFixed(2)+ '%';

				if(i==0)
					down_price = price;
				if(i==len-1)
					up_price = price;
			}
			//
			let price_scale = d3.scaleLinear().domain([up_price, down_price]).range([this.cfg.padding[0], this.cfg.padding[0] + this.price_rect_height]);
			this.price_scale = price_scale;
			//
			let delta = this.price_rect_width / (this.cfg.day_count * this.cfg.point_count_per_one_day - 1);
			this.delta_x = delta;
			// 更新价格刻度值
			this.price_label_group
				.data(price_scale_label_arr)
				.text((v)=>{
					return v;
				});
			this.percent_label_group
				.data(percent_scale_label_arr)
				.text((v)=>{
				return v;
				});
		}
	}

    setData(data,pclose) {
        if(!data) return;
        let cfg = this.cfg;
        var price_total = 0;
        data.map((item,i) => {
            item.index = longTimeIntToIndex(item.time,cfg.is_ggt);

			if(i === 0) {
				if(item.price > pclose){
					item.color = 'up';
				}else{
					item.color = 'down';
				}
			}else{
				if(item.price > data[i-1].price){
					item.color = 'up';
				}else{
					item.color = 'down';
				}
			}

            price_total += item.price;
            item.avg = price_total/(i+1);
            return item;
        })
        this.alldata = data;
        pclose && (this.pclose = pclose);

        this.data  = this.alldata.slice(0);
        
        let abs_price;
		if(!cfg.is_multi){
			abs_price = d3.max(this.alldata,(v)=>{
				return Math.abs(v.change);
			});
		}else{
			abs_price = d3.max(this.alldata,(v)=>{
				return Math.abs(v.price - pclose);
			});
		}
		let abs_avg = d3.max(this.alldata, (v)=>{
			return Math.abs(v.avg - pclose);
		});
		abs_price = abs_price > abs_avg? abs_price:abs_avg;
		let count = 5;
		let delta_price = abs_price / count;

		let delta = delta_price >= 0.01 ? 0.01:0.001;

		if(abs_price >= pclose * 0.09 && abs_price <= pclose * 0.1){
			abs_price = pclose * 0.1;
		}else if(abs_price > pclose * 0.1 && (cfg.is_ggt || cfg.is_multi)){
			abs_price += pclose * delta;
		}else if(abs_price < pclose * 0.09){
			abs_price += pclose * delta;
		}

		// 最小刻度必须大于等于0.001
		let unit_price = 1/(Math.pow(10,cfg.accuracy));
		if(delta_price < unit_price){
			delta_price = unit_price;
			abs_price = delta_price * count;
		}else{
			delta_price = abs_price / count;
		}
		let up_price = pclose + abs_price;
		let down_price = pclose - abs_price;

		//获取叠加品种最大涨跌幅
		let max_percent = 0;
		if(pclose*max_percent>abs_price) {
			up_price = pclose*(1+max_percent);
			down_price = pclose*(1-max_percent);
		}

		let price_scale = d3.scaleLinear().domain([up_price, down_price]).range([cfg.padding[0], cfg.padding[0] + this.price_rect_height]);
		let percent_scale = d3.scaleLinear().domain([up_price/pclose, down_price/pclose]).range([cfg.padding[0], cfg.padding[0] + this.price_rect_height]);
		this.price_scale = price_scale;
		let price_scale_label_arr = [];
		let percent_scale_label_arr = [];
		let len = PRICE_SCALE_LABEL_ARR.length;
		for(let i=0; i<len; i++){
			let temp_price = price_scale.invert(cfg.padding[0] + this.delta_y * i);
			price_scale_label_arr[i] = temp_price.toFixed(cfg.accuracy);
			percent_scale_label_arr[i] = ((Math.abs(temp_price - pclose) / pclose)*100).toFixed(2)+ '%';
		}
		// 更新价格刻度值
		this.price_label_group
			.data(price_scale_label_arr)
			.text((v)=>{
				return v;
			});
		// 更新百分比刻度值
		this.percent_label_group
			.data(percent_scale_label_arr)
			.text((v)=>{
				return v;
			});

        let price_line_attr_d = 'M';
		let price_path_attr_d = 'M';
		let avg_line_attr_d = 'M';
		len = this.data.length;
		let latest_x;
		let latest_y;
		delta = this.price_rect_width / (cfg.day_count * cfg.point_count_per_one_day - 1);
		this.delta_x = delta;
		for(let i = 0; i<len; i++){
			let item = this.data[i];
			let x = cfg.padding[3] + delta*item.index;

			price_line_attr_d += ` ${x},${price_scale(item.price)}`;
			if(i == 0){
				price_path_attr_d += ` ${x},${cfg.padding[0] + this.price_rect_height}`;
			}
			price_path_attr_d += ` ${x},${price_scale(item.price)}`;
			if(i==len-1){
				latest_x = x;
				latest_y = price_scale(item.price);
				price_path_attr_d += ` ${x},${cfg.padding[0] + this.price_rect_height}`;
			}
			avg_line_attr_d += ` ${x},${price_scale(item.avg)}`;
		}

		// 画价格线
		if(!this.price_line){
			this.price_line = this.g.append('path')
				.style('stroke', cfg.price_line_color)
				.style('stroke-width', cfg.price_line_width)
				.style('fill', 'transparent')
				.attr('d', price_line_attr_d);
		}else{
			this.price_line.attr('d', price_line_attr_d);
		}
		// 画价格线下面的半透明区域
		if(!this.price_path){
			this.price_path = this.g.append('path')
				.style('fill', cfg.price_path_fill_color)
				.style('opacity', cfg.price_path_fill_opacity)
				.attr('d', price_path_attr_d);
		}else{
			this.price_path.attr('d', price_path_attr_d);
		}

		// 画均价线
		if(!this.avg_line){
			this.avg_line = this.g.append('path')
				.style('stroke', cfg.avg_line_color)
				.style('stroke-width', cfg.line_width)
				.style('fill', 'transparent')
				.attr('d', avg_line_attr_d);
		}else{
			this.avg_line.attr('d', avg_line_attr_d);
		}

		// 价格线最后一点的闪烁效果
		if(!this.blink_circle){
			this.blink_circle = this.g.append('circle')
				.attr('cx', latest_x)
				.attr('cy', latest_y)
				.attr('r', 0)
				.style('fill', cfg.price_line_color);
			this.blink_circle.attr('r', 4)
				.transition()
				.duration(800)
				.attr('r', 0);
		}else{
			this.blink_circle
				.attr('cx', latest_x)
				.attr('cy', latest_y)
				.attr('r', 4)
				.transition()
				.duration(800)
				.attr('r', 0);
		}

		// 画成交量柱子
		let max_valume = d3.max(this.alldata, (item)=>{
			return item.volume;
		});
		let volume_scale = d3.scaleLinear().domain([max_valume, 0]).range([cfg.padding[0] + this.price_rect_height + cfg.inner_span, cfg.height - cfg.padding[2]]);
		let volume_candle_width = 0;
		volume_candle_width = this.price_rect_width/(cfg.day_count * cfg.point_count_per_one_day - 1) - 4;
		volume_candle_width < 1 && (volume_candle_width = 1);
		//var sel_volume_candles = this.volume_g.selectAll('rect').data(this.data);
		//sel_volume_candles.exit().remove();
		//sel_volume_candles.enter().append('rect');
		//sel_volume_candles
		this.volume_g.selectAll('rect').data(this.data)
			.enter()
			.append('rect')
			.attr('width', volume_candle_width)
			.attr('height', (item)=>{
				return Math.max(cfg.height - cfg.padding[2] - volume_scale(item.volume),0);
			})
			.attr('x', (item,i)=>{
				return cfg.padding[3] + delta * item.index;
			})
			.attr('y',(item)=>{
				return volume_scale(item.volume);
			})
			.attr('fill',(v)=>{
				if(v.color === 'up'){
					return cfg.volume_candle_up_color;
				}else{
					return cfg.volume_candle_down_color;
				}
			});
		this.volume_scale = volume_scale;
		// 更新成交量最高刻度值
		max_valume = Math.floor(max_valume);
		this.volume_left_top_scale_text.text(max_valume);
		this.volume_right_top_scale_text.text(max_valume);
    }
}

function longTimeIntToIndex(time,is_ggt){
    let delta_count = 120;
    is_ggt && (delta_count = 150);
    time = time%10000
    let index = Math.floor(time/100)*60+time%100;
    if(index <INDEX_B_BEGIN){
        return index - INDEX_A_BEGIN;
    }else{
        return index-INDEX_B_BEGIN + delta_count;
    }
}