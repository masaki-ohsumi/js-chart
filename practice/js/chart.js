var CHART = {
	PADDING: {
		TOP: 60,
		RIGHT: 50,
		BOTTOM: 50,
		LEFT: 100
	},
	AXIS_COLOR: '#808080',
	AXIS_LABEL_COLOR: '#404040',
	LABEL_MARGIN: 10,
	TICK_MARGIN: 10,
	TICK_LENGTH: 10,
	DOTTED_LINE_PATTERN: [5, 5],
	BAR_CREVICE_RATE: 0.05,
	BAR_END_RATE: 0.1,
	LEGEND_SIZE: 12,
	LEGEND_OFFSET: 10,
	LEGEND_PADDING: 10,
	LEGEND_MARGIN: 10,
	ANIMATION_COUNT: 30,

	init: function (data) {
		this.data = data;
		this.setParameters();
		this.bindEvent();
		this.setupCanvas();
		this.watchScroll();
	},
	setParameters: function () {
		this.$window = $(window);
		this.$container = $('#jsi-chart-container');
		this.width = this.$container.width();
		this.height = this.$container.height();

		this.$canvas = $('<canvas/>');
		this.$canvas.attr({
			width: this.width,
			height: this.height
		});
		this.$container.append(this.$canvas);
		this.context = this.$canvas.get(0).getContext('2d');

		this.timerlds = [];
		this.legendAxis = [];
	},
	bindEvent: function () {
		this.$window.on( 'resize', $.proxy( this.watchResize, this ) );
		this.$window.on( 'scroll', $.proxy( this.watchScroll, this ) );
		this.$canvas.on( 'click', $.proxy( this.selectCarrier, this ) );
	},
	watchResize: function () {
		//リサイズ発生時に既にタイマーが設定されている場合は全て停止
		while( this.timerlds.length > 0 ) {
			window.cancelAnimationFrame( this.timerlds.pop() );
		}
		this.timerlds.push( window.requestAnimationFrame( $.proxy( this.redrawChart, this ) ) );
	},
	//スクロールの位置を監視し、チャートが表示領域に入った時にアニメーションを開始
	watchScroll: function () {
		var containerTop = this.$container.offset().top,
			containerBottom = containerTop + this.height,
			windowTop = this.$window.scrollTop(),
			windowBottom = windowTop + this.$window.height();

		var isContainChartInWindow = containerTop >= windowTop && containerBottom <= windowBottom;
		var isOverlapChartWithWindow = containerTop <= windowTop && containerBottom >= windowBottom;

		if( isContainChartInWindow || isOverlapChartWithWindow ) {
			this.$window.off('scroll', this.watchScroll);
			this.startToDrawBars( true );
		}
	},
	selectCarrier: function ( event ) {
		//クリックされた座標取得
		var offset = this.$container.offset(),
			x = event.clientX + this.$window.scrollLeft() - offset.left,
			y = event.clientY + this.$window.scrollTop() - offset.top;

		for( var i = 0, length = this.legendAxis.length; i < length; i++ ) {
			var axis = this.legendAxis[i];

			if( x >= axis.x1 && x <= axis.x2 && y >= axis.y1 && y <= axis.y2 ) {
				this.data.carrier[i].disabled = !this.data.carrier[i].disabled;
				this.redrawChart( true );
			}
		}
	},
	redrawChart: function ( toAnimate ) {
		var width = this.$container.width();

		//前回と幅が異なる場合はリサイズ中であると判定し、再度タイマーを設定
		if( this.width !== width ) {
			this.width = width;
			this.watchResize();
			return;
		}
		this.setupCanvas();
		this.startToDrawBars( toAnimate );
	},
	setupCanvas: function ( toAnimate ) {
		this.setupCommonParameters();
		this.setVerticalAxisInfo();
		this.drawAxis();
		this.drawLegend();
	},
	setupCommonParameters: function () {
		this.width = this.$container.width();
		this.height = this.$container.height();
		this.$canvas.attr( {width: this.width, heigth: this.height} );
		this.legendAxis.length = 0;

		this.context.clearRect( 0, 0, this.width, this.height );

		this.context.lineWidth = 1;
		this.context.strokeStyle = 'none';
		this.context.fillStyle = 'none';
		this.context.font = 'italic bold 12px Verdana';
	},
	drawAxis: function () {
		this.drawAxisX();
		this.drawAxisY();
	},
	drawAxisX: function () {
		this.drawAxisLineAndTicksX();
		this.drawAxisLabelX();
	},
	drawAxisLineAndTicksX: function () {
		//設定を一時的に変更するため、保存する
		this.context.save();
		this.context.strokeStyle = this.AXIS_COLOR;

		//始点に移動
		this.context.beginPath();
		this.context.moveTo( this.PADDING.LEFT, this.height - this.PADDING.BOTTOM );

		//終点まで線を引く
		this.context.lineTo( this.width - this.PADDING.RIGHT, this.height - this.PADDING.BOTTOM );

		//図形を描画する
		this.context.stroke();

		//目盛りを計算して描画する
		this.tickSpaceX = Math.floor( (this.width - this.PADDING.LEFT - this.PADDING.RIGHT) / this.data.subscribership.length );
		for ( var i = 0, length = this.data.subscribership.length - 1; i < length; i++ ) {
			var x = this.PADDING.LEFT + this.tickSpaceX * (i + 1);

			this.context.beginPath();
			this.context.moveTo( x, this.height - this.PADDING.BOTTOM );
			this.context.lineTo( x, this.height - this.PADDING.BOTTOM + this.TICK_LENGTH );
			this.context.stroke();
		}

		//設定を復元する
		this.context.restore();
	},
	drawAxisLabelX: function () {
		this.context.save();
		this.context.textAlign = 'center';
		this.context.textBaseline = 'top';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;

		for ( var i = 0, length = this.data.subscribership.length; i < length; i++ ) {
			this.context.fillText( this.data.subscribership[i].year, this.PADDING.LEFT + this.tickSpaceX * (i + 0.5), this.height - this.PADDING.BOTTOM + this.TICK_LENGTH );
		}
		this.context.fillText( '年', this.PADDING.LEFT + this.tickSpaceX * length, this.height - this.PADDING.BOTTOM + this.TICK_LENGTH );
		this.context.restore();
	},
	drawAxisY: function () {
		this.drawAxisLineAndTicksY();
		this.drawAxisLabelY();
	},
	drawAxisLineAndTicksY: function () {
		this.context.save();
		this.strokeStyle = this.AXIS_COLOR;

		this.context.beginPath();
		this.context.moveTo( this.PADDING.LEFT, this.height - this.PADDING.BOTTOM );
		this.context.lineTo( this.PADDING.LEFT, this.PADDING.TOP );
		this.context.stroke();

		//目盛りを計算して描画する
		this.tickSpaceY = Math.floor( (this.height - this.PADDING.TOP - this.PADDING.BOTTOM - this.TICK_MARGIN) / this.ticksY );
		for ( var i = 0; i < this.ticksY; i++ ) {
			var y = this.height - this.PADDING.BOTTOM - this.tickSpaceY * ( i + 1 );
			this.context.beginPath();
			this.context.moveTo( this.PADDING.LEFT, y );
			this.context.lineTo( this.PADDING.LEFT - this.TICK_LENGTH, y );
			this.context.stroke();

			this.drawDottedLine( this.PADDING.LEFT, y, this.width - this.PADDING.RIGHT, y );
		}

		this.context.restore();
	},
	drawAxisLabelY: function () {
		this.context.save();
		this.context.textAlign = 'right';
		this.context.textBaseline = 'middle';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;

		for ( var i = 0; i < this.ticksY; i++ ) {
			var y = this.height - this.PADDING.BOTTOM - this.tickSpaceY * (i + 1);
			this.context.fillText( this.formatNumber( this.maxY / this.ticksY * (i + 1) ) , this.PADDING.LEFT - this.TICK_LENGTH - this.LABEL_MARGIN, y );
		}
		this.context.restore();

		this.context.save();
		this.context.textAlign = 'center';
		this.context.textBaseline = 'bottom';
		this.context.fillStyle = this.AXIS_LABEL_COLOR;
		this.context.fillText( '契約純増数', this.PADDING.LEFT, this.PADDING.TOP - this.LABEL_MARGIN );
		this.context.restore();
	},
	setVerticalAxisInfo: function () {
		var isFirst = true;

		//最大値を取得
		for ( var i = 0, lengthi = this.data.subscribership.length; i < lengthi; i++ ) {
			var counts = this.data.subscribership[i].count;

			for( var j = 0, lengthj = counts.length; j < lengthj; j++ ) {
				if( this.data.carrier[j].disabled ) {
					continue;
				}
				if( isFirst || this.maxY < counts[j] ) {
					this.maxY = counts[j];
					isFirst = false;
				}
			}
		}
		//最大値をキリの良い値に丸める
		if ( this.maxY <= 10 ) {
			this.ticksY = this.maxY;
			return;
		}
		var digits = String( this.maxY ).length,
			base = Math.pow( 10, digits - 1 );

		this.ticksY = Math.ceil( this.maxY / base );
		this.maxY = this.ticksY * base;
	},
	drawDottedLine: function ( x1, y1, x2, y2 ) {
		/*
		x1 = 0;
		x2 = 100;
		y1 = 0;
		y2 = 100;
		Math.sqrt( (100 - 0 の2乗) + (100 - 0 の2乗) )
		Math.sqrt( 10000 + 10000 )
		Math.sqrl( 20000 )
		*/
		var length = Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 )),
			rateX = (x2 - x1) / length,
			rateY = (y2 - y1) / length,
			startX = x1,
			startY = y1;

		while( true ) {
			for ( var i = 0, patternLength = this.DOTTED_LINE_PATTERN.length; i < patternLength; i += 2 ) {
				var endX = startX + this.DOTTED_LINE_PATTERN[i] * rateX,
					endY = startY + this.DOTTED_LINE_PATTERN[i] * rateY;

				if( endX > x2 ) {
					return;
				}
				this.context.beginPath();
				this.context.moveTo( startX, startY );
				this.context.lineTo( endX, endY );
				this.context.stroke();

				if ( i < patternLength - 1 ) {
					startX = endX + this.DOTTED_LINE_PATTERN[i + 1] * rateX;
					startY = endY + this.DOTTED_LINE_PATTERN[i + 1] * rateY;
				}
			}
		}
	},
	startToDrawBars: function ( toAnimate ) {
		var barCount = this.data.carrier.length;

		this.eachBarWidth = this.tickSpaceX * ( 1 - this.BAR_END_RATE * 2 - this.BAR_CREVICE_RATE * (barCount - 1) ) / barCount;
		this.axisYHeight = this.height - this.PADDING.TOP - this.PADDING.BOTTOM - this.TICK_MARGIN;

		if( toAnimate ) {
			this.timerlds.push( window.requestAnimationFrame( $.proxy( this.drawBars, this, this.ANIMATION_COUNT - 1 ) ) );
		}else {
			this.drawBars(0);
		}
	},
	drawBars: function ( index ) {
		this.context.save();

		//年ごとにループでデータを取り出す
		for( var i = 0,length = this.data.subscribership.length; i < length; i++ ) {
			// 各キャリアの純契約増数のデータ（配列）
			var counts = this.data.subscribership[i].count;
			//各年の表示領域の左端のX座標
			var baseX = this.PADDING.LEFT + this.tickSpaceX * (i + this.BAR_END_RATE);

			//キャリアごとにループでデータを取り出す
			for( var j = 0, lengthj = counts.length; j < lengthj; j++ ) {
				if( this.data.carrier[j].disabled ) {
					continue;
				}
				var color = this.data.carrier[j].color,
					x = baseX + ( this.eachBarWidth + this.tickSpaceX * this.BAR_CREVICE_RATE ) * j,
					height = this.axisYHeight * counts[j] / this.maxY * ( this.ANIMATION_COUNT - index ) / this.ANIMATION_COUNT;

					this.context.fillStyle = color;
					this.context.fillRect(
						x,
						this.PADDING.TOP + this.TICK_MARGIN + this.axisYHeight - height,
						this.eachBarWidth, height, this.eachBarWidth );
			}
		}
		if( index > 0 ) {
			this.timerlds.push( window.requestAnimationFrame( $.proxy( this.drawBars, this, --index ) ) );
		}
		this.context.restore();
	},
	drawLegend: function () {
		this.context.save();

		var legendCount = this.data.carrier.length,
			totalLength = 0,
			literalLength = [];

		//レジェンドの文字列の幅を取得して保持
		for ( var i = 0, count = this.data.carrier.length; i < count; i++ ) {
			var width = this.context.measureText( this.data.carrier[i].name ).width;
			literalLength.push(width);
			totalLength += width;
		}

		//レジェンドの合計幅を求める
		totalLength += this.LEGEND_SIZE * legendCount;
		totalLength += this.LEGEND_PADDING * legendCount;
		totalLength += this.LEGEND_MARGIN * legendCount;

		//レジェンドの左端のx座標
		var x = (this.width - totalLength) / 2;

		//レジェンドを描画
		for( var i = 0, count = this.data.carrier.length; i < count; i++ ) {
			this.context.globalAlpha = this.data.carrier[i].disabled ? 0.5 : 1;
			this.context.fillStyle = this.data.carrier[i].color;
			this.context.fillRect( x, this.LEGEND_OFFSET, this.LEGEND_SIZE, this.LEGEND_SIZE );

			//レジェンドのクリック判定用にレジェンドの位置情報を保持
			var axis = { x1 : x, y1: this.LEGEND_OFFSET, y2: this.LEGEND_OFFSET + this.LEGEND_SIZE };

			x += this.LEGEND_SIZE + this.LEGEND_PADDING;

			this.context.textBaseline = 'top';
			this.context.fillStyle = this.AXIS_LABEL_COLOR;
			this.context.fillText( this.data.carrier[i].name, x, this.LEGEND_OFFSET );

			x += literalLength[i];
			axis.x2 = x;
			this.legendAxis.push( axis );
			x += this.LEGEND_MARGIN;
		}
		this.context.restore();
	},
	formatNumber: function ( data ) {
		data = String( data ).split('');

		for( var i = data.length - 1 - 3;i >= 0; i -= 3 ) {
			data.splice( i + 1, 0, ',' );
		}
		return data.join('');
	}
};

$(function () {
	CHART.init(BAR_DATA);
});