import React, { useState } from 'react';
import { STOCK_DOCUMENTARY_IMAGES } from '../utils/presets';
import {
  Upload,
  Sparkles,
  RefreshCw,
  Shuffle,
  Trash2,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';

interface MediaBinProps {
  userImages: { id: string; title: string; url: string }[];
  onAddUserImages: (newImages: { id: string; title: string; url: string }[]) => void;
  onRemoveImage: (id: string) => void;
  onDistributeImagesToScenes: (images: { id: string; title: string; url: string }[]) => void;
  selectedSceneImageUrl?: string;
  onAssignToSelectedScene: (url: string) => void;
}

export const MediaBin: React.FC<MediaBinProps> = ({
  userImages,
  onAddUserImages,
  onRemoveImage,
  onDistributeImagesToScenes,
  selectedSceneImageUrl,
  onAssignToSelectedScene,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const allImages = [...userImages, ...STOCK_DOCUMENTARY_IMAGES];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
  };

  const processFiles = (files: File[]) => {
    const newItems: { id: string; title: string; url: string }[] = [];
    let processed = 0;

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        newItems.push({
          id: `img_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          url,
        });
        processed++;
        if (processed === files.length) {
          onAddUserImages(newItems);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleGenerateAIImage = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          aspectRatio: '16:9',
        }),
      });

      const data = await res.json();
      if (data.imageUrl) {
        const newImg = {
          id: `img_ai_${Date.now()}`,
          title: aiPrompt.slice(0, 30),
          url: data.imageUrl,
        };
        onAddUserImages([newImg]);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('Failed to generate AI image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Top Header & Distribution Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <span>Image Asset Bin & Auto-Distributor</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Upload your documentary image stills or generate custom visual frames with Gemini.
          </p>
        </div>

        {/* Auto-distribute button */}
        <button
          onClick={() => onDistributeImagesToScenes(allImages)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
        >
          <Shuffle className="w-4 h-4 text-amber-400" />
          <span>Auto-Distribute All to 20-30m Timeline</span>
        </button>
      </div>

      {/* Drag & Drop Upload Zone + AI Generation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
            isDragging
              ? 'border-amber-400 bg-amber-400/5'
              : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
          }`}
        >
          <label className="flex flex-col items-center cursor-pointer w-full">
            <Upload className="w-8 h-8 text-neutral-400 mb-2" />
            <span className="text-xs font-semibold text-neutral-200">
              Drop multiple documentary images here
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">
              Supports JPG, PNG, WebP (16:9 recommended)
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* AI Image Generator Box */}
        <div className="flex flex-col justify-between p-5 bg-neutral-900/80 rounded-xl border border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-neutral-200">
                Generate Custom Still with Gemini
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-3">
              Describe the historic archive, scientific telescope view, or macro subject needed for your scenes.
            </p>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 1960s Apollo mission flight control room with telemetry consoles..."
              className="w-full text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleGenerateAIImage}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-40 transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Image...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Still</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Media Library Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Active Visual Library ({allImages.length} images)</span>
          <span className="text-[11px] text-neutral-500">
            Click any image to assign it directly to the active shot
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allImages.map((img) => {
            const isCurrentlyAssigned = selectedSceneImageUrl === img.url;

            return (
              <div
                key={img.id}
                onClick={() => onAssignToSelectedScene(img.url)}
                className={`group relative aspect-video rounded-xl overflow-hidden border cursor-pointer transition-all bg-neutral-950 ${
                  isCurrentlyAssigned
                    ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-400/10'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-between p-2.5">
                  <div className="flex justify-end">
                    {isCurrentlyAssigned && (
                      <span className="p-1 rounded-full bg-amber-400 text-neutral-950">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white truncate max-w-[85%]">
                      {img.title}
                    </span>
                    {userImages.some((u) => u.id === img.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(img.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-400 transition-opacity"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
