import React from 'react';
import { View } from '../types';
import { Sparkles, Shirt, PlusCircle } from 'lucide-react';

interface NavBarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView, onChangeView }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 shadow-lg z-50 pb-4">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <button 
          onClick={() => onChangeView('home')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'home' ? 'text-rose-500' : 'text-gray-400'}`}
        >
          <Sparkles size={24} strokeWidth={currentView === 'home' ? 2.5 : 2} />
          <span className="text-xs font-medium">Suggest</span>
        </button>

        <button 
          onClick={() => onChangeView('upload')}
          className="flex flex-col items-center -mt-8"
        >
          <div className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 ${currentView === 'upload' ? 'bg-rose-600 text-white ring-4 ring-rose-100' : 'bg-rose-500 text-white'}`}>
            <PlusCircle size={32} />
          </div>
        </button>

        <button 
          onClick={() => onChangeView('wardrobe')}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'wardrobe' ? 'text-rose-500' : 'text-gray-400'}`}
        >
          <Shirt size={24} strokeWidth={currentView === 'wardrobe' ? 2.5 : 2} />
          <span className="text-xs font-medium">Wardrobe</span>
        </button>
      </div>
    </div>
  );
};