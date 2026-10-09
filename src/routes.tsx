import React from 'react';

// Admin Imports

// Icon Imports
import { MdHome, MdPeople, MdApartment, MdSettings, MdPayment, MdAccountCircle, MdConstruction } from 'react-icons/md';

const routes = [
  {
    name: 'Dashboard',
    layout: '/grahsiddhi',
    path: 'dashboard',
    icon: <MdHome className="h-6 w-6" />,
  },
  {
    name: 'Leads',
    layout: '/grahsiddhi',
    icon: <MdPeople className="h-6 w-6" />,
    path: 'leads',
  },
  {
    name: 'Inventory',
    layout: '/grahsiddhi',
    path: 'inventory',
    icon: <MdApartment className="h-6 w-6" />,
  },
  {
    name: 'Site Operations',
    layout: '/grahsiddhi',
    path: 'sites',
    icon: <MdConstruction className="h-6 w-6" />,
  },
  {
    name: 'Subscription', layout: '/workspace', path: 'billing', icon: <MdPayment className="h-6 w-6" />, adminOnly: true,
  },
  {
    name: 'Settings',
    layout: '/grahsiddhi',
    path: 'settings',
    icon: <MdSettings className="h-6 w-6" />,
    adminOnly: true,
  },
  {
    name: 'My Account',
    layout: '/grahsiddhi',
    path: 'account',
    icon: <MdAccountCircle className="h-6 w-6" />,
  },
];
export default routes;
