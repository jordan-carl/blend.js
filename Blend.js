Blend = {map : {}, fx : {}};
// todo hold more info in each cell and pass it to the effect functions ?
// todo specify only 1 dim and compute the 2nd as data.length / dim
Blend.map.Grid2D = function(w, h, data) {
	if (w*h != data.length)
		throw "given dimensions doesn't match member count"

	Iterator = function(tree) {
		return {
			grid : grid,
			current : -1,

			hasNext : function() {
				return this.current < this.grid.data.length-1;
			},
			next : function() {
				this.current++;
				return {
					x : this.current%this.grid.width,
					y : Math.floor(this.current/this.grid.width),
					data : this.grid.data[this.current],
					i : this.current
				};
			},
			reset : function() {
				this.current = 0;
			}
		}
	}

	var grid = {
		data : data,
		width : w,
		height : h,
		projectedWidth : 1,
		projectedHeight : 1,
		addRow : function(row, i) {
			this.checkRowLength(row);
			i = ('undefined' == typeof i) ? this.height : Math.max(0, Math.min(i, this.height));
			Array.prototype.splice.apply(this.data, [i*this.width, 0].concat(row));
			this.height++;
			return this;
		},
		removeRow : function(i) {
			var row = Array.prototype.splice.apply(this.data, [i*this.width, this.width]);
			this.height--;
			return row;
		},

		addCol : function(col, i) {
			this.checkColLength(col);
			i = ('undefined' == typeof i) ? this.width : Math.max(0, Math.min(i, this.width));
			for (var j=this.height-1; j>=0; j--)
				this.data.splice(j*this.width+i, 0, col.pop());
			this.width++;
			return this;
		},
		removeCol : function(i) {
			col = [];
			for (var j=this.height-1; j>=0; j--)
				col.unshift(this.data.splice(j*this.width+i, 1).pop());
			this.width--;
			return col;
		},

		checkRowLength : function(row) {
			if (row.length != this.width)
				throw "row length doesn't match column number";
		},
		checkColLength : function(col) {
			if (col.length != this.height)
				throw "column length doesn't match row number";
		},

		// get : function(i, j) {
		// 	return this.data[i*this.width+j];
		// },

		// getAreaDims : function(surfaceWidth, surfaceHeight) {
		// 	w = surfaceWidth / this.width;
		// 	h = surfaceHeight / this.height;
		// 	return [w, h];
		// },

		project : function(width, height) {
			this.projectedWidth = width;
			this.projectedHeight = height;
			this.areaWidth = this.projectedWidth / this.width;
			this.areaHeight = this.projectedHeight /this.height;
			this.wFloat = Math.floor(this.areaWidth) != this.areaWidth;
			this.hFloat = Math.floor(this.areaHeight) != this.areaHeight;
		},

		nextArea : function() {
			node = this.iterator.hasNext() ? this.iterator.next() : false;
			// console.log(node);
				// var dims = this.map.getAreaDims(this.img.width, this.img.height),
				// 	w = dims.shift(),
				// 	h = dims.shift(),
				// 	hFloat = Math.floor(h) != h,
				// 	wFloat = Math.floor(w) != w;
				// w = Math.floor(w);
				// h = Math.floor(h);
				// for (var i=0; i<this.map.height; i++) {
				// 	for (var j=0; j<this.map.width; j++) {
				// 		var x = j*w,
				// 			y = i*h,
				// 			amount = this.map.get(i, j);
				// 		if (amount) {
				// 			var wInc = (wFloat && 1 == this.map.width-j) ? 1 : 0,
				// 			 	hInc = (hFloat && 1 == this.map.height-i) ? 1 : 0;
				// 			_fx.call(this, x, y, w+wInc, h+hInc, amount);
				// 		}
				// 	}
				// }
			var wInc = (this.wFloat && node.i%this.width == this.width-1) ? 1 : 0,
				hInc = (this.hFloat && Math.floor(node.i/this.height) == this.height-1) ? 1 : 0;
			area = {
				x : Math.floor(this.areaWidth * node.x),
				y : Math.floor(this.areaHeight * node.y),
				w : Math.floor(this.projectedWidth / this.width)+wInc,
				h : Math.floor(this.projectedHeight /this.height)+hInc,
				data : data
			};
			return area;
		},

		toString : function() {
			repr = [];
			for (var i=0; i<this.height; i++)
				repr.push(this.data.slice(i*this.width, (i+1)*this.width).join(' '));
			return '[' + repr.join('\n ') + ']';
		}
	}
	grid.iterator = Iterator(grid);
	return grid;
}

