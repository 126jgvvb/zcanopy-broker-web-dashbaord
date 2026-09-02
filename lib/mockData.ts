const MOCK_USER = {
  id: 'web-user-1',
  username: 'Demo User',
  email: 'demo@zcanopy.com',
  role: 'customer',
  brokerCode: '',
};

const MOCK_PROPERTIES = [
  { id: 'wp1', title: '2BR Apartment in Kololo', description: 'Modern apartment with shared pool, balcony & 24/7 security.', propertyType: 'apartment', location: 'Kololo, Kampala', isAvailable: true, createdAt: '2026-08-01T10:00:00Z', price: 850000, brokerBookingFee: 50000, latitude: 0.3476, longitude: 32.5825, imageUrl: ['https://picsum.photos/400/200?1', 'https://picsum.photos/400/200?6', 'https://picsum.photos/400/200?7', 'https://picsum.photos/400/200?8'], videoUrl: ['https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4'] },
  { id: 'wp2', title: '3BR Villa in Muyenga', description: 'Spacious family villa with garden, double garage & maid\'s quarter.', propertyType: 'villa', location: 'Muyenga, Kampala', isAvailable: true, createdAt: '2026-08-02T10:00:00Z', price: 1500000, brokerBookingFee: 75000, latitude: 0.0645, longitude: 32.4592, imageUrl: ['https://picsum.photos/400/200?2', 'https://picsum.photos/400/200?9', 'https://picsum.photos/400/200?10', 'https://picsum.photos/400/200?11', 'https://picsum.photos/400/200?12'], videoUrl: ['https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4', 'https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4'] },
  { id: 'wp3', title: 'Office Space in CBD', description: 'Prime office location with secure parking.', propertyType: 'commercial', location: 'CBD, Kampala', isAvailable: false, createdAt: '2026-08-03T10:00:00Z', price: 1200000, brokerBookingFee: 60000, latitude: 0.3136, longitude: 32.5745, imageUrl: ['https://picsum.photos/400/200?3', 'https://picsum.photos/400/200?13', 'https://picsum.photos/400/200?14'], videoUrl: [] },
  { id: 'wp4', title: 'Land Plot in Kira', description: 'Residential land for sale, surveyed and ready for title processing.', propertyType: 'land', location: 'Kira, Wakiso', isAvailable: true, createdAt: '2026-08-04T10:00:00Z', price: 500000, brokerBookingFee: 30000, latitude: 0.4306, longitude: 33.2006, imageUrl: ['https://picsum.photos/400/200?4', 'https://picsum.photos/400/200?15', 'https://picsum.photos/400/200?16', 'https://picsum.photos/400/200?17', 'https://picsum.photos/400/200?18', 'https://picsum.photos/400/200?19'], videoUrl: ['https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4'] },
  { id: 'wp5', title: '1BR Studio in Ntinda', description: 'Cozy studio apartment, ideal for young professionals. Gated community.', propertyType: 'apartment', location: 'Ntinda, Kampala', isAvailable: true, createdAt: '2026-08-05T10:00:00Z', price: 600000, brokerBookingFee: 40000, latitude: 0.3496, longitude: 32.6108, imageUrl: ['https://picsum.photos/400/200?5', 'https://picsum.photos/400/200?20', 'https://picsum.photos/400/200?21'], videoUrl: [] },
];

const MOCK_BOOKINGS = [
  { id: 'wb1', propertyTitle: '2BR Apartment in Kololo', customerName: 'John Doe', customerPhone: '+256 701 234567', date: '2026-08-20', status: 'pending', amount: 850000 },
  { id: 'wb2', propertyTitle: '3BR Villa in Muyenga', customerName: 'Jane Smith', customerPhone: '+256 772 345678', date: '2026-08-21', status: 'approved', amount: 1500000 },
];

const MOCK_TRANSACTIONS = [
  { id: 'wt1', type: 'credit', amount: 1500000, balanceAfter: 2500000, reason: 'Booking payment - Muyenga Villa', createdAt: '2026-08-21T08:00:00Z' },
  { id: 'wt2', type: 'debit', amount: 500000, balanceAfter: 2000000, reason: 'Platform fee', createdAt: '2026-08-20T08:00:00Z' },
];

