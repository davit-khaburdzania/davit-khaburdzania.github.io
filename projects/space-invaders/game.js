function Game () {
  var ctx = $('canvas')[0].getContext('2d'),
      cW = window.innerWidth,
      cH = window.innerHeight;
  
  self = gameSelf = this;
  this.cannon = null;
  this.alians = null;

  ctx.canvas.width = cW;
  ctx.canvas.height = cH;

  function Cannon () {
    var self = cannonSelf = this;

    this.w = 100;
    this.h = 30;
    this.x = (cW / 2) - (this.w / 2);
    this.y = cH - (this.h * 2);

    this.c = 'red';
    this.moveWidth = 3;
    this.moveDirection = null;

    this.lasers = [];

    function Laser () {
      var self = this;
      this.x = cannonSelf.x + (cannonSelf.w / 2);
      this.y = cannonSelf.y - (cannonSelf.h / 2 );
      this.w = 5;
      this.h = 20
      this.moveLength = 3;

      this.detectCollosion = function (laserIndex) {
        var alians = gameSelf.alians.alians, 
            aw = gameSelf.alians.alianW
            a = null, index = null;

        for(var i=0; i<alians.length; i++) {
          a = alians[i];
          if (a && self.y <= a.y && (self.x + self.w) >= a.x && self.x <= (a.x + aw)) {
            index = cannonSelf.lasers.indexOf(self);
            cannonSelf.lasers.splice(index, 1);
            alians[i] = null;
            return;
          }
        }
      };

      this.render = function () {
        ctx.fillStyle = 'black';
        ctx.fillRect(self.x, self.y, self.w, self.h);
        self.detectCollosion();
        self.y -= self.moveLength;
      };
    };

    this.move = function () {
      if (self.moveDirection === 'left') {
        self.x -= self.moveWidth;  
      } else if (self.moveDirection === 'right') {
        self.x += self.moveWidth;  
      }
    };

    this.fire = function () {
      var laser = new Laser();
      self.lasers.push(laser);
    };

    this.renderLasers = function () {
      for(var i=0; i<self.lasers.length; i++) {
        self.lasers[i].render();
      }
    };

    this.detectCollosion = function () {
      if (self.x < 0) {
        self.x = 0;
      }
      if (self.x + self.w > cW) {
        self.x = cW - self.w;
      }
    };

    this.render = function () {
      self.move();
      self.detectCollosion();
      ctx.fillStyle = this.c;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      self.renderLasers();
    };
  };

  function Alians () {
    var self = alianSelf = this;
        alian = null, x = null, y = null;

    this.alians = [];
    
    this.totalCount = 30;
    this.row_count = 5;
    this.spaceBetween = 30;
    this.alianColor = 'green';

    this.alianW = 60;
    this.alianH = 15;

    this.lastAliansRowY = y = (this.row_count-1) * this.spaceBetween + this.row_count * this.alianH;
    this.alianStartX = (cW - (this.row_count * this.alianW + this.spaceBetween * (this.row_count - 1))) / 2;
    this.alianStartX = Math.round(this.alianStartX);

    this.get = function () {
      return self.alians;
    };

    function Alian (x, y) {
      var self = this;
      this.x = x;
      this.y = y;

      this.detectCollosion = function () {
        if (self.y + alianSelf.alianH >= gameSelf.cannon.y) {
          gameSelf.gameOver();
        }
      };

      this.render = function () {
        ctx.fillStyle = alianSelf.alianColor;
        ctx.fillRect(self.x, self.y, alianSelf.alianW, alianSelf.alianH);
      };
    };

    //initialize alians
    for(var i=0; i<this.totalCount; i++) {
      if (i % self.row_count === 0) {
          y = self.lastAliansRowY - ((i / self.row_count) * self.spaceBetween + self.alianH);
        }
      x = self.alianStartX + (i % self.row_count) * (self.alianW + self.spaceBetween);
      alian = new Alian(x, y);
      self.alians.push(alian);
    }

    this.render = function () {

      for(var i=0; i<self.alians.length; i++) {
        if (i % self.row_count === 0) {
          y = self.lastAliansRowY - ((i / self.row_count) * self.spaceBetween + self.alianH);
        }

        if (self.alians[i]) {        
          self.alians[i].y = y;
          self.alians[i].detectCollosion();
          self.alians[i].render();
        }
      }
    };
  };

  self.cannon = new Cannon();
  self.alians = new Alians();

  this.clear = function () {
    ctx.clearRect(0, 0, cW, cH);
  };

  this.gameOver = function () {
    self.stop = true;
    self.clear();
    console.log('game is over')
  };

  this.isWinner = function () {
    var alians = self.alians.get();

    for(var i=0; i<alians.length; i++) {
      if (alians[i]) return;
    }

    self.clear();
    self.stop = true;
    console.log('uhuum you won');
  } 
  this.render = function () {
    self.clear();
    self.isWinner();

    self.cannon.render();
    self.alians.render();
    self.alians.lastAliansRowY += 0.8;
    
    if (!self.stop) requestAnimationFrame(self.render);
  };
};

var game = new Game();
requestAnimationFrame(game.render);

$(document).on('keydown', function (e) {
  if (e.which === 65) {
    game.cannon.moveDirection = 'left';
  } else if (e.which === 68) {
    game.cannon.moveDirection = 'right';
  } else if (e.which === 32) {
    game.cannon.fire();
  }
});

$(document).on('keyup', function (e) {
  if (e.which === 65) {
    game.cannon.moveDirection = null;
  } else if (e.which === 68) {
    game.cannon.moveDirection = null;
  }
});
