import React from 'react';
import { MdHome, MdPeople, MdPayment, MdSettings } from 'react-icons/md';

const adminRoutes = [
  {
    name: 'Platform Overview',
    layout: '/admin',
    path: '',
    icon: <MdHome className="h-6 w-6" />,
  },
  {
    name: 'Tenants (Organizations)',
    layout: '/admin',
    icon: <MdPeople className="h-6 w-6" />,
    path: 'tenants',
  },
  {
    name: 'SaaS Plans & Billing',
    layout: '/admin',
    path: 'billing',
    icon: <MdPayment className="h-6 w-6" />,
  },
  {
    name: 'Platform Settings',
    layout: '/admin',
    path: 'settings',
    icon: <MdSettings className="h-6 w-6" />,
  },
];
export default adminRoutes;
