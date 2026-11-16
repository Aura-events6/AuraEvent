import { ScreenAccess } from '../types';

/**
 * Aura Mock Database & Demo Credentials
 * Offline-first development layer for Phase 1
 */

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  pin: string;
  hallName: string;
  phone: string;
  screenAccess?: Partial<ScreenAccess>;
}

export const DEMO_CREDENTIALS: { owner: DemoUser; staff: DemoUser } = {
  owner: {
    id: 'usr_owner_001',
    email: 'owner@aura.app',
    name: 'Rajesh Patil',
    role: 'owner',
    pin: '1234',
    hallName: 'Royal Palace Conventions',
    phone: '+91 98860 44521',
    screenAccess: {
      calendar: true,
      search: true,
      khatabook: true,
      analytics: true,
      users: true,
      settings: true,
    },
  },
  staff: {
    id: 'usr_staff_002',
    email: 'staff@aura.app',
    name: 'Sanjay Sharma',
    role: 'staff',
    pin: '5678',
    hallName: 'Royal Palace Conventions',
    phone: '+91 98450 33211',
    screenAccess: {
      calendar: true,
      search: true,
      khatabook: true,
      analytics: false,
      users: false,
      settings: false,
    },
  },
};

export const MOCK_KPIS = {
  expectedRevenue: '₹18.4L',
  expectedBookings: '22 Bookings',
  collectedRevenue: '₹14.9L',
  collectedPercentage: '81% Paid',
  pendingDue: '₹3.45L',
  pendingCount: '5 Unpaid',
  completedCount: '14',
  upcomingCount: '8 Upcoming',
};

export interface PendingDueItem {
  id: string;
  customerName: string;
  eventType: string;
  eventDate: string;
  dueAmount: string;
  rawDue: number;
  status: 'Overdue' | 'Credit';
  phone: string;
  totalContract: string;
  advancePaid: string;
}

export const MOCK_PENDING_DUES: PendingDueItem[] = [
  {
    id: 'due_01',
    customerName: 'Vikramaditya Rathore',
    eventType: 'Reception',
    eventDate: '02 Nov',
    dueAmount: '₹1,20,000',
    rawDue: 120000,
    status: 'Overdue',
    phone: '+91 98450 11223',
    totalContract: '₹2,60,000',
    advancePaid: '₹1,40,000',
  },
  {
    id: 'due_02',
    customerName: 'Suresh Deshmukh',
    eventType: 'Engagement',
    eventDate: '04 Nov',
    dueAmount: '₹85,000',
    rawDue: 85000,
    status: 'Overdue',
    phone: '+91 99001 44556',
    totalContract: '₹1,75,000',
    advancePaid: '₹90,000',
  },
  {
    id: 'due_03',
    customerName: 'Dr. Farhan Nadaf',
    eventType: 'Walima',
    eventDate: '06 Nov',
    dueAmount: '₹80,000',
    rawDue: 80000,
    status: 'Credit',
    phone: '+91 97312 88990',
    totalContract: '₹1,30,000',
    advancePaid: '₹50,000',
  },
  {
    id: 'due_04',
    customerName: 'Prashanth Patil',
    eventType: 'Naming Ceremony',
    eventDate: '07 Nov',
    dueAmount: '₹60,000',
    rawDue: 60000,
    status: 'Overdue',
    phone: '+91 94481 23456',
    totalContract: '₹95,000',
    advancePaid: '₹35,000',
  },
  {
    id: 'due_05',
    customerName: 'Ramesh Kulkarni',
    eventType: 'Thread Ceremony',
    eventDate: '08 Nov',
    dueAmount: '₹40,000',
    rawDue: 40000,
    status: 'Overdue',
    phone: '+91 94480 99887',
    totalContract: '₹1,10,000',
    advancePaid: '₹70,000',
  },
];

export interface TimelineItem {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  category: 'events' | 'payments';
  isPaid?: boolean;
  amount?: string;
  billNumber?: string;
}

export const MOCK_TIMELINE: TimelineItem[] = [
  {
    id: 'tl_01',
    title: 'Ananya & Karthik',
    subtitle: 'Wedding • Paid in Full',
    timeLabel: 'Today 02:30 PM',
    category: 'events',
    isPaid: true,
    billNumber: 'RPC-118',
  },
  {
    id: 'tl_02',
    title: 'UPI Payment Received',
    subtitle: 'Ananya & Karthik (Ref: #HDFC99281)',
    timeLabel: 'Today 11:15 AM',
    category: 'payments',
    amount: '+₹60,000',
  },
  {
    id: 'tl_03',
    title: 'Prashanth Patil',
    subtitle: 'Naming Ceremony • Partial Due',
    timeLabel: '07 Nov Saturday',
    category: 'events',
    amount: '₹60K Due',
  },
  {
    id: 'tl_04',
    title: 'Apex Doctors Meet',
    subtitle: 'Corporate Convention • Paid',
    timeLabel: '05 Nov Thursday',
    category: 'events',
    isPaid: true,
    billNumber: 'RPC-115',
  },
];