/**
 * Binary tree representing a plane split horizontally and vertically.
 * A node always 0 or 2 children.
 * Plane rectangles are represented by the leaves.
 * Internal data are represented by a list of array.
 */
Blend.map.Tree2D = function(data) {
	var treeDim = 2;

	Iterator = function(tree) {
		return {
			tree : tree,
			current : -1,

			hasNext : function() {
				return this.current < this.tree.leaves.length-1;
			},
			/**
			 * Get the next leaf by iterating over the last data rows.
			 * If an element is null (i.e. the leaf lies higher in the tree), then
			 * it goes up in the tree until it finds the ancestor node of the null leaf.
			 * As every node has exactly 2 leaves (but the leaves themselves), when going up 
			 * in the tree, we know some consecutive leaves (i.e. right siblings) can be skipped
			 * as it would lead to the same ancestor.
			 */
			next : function() {
				this.current++;
				// console.log(this.current);
				var i = this.tree.data.length-1;
				var leaf = tree.leaves[this.current];
				if (typeof leaf == 'undefined') {
					var j = this.current;
					for (i=tree.data.length-2; i>=0 && !leaf; --i) {
						j = Math.floor(j/2);
						leaf = tree.data[i][j];
					}
					// some nodes can be skipped as any node has 0 or 2 children
					this.current += (tree.data.length-i-2)*2-1;
					// console.log('up', tree.data.length-i-2, 'right', (tree.data.length-i-2)*2-1, this.current);
					return {x : this.current-1, y : i+1, data : leaf};
				}
				else
					return {x : this.current, y : i, data : leaf};
			},
			reset : function() {
				this.current = 0;
			}
		}
	}

	var tree = {
		dim : treeDim,
		data : data,
		leaves : data[data.length-1],
		projectedWidth : 1,
		projectedHeight : 1,

		project : function(width, height) {
			this.projectedWidth = width;
			this.projectedHeight = height;
		},

		nextArea : function() {
			node = this.iterator.hasNext() ? this.iterator.next() : false;
			var hSplit = Math.ceil(node.y/2), vSplit = Math.floor(node.y/2);
			// console.log(node, hSplit, vSplit);
			area = {
				x : (this.projectedWidth*(1-1/Math.pow(2, hSplit-(1-node.x%2)))),
				y : (this.projectedHeight*(1-1/Math.pow(2, vSplit))),
				w : (this.projectedWidth/Math.pow(2, hSplit)),
				h : (this.projectedHeight/Math.pow(2, vSplit)),
				data : node.data
			};
			return area;
		}
	}
	tree.iterator = Iterator(tree);
	return tree;
}

