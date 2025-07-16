import Phaser from 'phaser';
import { Fruit, FruitType, getNextFruitType, FruitOrder } from '../objects/Fruit';
import i18next from 'i18next';

export class MainScene extends Phaser.Scene {
  score: number = 0;
  scoreText!: Phaser.GameObjects.Text;
  nextFruitIcon!: Phaser.GameObjects.Image;
  fruits!: Phaser.GameObjects.Group;
  currentFruitType: FruitType = 'cherry';
  gameOver: boolean = false;
  gameOverText: Phaser.GameObjects.Text | null = null;
  restartButton: Phaser.GameObjects.Text | null = null;
  platform!: Phaser.Physics.Matter.Image;
  leftWall!: Phaser.Physics.Matter.Image;
  rightWall!: Phaser.Physics.Matter.Image;
  bottomWall!: Phaser.Physics.Matter.Image;
  abilityExplodeCount: number = 3;
  abilityGrandmaCount: number = 3;
  abilityExplodeIcon!: Phaser.GameObjects.Container;
  abilityGrandmaIcon!: Phaser.GameObjects.Container;
  abilityExplodeText!: Phaser.GameObjects.Text;
  abilityGrandmaText!: Phaser.GameObjects.Text;
  abilityMode: 'none' | 'explode' | 'grandma' = 'none';
  abilityExplodeGlow!: Phaser.GameObjects.Image;
  abilityGrandmaGlow!: Phaser.GameObjects.Image;
  leadersModal: Phaser.GameObjects.GameObject | null = null;
  menuButton!: Phaser.GameObjects.Image;
  leftPanel!: Phaser.GameObjects.Container;
  rightPanel!: Phaser.GameObjects.Container;
  menuContainer: Phaser.GameObjects.Rectangle | null = null; // Добавляем поле для хранения меню
  menuOpen: boolean = false;
  menuButtons: Phaser.GameObjects.Text[] = [];
  _globalPointerDownHandler: (pointer: Phaser.Input.Pointer) => void = () => {};
  inputBlocked: boolean = false;
  placeText: Phaser.GameObjects.Text | null = null;
  topPanel!: Phaser.GameObjects.Container; // Добавляем поле для хранения верхней панели

  constructor() {
    super('MainScene');
  }

