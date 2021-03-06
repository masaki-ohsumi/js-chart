
var CHART = {
	PADDING : {
		TOP : 60,
		RIGHT : 50,
		BOTTOM : 50,
		LEFT : 100
	},
	AXIS_COLOR : '#808080',
	AXIS_LABEL_COLOR : '#404040',
	LABEL_MARGIN : 10,
	TICK_MARGIN : 10,
	TICK_LENGTH : 10,
	DOTTED_LINE_PATTERN : [5, 5],
	BAR_CREVICE_RATE : 0.05,
	BAR_END_RATE : 0.1,
	LEGEND_SIZE : 12,
	LEGEND_OFFSET : 10,
	LEGEND_PADDING : 10,
	LEGEND_MARGIN : 20,
	ANIMATION_COUNT : 30,
	
	init : function(data){
		this.data = data;
		this.setParameters();
		this.bindEvent();
		this.setupCanvas();
		this.watchScroll();
	},
	setParameters : function(){
		this.$window = $(window);
		this.$container = $('#jsi-chart-container');
		
		this.$canvas = $('<canvas />');
		this.$container.append(this.$canvas);
		this.context = this.$canvas.get(0).getContext('2d');
		
		this.timerIds = [];
		this.legendAxis = [];
	},
	bindEvent : function(){
		this.$window.on('resize', $.proxy(this.watchResize, this));
		this.$window.on('scroll', $.proxy(this.watchScroll, this));
		/*
		 * レジェンドがクリックされた時に実行するイベントハンドラを設定する
		 * 但しcanvasに描画した特定の要素に対して設定することはできない
		 * よってcanvas全体に対して設定し、ハンドラ内でクリックした要素を判定する
		 */
		this.$canvas.on('click', $.proxy(this.selectCarrier, this));
	},
	setupCanvas : function(){
		this.setupCommonParameters();
		this.setVeticalAxisInfo();
		this.drawAxis();
		this.drawLegend();
	},
	setupCommonParameters : function(){
		this.width = this.$container.width();
		this.height = this.$container.height();
		this.$canvas.attr({width : this.width, height : this.height});
		
		this.legendAxis.length = 0;
		
		this.context.clearRect(0, 0, this.width, this.height);
		this.context.lineWidth = 1;
		this.context.strokeStyle = 'none';
		this.context.fillStyle = 'none';
		this.context.font = 'italic bold 12px Verdana';
	},
	watchResize : function(event){
		while(this.timerIds.length > 0){
			cancelAnimationFrame(this.timerIds.pop());
		}
		this.timerIds.push(requestAnimationFrame($.proxy(this.redrawChart, this, false)));
	},
	watchScroll : function(event){
		var containerTop = this.$container.offset().top,
			containerBottom = containerTop + this.height,
			windowTop = this.$window.scrollTop(),
			windowBottom = windowTop + this.$window.height();
		
		if(containerTop >= windowTop && containerBottom <= windowBottom || containerTop <= windowTop && containerBottom >= windowBottom){
			this.$window.off('scroll', this.watchSroll);
			this.startToDrawBars(true);
		}
	},
	/*
	 * canvasをクリックした位置が、レジェンドの位置と重なっているかどうか判定する
	 */
	selectCarrier : function(event){
		/*
		 * クリックされた座標を取得する
		 */
		var offset = this.$container.offset(),
			x = event.clientX + this.$window.scrollLeft() - offset.left,
			y = event.clientY + this.$window.scrollTop() - offset.top;
		
		/*
		 * クリックされた座標と各レジェンドの座標を比較して、レジェンドがクリックされたかどうか判定する
		 * レジェンドがクリックされた時は、画面全体を再描画する
		 * その際、各レジェンドの選択状態を反転してJSONに保存しておく
		 * 今回はdiabledという名前のプロパティを追加している(未選択 : true、選択 : false);
		 */
		for(var i = 0, length = this.legendAxis.length; i < length; i++){
			var axis = this.legendAxis[i];
			
			if(x >= axis.x1 && x <= axis.x2 && y >= axis.y1 && y <= axis.y2){
				this.data.carrier[i].disabled = !this.data.carrier[i].disabled;
				this.redrawChart(true);
			}
		}
	},
	redrawChart : function(toAnimate){
		var width = this.$container.width();
		
		if(this.width != width){
			this.width = width;
			this.watchResize();
			return;
		}
		this.setupCanvas();
		this.startToDrawBars(toAnimate);
	},
	setVeticalAxisInfo : function(){
		var isFirst = true;
		
		/*
		 * y軸の最大値を求める際に、未選択のキャリアは計算から省く
		 */
		for(var i = 0, lengthi = this.data.subscribership.length; i < lengthi; i++){
			var counts = this.data.subscribership[i].count;
			
			for(var j = 0, lengthj = counts.length; j < lengthj; j++){
				if(this.data.carrier[j].disabled){
					continue;
				}
				if(isFirst || this.maxY < counts[j]){
					this.maxY = counts[j];
					isFirst = false;
				}
			}
		}
		if(this.maxY <= 10){
			this.ticksY = this.maxY;
			return;
		}
		var digits = String(this.maxY).length,
			base = Math.pow(10, digits - 1);
		
		this.ticksY = Math.ceil(this.maxY / base);
		this.maxY = this.ticksY * base;
	},
	drawAxis : function(){
		this.drawAxisX();
		this.drawAxisY();
	},
	drawAxisX : function(){
		this.drawAxisLineAndTicksX();
		this.drawAxisLabelX();
	},
	drawAxisLineAndTicksX : function(){
		this.context.save();
		this.context.strokeStyle = this.AXIS_COLOR;
		
		this.context.beginPath();
		this.context.moveTo(this.PADDING.LEFT, this.height - this.PADDING.BOTTOM);
		this.context.lineTo(this.width - this.PADDING.RIGHT, this.height - this.PADDING.BOTTOM);
		this.context.stroke();
		
		this.tickSpaceX = Math.floor((this.width - this.PADDING.LEFT - this.PADDING.RIGHT) / this.data.subscribership.length);
		
		for(var i = 0, length = this.data.subscribership.length - 1; i < length; i++){
			var x = this.PADDING.LEFT + this.tickSpaceX * (i + 1);
			
			this.context.beginPath();
			this.context.moveTo(x, this.height - this.PADDING.BOTTOM);
			this.context.lineTo(x, this.height - this.PADDING.BOTTOM + this.TICK_LENGTH);
			this.context.stroke();
		}
		this.context.restore();
	},
	drawAxisLabelX : function(){
		this.context.save();
		this.context.textAlign = 'center';
		this.context.textBaseline = 'top';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;
			
		for(var i = 0, length = this.data.subscribership.length; i < length; i++){
			this.context.fillText(this.data.subscribership[i].year, this.PADDING.LEFT + this.tickSpaceX * (i + 0.5), this.height - this.PADDING.BOTTOM + this.TICK_LENGTH);
		}
		this.context.fillText('年', this.PADDING.LEFT + this.tickSpaceX * length, this.height - this.PADDING.BOTTOM + this.TICK_LENGTH);
		this.context.restore();
	},
	drawAxisY : function(){
		this.drawAxisLineAndTicksY();
		this.drawAxisLabelY();
	},
	drawAxisLineAndTicksY : function(){
		this.context.save();
		this.context.strokeStyle = this.AXIS_COLOR;
		
		this.context.beginPath();
		this.context.moveTo(this.PADDING.LEFT, this.height - this.PADDING.BOTTOM);
		this.context.lineTo(this.PADDING.LEFT, this.PADDING.TOP);
		this.context.stroke();
		
		this.tickSpaceY = Math.floor((this.height - this.PADDING.TOP - this.PADDING.BOTTOM - this.TICK_MARGIN) / this.ticksY);
		
		for(var i = 0; i < this.ticksY; i++){
			var y = this.height - this.PADDING.BOTTOM - this.tickSpaceY * (i + 1);
			
			this.context.beginPath();
			this.context.moveTo(this.PADDING.LEFT, y);
			this.context.lineTo(this.PADDING.LEFT - this.TICK_LENGTH, y);
			this.context.stroke();
			
			this.drawDottedLine(this.PADDING.LEFT, y, this.width - this.PADDING.RIGHT, y);
		}
		this.context.restore();
	},
	drawAxisLabelY : function(){
		this.context.save();
		this.context.textAlign = 'right';
		this.context.textBaseline = 'middle';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;
		
		for(var i = 0; i < this.ticksY; i++){
			var y = this.height - this.PADDING.BOTTOM - this.tickSpaceY * (i + 1);
			this.context.fillText(this.formatNumber(this.maxY / this.ticksY  * (i + 1)), this.PADDING.LEFT - this.TICK_LENGTH - this.LABEL_MARGIN, y);
		}
		this.context.restore();
		
		this.context.save();
		this.context.textAlign = 'center';
		this.context.textBaseline = 'bottom';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;
		this.context.fillText('契約純増数', this.PADDING.LEFT, this.PADDING.TOP - this.TICK_LENGTH);
		this.context.restore();
	},
	drawDottedLine : function(x1, y1, x2, y2){
		var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
			rateX = (x2 - x1) / length,
			rateY = (y2 - y1) / length,
			startX = x1,
			startY = y1;
			
		while(true){
			for(var i = 0, patternLength = this.DOTTED_LINE_PATTERN.length; i < patternLength; i += 2){
				var endX = startX + this.DOTTED_LINE_PATTERN[i] * rateX,
					endY = startY + this.DOTTED_LINE_PATTERN[i] * rateY;
				
				if(endX > x2){
					return;
				}
				this.context.beginPath();
				this.context.moveTo(startX, startY);
				this.context.lineTo(endX, endY);
				this.context.stroke();
				
				if(i < patternLength - 1){
					startX = endX + this.DOTTED_LINE_PATTERN[i + 1] * rateX;
					startY = endY + this.DOTTED_LINE_PATTERN[i + 1] * rateY;
				}
			}
		}
	},
	startToDrawBars : function(toAnimate){
		var barCount = this.data.carrier.length;
		
		this.eachBarWidth = this.tickSpaceX * (1 - this.BAR_END_RATE * 2 - this.BAR_CREVICE_RATE * (barCount - 1)) / barCount,
		this.axisYHeight = this.height - this.PADDING.TOP - this.PADDING.BOTTOM - this.TICK_MARGIN;
		
		if(toAnimate){
			this.timerIds.push(requestAnimationFrame($.proxy(this.drawBars, this, this.ANIMATION_COUNT - 1)));
		}else{
			this.drawBars(0);
		}
	},
	drawBars : function(index){
		this.context.save();
		
		for(var i = 0, lengthi = this.data.subscribership.length; i < lengthi; i++){
			var counts = this.data.subscribership[i].count,
				baseX = this.PADDING.LEFT + this.tickSpaceX * (i + this.BAR_END_RATE);
			
			/*
			 * 棒を描画する際に、未選択のキャリアは省く
			 */
			for(var j = 0, lengthj = counts.length; j < lengthj; j++){
				if(this.data.carrier[j].disabled){
					continue;
				}
				var color = this.data.carrier[j].color,
					x = baseX + (this.eachBarWidth + this.tickSpaceX * this.BAR_CREVICE_RATE) * j,
					height = this.axisYHeight * counts[j] / this.maxY * (this.ANIMATION_COUNT - index) / this.ANIMATION_COUNT;
				
				this.context.fillStyle = color;
				this.context.fillRect(x, this.PADDING.TOP + this.TICK_MARGIN + this.axisYHeight - height, this.eachBarWidth, height, this.eachBarWidth);
			}
		}
		if(index > 0){
			this.timerIds.push(requestAnimationFrame($.proxy(this.drawBars, this, --index)));
		}
		this.context.restore();
	},
	drawLegend : function(){
		this.context.save();
		
		var legendCount = this.data.carrier.length,
			totalLength = 0,
			literalLengths = [];
		
		for(var i = 0, count = this.data.carrier.length; i < count; i++){
			var width = this.context.measureText(this.data.carrier[i].name).width;
			literalLengths.push(width);
			totalLength += width;
		}
		totalLength += this.LEGEND_SIZE * legendCount;
		totalLength += this.LEGEND_PADDING * legendCount;
		totalLength += this.LEGEND_MARGIN * (legendCount - 1);
		
		var x = (this.width - totalLength) / 2;
		
		for(var i = 0, count = this.data.carrier.length; i < count; i++){
			/*
			 * レジェンドを描画する際に、未選択のキャリアは透明度を0.5に設定する
			 */
			this.context.globalAlpha = this.data.carrier[i].disabled ? 0.5 : 1;
			this.context.fillStyle = this.data.carrier[i].color;
			this.context.fillRect(x, this.LEGEND_OFFSET, this.LEGEND_SIZE, this.LEGEND_SIZE);
			
			var axis = {x1 : x, y1 : this.LEGEND_OFFSET, y2 : this.LEGEND_OFFSET + this.LEGEND_SIZE};
			
			x += this.LEGEND_SIZE + this.LEGEND_PADDING;
			
			this.context.textBaseline = 'top';
			this.context.fillStyle = this.AXIS_LABEL_COLOR;
			this.context.fillText(this.data.carrier[i].name, x, this.LEGEND_OFFSET);
			
			x += literalLengths[i];
			axis.x2 = x;
			
			/*
			 * レジェンドを描画する際に、x座標の最大値/最小値とy座標の最大値/最小値を保存する
			 * canvasがクリックされた位置と、これらの座標の位置を比較することで、レジェンドがクリックされたかどうか判定する
			 */
			this.legendAxis.push(axis);
			x += this.LEGEND_MARGIN;
		}
		this.context.restore();
	},
	formatNumber : function(data){
		data = String(data).split('');
		
		for(var i = data.length - 1 - 3; i >= 0; i -= 3){
			data.splice(i + 1, 0, ',');
		}
		return data.join('');
	},
	destroy : function(){
		this.$window.off('resize', this.watchResize);
		this.$window.off('scroll', this.watchScroll);
		this.$canvas.off('click', this.selectCarrier);
		this.$canvas.remove();
	}
};

$(function(){
	CHART.init(BAR_DATA);
});