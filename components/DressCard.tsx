import React from 'react';
import { Dress } from '../types';
import { Calendar, Tag, Clock, Trash2 } from 'lucide-react';

interface DressCardProps {
  dress: Dress;
  onDelete?: (id: string) => void;
  onWear?: (id: string) => void;
  compact?: boolean;
}

export const DressCard: React.FC<DressCardProps> = ({ dress, onDelete, onWear, compact = false }) => {
  const lastWornDate = dress.lastWorn ? new Date(dress.lastWorn) : null;
  
  // Calculate days since worn
  let timeLabel = "Never worn";
  let isRecent = false;

  if (lastWornDate) {
    const diffTime = Math.abs(new Date().getTime() - lastWornDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) timeLabel = "Worn today";
    else if (diffDays === 1) timeLabel = "Worn yesterday";
    else timeLabel = `${diffDays} days ago`;

    if (diffDays < 2) isRecent = true;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-full relative group hover:shadow-md transition-shadow">
      <div className={`relative ${compact ? 'h-40' : 'h-64'} bg-gray-100`}>
        <img 
          src={dress.imageData} 
          alt={dress.category} 
          className="w-full h-full object-cover"
        />
        {isRecent && (
          <div className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
            Recently Worn
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-800 capitalize truncate w-full">{dress.color} {dress.category}</h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Tag size={12} />
          <span>{dress.occasion}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Clock size={12} />
          <span className={isRecent ? "text-rose-500 font-medium" : ""}>{timeLabel}</span>
        </div>

        <div className="mt-auto flex gap-2">
          {onWear && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWear(dress.id);
              }}
              className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <Calendar size={14} />
              Wear
            </button>
          )}
          {onDelete && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(dress.id);
              }}
              className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};