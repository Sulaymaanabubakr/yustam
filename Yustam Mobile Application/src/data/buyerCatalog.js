const FLASH_SALE_ITEMS = [
  {
    id: 'nova-v2',
    name: 'Nova V 2.01" HD Video Watch',
    price: 33900,
    oldPrice: 77900,
    rating: 4.8,
    reviews: '4k+',
    image: 'https://res.cloudinary.com/dk-find-out/image/upload/q_80,w_960,f_auto/Watch_mock.png',
    badges: ['Flash Sale'],
    sellingPoints: ['Wireless HD Calling', 'Video Watch Faces'],
    colors: ['#0F6A53', '#111827', '#9CA3AF'],
    description:
      'Stay connected with crystal-clear HD calling and switch between animated watch faces on the Nova V smart watch. Built for reliable fitness tracking and all-day comfort.',
    specs: [
      '2.01" HD full-touch display',
      'Bluetooth 5.3 with HD calling',
      '7-day typical battery life',
      'IP68 water and dust resistance',
    ],
  },
  {
    id: 'airbuds-4',
    name: 'AirBuds 4 ENC Wireless Earbuds',
    price: 23400,
    oldPrice: 37900,
    rating: 4.8,
    reviews: '1k+',
    image: 'https://res.cloudinary.com/dk-find-out/image/upload/q_80,w_900,f_auto/earbuds_mock.png',
    badges: ['Flash Sale'],
    sellingPoints: ['38-hr Long Playtime', 'LED Screen Display'],
    colors: ['#111827', '#F9A8D4', '#2563EB'],
    description:
      'Enjoy punchy bass, clear calls, and a futuristic charging dock with LED power readout. AirBuds 4 are built for everyday hustle.',
    specs: [
      'ENC quad-mic noise cancellation',
      '38-hour total playtime with case',
      'Low latency gaming mode',
      'IPX5 sweat and splash proof',
    ],
  },
  {
    id: 'nova-n2',
    name: 'Watch Nova N 2.04" AMOLED 2.5D',
    price: 37900,
    oldPrice: 82900,
    rating: 4.7,
    reviews: '115',
    image: 'https://res.cloudinary.com/dk-find-out/image/upload/q_80,w_960,f_auto/watch_green_mock.png',
    badges: ['Flash Sale'],
    sellingPoints: ['24-Hour Health Monitoring', 'AI-generated Watch Faces'],
    colors: ['#0EA5E9', '#F97316', '#111827'],
    description:
      'A premium AMOLED edge-to-edge display meets AI watch faces and advanced health tracking. Nova N elevates every outfit.',
    specs: [
      '2.04" AMOLED 2.5D curved display',
      'Continuous SpO₂ and heart rate monitoring',
      'Stress and sleep tracking suite',
      '5-day battery with fast charge',
    ],
  },
  {
    id: 'watch-5n',
    name: 'Watch 5N 2.01" TFT IP68 Smart Watch',
    price: 29900,
    oldPrice: 59900,
    rating: 4.7,
    reviews: '138',
    image: 'https://res.cloudinary.com/dk-find-out/image/upload/q_80,w_960,f_auto/watch_black_mock.png',
    badges: ['Flash Sale'],
    sellingPoints: ['Wireless HD Calling', '100+ Sports Modes'],
    colors: ['#111827', '#2563EB'],
    description:
      'Wireless calling, over 100 sports modes, and dependable IP68 durability. Watch 5N keeps up with your daily grind.',
    specs: [
      '2.01" TFT full-view display',
      '100+ sports tracking profiles',
      'AI voice assistant support',
      'IP68 water-resistant build',
    ],
  },
];

export const getFlashSaleItems = () => FLASH_SALE_ITEMS;

export const getProductById = (productId) =>
  FLASH_SALE_ITEMS.find((item) => item.id === productId);

export default {
  getFlashSaleItems,
  getProductById,
};