export const mockData = {
  login: () => ({ ...MOCK_USER, token: 'mock-token-web' }),
  brokerLogin: () => ({ ...MOCK_USER, role: 'broker', brokerCode: 'BRK-WEB-1', token: 'mock-token-broker' }),
  properties: () => ({ properties: MOCK_PROPERTIES, total: MOCK_PROPERTIES.length }),
  propertyDetails: (id: string) => ({ property: MOCK_PROPERTIES.find((p) => p.id === id) || MOCK_PROPERTIES[0] }),
  search: (query: string) => ({ properties: MOCK_PROPERTIES.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())), total: 1 }),
  bookings: () => ({ bookings: MOCK_BOOKINGS }),
  wallet: () => ({ balance: 2000000, currency: 'UGX', walletId: 'wallet-web-1', minimumWithdrawal: 10000 }),
  walletTransactions: () => ({ transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length }),
  subscriptionDetails: () => ({
    subscriptionTier: 'prop',
    subscriptionExpiresAt: null,
    limits: { maxProperties: 5, maxPhotosPerProperty: 15, maxVideosPerProperty: 1, maxVideoSizeMB: 500 },
  }),
  subscriptionPackages: () => ({
    tiers: [
      { tier: 'prop', name: 'Prop', price: 0, currency: 'UGX', expiryDays: 0, advantages: ['Up to 5 properties', '15 photos per property', '1 video per property', '500MB max video size'], limits: { maxProperties: 5, maxPhotosPerProperty: 15, maxVideosPerProperty: 1, maxVideoSizeMB: 500 } },
      { tier: 'buttress', name: 'Buttress', price: 50000, currency: 'UGX', expiryDays: 30, advantages: ['Up to 16 properties', '50 photos per property', '4 videos per property', '4GB max video size', 'Priority support'], limits: { maxProperties: 16, maxPhotosPerProperty: 50, maxVideosPerProperty: 4, maxVideoSizeMB: 4096 } },
      { tier: 'fibrous', name: 'Fibrous', price: 25000, currency: 'UGX', expiryDays: 30, advantages: ['Up to 12 properties', '25 photos per property', '2 videos per property', '12GB max video size', 'Premium support', 'Advanced analytics'], limits: { maxProperties: 12, maxPhotosPerProperty: 25, maxVideosPerProperty: 2, maxVideoSizeMB: 12288 } },
    ],
  }),
  brokerProperties: () => ({ properties: MOCK_PROPERTIES.slice(0, 2), total: 2 }),
  brokerDashboard: () => ({
    broker: { id: 'b1', username: 'Demo Broker', email: 'broker@example.com', brokerCode: 'BRK-WEB-1', subscriptionTier: 'prop' },
    properties: { properties: MOCK_PROPERTIES.slice(0, 2), total: 2 },
    bookings: { bookings: MOCK_BOOKINGS },
    wallet: { balance: 2000000, currency: 'UGX', walletId: 'wallet-web-1', minimumWithdrawal: 10000 },
  }),
  brokerNotifications: () => ({
    notifications: [
      { id: 'n1', type: 'booking', title: 'New Booking Request', message: 'Brian wants to book Sunset Apartments on 21 Jul 2026.', time: '2026-08-29T08:00:00Z', read: false },
      { id: 'n2', type: 'payment', title: 'Payment Received', message: 'You received UGX 290,000 for Garden Villa booking.', time: '2026-08-29T06:00:00Z', read: false },
      { id: 'n3', type: 'system', title: 'System Maintenance', message: 'Scheduled maintenance on 18 Jul 2026, 01:00–02:00 EAT.', time: '2026-08-28T10:00:00Z', read: true },
    ],
    total: 3,
  }),
  brokerProfile: () => ({
    id: 'b1',
    username: 'Demo Broker',
    fullName: 'Demo Broker',
    email: 'broker@example.com',
    phoneNumber: '+256700000000',
    location: 'Kampala',
    brokerCode: 'BRK-WEB-1',
    isVerified: true,
    subscriptionTier: 'prop',
  }),
  brokerHelp: () => ({ success: true, message: 'Support request submitted' }),
  customerProperties: () => ({ properties: MOCK_PROPERTIES, total: MOCK_PROPERTIES.length }),
  customerBookings: () => ({ bookings: MOCK_BOOKINGS }),
  brokerByCode: () => ({ id: 'b1', username: 'Demo Broker', email: 'broker@example.com', brokerCode: 'BRK-WEB-1' }),
};
