const LINE_COLOR = '#7a72a4';
const LINE_WIDTH = '1px';
const RECT_FILL_COLOR = '#252235';
const FONT_COLOR = '#ffffff';
const FONT_SIZE = '12px';
const PRICE_LINE_COLOR = '#337ec2';
const CROSS_POINT_RADIUS = 4;
const RED = '#f7413d';
const GREEN = '#69ae2f';
const GRAY = '#838383';
const WHITE = '#d2d2d2';
const YELLOW = '#d2d2d2';
const colorPlanA = {
		'buy': true,
		'sale': true,
		'now': true,
		'openprice': true,
		'high': true,
		'low': true,
		'price': true,
		'avg': true,
		'close': true,
		'open': true
	}, colorPlanB = {
		'risepercent': true,
		'rise': true
	}, colorPlanC = {
		'name': true,
		'volume': true,
		'amount': true
	};

export default class CrossLine{
	constructor(g, config={}){
		let cfg = {};
		({
			x1: cfg.x1 = -1,
			x2: cfg.x2 = -1,
			y1: cfg.y1 = -1,
			y2: cfg.y2 = -1,
			font_color: cfg.font_color = FONT_COLOR,
			font_size: cfg.font_size = FONT_SIZE,
			line_color: cfg.line_color = LINE_COLOR,
			line_width: cfg.line_width = LINE_WIDTH,
			label_fill_color: cfg.label_fill_color = RECT_FILL_COLOR,
			price_line_color: cfg.price_line_color = PRICE_LINE_COLOR,
			right_float_label_width: cfg.right_float_label_width = 50,
			left_float_label_width: cfg.left_float_label_width = 50,
			right_float_label_height: cfg.right_float_label_height = 20,
			left_float_label_height: cfg.left_float_label_height = 20,
			bottom_float_label_width: cfg.bottom_float_label_width = 40,
			bottom_float_label_height: cfg.bottom_float_label_height = 20,
			detail_label_width: cfg.detail_label_width = 115,
			detail_label_height: cfg.detail_label_height = 130,
			show_cross_point: cfg.show_cross_point = false,
			corss_point_radius: cfg.corss_point_radius = CROSS_POINT_RADIUS,
			detail_label_left: cfg.detail_label_left = true
		} = config);

		this.cfg = cfg;

		this.sel_cross_path = g.append('path')
			.style('stroke-width', cfg.line_width)
			.style('fill', 'transparent')
			.style('stroke', cfg.line_color)
			.attr('d', 'M 0,0');

		this.sel_right_float_label = g.append('path')
			.style('stroke-width', cfg.line_width)
			.style('fill', cfg.label_fill_color)
			.style('stroke', cfg.line_color)
			.attr('d', 'M 0,0');

		this.sel_left_float_label = g.append('path')
			.style('stroke-width', cfg.line_width)
			.style('fill', cfg.label_fill_color)
			.style('stroke', cfg.line_color)
			.attr('d', 'M 0,0');

		this.sel_bottom_float_label = g.append('path')
			.style('stroke-width', cfg.line_width)
			.style('fill', cfg.label_fill_color)
			.style('stroke', cfg.line_color)
			.attr('d', 'M 0,0');

		this.sel_right_text = g.append('text')
			.attr('x', 0)
			.attr('y', 0)
			.style('text-anchor', 'middle')
			.style('dominant-baseline', 'auto')
			.style('font-size', cfg.font_size)
			.style('fill', cfg.font_color)
			.text('');

		this.sel_left_text = g.append('text')
			.attr('x', 0)
			.attr('y', 0)
			.style('text-anchor', 'middle')
			.style('dominant-baseline', 'auto')
			.style('font-size', cfg.font_size)
			.style('fill', cfg.font_color)
			.text('');

		this.sel_bottom_text = g.append('text')
			.attr('x', 0)
			.attr('y', 0)
			.style('text-anchor', 'middle')
			.style('dominant-baseline', 'auto')
			.style('font-size', cfg.font_size)
			.style('fill', cfg.font_color)
			.text('');

		if (cfg.show_cross_point) {
			this.cross_point = g.append('circle')
			.attr('cx', -cfg.corss_point_radius)
			.attr('cy', -cfg.corss_point_radius)
			.attr('r', cfg.corss_point_radius)
			.style('fill', cfg.price_line_color);
		}

		// 详情
		this.sel_detail_label = g.append('path')
			.style('stroke-width', cfg.line_width)
			.style('fill', cfg.label_fill_color)
			.style('stroke', cfg.line_color)
			.attr('d', 'M 0,0');

		this.sel_detail_text = g.append('text')
			//.attr('x', 0)
			//.attr('y', 0)
			.attr('fill', cfg.font_color)
			.style('font-size', cfg.font_size)
			.text('');

		this.g = g;
	}

