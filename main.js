// ===== INPUT =====
const keys = {};
window.addEventListener("keydown", e => { keys[e.key] = true; });
window.addEventListener("keyup", e => { keys[e.key] = false; });

// ===== CANVAS =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== SOUNDS =====
const sfxLaser = document.getElementById("sfxLaser");
const sfxExplosion = document.getElementById("sfxExplosion");
const sfxPowerup = document.getElementById("sfxPowerup");
const bgm = document.getElementById("bgm");
if (bgm) {
  bgm.volume = 0.4;
  bgm.play().catch(() => {});
}

// ===== IMAGES (OPTIONAL SPRITES) =====
const images = {
  player: new Image(),
  fighter: new Image(),
  bomber: new Image(),
  hybrid: new Image(),
  boss: new Image(),
  clouds: new Image()
};
// Put your own sprite paths here if you have them:
images.player.src = "sprites/player.png";
images.fighter.src = "sprites/fighter.png";
images.bomber.src = "sprites/bomber.png";
images.hybrid.src = "sprites/hybrid.png";
images.boss.src = "sprites/boss.png";
images.clouds.src = "sprites/clouds.png";

// ===== COLLISION =====
function collide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ===== WEATHER & WORLD =====
let scrollY = 0;
let distance = 0;
let weather = {
  type: "clear", // clear, rain, fog, storm
  timer: 600
};

function updateWeather() {
  weather.timer--;
  if (weather.timer <= 0) {
    const types = ["clear", "rain", "fog", "storm"];
    weather.type = types[Math.floor(Math.random() * types.length)];
    weather.timer = 600 + Math.random() * 600;
  }
}

function getZone() {
  if (distance < 5000) return "forest";
  if (distance < 10000) return "river";
  if (distance < 15000) return "city";
  return "base";
}

function updateWorldProgress() {
  distance += 2;
}

function drawWorld(ctx) {
  scrollY += 2;
  if (scrollY > 720) scrollY = 0;

  const zone = getZone();
  if (zone === "forest") ctx.fillStyle = "#061108";
  if (zone === "river") ctx.fillStyle = "#020b18";
  if (zone === "city") ctx.fillStyle = "#080808";
  if (zone === "base") ctx.fillStyle = "#101010";

  ctx.fillRect(0, scrollY, 480, 720);
  ctx.fillRect(0, scrollY - 720, 480, 720);

  // clouds
  if (images.clouds && images.clouds.complete) {
    ctx.globalAlpha = weather.type === "storm" ? 0.8 : 0.4;
    ctx.drawImage(images.clouds, 0, scrollY, 480, 720);
    ctx.drawImage(images.clouds, 0, scrollY - 720, 480, 720);
    ctx.globalAlpha = 1.0;
  }

  // rain
  if (weather.type === "rain" || weather.type === "storm") {
    ctx.strokeStyle = "rgba(150,150,255,0.6)";
    for (let i = 0; i < 80; i++) {
      const rx = Math.random() * 480;
      const ry = Math.random() * 720;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 2, ry + 8);
      ctx.stroke();
    }
  }

  // fog
  if (weather.type === "fog") {
    ctx.fillStyle = "rgba(200,200,200,0.25)";
    ctx.fillRect(0, 0, 480, 720);
  }

  // lightning flash
  if (weather.type === "storm" && Math.random() < 0.01) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(0, 0, 480, 720);
  }
}

// ===== PLAYER =====
class Player {
  constructor() {
    this.x = 240 - 24;
    this.y = 600;
    this.width = 48;
    this.height = 48;
    this.speed = 5;
    this.cooldown = 0;
    this.lasers = [];
    this.jammerActive = false;
    this.jammerTimer = 0;
    this.health = 5;
    this.maxHealth = 5;
    this.score = 0;
    this.laserDamage = 1;
  }

  update() {
    if (keys["ArrowLeft"]) this.x -= this.speed;
    if (keys["ArrowRight"]) this.x += this.speed;
    if (keys["ArrowUp"]) this.y -= this.speed;
    if (keys["ArrowDown"]) this.y += this.speed;

    // weather effect
    if (weather.type === "storm") {
      this.x += Math.sin(Date.now() / 200) * 0.5;
    }

    this.x = Math.max(0, Math.min(480 - this.width, this.x));
    this.y = Math.max(0, Math.min(720 - this.height, this.y));

    if (keys[" "] && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = 10;
    }
    if (this.cooldown > 0) this.cooldown--;

    this.lasers.forEach(l => l.update());
    this.lasers = this.lasers.filter(l => l.y > -20);

    if (keys["7"] && keys["Control"] && !this.jammerActive && this.jammerTimer <= 0) {
      this.activateJammer();
    }

    if (this.jammerActive) {
      this.jammerTimer--;
      if (this.jammerTimer <= 0) {
        this.jammerActive = false;
        this.jammerTimer = 0;
      }
    }
  }

