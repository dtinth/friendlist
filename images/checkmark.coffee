
createCheckPath = (size) ->
	
	pad = 0
	thick = 5

	x1 = pad
	x3 = size - pad
	x2 = x1 + (x3 - x1) * 0.3
	yb = size

	ctx.beginPath()
	ctx.moveTo x1, yb - (x2 - x1)
	ctx.lineTo x2, yb
	ctx.lineTo x3, yb - (x3 - x2)

	ctx.lineTo x3, yb - (x3 - x2) - thick
	ctx.lineTo x2, yb - thick
	ctx.lineTo x1, yb - (x2 - x1) - thick

check = ->
	
	createCheckPath arguments...
	ctx.fill()

image = (name, fill) ->

	newFile 24, 14
	fill()
	ctx.translate 10, 2
	check 12
	saveFile name

image 'check', ->
	ctx.fillStyle = 'rgba(255,255,255,0.1)'

image 'checked', ->
	grad = ctx.createLinearGradient 0, 0, 0, h
	grad.addColorStop 0, '#9af'
	grad.addColorStop 1, '#aef'
	ctx.fillStyle = grad

