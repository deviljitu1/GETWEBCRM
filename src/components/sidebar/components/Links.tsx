/* eslint-disable */
import React from 'react';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import NavLink from 'components/link/NavLink';
import DashIcon from 'components/icons/DashIcon';
// chakra imports

export const SidebarLinks = (props: { routes: RoutesType[] }): React.JSX.Element => {
  // Chakra color mode
  const pathname = usePathname();

  const { routes } = props;

  // verifies if routeName is the one active (in browser input)
  const activeRoute = useCallback(
    (route: RoutesType) => {
      const destination = `${route.layout}/${route.path}`.replace(/\/$/, '');
      return pathname === destination || (!!route.path && pathname?.startsWith(`${destination}/`));
    },
    [pathname],
  );

  const createLinks = (routes: RoutesType[]) => {
    return routes.map((route, index) => {
      if (
        route.layout !== '/auth' && route.layout !== '/rtl'
      ) {
        return (
          <NavLink key={index} href={route.layout + '/' + route.path}>
            <div className="relative mb-3 flex hover:cursor-pointer">
              <li
                className="my-[3px] flex cursor-pointer items-center px-8"
                key={index}
              >
                <span
                  className={`${
                    activeRoute(route) === true
                      ? 'font-bold text-brand-500 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.icon ? route.icon : <DashIcon />}{' '}
                </span>
                <p
                  className={`leading-1 ml-4 flex ${
                    activeRoute(route) === true
                      ? 'font-bold text-navy-700 dark:text-white'
                      : 'font-medium text-gray-600'
                  }`}
                >
                  {route.name}
                </p>
              </li>
              {activeRoute(route) ? (
                <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
              ) : null}
            </div>
          </NavLink>
        );
      }
    });
  };
  // BRAND
  return <>{createLinks(routes)}</>;
};

export default SidebarLinks;
