"use client"; import { useEffect, useRef, useState } from "react"; export default function GamePage() {
  const [isGameStarted, setIsGameStarted] = useState(false); const [isGameWon, setIsGameWon] = useState(false); const gameRef = useRef<Phaser.Game | null>(null); useEffect(() => {
    if (!isGameStarted) return;// Supaya aman dipanggil di browser (Next.js SSR fix)
    import("phaser").then((Phaser) => {
      // ==========================================
      // SCENE 1: PLATFORMER (Kumpulin Kado)
      // ==========================================
      class PlatformerScene extends Phaser.Scene {
        private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private wasd!: any;
        private collectedCount = 0;
        private scoreText!: Phaser.GameObjects.Text;
        private jumpCount = 0;
        private isSfxEnabled = true;
        private sfxToggle!: Phaser.GameObjects.Image;
        private bgm!: Phaser.Sound.BaseSound;
        private jumpSfx!: Phaser.Sound.BaseSound;

        constructor() {
          super({ key: "PlatformerScene" });
        }

        preload() {
          // Ganti dengan nama file kamu di folder public
          this.load.image("player", "/player.png");
          this.load.image("collectible", "/collectible.png");
          this.load.image("control_guide", "/control_guide.png");
          this.load.image("sfx_icon", "/icon.png");
          this.load.audio("bgm", "/bgm.mp3");
          this.load.audio("jump", "/jump.mp3");
        }

        create() {
          this.collectedCount = 0;
          const { width, height } = this.sys.game.config;

          // Lebarkan world physics bounds untuk 3 layar (2400 x 600)
          this.physics.world.setBounds(0, 0, 2400, 600);
          this.cameras.main.setBackgroundColor("#87CEEB"); // Biru langit

          // Bikin awan sederhana (disebar ke 3 layar)
          const graphics = this.add.graphics();
          graphics.fillStyle(0xffffff, 1);
          graphics.fillCircle(200, 100, 40); graphics.fillCircle(240, 100, 50); graphics.fillCircle(280, 100, 40);
          graphics.fillCircle(600, 150, 40); graphics.fillCircle(640, 150, 50); graphics.fillCircle(680, 150, 40);
          graphics.fillCircle(1000, 100, 40); graphics.fillCircle(1040, 100, 50); graphics.fillCircle(1080, 100, 40);
          graphics.fillCircle(1400, 150, 40); graphics.fillCircle(1440, 150, 50); graphics.fillCircle(1480, 150, 40);
          graphics.fillCircle(1800, 100, 40); graphics.fillCircle(1840, 100, 50); graphics.fillCircle(1880, 100, 40);

          // UI Teks Skor (setScrollFactor(0) bikin UI ngikut layar)
          this.scoreText = this.add.text(20, 20, "Kado Terkumpul: 0 / 6", {
            fontSize: "24px", color: "#ffffff", stroke: "#000000", strokeThickness: 4,
          }).setScrollFactor(0);
          this.scoreText.setDepth(10); // Biar selalu di atas

          // Bikin Platform
          const platformRects: Phaser.GameObjects.Rectangle[] = [];
          const createPlatform = (x: number, y: number, w: number, h: number, isWhite: boolean = false) => {
            if (isWhite) {
              const rect = this.add.rectangle(x, y, w, h, 0xffffff); // Blok Putih
              this.physics.add.existing(rect, true);
              platformRects.push(rect);
            } else {
              const rect = this.add.rectangle(x, y, w, h, 0x8B4513); // Coklat Tanah
              this.physics.add.existing(rect, true);
              this.add.rectangle(x, y - h / 2 + 4, w, 8, 0x32CD32); // Rumput Hijau
              platformRects.push(rect);
            }
          };

          // Lantai dasar (Panjang 2400)
          createPlatform(1200, Number(height) - 20, 2400, 40);

          // ======== LAYAR 1 (0 - 800) ========
          createPlatform(150, 450, 20, 260); // Tembok vertikal
          createPlatform(80, 450, 60, 20, true);   // Tutorial Blok Putih!
          createPlatform(250, 300, 100, 20);
          createPlatform(150, 200, 100, 20, true); // Tutorial Blok Putih!
          createPlatform(400, 420, 100, 20);
          createPlatform(400, 250, 100, 20);
          createPlatform(550, 420, 100, 20);
          createPlatform(550, 200, 100, 20);
          createPlatform(700, 420, 100, 20);
          createPlatform(700, 150, 100, 20);

          // ======== LAYAR 2 (800 - 1600) ========
          createPlatform(1520, 100, 50, 20); // Platform mustahil 

          // ======== LAYAR 3 (1600 - 2400) ========
          // Tangga kiri
          createPlatform(1750, 500, 80, 20);
          createPlatform(1800, 430, 80, 20);
          createPlatform(1850, 360, 80, 20);
          createPlatform(1900, 290, 80, 20);
          createPlatform(1950, 220, 80, 20);
          // Tembok vertikal penutup goa (turun ke lantai)
          createPlatform(1950, 400, 20, 340);
          // Puncak
          createPlatform(2050, 150, 80, 20);
          // Tangga kanan
          createPlatform(2120, 220, 80, 20);
          createPlatform(2180, 290, 80, 20);
          createPlatform(2320, 350, 80, 20); // Tempat kado diletakkan
          createPlatform(2250, 450, 80, 20); // Ekstra platform
          // Platform di dalam goa
          createPlatform(2050, 520, 60, 20);

          // Player spawn di Layar 2
          this.add.image(900, 420, "control_guide"); // Muncul di atas player
          this.player = this.physics.add.sprite(900, 500, "player");
          this.player.setCollideWorldBounds(true);
          this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.6);
          this.player.body.setOffset(this.player.width * 0.25, this.player.height * 0.4);
          this.physics.add.collider(this.player, platformRects);

          // ======== THE CURSOR TROLL ========
          const fakeCursor = this.add.rectangle(0, 0, 24, 24, 0xff0000, 0); // alpha 0 = invisible
          this.physics.add.existing(fakeCursor, true);
          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            fakeCursor.setPosition(pointer.worldX, pointer.worldY);
            (fakeCursor.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          });
          this.physics.add.collider(this.player, fakeCursor);

          // Collectibles (Kado) manual placement
          const kadoGroup = this.physics.add.group();
          const kadoCoords = [
            { x: 80, y: 500 },     // Sc1: Bawah
            { x: 750, y: 100 },    // Sc1: Atas
            { x: 1200, y: 450 },   // Sc2: Tengah
            { x: 1520, y: 50 },    // Sc2: Atas banget (Troll spot)
            { x: 2050, y: 480 },   // Sc3: Dalam goa (tertutup tembok)
            { x: 2320, y: 310 }    // Sc3: Kanan
          ];

          kadoCoords.forEach(pos => {
            const kado = kadoGroup.create(pos.x, pos.y, "collectible");
            kado.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            kado.setCollideWorldBounds(true);
            kado.body.setSize(kado.width * 0.4, kado.height * 0.4);
            kado.body.setOffset(kado.width * 0.3, kado.height * 0.4);
          });
          this.physics.add.collider(kadoGroup, platformRects);
          this.physics.add.collider(kadoGroup, fakeCursor); // Mouse bisa nyundul kado!

          // Deteksi ambil kado
          this.physics.add.overlap(this.player, kadoGroup, (player, kado: any) => {
            kado.disableBody(true, true);
            this.collectedCount++;
            this.scoreText.setText(`Kado Terkumpul: ${this.collectedCount} / 6`);

            if (this.collectedCount === 6) {
              this.scene.start("PuzzleScene");
            }
          });

          this.cursors = this.input.keyboard!.createCursorKeys();
          this.wasd = this.input.keyboard!.addKeys('W,A,S,D');

          // ======== AUDIO SETUP ========
          this.bgm = this.sound.add("bgm", { loop: true, volume: 0.3 });
          this.jumpSfx = this.sound.add("jump", { volume: 0.5 });
          this.jumpCount = 0;
          this.isSfxEnabled = true;

          let isBgmEnabled = true;
          this.bgm.play();
          const bgmToggle = this.add.text(750, 20, "🔊", { fontSize: "32px" })
            .setScrollFactor(0).setDepth(10).setInteractive({ useHandCursor: true });

          bgmToggle.on('pointerdown', () => {
            isBgmEnabled = !isBgmEnabled;
            bgmToggle.setText(isBgmEnabled ? "🔊" : "🔇");
            if (isBgmEnabled) {
              if (!this.bgm.isPlaying) this.bgm.play();
            } else {
              this.bgm.stop();
            }
          });

          this.sfxToggle = this.add.image(700, 35, "sfx_icon")
            .setScrollFactor(0).setDepth(10).setInteractive({ useHandCursor: true })
            .setDisplaySize(48, 48);
          this.sfxToggle.setVisible(false); // Tersembunyi sampai 15 kali lompat
          this.sfxToggle.on('pointerdown', () => {
            this.isSfxEnabled = !this.isSfxEnabled;
            this.sfxToggle.setAlpha(this.isSfxEnabled ? 1 : 0.4);
          });

          // Mulai kamera di Layar 2
          this.cameras.main.scrollX = 800;
        }

        update() {
          const speed = 250;
          if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.setVelocityX(-speed);
          } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.setVelocityX(speed);
          } else {
            this.player.setVelocityX(0);
          }

          if ((this.cursors.up.isDown || this.wasd.W.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-450);

            // Mainkan SFX jika aktif
            if (this.isSfxEnabled) {
              this.jumpSfx.play();
            }

            // Logika unlock toggle SFX setelah 15x lompat
            this.jumpCount++;
            if (this.jumpCount === 15) {
              this.sfxToggle.setVisible(true);
            }
          }

          // Logic Static Screen Snapping 
          // Jika player melewati batas layar, kamera akan otomatis geser (snap) 800 pixel
          const currentScreen = Math.floor(this.player.x / 800);
          const targetScroll = currentScreen * 800;
          if (this.cameras.main.scrollX !== targetScroll) {
            this.cameras.main.scrollX = targetScroll;
          }
        }
      }

      // ==========================================
      // SCENE 2: PUZZLE (Susun Kartu)
      // ==========================================
      class PuzzleScene extends Phaser.Scene {
        private piecesPlaced = 0;

        constructor() {
          super({ key: "PuzzleScene" });
        }

        preload() {
          // PENTING: Sesuaikan frameWidth dan frameHeight dengan ukuran gambarmu dibagi jumlah kolom/baris!
          // Misalnya gambar utuhmu 300x200 pixel, mau dipotong 3x2, berarti 300/3 = 100, 200/2 = 100.
          this.load.spritesheet("message", "/message.png", {
            frameWidth: 100,
            frameHeight: 100,
          });
        }

        create() {
          this.cameras.main.setBackgroundColor("#2d2d2d");

          this.add.text(400, 50, "Susun Kepingan Kartunya!", {
            fontSize: "28px",
            color: "#ffffff"
          }).setOrigin(0.5);

          // Posisi target kotak (Bingkai puzzle di tengah layar)
          const startX = 400 - 100; // Tengah layar dikurang lebar frame
          const startY = 300 - 50;

          // Gambar bingkai grid di tempat puzzle harus disusun
          const gridGraphics = this.add.graphics();
          gridGraphics.lineStyle(2, 0x555555);

          const pieces: Phaser.GameObjects.Sprite[] = [];

          let frameIndex = 0;
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
              const targetX = startX + col * 100; // 100 adalah frameWidth
              const targetY = startY + row * 100; // 100 adalah frameHeight

              // Bikin area target (Drop Zone transparan)
              const zone = this.add.zone(targetX, targetY, 100, 100).setRectangleDropZone(100, 100);
              (zone as any).expectedFrame = frameIndex;

              // Gambar kotak kosong sebagai petunjuk di posisi target
              gridGraphics.strokeRect(targetX - 50, targetY - 50, 100, 100);

              // Bikin kepingan puzzle di posisi acak (Jangan tumpang tindih dengan grid di tengah)
              // Kiri: 50-200, Kanan: 600-750
              const isLeft = Math.random() > 0.5;
              const randomX = isLeft ? Phaser.Math.Between(50, 200) : Phaser.Math.Between(600, 750);
              const randomY = Phaser.Math.Between(100, 500);

              const piece = this.add.sprite(randomX, randomY, "message", frameIndex);
              piece.setInteractive({ draggable: true });
              (piece as any).frameID = frameIndex; // Simpan ID kepingan

              pieces.push(piece);
              frameIndex++;
            }
          }

          // Logika Drag and Drop
          this.input.on("drag", (pointer: any, gameObject: any, dragX: number, dragY: number) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
            this.children.bringToTop(gameObject);
          });

          this.input.on("drop", (pointer: any, gameObject: any, dropZone: any) => {
            // Cek apakah kepingan (frameID) cocok dengan slotnya (expectedFrame)
            if (gameObject.frameID === dropZone.expectedFrame) {
              gameObject.x = dropZone.x;
              gameObject.y = dropZone.y;
              gameObject.input.enabled = false; // Kunci supaya gak bisa ditarik lagi
              this.piecesPlaced++;

              if (this.piecesPlaced === 6) {
                // Menang! Kirim event ke React
                const customEvent = new CustomEvent('game-won');
                window.dispatchEvent(customEvent);
              }
            } else {
              // Kalau salah, balik ke posisi sebelum ditarik
              gameObject.x = gameObject.input.dragStartX;
              gameObject.y = gameObject.input.dragStartY;
            }
          });
        }
      }

      // Konfigurasi Utama Phaser
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: "game-container", // Masuk ke div dengan ID ini
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 600 },
            debug: false,
          },
        },
        scene: [PlatformerScene, PuzzleScene],
      };

      gameRef.current = new Phaser.Game(config);
    });

    // Event listener untuk menangkap kemenangan dari Scene 2
    const handleWin = () => setIsGameWon(true);
    window.addEventListener('game-won', handleWin);

    return () => {
      window.removeEventListener('game-won', handleWin);
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };
  }, [isGameStarted]);

  return (
    <>
      <style>{`
        @keyframes slideDownMessage {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(0, 550px) scale(1.5);
          }
        }
        .animate-slideDownMessage {
          animation: slideDownMessage 2s ease-in-out forwards;
          animation-delay: 0.5s;
        }
        @keyframes fadeInBirthday {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInBirthday {
          animation: fadeInBirthday 1.5s ease-out forwards;
          animation-delay: 2.5s;
          opacity: 0;
        }
      `}</style>
      
      <div className={`flex flex-col items-center w-full min-h-screen bg-pink-900 overflow-x-hidden ${!isGameWon ? 'h-screen justify-center' : 'pt-10 pb-32'}`}>
        
        {/* UI Overlay sebelum mulai */}
        {!isGameStarted && (
          <div className="absolute z-10 flex flex-col items-center p-8 bg-black/60 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-4">Misi Kejutan!</h1>
            <p className="text-slate-200 mb-8 max-w-md text-center">
              Ada pesan rahasia yang pecah berkeping-keping. Kumpulkan semua kadonya dan satukan pesannya!
            </p>
            <button
              onClick={() => setIsGameStarted(true)}
              className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95"
            >
              Mulai Main
            </button>
          </div>
        )}

        {/* Container untuk Canvas Phaser */}
        <div className="relative w-[800px] h-[600px]">
          <div 
            id="game-container" 
            className={`rounded-lg overflow-hidden shadow-2xl transition-all duration-1000 ${isGameWon ? 'opacity-30 pointer-events-none grayscale' : ''}`}
          />
          
          {/* Animated Message Extraction */}
          {isGameWon && (
            <img 
              src="/message.png" 
              alt="Secret Message"
              className="absolute left-[250px] top-[200px] w-[300px] h-[200px] z-20 shadow-xl rounded-md animate-slideDownMessage"
            />
          )}
        </div>

        {/* Birthday Messages Section */}
        {isGameWon && (
          <div className="flex flex-col items-center mt-[450px] text-center animate-fadeInBirthday">
            <h2 className="text-6xl font-black mb-6 drop-shadow-lg">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-white">
                Saengil Chukha, Ae-ra!
              </span> 🎉
            </h2>
            <p className="text-2xl text-pink-100 font-medium mb-8 max-w-2xl leading-relaxed">
              Selamat ulang tahun, Song Ae-ra! 🎂✨<br/>
              Semoga panjang umur, sehat selalu, terus bahagia, dan segala impianmu dapat terwujud.<br/>
              Tetap semangat dan jadikan tahun ini penuh dengan kejutan manis! 💖
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-pink-900 font-bold rounded-full hover:bg-pink-100 transition-transform hover:scale-105"
            >
              Main Lagi
            </button>
          </div>
        )}
      </div>
    </>
  );
}