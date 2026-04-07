import React, { useState } from 'react';
import { Network, Cookie, ChevronDown, ChevronRight } from 'lucide-react';

export const NetworkNode = ({ customer, customers, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const children = customers.filter(c => c.referredBy === customer.id);
  const hasChildren = children.length > 0;
  return (
    <div className={`relative ${!isRoot ? 'ml-8 mt-4' : 'mb-8'}`}>
      {!isRoot && ( <><div className="absolute -left-6 top-6 w-6 border-t-2 border-amber-200 dark:border-[#4A3B32]"></div><div className="absolute -left-6 -top-4 h-10 border-l-2 border-amber-200 dark:border-[#4A3B32]"></div></> )}
      <div onClick={() => hasChildren && setIsExpanded(!isExpanded)} className={`flex items-center gap-3 p-3 rounded-xl shadow-sm w-fit z-10 relative transition-colors ${isRoot ? 'bg-amber-50 dark:bg-[#2C1E16] border-2 border-amber-200 dark:border-[#4A3B32] hover:bg-amber-100 dark:hover:bg-[#3D2C20]' : 'bg-white dark:bg-[#3D2C20] border border-amber-100 dark:border-[#4A3B32] hover:bg-amber-50 dark:hover:bg-[#2C1E16]'} ${hasChildren ? 'cursor-pointer' : ''}`}>
        <div className={`p-2 rounded-full ${isRoot ? 'bg-amber-800 text-white dark:bg-[#C17F59] dark:text-[#2C1E16]' : 'bg-amber-100 dark:bg-[#2C1E16] text-amber-800 dark:text-[#C17F59]'}`}>
          {isRoot ? <Network size={20} /> : <Cookie size={20} />}
        </div>
        <div>
          <p className={`font-bold ${isRoot ? 'text-amber-950 dark:text-[#F3E8D6]' : 'text-stone-800 dark:text-[#E2D4C1]'}`}>{customer.name || 'Desconhecido'}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {isRoot && <span className="text-amber-800 dark:text-[#C17F59] mr-1">Iniciador •</span>}
            {customer.purchases || 0} pedidos {hasChildren && `• ${children.length} indicações`}
          </p>
        </div>
        {hasChildren && (<div className="ml-2 text-amber-800 dark:text-[#C17F59]">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>)}
      </div>
      {hasChildren && isExpanded && (<div className="relative border-l-2 border-amber-200 dark:border-[#4A3B32] ml-[1.5rem] mt-2">{children.map(child => <NetworkNode key={child.id} customer={child} customers={customers} />)}</div>)}
    </div>
};
