import React, { useState, useEffect, useCallback } from 'react';
import { Dress, View, AnalysisResult, FilterOption } from './types';
import { NavBar } from './components/NavBar';
import { analyzeDressImage } from './services/geminiService';
import { DressCard } from './components/DressCard';
import { Sparkles, Camera, AlertCircle, CheckCircle2, Filter, RefreshCw, Trash2, X } from 'lucide-react';

// --- Helper Utilities ---

// Compress image to avoid LocalStorage quota limits
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to JPEG 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Helper Components ---

const Toast = ({ message }: { message: string }) => (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-[100] flex items-center gap-3 animate-bounce-in">
    <CheckCircle2 size={20} className="text-green-400" />
    <span className="text-sm font-medium">{message}</span>
  </div>
);

const DeleteModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl transform transition-all scale-100">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 size={24} className="text-red-500" />
      </div>
      <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Remove Item?</h3>
      <p className="text-gray-500 text-center text-sm mb-6 leading-relaxed">
        This will permanently delete this outfit from your wardrobe history.
      </p>
      <div className="flex gap-3">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 active:scale-95 rounded-xl shadow-lg shadow-red-200 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const EmptyWardrobe = ({ onUpload }: { onUpload: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
    <div className="bg-rose-100 p-6 rounded-full mb-6">
      <Camera size={48} className="text-rose-400" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Closet is Empty</h2>
    <p className="text-gray-500 mb-8">Add photos of your dresses to get smart outfit suggestions.</p>
    <button 
      onClick={onUpload}
      className="bg-rose-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-rose-600 transition-colors"
    >
      Add First Item
    </button>
  </div>
);

const Header = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <header className="pt-8 pb-6 px-6 bg-white">
    <h1 className="text-3xl font-black text-gray-800 tracking-tight">{title}</h1>
    {subtitle && <p className="text-gray-500 mt-1 font-medium">{subtitle}</p>}
  </header>
);

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<View>('home');
  
  // Lazy initialize state to prevent overwriting LocalStorage with empty array on first render
  const [dresses, setDresses] = useState<Dress[]>(() => {
    const stored = localStorage.getItem('chicpick_dresses');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse wardrobe", e);
        return [];
      }
    }
    return [];
  });

  const [suggestion, setSuggestion] = useState<Dress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>(FilterOption.ALL);
  
  // UI State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Upload State
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [uploadAnalysis, setUploadAnalysis] = useState<AnalysisResult | null>(null);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('chicpick_dresses', JSON.stringify(dresses));
  }, [dresses]);

  // --- Helpers ---

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // --- Actions ---

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      // Compress image before storing/analyzing
      const compressedBase64 = await compressImage(file);
      setUploadImage(compressedBase64);
      
      // Call Gemini API
      const analysis = await analyzeDressImage(compressedBase64);
      setUploadAnalysis(analysis);
    } catch (error) {
      console.error("Upload failed", error);
      showNotification("Failed to process image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveNewDress = () => {
    if (!uploadImage || !uploadAnalysis) return;

    const newDress: Dress = {
      id: Date.now().toString(),
      imageData: uploadImage,
      ...uploadAnalysis,
      lastWorn: null,
      createdAt: new Date().toISOString()
    };

    setDresses(prev => [newDress, ...prev]);
    setUploadImage(null);
    setUploadAnalysis(null);
    setView('wardrobe');
    showNotification("Added to wardrobe!");
  };

  // Request delete (opens modal)
  const requestDelete = (id: string) => {
    setDeleteId(id);
  };

  // Confirm delete (performs action)
  const confirmDelete = () => {
    if (deleteId) {
      setDresses(prev => prev.filter(d => d.id !== deleteId));
      
      // If the deleted item was the current suggestion, clear it
      if (suggestion?.id === deleteId) {
        setSuggestion(null);
      }
      
      setDeleteId(null);
      showNotification("Item deleted successfully");
    }
  };

  const wearDress = (id: string) => {
    const now = new Date().toISOString();
    setDresses(prev => prev.map(d => d.id === id ? { ...d, lastWorn: now } : d));
    
    // If we are wearing the currently suggested dress, clear the suggestion
    if (suggestion?.id === id) {
        setSuggestion(null);
    }

    if (view === 'home') {
        showNotification("Nice! Enjoy your outfit.");
    } else {
        showNotification("Marked as worn today");
    }
  };

  const generateSuggestion = useCallback(() => {
    if (dresses.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter Rule: Exclude items worn today or yesterday
    const availableDresses = dresses.filter(dress => {
      if (!dress.lastWorn) return true;
      
      const lastWornDate = new Date(dress.lastWorn);
      const wornDay = new Date(lastWornDate.getFullYear(), lastWornDate.getMonth(), lastWornDate.getDate());
      
      const diffTime = Math.abs(today.getTime() - wornDay.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // 0 = Today, 1 = Yesterday. Both are excluded.
      return diffDays >= 2;
    });

    if (availableDresses.length === 0) {
      alert("Everything in your wardrobe has been worn recently! Maybe time for some laundry?");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableDresses.length);
    setSuggestion(availableDresses[randomIndex]);
  }, [dresses]);


  // --- View Rendering ---

  const renderUpload = () => (
    <div className="flex flex-col h-full bg-white min-h-screen pb-24">
      <Header title="Add Item" subtitle="Snap a photo to auto-tag" />
      
      <div className="flex-1 px-6 flex flex-col items-center">
        {!uploadImage ? (
          <label className="w-full h-64 border-2 border-dashed border-rose-300 rounded-3xl flex flex-col items-center justify-center bg-rose-50 cursor-pointer hover:bg-rose-100 transition-colors">
            <Camera size={48} className="text-rose-400 mb-4" />
            <span className="font-semibold text-rose-600">Take Photo or Upload</span>
            <span className="text-xs text-rose-400 mt-2">Supports JPG, PNG</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </label>
        ) : (
          <div className="w-full flex flex-col gap-6 animate-fade-in">
            <div className="relative h-64 w-full rounded-3xl overflow-hidden shadow-lg">
              <img src={uploadImage} className="w-full h-full object-cover" alt="Preview" />
              <button 
                onClick={() => { setUploadImage(null); setUploadAnalysis(null); }}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {isAnalyzing ? (
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex items-center gap-4">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600 font-medium">AI is analyzing your outfit...</span>
              </div>
            ) : uploadAnalysis ? (
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles size={18} className="text-rose-500" />
                  AI Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Category</span>
                    <span className="font-semibold text-gray-800 capitalize">{uploadAnalysis.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Color</span>
                    <span className="font-semibold text-gray-800 capitalize">{uploadAnalysis.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Occasion</span>
                    <span className="font-semibold text-gray-800 capitalize">{uploadAnalysis.occasion}</span>
                  </div>
                </div>
                <button 
                  onClick={saveNewDress}
                  className="w-full mt-6 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-600 active:scale-95 transition-all"
                >
                  Save to Wardrobe
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen pb-24">
      <Header title="Hello, Fashionista" subtitle="What should we wear today?" />
      
      <div className="px-6">
        {dresses.length === 0 ? (
          <EmptyWardrobe onUpload={() => setView('upload')} />
        ) : (
          <div className="flex flex-col gap-8">
            {suggestion ? (
              <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-xl">Today's Pick</h3>
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Fresh (Not worn recently)
                  </span>
                </div>
                <DressCard dress={suggestion} onWear={wearDress} />
                
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm mb-4">Not feeling this vibe?</p>
                  <button 
                    onClick={generateSuggestion}
                    className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-full font-semibold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw size={16} />
                    Spin Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-center border border-gray-100">
                <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles size={40} className="text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Need inspiration?</h3>
                <p className="text-gray-500 mb-8">I'll pick something you haven't worn in at least 2 days.</p>
                <button 
                  onClick={generateSuggestion}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Pick My Outfit
                </button>
              </div>
            )}

            {/* Stats / Info */}
            <div className="bg-white/50 p-4 rounded-2xl border border-rose-100/50 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm">The 2-Day Rule</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    To keep your style fresh, the suggestion engine automatically filters out any items marked as worn within the last 48 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWardrobe = () => {
    const filteredDresses = activeFilter === FilterOption.ALL 
      ? dresses 
      : dresses.filter(dress => dress.occasion === activeFilter);

    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white sticky top-0 z-10 shadow-sm transition-shadow">
          <Header title="My Wardrobe" subtitle={`${dresses.length} items collected`} />
          
          {dresses.length > 0 && (
             <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
               {Object.values(FilterOption).map(tag => (
                 <button 
                   key={tag} 
                   onClick={() => setActiveFilter(tag)}
                   className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                     activeFilter === tag 
                       ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                       : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600'
                   }`}
                 >
                   {tag}
                 </button>
               ))}
             </div>
          )}
        </div>
  
        <div className="px-4 pt-6">
          {dresses.length === 0 ? (
             <EmptyWardrobe onUpload={() => setView('upload')} />
          ) : filteredDresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Filter size={48} className="mb-2 opacity-20" />
              <p>No {activeFilter.toLowerCase()} items found.</p>
              <button 
                onClick={() => setActiveFilter(FilterOption.ALL)}
                className="mt-2 text-rose-500 font-medium text-sm hover:underline"
              >
                View all items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredDresses.map(dress => (
                <DressCard 
                  key={dress.id} 
                  dress={dress} 
                  compact 
                  onDelete={requestDelete}
                  onWear={wearDress}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-rose-50/30 min-h-screen font-sans text-gray-900">
      {notification && <Toast message={notification} />}
      
      {deleteId && (
        <DeleteModal 
          onConfirm={confirmDelete} 
          onCancel={() => setDeleteId(null)} 
        />
      )}

      {view === 'home' && renderHome()}
      {view === 'wardrobe' && renderWardrobe()}
      {view === 'upload' && renderUpload()}
      
      <NavBar currentView={view} onChangeView={setView} />
    </div>
  );
}