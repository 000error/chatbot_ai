import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const ModelSelector = ({ isOpen, onClose, models, currentModel, onSelectModel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <Motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                选择你的AI伙伴
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model);
                    onClose();
                  }}
                  className={`relative p-4 rounded-xl text-left transition-all duration-300 border 
                    ${currentModel.id === model.id 
                      ? 'border-black bg-white shadow-polaroid transform -translate-y-1 rotate-1' 
                      : 'border-transparent bg-gray-50 hover:bg-white hover:shadow-sm hover:border-gray-200'
                    }
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl mb-3 ${model.color} flex items-center justify-center`}>
                    <span className="text-2xl">{model.icon}</span>
                  </div>
                  <h3 className="font-bold text-gray-900">{model.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{model.description}</p>
                  
                  {currentModel.id === model.id && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full ring-4 ring-white" />
                  )}
                </button>
              ))}
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModelSelector;