	update(data){
		let cfg = this.cfg;
		data.x1 && (cfg.x1 = data.x1);
		data.x2 && (cfg.x2 = data.x2);
		data.y1 && (cfg.y1 = data.y1);
		data.y2 && (cfg.y2 = data.y2);
		data.price_y && (cfg.price_y = data.price_y);
		let x = data.x;
		let y = data.y;
		if(!x || !y || x < cfg.x1 || x > cfg.x2 || y < cfg.y1 || y > cfg.y2){
			return;
		}
		this.x = data.x;
		this.y = data.y;
		let cross_attr_d = `M ${cfg.x1}, ${y}, ${cfg.x2}, ${y} M ${x},${cfg.y1} ${x}, ${cfg.y2}`;
		this.sel_cross_path.attr('d', cross_attr_d);
		// 分时才有左侧浮动Label
		if(data.left_label_text !== undefined){
			let left_float_label_attr_d = `M ${cfg.x1 - cfg.left_float_label_width}, ${y - cfg.left_float_label_height/2} ${cfg.x1}, ${y - cfg.left_float_label_height/2} ${cfg.x1}, ${y + cfg.left_float_label_height/2} ${cfg.x1 - cfg.left_float_label_width}, ${y + cfg.left_float_label_height/2} ${cfg.x1 - cfg.left_float_label_width}, ${y - cfg.left_float_label_height/2} `;
			this.sel_left_float_label.attr('d', left_float_label_attr_d);

			this.sel_left_text
				.attr('x', cfg.x1 - cfg.left_float_label_width/2)
				.attr('y', y+4)
				.text(data.left_label_text);
		}

		let right_float_label_attr_d = `M ${cfg.x2}, ${y - cfg.right_float_label_height/2} ${cfg.x2+cfg.right_float_label_width}, ${y - cfg.right_float_label_height/2}  ${cfg.x2+cfg.right_float_label_width},${y+ cfg.right_float_label_height/2} ${cfg.x2}, ${y+ cfg.right_float_label_height/2} ${cfg.x2}, ${y - cfg.right_float_label_height/2}`;
		this.sel_right_float_label.attr('d', right_float_label_attr_d);
		
		let bottom_float_label_attr_d = `M ${x - cfg.bottom_float_label_width/2},${cfg.y2} ${x + cfg.bottom_float_label_width/2},${cfg.y2} ${x + cfg.bottom_float_label_width/2},${cfg.y2 + cfg.bottom_float_label_height} ${x - cfg.bottom_float_label_width/2},${cfg.y2 + cfg.bottom_float_label_height} ${x - cfg.bottom_float_label_width/2},${cfg.y2}`;
		this.sel_bottom_float_label.attr('d', bottom_float_label_attr_d);
		this.sel_right_text
			.attr('x', cfg.x2+cfg.right_float_label_width/2)
			.attr('y', y+4)
			.text(data.right_label_text);
		this.sel_bottom_text
			.attr('x', x)
			.attr('y', cfg.y2+cfg.bottom_float_label_height/2+4)
			.text(data.bottom_label_text);

		cfg.show_cross_point && this.cross_point.attr('cx', x).attr('cy', cfg.price_y);

		//详情显示
		let detail_label_attr_d = '';
		if(!cfg.detail_label_left && x>cfg.x2-cfg.detail_label_width) {
			cfg.detail_label_left = true;
		}
		else if(cfg.detail_label_left && x<cfg.x1+cfg.detail_label_width) {
			cfg.detail_label_left = false;
		}
		if(cfg.detail_label_left)
		detail_label_attr_d = `M ${cfg.x1},${cfg.y1} ${cfg.x1 + cfg.detail_label_width},${cfg.y1} ${cfg.x1 + cfg.detail_label_width},${cfg.y1 + cfg.detail_label_height} ${cfg.x1},${cfg.y1 + cfg.detail_label_height} ${cfg.x1},${cfg.y1}`;
		else
		detail_label_attr_d = `M ${cfg.x2-cfg.detail_label_width},${cfg.y1} ${cfg.x2},${cfg.y1} ${cfg.x2},${cfg.y1 + cfg.detail_label_height} ${cfg.x2-cfg.detail_label_width},${cfg.y1 + cfg.detail_label_height} ${cfg.x2-cfg.detail_label_width},${cfg.y1}`;
		this.sel_detail_label.attr('d',detail_label_attr_d);

		console.log('data.item:',data.item);
		this.sel_detail_text.text(null);
		let detail_label_text = '';
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+15)
			.text(`时\u3000间`);
		let dateStr = ''+data.item.time;
		let time = `${dateStr.slice(8, 10)}:${dateStr.slice(10, 12)}`;
		console.log('time:',time);
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+15)
			.text(time);
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+35)
			.text('涨跌幅');
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+35)
			.text(data.item.rise.toFixed(2) + '%')
			.attr('fill',this.getColor('rise',data.item));//data.item.rise>0?RED:(data.item.rise<0?GREEN:WHITE));
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+55)
			.text('价\u3000格');
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+55)
			.text(data.item.price.toFixed(2))
			.attr('fill',this.getColor('price',data.item));
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+75)
			.text('均\u3000价');
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+75)
			.text(data.item.avg.toFixed(2))
			.attr('fill',this.getColor('avg',data.item));
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+95)
			.text('成交量');
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+95)
			.text(this.fitNumber(data.item.volume))
			.attr('fill',this.getColor('volume',data.item));
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+5:cfg.x2-cfg.detail_label_width+5)
			.attr('y',cfg.y1+115)
			.text('成交额');
		this.sel_detail_text
			.append('tspan')
			.attr('x',cfg.detail_label_left?cfg.x1+55:cfg.x2-cfg.detail_label_width+55)
			.attr('y',cfg.y1+115)
			.text(this.fitNumber(data.item.amount))
			.attr('fill',this.getColor('amount',data.item));
	}

	fitNumber(n) {
		if (n !== +n) return "";

		var m, nn = n>=0 ? n : -n;
		if(nn > 1e8) {
			m = nn/1e8;
			return (n<0 ? '-' : '') + (0 == m%1 ? m : m.toFixed(2)) + '亿';
		}
		else if(nn > 1e5) {
			m = nn/1e4;
			return (n<0 ? '-' : '') + (0 == m%1 ? m : m.toFixed(2)) + '万';
		}
		else {
			return (n<0 ? '-' : '') + (0 == nn%1 ? nn : nn.toFixed(0));
		}
	}

	getColor(title, data) {
		var color = '',
			item = data[title],
			val = typeof item == 'object' ? item.num : item;
		if (val === undefined) {
			return color;
		}

		if (title in colorPlanA) {
			// color based on closeprice
			var pclose = typeof data.closeprice == 'object' ? data.closeprice.num : data.closeprice;
			if (null !== pclose && undefined !== pclose) {
				if (+val > +pclose) {
					color = RED;
				} else if (+val < +pclose && +val > 0) {
					color = GREEN;
				}
				else {
					color = WHITE;
				}
			} else {
				var val = parseFloat(data.risepercent.num);
				color = val > 0 ? RED : (val < 0 ? GREEN : WHITE);
			}
		} else if (title in colorPlanB) {
			// color based on sign
			color = +val > 0 ? RED : (+val < 0 ? GREEN : WHITE);
		} else if (title in colorPlanC) {
			// color based on title only
			color = YELLOW;
		}
		return color;
	}

	show(){
		this.g.style('visibility','visible');
	}

	hide(){
		this.g.style('visibility','hidden');
	}

	destroy(){
		this.g.remove();
	}
}