  preload() {
    // --- Загрузка SVG-фонов ---
    this.load.svg('bg_1', 'assets/backgrounds/bg_1.svg', { width: 800, height: 1200 });
    this.load.svg('bg_2', 'assets/backgrounds/bg_2.svg', { width: 800, height: 1200 });
    this.load.svg('bg_3', 'assets/backgrounds/bg_3.svg', { width: 800, height: 1200 });
    // Загрузка SVG-ассетов фруктов
    this.load.svg('fruit_cherry', 'assets/fruit_cherry.svg', { width: 64, height: 64 });
    this.load.svg('fruit_strawberry', 'assets/fruit_strawberry.svg', { width: 72, height: 72 });
    this.load.svg('fruit_orange', 'assets/fruit_orange.svg', { width: 80, height: 80 });
    this.load.svg('fruit_lemon', 'assets/fruit_lemon.svg', { width: 88, height: 88 });
    this.load.svg('fruit_kiwi', 'assets/fruit_kiwi.svg', { width: 96, height: 96 });
    this.load.svg('fruit_peach', 'assets/fruit_peach.svg', { width: 104, height: 104 });
    this.load.svg('fruit_plum', 'assets/fruit_plum.svg', { width: 112, height: 112 });
    this.load.svg('fruit_apple', 'assets/fruit_apple.svg', { width: 120, height: 120 });
    this.load.svg('fruit_pineapple', 'assets/fruit_pineapple.svg', { width: 128, height: 128 });
    this.load.svg('fruit_watermelon', 'assets/fruit_watermelon.svg', { width: 136, height: 136 });
    // 1x1 белый пиксель для Matter.Image-стен
    if (!this.textures.exists('white-pixel')) {
      const rt = this.textures.createCanvas('white-pixel', 1, 1);
      if (rt) {
        rt.context.fillStyle = '#fff';
        rt.context.fillRect(0, 0, 1, 1);
        rt.refresh();
      }
    }

    // Fallback: если ассет не найден, создаём цветные круги
    this.load.on('loaderror', (file: any) => {
      const type = file.key.replace('fruit_', '') as FruitType;
      const idx = FruitOrder.indexOf(type);
      if (idx !== -1) {
        const size = 32 + idx * 16;
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xff0000 - idx * 0x330000 + idx * 0x003300, 1);
        g.fillCircle(size / 2, size / 2, size / 2);
        g.generateTexture(file.key, size, size);
        g.destroy();
      }
    });
    // SVG-иконки способностей (можно заменить на свои SVG)
    this.load.svg('icon_explode', 'assets/icon_explode.svg', { width: 40, height: 40 }); // отдельный SVG для взрыва
    this.load.svg('icon_grandma', 'assets/fruit_cherry.svg', { width: 40, height: 40 }); // временно вишня
    this.load.svg('icon_menu', 'assets/icon_menu.svg', { width: 40, height: 40 });
  }

  create() {
    this.inputBlocked = false;
    this.input.off('pointerup', this._globalPointerDownHandler, this);
    this._globalPointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.inputBlocked) return;
      if (this.menuOpen) return;
      if (this.gameOver) return;
      // Проверяем, не кликнули ли по иконке способности
      const px = pointer.x, py = pointer.y;
      const icons = [this.abilityExplodeIcon, this.abilityGrandmaIcon];
      for (const icon of icons) {
        const bounds = icon.getBounds();
        if (px >= bounds.left && px <= bounds.right && py >= bounds.top && py <= bounds.bottom) {
          return; // Клик по иконке — не обрабатываем как взрыв
        }
      }
      if (this.abilityMode === 'explode' && this.abilityExplodeCount > 0) {
        // Проверяем, кликнули ли по фрукту
        const fruits = this.fruits.getChildren() as Fruit[];
        let found = false;
        for (const fruit of fruits) {
          const worldPos = fruit.getWorldTransformMatrix().transformPoint(0, 0);
          const r = fruit.bodySprite.displayWidth / 2;
          if (Phaser.Math.Distance.Between(pointer.x, pointer.y, worldPos.x, worldPos.y) < r + 10) {
            this.useExplodeAbility(fruit);
            found = true;
            break;
          }
        }
        if (!found) {
          // Фрукт не выбран для взрыва
        }
        this.abilityMode = 'none';
        this.updateAbilityGlow();
        this.updateCursor();
        return;
      }
      if (this.abilityMode === 'none') {
        this.spawnFruit(pointer.x, 50);
      }
    };
    this.input.on('pointerup', this._globalPointerDownHandler, this);
    // --- Удаляем старые UI-элементы при рестарте ---
    if (this.scoreText) this.scoreText.destroy();
    if (this.abilityExplodeIcon) this.abilityExplodeIcon.destroy();
    if (this.abilityGrandmaIcon) this.abilityGrandmaIcon.destroy();
    if (this.nextFruitIcon) this.nextFruitIcon.destroy();
    if (this.menuButton) this.menuButton.destroy();
    if (this.leftPanel) this.leftPanel.destroy();
    if (this.rightPanel) this.rightPanel.destroy();
    if (this.menuContainer) this.menuContainer.destroy(); // Удаляем меню при рестарте
    if (this.topPanel) this.topPanel.destroy(); // Удаляем верхнюю панель при рестарте
    // --- Случайный выбор и установка фона ---
    const bgKeys = ['bg_1', 'bg_2', 'bg_3'];
    const bgKey = Phaser.Utils.Array.GetRandom(bgKeys);
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, bgKey)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(-100);
    bg.setOrigin(0.5, 0.5);
    this.score = 0;
    this.fruits = this.add.group();

    // --- UI верхней панели ---
    // Только число очков, без слова 'Счёт'
    this.scoreText = this.add.text(0, 0, '0', {
      font: 'bold 32px Arial',
      color: '#fff',
      stroke: '#222',
      strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, fill: true },
      align: 'right',
      fixedWidth: 120
    });

    // 2. Умения (иконки и счётчики)
    this.abilityExplodeIcon = this.add.container(0, 0);
    const explodeBg = this.add.circle(0, 0, 24, 0x333344, 0.7).setStrokeStyle(2, 0xffff66);
    const explodeIcon = this.add.image(0, 0, 'icon_explode').setDisplaySize(32, 32);
    this.abilityExplodeGlow = this.add.image(0, 0, 'icon_explode').setDisplaySize(40, 40).setAlpha(0);
    this.abilityExplodeText = this.add.text(20, 12, '3', { font: '18px Arial', color: '#fff', fontStyle: 'bold', stroke: '#222', strokeThickness: 3 }).setOrigin(0, 0.5);
    this.abilityExplodeIcon.add([explodeBg, this.abilityExplodeGlow, explodeIcon, this.abilityExplodeText]);
    this.abilityExplodeIcon.setSize(48, 48).setInteractive({ useHandCursor: true });
    this.abilityExplodeIcon.setScrollFactor(0).setDepth(100);
    this.abilityExplodeIcon.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.abilityExplodeCount > 0 && !this.gameOver) {
        this.abilityMode = this.abilityMode === 'explode' ? 'none' : 'explode';
        this.updateAbilityGlow();
        this.updateCursor();
        pointer.event.stopPropagation();
      }
    });
    this.abilityGrandmaIcon = this.add.container(0, 0);
    const grandmaBg = this.add.circle(0, 0, 24, 0x443333, 0.7).setStrokeStyle(2, 0x66ffcc);
    const grandmaIcon = this.add.image(0, 0, 'icon_grandma').setDisplaySize(32, 32);
    this.abilityGrandmaGlow = this.add.image(0, 0, 'icon_grandma').setDisplaySize(40, 40).setAlpha(0);
    this.abilityGrandmaText = this.add.text(20, 12, '3', { font: '18px Arial', color: '#fff', fontStyle: 'bold', stroke: '#222', strokeThickness: 3 }).setOrigin(0, 0.5);
    this.abilityGrandmaIcon.add([grandmaBg, this.abilityGrandmaGlow, grandmaIcon, this.abilityGrandmaText]);
    this.abilityGrandmaIcon.setSize(48, 48).setInteractive({ useHandCursor: true });
    this.abilityGrandmaIcon.setScrollFactor(0).setDepth(100);
    this.abilityGrandmaIcon.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.abilityGrandmaCount > 0 && !this.gameOver) {
        this.abilityMode = 'grandma';
        this.updateAbilityGlow();
        this.useGrandmaAbility();
        this.updateCursor();
        pointer.event.stopPropagation();
      }
    });
    // 3. Следующий фрукт
    this.nextFruitIcon = this.add.image(0, 0, 'fruit_' + this.currentFruitType).setDisplaySize(40, 40);
    this.nextFruitIcon.setOrigin(1, 0.5);
    // 4. Кнопка меню
    this.menuButton = this.add.image(0, 0, 'icon_menu')
      .setOrigin(1, 0.5)
      .setDisplaySize(40, 40)
      .setInteractive({ useHandCursor: true })
      .setDepth(200);
    // --- Контейнеры панели ---
    // Не используем контейнер topPanel для scoreText и кнопок — позиционируем их напрямую

    // --- Функция для выравнивания и масштабирования ---
    const layoutTopPanel = () => {
      const padding = 12;
      let scale = 1;
      if (this.scale.width < 500) scale = 0.8;
      if (this.scale.width < 350) scale = 0.65;
      const topY = 24; // Центрируем строку выше
      // Размеры и стили
      // Не трогаем размер scoreText! Только иконки масштабируем
      this.abilityExplodeIcon.setScale(1 * scale);
      this.abilityGrandmaIcon.setScale(1 * scale);
      this.nextFruitIcon.setDisplaySize(40 * scale, 40 * scale);
      this.menuButton.setDisplaySize(40 * scale, 40 * scale);
      // Счёт
      let x = padding;
      this.scoreText.setPosition(x, topY); // фиксированная ширина, выравнивание по правому краю, но блок у левого края
      x += 120 + padding;
      // Способности
      this.abilityExplodeIcon.setPosition(x + 24 * scale, topY + 16 * scale);
      x += 48 * scale + padding;
      this.abilityGrandmaIcon.setPosition(x + 24 * scale, topY + 16 * scale);
      x += 48 * scale + padding;
      // Справа: следующий фрукт и меню
      let rightX = this.scale.width - padding;
      this.menuButton.setPosition(rightX - 20 * scale, topY + 20 * scale);
      rightX -= 40 * scale + padding;
      this.nextFruitIcon.setPosition(rightX - 20 * scale, topY + 20 * scale);
    };
    layoutTopPanel();
    this.scale.on('resize', layoutTopPanel);

    // Matter.Image платформы и стены
    this.platform = this.matter.add.image(this.scale.width / 2, this.scale.height - 10, 'white-pixel', undefined, { isStatic: true }) as Phaser.Physics.Matter.Image;
    this.platform.setDisplaySize(this.scale.width, 20);
    this.platform.setVisible(false);
    this.leftWall = this.matter.add.image(-20, this.scale.height / 2, 'white-pixel', undefined, { isStatic: true }) as Phaser.Physics.Matter.Image;
    this.leftWall.setDisplaySize(40, this.scale.height);
    this.leftWall.setVisible(false);
    this.rightWall = this.matter.add.image(this.scale.width + 20, this.scale.height / 2, 'white-pixel', undefined, { isStatic: true }) as Phaser.Physics.Matter.Image;
    this.rightWall.setDisplaySize(40, this.scale.height);
    this.rightWall.setVisible(false);
    this.bottomWall = this.matter.add.image(this.scale.width / 2, this.scale.height + 20, 'white-pixel', undefined, { isStatic: true }) as Phaser.Physics.Matter.Image;
    this.bottomWall.setDisplaySize(this.scale.width, 40);
    this.bottomWall.setVisible(false);

    // --- UI способностей ---
    // Взорвать фрукт
    // this.abilityExplodeIcon = this.add.container(160, 24); // Moved to top panel
    // const explodeBg = this.add.circle(0, 0, 24, 0x333344, 0.7).setStrokeStyle(2, 0xffff66);
    // const explodeIcon = this.add.image(0, 0, 'icon_explode').setDisplaySize(32, 32);
    // this.abilityExplodeGlow = this.add.image(0, 0, 'icon_explode').setDisplaySize(40, 40).setAlpha(0);
    // this.abilityExplodeText = this.add.text(20, 12, '3', { font: '18px Arial', color: '#fff', fontStyle: 'bold', stroke: '#222', strokeThickness: 3 }).setOrigin(0, 0.5);
    // this.abilityExplodeIcon.add([explodeBg, this.abilityExplodeGlow, explodeIcon, this.abilityExplodeText]);
    // this.abilityExplodeIcon.setSize(48, 48).setInteractive({ useHandCursor: true });
    // this.abilityExplodeIcon.setScrollFactor(0).setDepth(100);
    // this.abilityExplodeIcon.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    //   if (this.abilityExplodeCount > 0 && !this.gameOver) {
    //     this.abilityMode = this.abilityMode === 'explode' ? 'none' : 'explode';
    //     this.updateAbilityGlow();
    //     this.updateCursor();
    //     console.log('Взорвать фрукт режим:', this.abilityMode);
    //     pointer.event.stopPropagation();
    //   }
    // });

    // // Позвать бабулю
    // this.abilityGrandmaIcon = this.add.container(220, 24); // Moved to top panel
    // const grandmaBg = this.add.circle(0, 0, 24, 0x443333, 0.7).setStrokeStyle(2, 0x66ffcc);
    // const grandmaIcon = this.add.image(0, 0, 'icon_grandma').setDisplaySize(32, 32);
    // this.abilityGrandmaGlow = this.add.image(0, 0, 'icon_grandma').setDisplaySize(40, 40).setAlpha(0);
    // this.abilityGrandmaText = this.add.text(20, 12, '3', { font: '18px Arial', color: '#fff', fontStyle: 'bold', stroke: '#222', strokeThickness: 3 }).setOrigin(0, 0.5);
    // this.abilityGrandmaIcon.add([grandmaBg, this.abilityGrandmaGlow, grandmaIcon, this.abilityGrandmaText]);
    // this.abilityGrandmaIcon.setSize(48, 48).setInteractive({ useHandCursor: true });
    // this.abilityGrandmaIcon.setScrollFactor(0).setDepth(100);
    // this.abilityGrandmaIcon.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    //   if (this.abilityGrandmaCount > 0 && !this.gameOver) {
    //     this.abilityMode = 'grandma';
    //     this.updateAbilityGlow();
    //     this.useGrandmaAbility();
    //     this.updateCursor();
    //     pointer.event.stopPropagation();
    //   }
    // });

    // --- Кнопка меню в правом верхнем углу ---
    // const menuButton = this.add.image(this.scale.width - 16, 16, 'icon_menu') // Moved to top panel
    //   .setOrigin(1, 0)
    //   .setDisplaySize(40, 40)
    //   .setInteractive({ useHandCursor: true })
    //   .setDepth(200);
    // Меню (изначально скрыто)
    // const menuContainer = this.add.container(this.scale.width - 20, 60).setDepth(201).setVisible(false);
    // const menuBg = this.add.rectangle(0, 0, 200, 180, 0x222244, 0.97).setOrigin(1, 0).setStrokeStyle(2, 0xffff99);
    // const btnContinue = this.add.text(-180, 20, window.t ? window.t('menu.continue') : 'Продолжить', { font: '22px Arial', color: '#fff', backgroundColor: '#333', padding: { left: 16, right: 16, top: 8, bottom: 8 } }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    // const btnRestart = this.add.text(-180, 60, window.t ? window.t('menu.restart') : 'Начать заново', { font: '22px Arial', color: '#fff', backgroundColor: '#333', padding: { left: 16, right: 16, top: 8, bottom: 8 } }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    // const btnLeaders = this.add.text(-180, 100, window.t ? window.t('menu.leaderboard') : 'Таблица лидеров', { font: '22px Arial', color: '#fff', backgroundColor: '#333', padding: { left: 16, right: 16, top: 8, bottom: 8 } }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    // menuContainer.add([menuBg, btnContinue, btnRestart, btnLeaders]);
    // Открытие/закрытие меню
    this.menuButtons = [];
    this.menuButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.menuContainer && this.menuContainer.visible) return;
      const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x111111, 0.45)
        .setDepth(3000).setInteractive();
      const panelW = 320, panelH = 260;
      const menuPanel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, panelW, panelH, 0x222244, 0.97)
        .setStrokeStyle(4, 0xffff99)
        .setDepth(3001)
        .setOrigin(0.5)
        .setAlpha(0.0)
        .setScale(0.7)
        .setInteractive();
      this.tweens.add({ targets: menuPanel, alpha: 1, scale: 1, duration: 250, ease: 'Back.Out' });
      // --- Современные кнопки меню ---
      // Создаём кастомные современные кнопки меню
      const createModernButton = (y: number, text: string, onClick: () => void) => {
        const btnWidth = 240, btnHeight = 56, radius = 16;
        const textWidth = 220; // ширина текста внутри кнопки
        const btnX = this.scale.width / 2, btnY = y;
        const g = this.add.graphics();
        g.fillStyle(0x333344, 0.97);
        g.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, radius);
        g.setDepth(3002);
        const btnText = this.add.text(btnX, btnY, text, {
          font: 'bold 26px Arial',
          color: '#fff',
          align: 'center',
          fixedWidth: textWidth,
          wordWrap: { width: textWidth, useAdvancedWrap: true },
          shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 6, fill: true }
        })
          .setOrigin(0.5)
          .setDepth(3003);
        // Создаём интерактивную зону по всей области кнопки
        const zone = this.add.zone(btnX, btnY, btnWidth, btnHeight)
          .setOrigin(0.5)
          .setDepth(3004)
          .setInteractive({ useHandCursor: true });
        // Навешиваем обработчики на зону
        zone.on('pointerover', () => {
          g.clear();
          g.fillStyle(0xffe066, 1);
          g.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, radius);
          btnText.setStyle({ color: '#222' });
        });
        zone.on('pointerout', () => {
          g.clear();
          g.fillStyle(0x333344, 0.97);
          g.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, radius);
          btnText.setStyle({ color: '#fff' });
        });
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          onClick();
        });
        return { btn: btnText, g, zone };
      };
      const btns = [
        createModernButton(this.scale.height / 2 - 50, window.t ? window.t('menu.continue') : 'Продолжить', () => closeMenu()),
        createModernButton(this.scale.height / 2 + 10, window.t ? window.t('menu.restart') : 'Начать заново', () => { closeMenu(); this.scene.restart(); }),
        createModernButton(this.scale.height / 2 + 70, window.t ? window.t('menu.leaderboard') : 'Таблица лидеров', () => { closeMenu(); this.showLeadersModal(); })
      ];
      this.menuButtons = btns.map(b => b.btn);
      const closeMenu = () => {
        overlay.destroy(); menuPanel.destroy();
        btns.forEach(({ btn, g, zone }) => { btn.destroy(); g.destroy(); zone.destroy(); });
        this.menuOpen = false;
        this.menuButtons = [];
        this.inputBlocked = false;
        this.input.off('pointerup', this._globalPointerDownHandler, this);
        this.input.on('pointerup', this._globalPointerDownHandler, this);
      };
      overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        closeMenu();
      });
      this.menuContainer = menuPanel;
      this.menuOpen = true;
      this.inputBlocked = true;
      this.input.off('pointerup', this._globalPointerDownHandler, this);
    });

    // --- обработка клика по фрукту для взрыва ---
    // (старый глобальный обработчик удалён)

    // --- смена курсора при активации способности ---
    this.input.on('gameout', () => {
      this.input.manager.canvas.style.cursor = '';
    });
    this.input.on('gameover', () => {
      this.input.manager.canvas.style.cursor = '';
    });

    // Matter.js: обработка merge через события столкновений
    this.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        let a = pair.bodyA.gameObject;
        let b = pair.bodyB.gameObject;
        // Получаем контейнер Fruit, если это bodySprite
        if (a && (a as any).fruitContainer) a = (a as any).fruitContainer;
        if (b && (b as any).fruitContainer) b = (b as any).fruitContainer;
        if (a && b && a instanceof Fruit && b instanceof Fruit) {
          this.handleMerge(a, b);
        }
      });
    });

    this.gameOver = false;
    this.gameOverText = null;
    this.restartButton = null;
    // Сброс способностей при рестарте
    this.abilityExplodeCount = 3;
    this.abilityGrandmaCount = 3;
    this.abilityExplodeText.setText(this.abilityExplodeCount.toString());
    this.abilityGrandmaText.setText(this.abilityGrandmaCount.toString());
    this.abilityMode = 'none';
    this.updateAbilityGlow();
    this.updateCursor();
  }

  update() {
    if (this.gameOver) return;
    const fruits = this.fruits.getChildren() as Fruit[];
    if (this.abilityMode === 'explode') {
      const pointer = this.input.activePointer;
      for (const fruit of fruits) {
        const worldPos = fruit.getWorldTransformMatrix().transformPoint(0, 0);
        const r = fruit.bodySprite.displayWidth / 2;
        if (Phaser.Math.Distance.Between(pointer.x, pointer.y, worldPos.x, worldPos.y) < r + 10) {
          fruit.visualSprite.setScale(1.15);
          fruit.visualSprite.setTint(0xff6666);
        } else {
          fruit.visualSprite.setScale(1);
          fruit.visualSprite.clearTint();
        }
      }
    } else {
      for (const fruit of fruits) {
        fruit.visualSprite.setScale(1);
        fruit.visualSprite.clearTint();
      }
    }
    this.fruits.getChildren().forEach((fruit: Phaser.GameObjects.GameObject) => {
      const f = fruit as Phaser.Physics.Matter.Sprite;
      // Game over по верхней границе
      if (f.y < 0) {
        console.log('endGame called! y =', f.y);
        this.endGame();
      }
    });
    // --- В update и других местах обновлять только this.scoreText ---
    this.scoreText.setText(this.score.toString());
  }

  async endGame() {
    this.gameOver = true;
    // Затемнение фона
    const overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x111111, 0.7)
      .setDepth(1000);
    // Окно
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 340, 260, 0x222244, 0.95)
      .setStrokeStyle(4, 0xffff99)
      .setDepth(1001);
    // Надпись Game Over
    this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, i18next.t('game.over'), {
      font: 'bold 40px Arial', color: '#fff', stroke: '#ff0', strokeThickness: 4, shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(1002);
    // Финальный счет
    const scoreText = this.add.text(this.scale.width / 2, this.scale.height / 2, `${i18next.t('score')}: ${this.score}`, {
      font: 'bold 32px Arial', color: '#fff', stroke: '#222', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1002);
    // Красивая кнопка рестарта
    this.restartButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70, i18next.t('restart'), {
      font: 'bold 30px Arial', color: '#222', backgroundColor: '#ffe066', padding: { left: 32, right: 32, top: 12, bottom: 12 }
    })
      .setOrigin(0.5)
      .setDepth(1002)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart());
    // Анимация появления окна
    panel.setScale(0.7); this.tweens.add({ targets: panel, scale: 1, duration: 300, ease: 'Back.Out' });
    this.gameOverText.setAlpha(0); this.tweens.add({ targets: this.gameOverText, alpha: 1, duration: 400 });
    scoreText.setAlpha(0); this.tweens.add({ targets: scoreText, alpha: 1, duration: 400, delay: 100 });
    this.restartButton.setAlpha(0); this.tweens.add({ targets: this.restartButton, alpha: 1, duration: 400, delay: 200 });
    if (this.restartButton) {
      this.restartButton.on('pointerover', () => this.restartButton && this.restartButton.setStyle({ backgroundColor: '#fff066', color: '#000' }));
      this.restartButton.on('pointerout', () => this.restartButton && this.restartButton.setStyle({ backgroundColor: '#ffe066', color: '#222' }));
    }
    // --- Сохраняем рекорд в Supabase через backend ---
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    let user = { id: 'guest', name: 'Гость' };
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const u = tg.initDataUnsafe.user;
      console.log('Telegram user:', u);
      user = {
        id: u.id,
        name: u.username || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User'
      };
    }
    try {
      await fetch('https://mergefruitadventure.onrender.com/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, username: user.name, score: this.score })
      });
    } catch (e) {
      console.error('Ошибка отправки результата в таблицу лидеров:', e);
    }
  }

  spawnFruit(x: number, y: number) {
    const allowedFruits = FruitOrder.slice(0, 5); // Только 1-5 типы
    const fruitType = allowedFruits.includes(this.currentFruitType) ? this.currentFruitType : allowedFruits[0];
    const fruit = new Fruit(this, x, y, fruitType);
    this.fruits.add(fruit); // Добавляем фрукт в группу
    // Анимация появления (scale-in)
    fruit.setScale(0);
    this.tweens.add({
      targets: fruit,
      scale: 1,
      duration: 200,
      ease: 'Back.Out',
    });
    // Случайный следующий фрукт только из первых 5
    this.currentFruitType = allowedFruits[Math.floor(Math.random() * allowedFruits.length)];
    // Обновить иконку следующего фрукта
    this.nextFruitIcon.setTexture('fruit_' + this.currentFruitType);
  }

  handleMerge(objA: Phaser.GameObjects.GameObject, objB: Phaser.GameObjects.GameObject) {
    const fruitA = objA as Fruit;
    const fruitB = objB as Fruit;
    // Защита от повторного merge
    if (fruitA.isMerging || fruitB.isMerging) return;
    if (fruitA.fruitType === fruitB.fruitType) {
      const nextType = getNextFruitType(fruitA.fruitType);
      if (nextType) {
        fruitA.isMerging = true;
        fruitB.isMerging = true;
        // Анимация слияния
        this.tweens.add({
          targets: [fruitA, fruitB],
          scale: 1.3,
          yoyo: true,
          duration: 120,
          onComplete: () => {
            // Вспышка при merge
            const flash = this.add.circle((fruitA.x + fruitB.x) / 2, (fruitA.y + fruitB.y) / 2, 40, 0xffff99, 0.7).setDepth(10);
            this.tweens.add({
              targets: flash,
              alpha: 0,
              duration: 200,
              onComplete: () => flash.destroy()
            });
            const merged = new Fruit(this, (fruitA.x + fruitB.x) / 2, (fruitA.y + fruitB.y) / 2, nextType);
            this.fruits.add(merged);
            fruitA.destroy();
            fruitB.destroy();
            this.score += 10;
            this.scoreText.setText(i18next.t('score') + ': ' + this.score);
            // Всплывающий счет
            const popup = this.add.text(merged.x, merged.y - 30, '+10', { font: '24px Arial', color: '#ff0', fontStyle: 'bold' }).setOrigin(0.5).setScale(1);
            this.tweens.add({
              targets: popup,
              y: popup.y - 40,
              scale: 1.5,
              alpha: 0,
              duration: 700,
              ease: 'Cubic.Out',
              onComplete: () => popup.destroy()
            });
          }
        });
      }
    }
  }

  updateAbilityGlow() {
    this.abilityExplodeGlow.setAlpha(this.abilityMode === 'explode' ? 0.5 : 0);
    this.abilityGrandmaGlow.setAlpha(this.abilityMode === 'grandma' ? 0.5 : 0);
    this.abilityExplodeIcon.setAlpha(this.abilityExplodeCount > 0 ? 1 : 0.4);
    this.abilityGrandmaIcon.setAlpha(this.abilityGrandmaCount > 0 ? 1 : 0.4);
    this.updateCursor();
  }

  updateCursor() {
    if (this.abilityMode === 'explode') {
      this.input.manager.canvas.style.cursor = 'crosshair';
    } else {
      this.input.manager.canvas.style.cursor = '';
    }
  }

  useExplodeAbility(fruit: Fruit) {
    if (this.abilityExplodeCount <= 0) return;
    // Анимация исчезновения
    this.tweens.add({
      targets: fruit,
      scale: 0,
      alpha: 0,
      duration: 250,
      ease: 'Back.In',
      onComplete: () => {
        fruit.destroy();
      }
    });
    this.abilityExplodeCount--;
    this.abilityExplodeText.setText(this.abilityExplodeCount.toString());
    this.abilityMode = 'none';
    this.updateAbilityGlow();
  }

  useGrandmaAbility() {
    if (this.abilityGrandmaCount <= 0) return;
    const count = 7;
    const margin = 40;
    const width = this.scale.width;
    const step = (width - margin * 2) / (count - 1);
    for (let i = 0; i < count; i++) {
      const x = margin + i * step;
      this.time.delayedCall(i * 60, () => {
        const fruit = new Fruit(this, x, 50, 'cherry');
        this.fruits.add(fruit);
        fruit.setScale(0);
        this.tweens.add({
          targets: fruit,
          scale: 1,
          duration: 200,
          ease: 'Back.Out',
        });
      });
    }
    this.abilityGrandmaCount--;
    this.abilityGrandmaText.setText(this.abilityGrandmaCount.toString());
    this.abilityMode = 'none';
    this.updateAbilityGlow();
  }

  // --- Модальное окно таблицы лидеров ---
  async showLeadersModal() {
    if (this.leadersModal) this.leadersModal.destroy(true);
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    // Выводим в консоль для отладки
    console.log('Telegram initDataUnsafe:', tg?.initDataUnsafe);
    let userId = 'guest';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      userId = tg.initDataUnsafe.user.id;
    }
    let leaders = [];
    let place = null;
    try {
      const res = await fetch(`https://mergefruitadventure.onrender.com/leaderboard/${userId}`);
      const data = await res.json();
      leaders = data.top || [];
      place = data.place;
    } catch (e) {
      leaders = [];
      place = null;
    }
    const modalBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x111111, 0.7).setDepth(3000).setInteractive();
    const modalPanel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 340, 420, 0x222244, 0.97).setStrokeStyle(4, 0xffff99).setDepth(3001);
    // --- Новый стиль заголовка ---
    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 180,
      window.t ? window.t('menu.leaderboard') : 'Таблица лидеров',
      {
        fontFamily: 'Arial, Montserrat, Roboto, Inter, sans-serif',
        font: 'bold 34px Arial',
        color: '#ffe066',
        stroke: '#222',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 8, fill: true },
        letterSpacing: 2
      }
    ).setOrigin(0.5).setDepth(3002);
    // --- Формируем массив для отображения ---
    let displayLeaders: any[] = [];
    let userIndex = leaders.findIndex((r: any) => r.id === userId);
    if (userIndex <= 6) {
      // Топ-7
      displayLeaders = leaders.slice(0, 7);
    } else {
      // Топ-3, прочерк, место перед, сам пользователь, место после (если есть)
      displayLeaders = [
        ...leaders.slice(0, 3),
        { isGap: true },
      ];
      // Место перед пользователем
      if (userIndex > 0) displayLeaders.push(leaders[userIndex - 1]);
      // Сам пользователь
      displayLeaders.push(leaders[userIndex]);
      // Место после пользователя (если есть)
      if (userIndex < leaders.length - 1) displayLeaders.push(leaders[userIndex + 1]);
    }
    // --- Layout ---
    const rowStartY = this.scale.height / 2 - 120;
    const rowStep = 32;
    displayLeaders.forEach((r: any, i: number) => {
      const rowY = rowStartY + i * rowStep;
      if (r.isGap) {
        // Прочерк
        this.add.text(this.scale.width / 2, rowY, '...', {
          font: '18px Arial',
          fontFamily: 'Arial, Montserrat, Roboto, Inter, sans-serif',
          color: '#ffe066',
          align: 'center'
        }).setOrigin(0.5, 0).setDepth(3002);
        return;
      }
      let username = r.username || 'Гость';
      if (username.length > 32) username = username.slice(0, 29) + '...';
      const maxNameWidth = 175;
      // --- Главное исправление: выводим реальное место игрока ---
      let placeNum = r.place;
      if (placeNum === undefined && r.id) {
        // Если поле place отсутствует, ищем в leaders
        const idx = leaders.findIndex((x: any) => x.id === r.id);
        placeNum = idx >= 0 ? idx + 1 : i + 1;
      }
      let displayName = `${placeNum}. ${username}`;
      let tempText = this.add.text(0, 0, displayName, { font: '18px Arial' }).setVisible(false);
      while (tempText.width > maxNameWidth && displayName.length > 4) {
        displayName = displayName.slice(0, -2) + '…';
        tempText.setText(displayName);
      }
      tempText.destroy();
      const leftX = this.scale.width / 2 - 140;
      // Имя
      const t1 = this.add.text(
        leftX,
        rowY,
        displayName,
        {
          font: '18px Arial',
          fontFamily: 'Arial, Montserrat, Roboto, Inter, sans-serif',
          color: r.id === userId ? '#ffe066' : '#fff',
          fontStyle: r.id === userId ? 'bold' : 'normal',
          align: 'left',
          wordWrap: { width: maxNameWidth, useAdvancedWrap: true }
        }
      ).setDepth(3002).setOrigin(0, 0);
      t1.setName('leader_name_' + i);
      // Очки
      const scoreX = leftX + maxNameWidth + 40;
      const t2 = this.add.text(
        scoreX,
        rowY,
        r.score ? r.score.toString() : '',
        {
          font: '18px Arial',
          fontFamily: 'Arial, Montserrat, Roboto, Inter, sans-serif',
          color: r.id === userId ? '#ffe066' : '#fff',
          fontStyle: r.id === userId ? 'bold' : 'normal',
          align: 'right'
        }
      ).setOrigin(1, 0).setDepth(3002);
      t2.setName('leader_score_' + i);
    });
    // --- Layout для "Ваше место" и кнопки ---
    const placeBlockY = rowStartY + displayLeaders.length * rowStep + 16;
    if (place !== null) {
      this.placeText = this.add.text(this.scale.width / 2, placeBlockY, `Ваше место: ${place}`, { font: 'bold 22px Arial', color: '#ffe066' }).setOrigin(0.5).setDepth(3002);
    }
    const closeBtnY = placeBlockY + 40;
    const closeBtn = this.add.text(this.scale.width / 2, closeBtnY, window.t ? window.t('close') : 'Закрыть', { font: 'bold 24px Arial', color: '#222', backgroundColor: '#ffe066', padding: { left: 32, right: 32, top: 12, bottom: 12 } })
      .setOrigin(0.5)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        modalBg.destroy();
        modalPanel.destroy();
        title.destroy();
        closeBtn.destroy();
        for (let i = 0; i < displayLeaders.length; i++) {
          const t1 = this.children.getByName('leader_name_' + i);
          const t2 = this.children.getByName('leader_score_' + i);
          if (t1) t1.destroy();
          if (t2) t2.destroy();
        }
        if (this.placeText) { this.placeText.destroy(); this.placeText = null; }
        this.inputBlocked = false;
        this.input.off('pointerup', this._globalPointerDownHandler, this);
        this.input.on('pointerup', this._globalPointerDownHandler, this);
        return false;
      });
    this.leadersModal = modalPanel;
  }
} 