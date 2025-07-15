import Phaser from 'phaser';
// import * as Matter from 'matter-js';

export type FruitType =
  | 'cherry'
  | 'strawberry'
  | 'orange'
  | 'lemon'
  | 'kiwi'
  | 'peach'
  | 'plum'
  | 'apple'
  | 'pineapple'
  | 'watermelon';

export const FruitOrder: FruitType[] = [
  'cherry',
  'strawberry',
  'orange',
  'lemon',
  'kiwi',
  'peach',
  'plum',
  'apple',
  'pineapple',
  'watermelon',
];

export const FruitSprites: Record<FruitType, string> = {
  cherry: 'fruit_cherry',
  strawberry: 'fruit_strawberry',
  orange: 'fruit_orange',
  lemon: 'fruit_lemon',
  kiwi: 'fruit_kiwi',
  peach: 'fruit_peach',
  plum: 'fruit_plum',
  apple: 'fruit_apple',
  pineapple: 'fruit_pineapple',
  watermelon: 'fruit_watermelon',
};

const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
const MOBILE_FRUIT_SCALE = 0.7;

const FruitRadius: Record<FruitType, number> = {
  cherry: 32,
  strawberry: 36,
  orange: 40,
  lemon: 44,
  kiwi: 48,
  peach: 52,
  plum: 56,
  apple: 60,
  pineapple: 64,
  watermelon: 68,
};

export function getNextFruitType(type: FruitType): FruitType | null {
  const idx = FruitOrder.indexOf(type);
  return idx >= 0 && idx < FruitOrder.length - 1 ? FruitOrder[idx + 1] : null;
}

export class Fruit extends Phaser.GameObjects.Container {
  fruitType: FruitType;
  bodySprite: Phaser.Physics.Matter.Sprite;
  visualSprite: Phaser.GameObjects.Sprite;
  isMerging: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, fruitType: FruitType) {
    super(scene, x, y);
    this.fruitType = fruitType;
    let r = FruitRadius[fruitType];
    let scale = 1;
    if (isMobile) {
      r = r * MOBILE_FRUIT_SCALE;
      scale = MOBILE_FRUIT_SCALE;
    }

    // Matter.Sprite с прозрачной текстурой (white-pixel)
    this.bodySprite = scene.matter.add.sprite(x, y, 'white-pixel');
    this.bodySprite.setDisplaySize(r * 2, r * 2);
    this.bodySprite.setCircle(r);
    this.bodySprite.setVisible(false);
    // Ссылка на контейнер для merge
    (this.bodySprite as any).fruitContainer = this;

    // Обычный Sprite с SVG-фруктом
    this.visualSprite = scene.add.sprite(0, 0, FruitSprites[fruitType]);
    this.visualSprite.setDisplaySize(r * 2, r * 2);
    this.visualSprite.setOrigin(0.5, 0.5);

    this.add([this.visualSprite]);
    scene.add.existing(this);

    // Синхронизация позиции и вращения
    this.scene.events.on('update', this.syncWithBody, this);
  }

  syncWithBody() {
    if (!this.bodySprite.body) return;
    this.x = this.bodySprite.x;
    this.y = this.bodySprite.y;
    this.visualSprite.rotation = this.bodySprite.rotation;
  }

  destroy(fromScene?: boolean) {
    this.scene.events.off('update', this.syncWithBody, this);
    this.bodySprite.destroy();
    this.visualSprite.destroy();
    super.destroy(fromScene);
  }
} 