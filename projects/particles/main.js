var ctx = $('canvas')[0].getContext('2d'),
    cW = ctx.canvas.width  = 300,
    cH = ctx.canvas.height = 300;

var posX = 0,
    posY = cH/2,
    vx = 3, 
    vy = -5,
    gravity = 1;

setInterval(function () {
  clear();
  posX += vx;
  posY += vy;
  vy += gravity;

  if (posY > 250) {
    vy *= -0.5;
    vx *= -0.5;
    posY = 250;
  }

  ctx.fillStyle = '#fff';
  ctx.fillRect(posX, posY, 10, 10);
}, 30);


function clear () {
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,cW, cH)
};