  shoot() {
    this.lasers.push({
      x: this.x + this.width / 2 - 2,
      y: this.y,
      width: 4,
      height: 10,
      update() { this.y -= 10; }
    });
    if (sfxLaser) {
      sfxLaser.currentTime = 0;
      sfxLaser.play().catch(() => {});
    }
  }

  activateJammer() {
    this.jammerActive = true;
    this.jammerTimer = 60 * 30; // 30 seconds at 60fps
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      alert("GAME OVER\nScore: " + this.score);
      document.location.reload();
    }
  }

  draw(ctx) {
    if (images.player && images.player.complete) {
      ctx.drawImage(images.player, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "lightgray";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    ctx.fillStyle = "cyan";
    this.lasers.forEach(l => ctx.fillRect(l.x, l.y, l.width, l.height));
  }
}

// ===== ENEMIES =====
class Enemy {
  constructor(type) {
    this.type = type;
    this.x = Math.random() * (480 - 48);
    this.y = -60;
    this.width = 48;
    this.height = 48;
    this.speed =
      type === "fighter" ? 3 :
      type === "hybrid" ? 2 : 1;
    this.health =
      type === "bomber" ? 5 :
      type === "hybrid" ? 3 : 1;
    this.cooldown = 60;
    this.lasers = [];
  }

  update(player) {
    this.y += this.speed;

    if (!player.jammerActive) {
      if (this.cooldown <= 0) {
        this.shoot();
        this.cooldown =
          this.type === "fighter" ? 40 :
          this.type === "hybrid" ? 60 : 80;
      }
      this.cooldown--;
    }

    this.lasers.forEach(l => l.update());
    this.lasers = this.lasers.filter(l => l.y < 800);
  }

  shoot() {
    this.lasers.push({
      x: this.x + this.width / 2 - 2,
      y: this.y + this.height,
      width: 4,
      height: 10,
      update() { this.y += 5; }
    });
  }

  draw(ctx) {
    let img = null;
    if (this.type === "fighter") img = images.fighter;
    if (this.type === "bomber") img = images.bomber;
    if (this.type === "hybrid") img = images.hybrid;

    if (img && img.complete) {
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle =
        this.type === "fighter" ? "red" :
        this.type === "hybrid" ? "orange" : "yellow";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    ctx.fillStyle = "white";
    this.lasers.forEach(l => ctx.fillRect(l.x, l.y, l.width, l.height));
  }
}

// ===== POWER-UPS =====
class PowerUp {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.speed = 2;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx) {
    ctx.fillStyle =
      this.type === "fire" ? "orange" :
      this.type === "damage" ? "red" :
      this.type === "shield" ? "cyan" :
      this.type === "speed" ? "green" :
      this.type === "jammer" ? "blue" :
      "yellow";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ===== EXPLOSIONS =====
class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.timer = 20;
  }
  update() { this.timer--; }
  draw(ctx) {
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 30 - this.timer, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== BOSS =====
class Boss {
  constructor() {
    this.x = 120;
    this.y = -200;
    this.width = 240;
    this.height = 160;
    this.health = 200;
    this.cooldown = 30;
    this.lasers = [];
  }

  update(player) {
    if (this.y < 50) this.y += 1;

    if (this.cooldown <= 0 && !player.jammerActive) {
      this.shoot();
      this.cooldown = 20;
    }
    this.cooldown--;

    this.lasers.forEach(l => l.update());
    this.lasers = this.lasers.filter(l => l.y < 800);
  }

  shoot() {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i - 2) * 0.2;
      this.lasers.push({
        x: this.x + this.width / 2,
        y: this.y + this.height,
        width: 4,
        height: 10,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        update() { this.x += this.vx; this.y += this.vy; }
      });
    }
  }

  draw(ctx) {
    if (images.boss && images.boss.complete) {
      ctx.drawImage(images.boss, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // boss health bar
    ctx.fillStyle = "red";
    ctx.fillRect(100, 10, 280, 10);
    ctx.fillStyle = "lime";
    ctx.fillRect(100, 10, 280 * (this.health / 200), 10);

    ctx.fillStyle = "white";
    this.lasers.forEach(l => ctx.fillRect(l.x, l.y, l.width, l.height));
  }
}

// ===== GAME STATE =====
const player = new Player();
let enemies = [];
let powerups = [];
let explosions = [];
let spawnTimer = 0;
let boss = null;
let bossSpawned = false;

// ===== HUD =====
function drawHUD(ctx) {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Health: " + player.health, 10, 30);
  ctx.fillText("Score: " + player.score, 10, 60);

  if (player.jammerActive) {
    ctx.fillStyle = "cyan";
    ctx.fillText("Jammer: " + Math.floor(player.jammerTimer / 60), 10, 90);
  }
}

// ===== MAIN LOOP =====
function gameLoop() {
  ctx.clearRect(0, 0, 480, 720);

  updateWeather();
  updateWorldProgress();
  drawWorld(ctx);

  player.update();
  player.draw(ctx);

  // spawn enemies until boss
  if (!bossSpawned) {
    if (spawnTimer <= 0) {
      const types = ["fighter", "bomber", "hybrid"];
      enemies.push(new Enemy(types[Math.floor(Math.random() * 3)]));
      spawnTimer = 40;
    }
    spawnTimer--;
  }

  // spawn boss after distance
  if (!bossSpawned && distance > 15000) {
    boss = new Boss();
    bossSpawned = true;
  }

  // enemies
  enemies.forEach(e => {
    e.update(player);
    e.draw(ctx);

    // enemy hits player
    e.lasers.forEach(l => {
      if (collide(player, l)) {
        player.takeDamage(1);
        l.y = 999;
      }
    });

    if (collide(player, e)) {
      player.takeDamage(1);
      e.y = 999;
    }

    // player hits enemy
    player.lasers.forEach(l => {
      if (collide(l, e)) {
        e.health -= player.laserDamage;
        l.y = -999;
        if (e.health <= 0) {
          explosions.push(new Explosion(e.x + e.width / 2, e.y + e.height / 2));
          if (sfxExplosion) {
            sfxExplosion.currentTime = 0;
            sfxExplosion.play().catch(() => {});
          }
          player.score += 100;

          // power-up drop
          if (Math.random() < 0.2) {
            const ptypes = ["fire", "damage", "shield", "speed", "jammer"];
            const t = ptypes[Math.floor(Math.random() * ptypes.length)];
            powerups.push(new PowerUp(t, e.x + e.width / 2 - 10, e.y + e.height / 2 - 10));
          }

          e.y = 999;
        }
      }
    });
  });
  enemies = enemies.filter(e => e.y < 800);

  // boss
  if (boss) {
    boss.update(player);
    boss.draw(ctx);

    // boss lasers hit player
    boss.lasers.forEach(l => {
      if (collide(player, l)) {
        player.takeDamage(1);
        l.y = 999;
      }
    });

    // player hits boss
    player.lasers.forEach(l => {
      if (collide(l, boss)) {
        boss.health -= player.laserDamage;
        l.y = -999;
        if (boss.health <= 0) {
          explosions.push(new Explosion(boss.x + boss.width / 2, boss.y + boss.height / 2));
          if (sfxExplosion) {
            sfxExplosion.currentTime = 0;
            sfxExplosion.play().catch(() => {});
          }
          player.score += 5000;
          alert("YOU WIN!\nScore: " + player.score);
          document.location.reload();
        }
      }
    });
  }

  // power-ups
  powerups.forEach(p => {
    p.update();
    p.draw(ctx);

    if (collide(player, p)) {
      if (p.type === "fire") player.cooldown = Math.max(2, player.cooldown - 3);
      if (p.type === "damage") player.laserDamage = 2;
      if (p.type === "shield") player.health = Math.min(player.maxHealth, player.health + 1);
      if (p.type === "speed") player.speed += 0.5;
      if (p.type === "jammer") player.jammerTimer += 60 * 5; // +5 seconds

      if (sfxPowerup) {
        sfxPowerup.currentTime = 0;
        sfxPowerup.play().catch(() => {});
      }

      p.y = 999;
    }
  });
  powerups = powerups.filter(p => p.y < 800);

  // explosions
  explosions.forEach(ex => {
    ex.update();
    ex.draw(ctx);
  });
  explosions = explosions.filter(ex => ex.timer > 0);

  drawHUD(ctx);

  requestAnimationFrame(gameLoop);
}

gameLoop();