Blend.fx.desaturate = function(ctx, amount) {
	var pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	for (var i=0; i<pixels.data.length; i+=4) {
		var avg = (pixels.data[i] + pixels.data[i+1] + pixels.data[i+2]) * 1/3;
		pixels.data[i] += (avg - pixels.data[i]) * amount;
		pixels.data[i+1] += (avg - pixels.data[i+1]) * amount;
		pixels.data[i+2] += (avg - pixels.data[i+2]) * amount;
	}
	ctx.putImageData(pixels, 0, 0);
}
Blend.fx.invert = function(ctx, amount) {
	var pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	for (var i=0; i<pixels.data.length; i+=4) {
		pixels.data[i] = 255 - pixels.data[i];
		pixels.data[i+1] = 255 - pixels.data[i+1];
		pixels.data[i+2] = 255 - pixels.data[i+2];
	}
	ctx.putImageData(pixels, 0, 0);
}
Blend.fx.alpha = function(ctx, amount) {
	var pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	for (var i=0; i<pixels.data.length; i+=4)
		pixels.data[i+3] = (1-amount) * 255;
	ctx.putImageData(pixels, 0, 0);
}
Blend.fx.border = function(ctx, amount) {
	var w = ctx.canvas.width,
		h = ctx.canvas.height,
		thickness = 5;
	ctx.strokeStyle = '#FF2356';
	for (var i=0; i<thickness; i++)
		ctx.strokeRect(i, i, w-2*i, h-2*i);
}
Blend.fx.circleMask = function(ctx, amount) {
	var w = ctx.canvas.width,
		h = ctx.canvas.height;
	ctx.globalCompositeOperation = 'destination-in';
	ctx.fillStyle = 'rgba(255, 255, 255, 1)';
	ctx.beginPath();
	ctx.arc(w/2, h/2, Math.min(w, h)/2, 0, Math.PI*2, true);
	ctx.fill();
	ctx.globalCompositeOperation = 'destination-over';
	ctx.fillRect(0, 0, w, h);
}

Blend.create = function(img, map) {
	canvas = document.createElement('canvas');
	canvas.height = img.height;
	canvas.width = img.width;
	context = canvas.getContext('2d');
	context.drawImage(img, 0, 0);
	map.project(img.width, img.height);

	return {
		img : img,
		map : map,
		canvas : canvas,
		context : context,

		fx : function(effect) {
			function _fx(x, y, w, h, amount) {
				// var pixels = this.context.getImageData(x, y, Math.floor(w), Math.floor(h));
				// effect.call(this, pixels, amount, this.context);
				// this.context.putImageData(pixels, x, y);
				// console.log(x, y, w, h, amount);
				var tmpCanvas = document.createElement('canvas');
				tmpCanvas.width = w;
				tmpCanvas.height = h;
				var tmpContext = tmpCanvas.getContext('2d');
				tmpContext.drawImage(this.canvas, x, y, w, h, 0, 0, w, h);

				// var result = effect.call(this, x, y, w, h, amount, this.context);
				// if ('object' == typeof result && result.width && result.height && result.data)
				// 	this.context.putImageData(result, x, y);
				effect.call(this, tmpContext, amount);
				// this.context.drawImage(tmpCanvas, x, y);
				var tmpImageData = tmpContext.getImageData(0, 0, w, h);
				this.context.putImageData(tmpImageData, x, y);
			}

			var dims = this.map.getAreaDims(this.img.width, this.img.height),
				w = dims.shift(),
				h = dims.shift(),
				hFloat = Math.floor(h) != h,
				wFloat = Math.floor(w) != w;
			w = Math.floor(w);
			h = Math.floor(h);
			for (var i=0; i<this.map.height; i++) {
				for (var j=0; j<this.map.width; j++) {
					var x = j*w,
						y = i*h,
						amount = this.map.get(i, j);
					if (amount) {
						var wInc = (wFloat && 1 == this.map.width-j) ? 1 : 0,
						 	hInc = (hFloat && 1 == this.map.height-i) ? 1 : 0;
						_fx.call(this, x, y, w+wInc, h+hInc, amount);
					}
				}
			}
			// handle the last row of the pixels in case of non-round division
			// if (Math.floor(h) != h)
			// 	for (var j=0; j<this.map.width; j++) {
			// 		var x = j*w; y=this.img.height-1, amount=this.map.get(this.map.height-1, j);
			// 		if (amount)
			// 			_fx.call(this, x, y, w, 1, amount);
			// 	}
			// // handle the last column of the pixels in case of non-round division
			// if (Math.floor(w) != w)
			// 	for (var i=0; i<this.map.height; i++) {
			// 		var x = this.img.width-1; y=i*h, amount=this.map.get(i, this.map.width-1);
			// 		if (amount)
			// 			_fx.call(this, x, y, 1, h, amount);
			// 	}
			return this;
		},
		update : function() {
			this.img.src = this.canvas.toDataURL();
			return this;
		}
	};
}