export interface CalendarDay {
  date: string;
  dayName: string;
  dayNumber: number;
  slots: {
    slotName: 'Morning' | 'Evening' | 'Full Day';
    isBooked: boolean;
    customerName?: string;
    eventType?: string;
    package?: string;
    financialStatus?: 'Fully Paid' | 'Due' | 'Overdue';
    amount?: string;
  }[];
}

export const MOCK_CALENDAR_WEEK: CalendarDay[] = [
  {
    date: '2026-11-08',
    dayName: 'Sun',
    dayNumber: 8,
    slots: [
      {
        slotName: 'Full Day',
        isBooked: true,
        customerName: 'Vijay & Sneha',
        eventType: 'Grand Wedding',
        package: 'Diamond',
        financialStatus: 'Fully Paid',
        amount: '₹4,50,000',
      },
    ],
  },
  {
    date: '2026-11-09',
    dayName: 'Mon',
    dayNumber: 9,
    slots: [
      { slotName: 'Morning', isBooked: false },
      {
        slotName: 'Evening',
        isBooked: true,
        customerName: 'Rohan Mehra',
        eventType: 'Sangeet Party',
        package: 'Silver',
        financialStatus: 'Due',
        amount: '₹40K Due',
      },
    ],
  },
  {
    date: '2026-11-10',
    dayName: 'Tue',
    dayNumber: 10,
    slots: [{ slotName: 'Full Day', isBooked: false }],
  },
  {
    date: '2026-11-11',
    dayName: 'Wed',
    dayNumber: 11,
    slots: [
      {
        slotName: 'Full Day',
        isBooked: true,
        customerName: 'Rotary Club',
        eventType: 'Annual District Meet',
        package: 'Silver',
        financialStatus: 'Fully Paid',
        amount: '₹85,000',
      },
    ],
  },
  {
    date: '2026-11-12',
    dayName: 'Thu',
    dayNumber: 12,
    slots: [
      {
        slotName: 'Morning',
        isBooked: true,
        customerName: 'Kulkarni Family',
        eventType: 'Satyanarayan Pooja',
        package: 'Silver',
        financialStatus: 'Fully Paid',
        amount: '₹80,000',
      },
      { slotName: 'Evening', isBooked: false },
    ],
  },
  {
    date: '2026-11-13',
    dayName: 'Fri',
    dayNumber: 13,
    slots: [
      {
        slotName: 'Full Day',
        isBooked: true,
        customerName: 'Nikhil & Pooja',
        eventType: 'Wedding Reception',
        package: 'Golden',
        financialStatus: 'Due',
        amount: '₹50K Due',
      },
    ],
  },
  {
    date: '2026-11-14',
    dayName: 'Sat',
    dayNumber: 14,
    slots: [
      {
        slotName: 'Full Day',
        isBooked: true,
        customerName: 'Al-Ameen Alumni',
        eventType: 'Convention',
        package: 'Golden',
        financialStatus: 'Fully Paid',
        amount: '₹1,80,000',
      },
    ],
  },
];

export interface PackageItem {
  id: string;
  name: string;
  tag: string;
  price: string;
  rawPrice: number;
  description: string;
  amenities: string[];
}

export const MOCK_PACKAGES: PackageItem[] = [
  {
    id: 'pkg_silver',
    name: 'Silver Classic',
    tag: 'Standard',
    price: '₹1,50,000',
    rawPrice: 150000,
    description: 'Ideal for engagements, naming ceremonies, and half-day corporate conferences.',
    amenities: ['Main Hall 800 seats', 'Basic Stage Backdrop', '500 Banqueting Chairs', 'Standard Lighting', 'Green Rooms (2)'],
  },
  {
    id: 'pkg_gold',
    name: 'Golden Elegance',
    tag: 'Popular',
    price: '₹2,80,000',
    rawPrice: 280000,
    description: 'Perfect for grand weddings, large receptions, and full-day gatherings.',
    amenities: ['Main Hall + AC Dining', 'Central Air Conditioning', 'Floral Entrance Decor', 'JBL Professional Sound', '125 KVA Generator Backup', '4 AC Bridal Suites'],
  },
  {
    id: 'pkg_diamond',
    name: 'Diamond Royal Sovereign',
    tag: 'Premium Luxury',
    price: '₹4,50,000',
    rawPrice: 450000,
    description: 'The premier all-inclusive package with regal chandeliers, suites, and full valet setup.',
    amenities: ['Full Complex Access (1500+ Cap)', 'Grand Crystal Chandeliers', 'Live 4K LED Screen Setup', 'Valet Parking Team (150 cars)', 'Luxury Bridal Suite', '24/7 Housekeeping Staff'],
  },
];

export const MOCK_SETTINGS = {
  hallName: 'Royal Palace Conventions',
  phone: '+91 836 225 1100',
  gstNumber: '29ABCDE1234F1Z5',
  billPrefix: 'RPC-2026',
  twoSlotMode: false,
  multiDayBooking: false,
  slotTimings: 'Morning 6:00 AM – 3:00 PM • Evening 4:00 PM – 12:00 AM',
  pushNotifications: true,
  priceChangeAlerts: true,
  paymentReminders: true,
};

