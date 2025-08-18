'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = ({ items, className = '' }: BreadcrumbProps) => {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <motion.nav 
      className={`flex items-center space-x-2 text-sm ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-emerald-300">/</span>
            )}
            
            {index < items.length - 1 ? (
              <button
                onClick={() => handleNavigation(item.href)}
                className="flex items-center space-x-1 text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ) : (
              <span className="flex items-center space-x-1 text-emerald-800 font-medium">
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </motion.nav>
  );
};

export default Breadcrumb;